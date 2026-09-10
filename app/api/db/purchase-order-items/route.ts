import { NextResponse } from "next/server"
import { apiErrorMessage, dbTransaction } from "@/lib/postgres"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const qty        = Number(body.qty)        || 0
    const unit_price = Number(body.unit_price) || 0
    const line_total = parseFloat((qty * unit_price).toFixed(2))

    if (!body.po_id || !String(body.description ?? "").trim()) return NextResponse.json({ error: "po_id and description are required" }, { status: 400 })
    const item = await dbTransaction(async (client) => {
      const inserted = await client.query(`INSERT INTO mms_purchase_order_items (po_id, item_code, description, qty, unit, unit_price, line_total) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [body.po_id, body.item_code || null, body.description, qty, body.unit || null, unit_price, line_total])
      await client.query(`UPDATE mms_purchase_orders SET subtotal = totals.subtotal, vat_amount = round(totals.subtotal * 0.07, 2), total_amount = totals.subtotal + round(totals.subtotal * 0.07, 2), updated_at = now() FROM (SELECT COALESCE(sum(line_total),0) AS subtotal FROM mms_purchase_order_items WHERE po_id = $1) totals WHERE id = $1`, [body.po_id])
      return inserted.rows[0]
    })
    return NextResponse.json(item, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}
