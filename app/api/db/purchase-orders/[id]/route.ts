import { NextResponse } from "next/server"
import { apiErrorMessage, buildUpdate, dbQuery } from "@/lib/postgres"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const [po, items] = await Promise.all([
      dbQuery("SELECT * FROM mms_purchase_orders WHERE id = $1", [id]),
      dbQuery("SELECT * FROM mms_purchase_order_items WHERE po_id = $1 ORDER BY created_at", [id]),
    ])
    if (!po.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ...po.rows[0], mms_purchase_order_items: items.rows })
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const update = buildUpdate(body, ["po_number","supplier_id","supplier_name","status","order_date","expected_date","notes"])
    if (!update.keys.length) return NextResponse.json({ error: "No supported fields" }, { status: 400 })
    const result = await dbQuery(`UPDATE mms_purchase_orders SET ${update.clause}, updated_at = now() WHERE id = $${update.values.length + 1} RETURNING *`, [...update.values, id])
    if (!result.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(result.rows[0])
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}
