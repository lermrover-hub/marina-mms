import { NextResponse } from "next/server"
import { PROCUREMENT_WRITE_ROLES, STAFF_ROLES, requireApiActor } from "@/lib/api-auth"
import { apiServerError } from "@/lib/api-route-utils"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const access = await requireApiActor(STAFF_ROLES)
  if ("error" in access) return access.error
  try {
    const params = new URL(req.url).searchParams
    let query = createServerClient({ requireServiceRole: true }).from("mms_purchase_orders").select("*").order("created_at", { ascending: false })
    if (params.get("status")) query = query.eq("status", params.get("status")!)
    if (params.get("supplier_id")) query = query.eq("supplier_id", params.get("supplier_id")!)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) { return apiServerError("purchase-orders.get", error) }
}

export async function POST(req: Request) {
  const access = await requireApiActor(PROCUREMENT_WRITE_ROLES)
  if ("error" in access) return access.error
  try {
    const body = await req.json()
    const { data, error } = await createServerClient({ requireServiceRole: true }).rpc("mms_create_purchase_order", {
      p_po_number: String(body.po_number ?? "").trim() || null, p_supplier_id: body.supplier_id || null,
      p_supplier_name: body.supplier_name || null, p_status: body.status || "draft", p_order_date: body.order_date || null,
      p_expected_date: body.expected_date || null, p_notes: body.notes || null, p_created_by: access.actor.userId,
    })
    if (error) throw error
    return NextResponse.json(Array.isArray(data) ? data[0] : data, { status: 201 })
  } catch (error) { return apiServerError("purchase-orders.post", error) }
}
