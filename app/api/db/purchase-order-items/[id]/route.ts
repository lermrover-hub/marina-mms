import { NextResponse } from "next/server"
import { PROCUREMENT_WRITE_ROLES, requireApiActor } from "@/lib/api-auth"
import { apiServerError, finiteNonNegative } from "@/lib/api-route-utils"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireApiActor(PROCUREMENT_WRITE_ROLES)
  if ("error" in access) return access.error
  try {
    const body = await req.json()
    const description = String(body.description ?? "").trim()
    const qty = finiteNonNegative(body.qty ?? 0)
    const unitPrice = finiteNonNegative(body.unit_price ?? 0)
    if (!description) return NextResponse.json({ error: "description is required" }, { status: 400 })
    if (qty == null || unitPrice == null) return NextResponse.json({ error: "qty and unit_price must be non-negative" }, { status: 400 })
    const { id } = await params
    const { data, error } = await createServerClient({ requireServiceRole: true }).from("mms_purchase_order_items").update({
      item_code: body.item_code || null, description, qty, unit: body.unit || null, unit_price: unitPrice,
      line_total: Number((qty * unitPrice).toFixed(2)), updated_at: new Date().toISOString(),
    }).eq("id", id).select().maybeSingle()
    if (error) throw error
    return data ? NextResponse.json(data) : NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (error) { return apiServerError("purchase-order-items.patch", error) }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireApiActor(PROCUREMENT_WRITE_ROLES)
  if ("error" in access) return access.error
  try {
    const { id } = await params
    const { data, error } = await createServerClient({ requireServiceRole: true }).from("mms_purchase_order_items").delete().eq("id", id).select("id").maybeSingle()
    if (error) throw error
    return data ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (error) { return apiServerError("purchase-order-items.delete", error) }
}
