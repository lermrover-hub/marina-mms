import { NextResponse } from "next/server"
import { apiErrorMessage, dbQuery } from "@/lib/postgres"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status   = searchParams.get("status")
    const result = await dbQuery(`SELECT * FROM mms_suppliers${status ? " WHERE status = $1" : ""} ORDER BY name`, status ? [status] : [])
    return NextResponse.json(result.rows)
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!String(body.name ?? "").trim()) return NextResponse.json({ error: "Supplier name is required" }, { status: 400 })
    const values = [body.code || null, body.name, body.contact_name || null, body.phone || null, body.email || null, body.address || null, body.tax_id || null, body.payment_terms || null, body.status || "active", body.notes || null]
    const result = await dbQuery(`INSERT INTO mms_suppliers (code, name, contact_name, phone, email, address, tax_id, payment_terms, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, values)
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}
