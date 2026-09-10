import { NextResponse } from "next/server"
import { apiErrorMessage, dbQuery, dbTransaction } from "@/lib/postgres"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const itemId   = searchParams.get("item_id")
    const type     = searchParams.get("movement_type")
    const limit    = parseInt(searchParams.get("limit") ?? "200")
    const where: string[] = []
    const values: unknown[] = []
    if (itemId) { values.push(itemId); where.push(`item_id = $${values.length}`) }
    if (type) { values.push(type); where.push(`movement_type = $${values.length}`) }
    values.push(Math.min(Math.max(limit, 1), 500))
    const result = await dbQuery(`SELECT * FROM mms_stock_movements${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT $${values.length}`, values)
    return NextResponse.json(result.rows)
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate required fields
    if (!body.item_id || !body.movement_type || body.quantity == null) {
      return NextResponse.json({ error: "item_id, movement_type, and quantity are required" }, { status: 400 })
    }

    const qty = Number(body.quantity)

    if (!Number.isFinite(qty) || qty < 0) return NextResponse.json({ error: "quantity must be a non-negative number" }, { status: 400 })
    const movement = await dbTransaction(async (client) => {
      const inventory = await client.query("SELECT item_code, name, on_hand FROM mms_inventory_items WHERE id=$1 FOR UPDATE", [body.item_id])
      if (!inventory.rows[0]) throw new Error("Inventory item not found")
      const current = Number(inventory.rows[0].on_hand)
      let next = current
      if (body.movement_type === "stock_in") next += qty
      else if (["stock_out", "issue"].includes(body.movement_type)) next = Math.max(0, current - qty)
      else if (body.movement_type === "adjustment") next = qty
      else throw new Error("Unsupported movement_type")

      const inserted = await client.query(`INSERT INTO mms_stock_movements (item_id,item_code,item_name,movement_type,quantity,unit_cost,reference_type,reference_id,notes,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [body.item_id, body.item_code || inventory.rows[0].item_code, body.item_name || inventory.rows[0].name, body.movement_type, qty, body.unit_cost ?? null, body.reference_type || null, body.reference_id || null, body.notes || null, body.created_by || null])
      await client.query("UPDATE mms_inventory_items SET on_hand=$1, updated_at=now() WHERE id=$2", [next, body.item_id])
      return inserted.rows[0]
    })
    return NextResponse.json(movement, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}
