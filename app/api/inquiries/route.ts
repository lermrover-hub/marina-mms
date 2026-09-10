import { NextRequest, NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { createServerClient } from "@/lib/supabase-server"
import { requireApiActor, STAFF_ROLES } from "@/lib/api-auth"

/**
 * POST /api/inquiries
 *
 * Accepts a public booking inquiry submission.
 * Stores to the `inquiries` table in Supabase without customer login.
 * Returns the created record id and reference number.
 */

export const dynamic = "force-dynamic"

const ALLOWED_SERVICE_CATEGORIES = new Set([
  "RAMP_LAUNCH",
  "RAMP_HAUL_OUT",
  "WET_BERTH",
  "DRY_STORAGE",
  "BOAT_REPAIR",
  "OTHER",
])
const ALLOWED_BOAT_TYPES = new Set([
  "SPEEDBOAT",
  "MOTOR_YACHT",
  "SAILING_YACHT",
  "CATAMARAN",
  "PWC",
  "OTHER",
])
const ALLOWED_CONTACT_METHODS = new Set(["PHONE", "EMAIL", "LINE"])
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60
const RATE_LIMIT_MAX_REQUESTS = 5

function optionalText(value: unknown, maxLength: number) {
  if (value === undefined || value === null || value === "") return null
  if (typeof value !== "string") return undefined
  const normalized = value.trim()
  if (!normalized || normalized.length > maxLength) return undefined
  return normalized
}

function optionalNumber(value: unknown, min: number, max: number, integer = false) {
  if (value === undefined || value === null || value === "") return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return undefined
  if (integer && !Number.isInteger(parsed)) return undefined
  return parsed
}

function requestKey(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const address = forwarded || req.headers.get("x-real-ip") || "unknown"
  const userAgent = req.headers.get("user-agent") || "unknown"
  return createHash("sha256").update(`${address}|${userAgent}`).digest("hex")
}

function generateRef(): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  const rnd = Math.floor(1000 + Math.random() * 9000)
  return `INQ-${yy}${mm}${dd}-${rnd}`
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient({ requireServiceRole: true })
  const { data: withinLimit, error: rateLimitError } = await supabase.rpc(
    "mms_consume_public_rate_limit",
    {
      p_endpoint: "public-inquiry",
      p_key_hash: requestKey(req),
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
      p_max_requests: RATE_LIMIT_MAX_REQUESTS,
    }
  )

  if (rateLimitError) {
    console.error("[inquiries] Rate-limit check failed", rateLimitError)
    return NextResponse.json({ error: "Inquiry service is temporarily unavailable" }, { status: 503 })
  }
  if (!withinLimit) {
    return NextResponse.json(
      { error: "Too many inquiries. Please try again later." },
      { status: 429, headers: { "Retry-After": String(RATE_LIMIT_WINDOW_SECONDS) } }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const fullName = optionalText(body.fullName, 150)
  const company = optionalText(body.company, 200)
  const phone = optionalText(body.phone, 50)
  const email = optionalText(body.email, 254)
  const lineId = optionalText(body.lineId, 100)
  const boatName = optionalText(body.boatName, 150)
  const boatLoa = optionalNumber(body.boatLoa, 0.1, 500)
  const boatBeam = optionalNumber(body.boatBeam, 0.1, 200)
  const boatDraft = optionalNumber(body.boatDraft, 0, 100)
  const engineCount = optionalNumber(body.engineCount, 0, 20, true)
  const boatYear = optionalNumber(body.boatYear, 1800, new Date().getFullYear() + 1, true)
  const durationDays = optionalNumber(body.durationDays, 1, 3650, true)
  const message = optionalText(body.message, 5000)
  const preferredTime = optionalText(body.preferredTime, 30)
  const preferredDate = optionalText(body.preferredDate, 10)
  const preferredContact = String(body.preferredContact ?? "PHONE")
  const boatType = body.boatType ? String(body.boatType) : null
  const serviceCategory = String(body.serviceCategory ?? "")

  if (!fullName || fullName.length < 2) {
    return NextResponse.json({ error: "fullName is required" }, { status: 422 })
  }
  if (company === undefined || phone === undefined || email === undefined || lineId === undefined) {
    return NextResponse.json({ error: "Invalid contact details" }, { status: 422 })
  }
  if (!phone && !email) {
    return NextResponse.json(
      { error: "At least one contact (phone or email) is required" },
      { status: 422 }
    )
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 422 })
  }
  if (!ALLOWED_CONTACT_METHODS.has(preferredContact)) {
    return NextResponse.json({ error: "Invalid preferredContact" }, { status: 422 })
  }
  if (!boatName) {
    return NextResponse.json({ error: "boatName is required" }, { status: 422 })
  }
  if (boatLoa === null || boatLoa === undefined) {
    return NextResponse.json({ error: "boatLoa is required" }, { status: 422 })
  }
  if (
    boatBeam === undefined ||
    boatDraft === undefined ||
    engineCount === undefined ||
    boatYear === undefined ||
    durationDays === undefined ||
    message === undefined ||
    preferredTime === undefined ||
    preferredDate === undefined
  ) {
    return NextResponse.json({ error: "Invalid vessel or service details" }, { status: 422 })
  }
  if (boatType && !ALLOWED_BOAT_TYPES.has(boatType)) {
    return NextResponse.json({ error: "Invalid boatType" }, { status: 422 })
  }
  if (!ALLOWED_SERVICE_CATEGORIES.has(serviceCategory)) {
    return NextResponse.json({ error: "Invalid serviceCategory" }, { status: 422 })
  }
  if (preferredDate && !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    return NextResponse.json({ error: "Invalid preferredDate" }, { status: 422 })
  }

  const ref = generateRef()

  const { data, error } = await supabase
    .from("inquiries")
    .insert([
      {
        ref_number: ref,
        status: "NEW",

        full_name: fullName,
        company,
        phone,
        email: email?.toLowerCase() ?? null,
        preferred_contact: preferredContact,
        line_id: lineId,

        boat_name: boatName,
        boat_type: boatType,
        boat_loa_ft: boatLoa,
        boat_beam_ft: boatBeam,
        boat_draft_ft: boatDraft,
        engine_count: engineCount,
        boat_year: boatYear,

        service_category: serviceCategory,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        duration_days: durationDays,
        message,

        source: "BOOKING_FORM",
        submitted_at: new Date().toISOString(),
      },
    ])
    .select("id, ref_number")
    .single()

  if (error) {
    console.error("[inquiries] Insert error:", error)
    return NextResponse.json({ error: "Unable to save inquiry" }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function GET() {
  const access = await requireApiActor(STAFF_ROLES)
  if (access.error) return access.error

  const supabase = createServerClient({ requireServiceRole: true })
  const { data, error } = await supabase
    .from("inquiries")
    .select("*")
    .order("submitted_at", { ascending: false })
    .limit(100)

  if (error) {
    console.error("[inquiries] Read error:", error)
    return NextResponse.json({ error: "Unable to load inquiries" }, { status: 500 })
  }

  return NextResponse.json(data)
}
