import { NextResponse } from "next/server"
import { PROCUREMENT_WRITE_ROLES, STAFF_ROLES, requireApiActor } from "@/lib/api-auth"
import { apiServerError, finiteNonNegative } from "@/lib/api-route-utils"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"
const movementTypes = new Set(["stock_in", "stock_out", "adjustment", "issue"])

export async function GET(req: Request) {
  const access = await requireApiActor(STAFF_ROLES)
  if ("error" in access) return access.error
  try {
    const params = new URL(req.url).searchParams
    const parsedLimit = Number.parseInt(params.get("limit") ?? "200", 10)
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 200
    let query = createServerClient({ requireServiceRole: true }).from("mms_stock_movements").select("*").order("created_at", { ascending: false }).limit(limit)
    if (params.get("item_id")) query = query.eq("item_id", params.get("item_id")!)
    if (params.get("movement_type")) query = query.eq("movement_type", params.get("movement_type")!)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) { return apiServerError("stock-movements.get", error) }
}

export async function POST(req: Request) {
  const access = await requireApiActor(PROCUREMENT_WRITE_ROLES)
  if ("error" in access) return access.error
  try {
    const body = await req.json()
    const movementType = String(body.movement_type ?? "")
    const quantity = finiteNonNegative(body.quantity)
    const unitCost = body.unit_cost == null ? null : finiteNonNegative(body.unit_cost)
    if (!body.item_id || !movementTypes.has(movementType) || quantity == null) return NextResponse.json({ error: "Valid item_id, movement_type, and quantity are required" }, { status: 400 })
    if (body.unit_cost != null && unitCost == null) return NextResponse.json({ error: "unit_cost must be non-negative" }, { status: 400 })
    const { data, error } = await createServerClient({ requireServiceRole: true }).rpc("mms_record_stock_movement", {
      p_item_id: body.item_id, p_movement_type: movementType, p_quantity: quantity, p_unit_cost: unitCost,
      p_reference_type: body.reference_type || null, p_reference_id: body.reference_id || null,
      p_notes: body.notes || null, p_created_by: access.actor.userId,
    })
    if (error) {
      if (error.code === "22003") return NextResponse.json({ error: "Insufficient stock" }, { status: 409 })
      if (error.code === "P0002") return NextResponse.json({ error: "Inventory item not found" }, { status: 404 })
      throw error
    }
    return NextResponse.json(Array.isArray(data) ? data[0] : data, { status: 201 })
  } catch (error) { return apiServerError("stock-movements.post", error) }
}
