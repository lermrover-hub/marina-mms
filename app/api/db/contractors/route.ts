import { NextResponse } from "next/server"
import { PROCUREMENT_WRITE_ROLES, STAFF_ROLES, requireApiActor } from "@/lib/api-auth"
import { apiServerError, finiteNonNegative } from "@/lib/api-route-utils"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const access = await requireApiActor(STAFF_ROLES)
  if ("error" in access) return access.error
  try {
    const { searchParams } = new URL(req.url)
    let query = createServerClient({ requireServiceRole: true }).from("mms_contractors").select("*").order("name")
    if (searchParams.get("status")) query = query.eq("status", searchParams.get("status")!)
    if (searchParams.get("specialty")) query = query.eq("specialty", searchParams.get("specialty")!)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) { return apiServerError("contractors.get", error) }
}

export async function POST(req: Request) {
  const access = await requireApiActor(PROCUREMENT_WRITE_ROLES)
  if ("error" in access) return access.error
  try {
    const body = await req.json()
    const name = String(body.name ?? "").trim()
    const dailyRate = body.daily_rate == null ? null : finiteNonNegative(body.daily_rate)
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })
    if (body.daily_rate != null && dailyRate == null) return NextResponse.json({ error: "daily_rate must be non-negative" }, { status: 400 })
    const { data, error } = await createServerClient({ requireServiceRole: true }).from("mms_contractors").insert({
      name, company_name: body.company_name || null, specialty: body.specialty || "other", phone: body.phone || null,
      email: body.email || null, address: body.address || null, tax_id: body.tax_id || null,
      rate_type: body.rate_type || "daily", daily_rate: dailyRate, status: body.status || "active", notes: body.notes || null,
    }).select().single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) { return apiServerError("contractors.post", error) }
}
