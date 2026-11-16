import { NextResponse } from "next/server"
import { PROCUREMENT_WRITE_ROLES, STAFF_ROLES, requireApiActor } from "@/lib/api-auth"
import { apiServerError } from "@/lib/api-route-utils"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const access = await requireApiActor(STAFF_ROLES)
  if ("error" in access) return access.error
  try {
    const status = new URL(req.url).searchParams.get("status")
    let query = createServerClient({ requireServiceRole: true }).from("mms_suppliers").select("*").order("name")
    if (status) query = query.eq("status", status)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) { return apiServerError("suppliers.get", error) }
}

export async function POST(req: Request) {
  const access = await requireApiActor(PROCUREMENT_WRITE_ROLES)
  if ("error" in access) return access.error
  try {
    const body = await req.json()
    const name = String(body.name ?? "").trim()
    if (!name) return NextResponse.json({ error: "Supplier name is required" }, { status: 400 })
    const { data, error } = await createServerClient({ requireServiceRole: true }).from("mms_suppliers").insert({
      code: body.code || null, name, contact_name: body.contact_name || null, phone: body.phone || null,
      email: body.email || null, address: body.address || null, tax_id: body.tax_id || null,
      payment_terms: body.payment_terms || "Net 30", status: body.status || "active", notes: body.notes || null,
    }).select().single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) { return apiServerError("suppliers.post", error) }
}
