import { NextResponse } from "next/server"
import { OPERATIONS_WRITE_ROLES, STAFF_ROLES, requireApiActor } from "@/lib/api-auth"
import { apiServerError, finiteNonNegative } from "@/lib/api-route-utils"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const access = await requireApiActor(STAFF_ROLES)
  if ("error" in access) return access.error
  try {
    const workOrderId = new URL(request.url).searchParams.get("work_order_id")
    if (!workOrderId) return NextResponse.json({ error: "work_order_id required" }, { status: 400 })
    const { data, error } = await createServerClient({ requireServiceRole: true }).from("mms_material_usage").select("*").eq("work_order_id", workOrderId).order("created_at")
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) { return apiServerError("material-usage.get", error) }
}

export async function POST(request: Request) {
  const access = await requireApiActor(OPERATIONS_WRITE_ROLES)
  if ("error" in access) return access.error
  try {
    const body = await request.json()
    const itemName = String(body.item_name ?? "").trim()
    const quantity = finiteNonNegative(body.quantity ?? 0)
    const unitCost = finiteNonNegative(body.unit_cost ?? 0)
    if (!body.work_order_id || !itemName) return NextResponse.json({ error: "work_order_id and item_name are required" }, { status: 400 })
    if (quantity == null || unitCost == null) return NextResponse.json({ error: "quantity and unit_cost must be non-negative" }, { status: 400 })
    const { data, error } = await createServerClient({ requireServiceRole: true }).from("mms_material_usage").insert({
      work_order_id: body.work_order_id, item_name: itemName, description: body.description || null,
      quantity, unit: body.unit || "pcs", unit_cost: unitCost, total_cost: Number((quantity * unitCost).toFixed(2)),
      supplier: body.supplier || null, charge_to_customer: body.charge_to_customer !== false,
    }).select().single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) { return apiServerError("material-usage.post", error) }
}

export async function DELETE(request: Request) {
  const access = await requireApiActor(OPERATIONS_WRITE_ROLES)
  if ("error" in access) return access.error
  try {
    const id = new URL(request.url).searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const { data, error } = await createServerClient({ requireServiceRole: true }).from("mms_material_usage").delete().eq("id", id).select("id").maybeSingle()
    if (error) throw error
    return data ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (error) { return apiServerError("material-usage.delete", error) }
}
