import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

/**
 * POST /api/inquiries
 *
 * Accepts a public booking inquiry submission.
 * Stores to the `inquiries` table in Supabase without customer login.
 * Returns the created record id and reference number.
 */

export const dynamic = "force-dynamic"

function generateRef(): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
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

  const {
    fullName,
    phone,
    email,
    boatName,
    boatLoa,
    serviceCategory,
    preferredDate,
  } = body

  if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
    return NextResponse.json({ error: "fullName is required" }, { status: 422 })
  }
  if (!phone && !email) {
    return NextResponse.json(
      { error: "At least one contact (phone or email) is required" },
      { status: 422 }
    )
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
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from("inquiries")
    .insert([
      {
        ref_number: ref,
        status: "NEW",

        full_name: String(fullName).trim(),
        company: body.company ? String(body.company).trim() : null,
        phone: phone ? String(phone).trim() : null,
        email: email ? String(email).trim().toLowerCase() : null,
        preferred_contact: body.preferredContact ?? "PHONE",
        line_id: body.lineId ? String(body.lineId).trim() : null,

        boat_name: String(boatName).trim(),
        boat_type: body.boatType ?? null,
        boat_loa_ft: boatLoa ? parseFloat(String(boatLoa)) : null,
        boat_beam_ft: body.boatBeam ? parseFloat(String(body.boatBeam)) : null,
        boat_draft_ft: body.boatDraft ? parseFloat(String(body.boatDraft)) : null,
        engine_count: body.engineCount ? parseInt(String(body.engineCount), 10) : null,
        boat_year: body.boatYear ? parseInt(String(body.boatYear), 10) : null,

        service_category: serviceCategory,
        preferred_date: preferredDate ?? null,
        preferred_time: body.preferredTime ?? null,
        duration_days: body.durationDays ? parseInt(String(body.durationDays), 10) : null,
        message: body.message ? String(body.message).trim() : null,

        source: "BOOKING_FORM",
        submitted_at: new Date().toISOString(),
      },
    ])
    .select("id, ref_number")
    .single()

  if (error) {
    // Table not in PostgREST schema cache (42P01 = Postgres "relation not found",
    // PGRST204/schema cache miss returns a different message string)
    const isTableMissing =
      error.code === "42P01" ||
      error.message?.includes("schema cache") ||
      error.message?.includes("Could not find the table")

    if (isTableMissing) {
      console.warn("[inquiries] Table not in schema cache or not yet created. Returning mock response.")
      return NextResponse.json({ id: "mock-id", ref_number: ref }, { status: 201 })
    }

    console.error("[inquiries] Insert error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServerClient()
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
