import { NextResponse } from "next/server"
import { PROCUREMENT_WRITE_ROLES, requireApiActor } from "@/lib/api-auth"
import { apiServerError, finiteNonNegative } from "@/lib/api-route-utils"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const access = await requireApiActor(PROCUREMENT_WRITE_ROLES)
  if ("error" in access) return access.error
  try {
    const body = await req.json()
    const description = String(body.description ?? "").trim()
    const qty = finiteNonNegative(body.qty ?? 0)
    const unitPrice = finiteNonNegative(body.unit_price ?? 0)
    if (!body.po_id || !description) return NextResponse.json({ error: "po_id and description are required" }, { status: 400 })
    if (qty == null || unitPrice == null) return NextResponse.json({ error: "qty and unit_price must be non-negative" }, { status: 400 })
    const { data, error } = await createServerClient({ requireServiceRole: true }).from("mms_purchase_order_items").insert({
      po_id: body.po_id, item_code: body.item_code || null, description, qty, unit: body.unit || null,
      unit_price: unitPrice, line_total: Number((qty * unitPrice).toFixed(2)),
    }).select().single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) { return apiServerError("purchase-order-items.post", error) }
}
