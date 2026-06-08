import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * POST /api/inquiries
 *
 * Accepts a public booking inquiry submission.
 * Stores to the `inquiries` table in Supabase (no auth required).
 * Returns the created record id + reference number.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateRef(): string {
  const now = new Date()
  const yy  = String(now.getFullYear()).slice(-2)
  const mm  = String(now.getMonth() + 1).padStart(2, "0")
  const dd  = String(now.getDate()).padStart(2, "0")
  const rnd = Math.floor(1000 + Math.random() * 9000)
  return `INQ-${yy}${mm}${dd}-${rnd}`
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // ── Basic server-side validation ──────────────────────────────────────────
  const { fullName, phone, email, boatName, boatLoa, serviceCategory, preferredDate } = body

  if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
    return NextResponse.json({ error: "fullName is required" }, { status: 422 })
  }
  if (!phone && !email) {
    return NextResponse.json({ error: "At least one contact (phone or email) is required" }, { status: 422 })
  }
  if (!boatName || typeof boatName !== "string" || boatName.trim().length < 1) {
    return NextResponse.json({ error: "boatName is required" }, { status: 422 })
  }
  if (!boatLoa) {
    return NextResponse.json({ error: "boatLoa is required" }, { status: 422 })
  }
  if (!serviceCategory) {
    return NextResponse.json({ error: "serviceCategory is required" }, { status: 422 })
  }

  const ref = generateRef()

  // ── Insert to Supabase ────────────────────────────────────────────────────
  const { data, error } = await supabase
    .from("inquiries")
    .insert([
      {
        ref_number:          ref,
        status:              "NEW",

        // Contact
        full_name:           String(fullName).trim(),
        company:             body.company ? String(body.company).trim() : null,
        phone:               phone ? String(phone).trim() : null,
        email:               email ? String(email).trim().toLowerCase() : null,
        preferred_contact:   body.preferredContact ?? "PHONE",
        line_id:             body.lineId ? String(body.lineId).trim() : null,

        // Boat
        boat_name:           String(boatName).trim(),
        boat_type:           body.boatType ?? null,
        boat_loa_ft:         boatLoa ? parseFloat(String(boatLoa)) : null,
        boat_beam_ft:        body.boatBeam ? parseFloat(String(body.boatBeam)) : null,
        boat_draft_ft:       body.boatDraft ? parseFloat(String(body.boatDraft)) : null,
        engine_count:        body.engineCount ? parseInt(String(body.engineCount), 10) : null,
        boat_year:           body.boatYear ? parseInt(String(body.boatYear), 10) : null,

        // Service
        service_category:    serviceCategory,
        preferred_date:      preferredDate ?? null,
        preferred_time:      body.preferredTime ?? null,
        duration_days:       body.durationDays ? parseInt(String(body.durationDays), 10) : null,
        message:             body.message ? String(body.message).trim() : null,

        // Meta
        source:              "BOOKING_FORM",
        submitted_at:        new Date().toISOString(),
      },
    ])
    .select("id, ref_number")
    .single()

  if (error) {
    // Table may not exist yet in dev — return graceful mock for local dev
    if (error.code === "42P01") {
      console.warn("[inquiries] Table 'inquiries' does not exist yet — returning mock response.")
      return NextResponse.json({ id: "mock-id", ref_number: ref }, { status: 201 })
    }
    console.error("[inquiries] Insert error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function GET(req: NextRequest) {
  // For internal dashboard use — requires auth check
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("inquiries")
    .select("*")
    .order("submitted_at", { ascending: false })
    .limit(100)

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json([], { status: 200 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
