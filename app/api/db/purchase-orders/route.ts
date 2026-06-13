import { NextResponse } from "next/server"
import { apiErrorMessage, dbQuery, dbTransaction } from "@/lib/postgres"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status      = searchParams.get("status")
    const supplierId  = searchParams.get("supplier_id")
    const where: string[] = []
    const values: unknown[] = []
    if (status) { values.push(status); where.push(`status = $${values.length}`) }
    if (supplierId) { values.push(supplierId); where.push(`supplier_id = $${values.length}`) }
    const result = await dbQuery(`SELECT * FROM mms_purchase_orders${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC`, values)
    return NextResponse.json(result.rows)
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const row = await dbTransaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext('mms_purchase_orders_number'))")
      let poNumber = String(body.po_number ?? "").trim()
      if (!poNumber) {
        const year = new Date().getFullYear()
        const count = await client.query("SELECT count(*)::int AS count FROM mms_purchase_orders WHERE EXTRACT(YEAR FROM created_at) = $1", [year])
        poNumber = `PO-${year}-${String(Number(count.rows[0].count) + 1).padStart(4, "0")}`
      }
      const result = await client.query(`INSERT INTO mms_purchase_orders (po_number, supplier_id, supplier_name, status, order_date, expected_date, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [poNumber, body.supplier_id || null, body.supplier_name || null, body.status || "draft", body.order_date || null, body.expected_date || null, body.notes || null])
      return result.rows[0]
    })
    return NextResponse.json(row, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}
