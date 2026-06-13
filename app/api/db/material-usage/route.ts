import { NextResponse } from "next/server"
import { apiErrorMessage, dbQuery } from "@/lib/postgres"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const workOrderId = searchParams.get("work_order_id")
    if (!workOrderId) return NextResponse.json({ error: "work_order_id required" }, { status: 400 })
    const result = await dbQuery("SELECT * FROM mms_material_usage WHERE work_order_id=$1 ORDER BY created_at", [workOrderId])
    return NextResponse.json(result.rows)
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.work_order_id || !String(body.item_name ?? "").trim()) return NextResponse.json({ error: "work_order_id and item_name are required" }, { status: 400 })
    const quantity = Number(body.quantity) || 0
    const unitCost = Number(body.unit_cost) || 0
    const result = await dbQuery(`INSERT INTO mms_material_usage (work_order_id,item_name,description,quantity,unit,unit_cost,total_cost,supplier,charge_to_customer) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [body.work_order_id, body.item_name, body.description || null, quantity, body.unit || "pcs", unitCost, Number((quantity * unitCost).toFixed(2)), body.supplier || null, body.charge_to_customer !== false])
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const result = await dbQuery("DELETE FROM mms_material_usage WHERE id=$1", [id])
    if (!result.rowCount) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}
