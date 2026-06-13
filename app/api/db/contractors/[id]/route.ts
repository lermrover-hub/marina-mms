import { NextResponse } from "next/server"
import { apiErrorMessage, buildUpdate, dbQuery } from "@/lib/postgres"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await dbQuery("SELECT * FROM mms_contractors WHERE id = $1", [id])
    if (!result.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(result.rows[0])
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
    const update = buildUpdate(body, ["name","company_name","specialty","phone","email","address","tax_id","rate_type","daily_rate","status","notes"])
    if (!update.keys.length) return NextResponse.json({ error: "No supported fields" }, { status: 400 })
    const result = await dbQuery(`UPDATE mms_contractors SET ${update.clause}, updated_at = now() WHERE id = $${update.values.length + 1} RETURNING *`, [...update.values, id])
    if (!result.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(result.rows[0])
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}
