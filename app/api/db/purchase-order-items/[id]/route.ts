import { NextResponse } from "next/server"
import { apiErrorMessage, dbTransaction } from "@/lib/postgres"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const qty        = Number(body.qty)        || 0
    const unit_price = Number(body.unit_price) || 0
    const line_total = parseFloat((qty * unit_price).toFixed(2))

    const item = await dbTransaction(async (client) => {
      const updated = await client.query(`UPDATE mms_purchase_order_items SET item_code=$1, description=$2, qty=$3, unit=$4, unit_price=$5, line_total=$6, updated_at=now() WHERE id=$7 RETURNING *`, [body.item_code || null, body.description, qty, body.unit || null, unit_price, line_total, id])
      if (!updated.rows[0]) return null
      await client.query(`UPDATE mms_purchase_orders SET subtotal = totals.subtotal, vat_amount = round(totals.subtotal * 0.07, 2), total_amount = totals.subtotal + round(totals.subtotal * 0.07, 2), updated_at = now() FROM (SELECT COALESCE(sum(line_total),0) AS subtotal FROM mms_purchase_order_items WHERE po_id = $1) totals WHERE id = $1`, [updated.rows[0].po_id])
      return updated.rows[0]
    })
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(item)
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const deleted = await dbTransaction(async (client) => {
      const result = await client.query("DELETE FROM mms_purchase_order_items WHERE id=$1 RETURNING po_id", [id])
      if (!result.rows[0]) return false
      await client.query(`UPDATE mms_purchase_orders SET subtotal = totals.subtotal, vat_amount = round(totals.subtotal * 0.07, 2), total_amount = totals.subtotal + round(totals.subtotal * 0.07, 2), updated_at = now() FROM (SELECT COALESCE(sum(line_total),0) AS subtotal FROM mms_purchase_order_items WHERE po_id = $1) totals WHERE id = $1`, [result.rows[0].po_id])
      return true
    })
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}
