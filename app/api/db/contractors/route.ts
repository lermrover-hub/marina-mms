import { NextResponse } from "next/server"
import { apiErrorMessage, dbQuery } from "@/lib/postgres"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status    = searchParams.get("status")
    const specialty = searchParams.get("specialty")
    const where: string[] = []
    const values: unknown[] = []
    if (status) { values.push(status); where.push(`status = $${values.length}`) }
    if (specialty) { values.push(specialty); where.push(`specialty = $${values.length}`) }
    const result = await dbQuery(`SELECT * FROM mms_contractors${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY name`, values)
    return NextResponse.json(result.rows)
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!String(body.name ?? "").trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 })
    const values = [body.name, body.company_name || null, body.specialty || "other", body.phone || null, body.email || null, body.address || null, body.tax_id || null, body.rate_type || "daily", body.daily_rate ?? null, body.status || "active", body.notes || null]
    const result = await dbQuery(`INSERT INTO mms_contractors (name, company_name, specialty, phone, email, address, tax_id, rate_type, daily_rate, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, values)
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}
