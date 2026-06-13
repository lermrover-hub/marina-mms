import { NextResponse } from "next/server"
import { apiErrorMessage, dbQuery } from "@/lib/postgres"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const entityType = searchParams.get("entity_type")
    const userName   = searchParams.get("user_name")
    const action     = searchParams.get("action")
    const where: string[] = []
    const values: unknown[] = []
    if (entityType) { values.push(entityType); where.push(`entity_type = $${values.length}`) }
    if (userName) { values.push(`%${userName}%`); where.push(`user_name ILIKE $${values.length}`) }
    if (action) { values.push(action); where.push(`action = $${values.length}`) }
    const result = await dbQuery(`SELECT * FROM mms_audit_log${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT 300`, values)
    return NextResponse.json(result.rows)
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body.action) return NextResponse.json({ error: "action is required" }, { status: 400 })
    const result = await dbQuery(`INSERT INTO mms_audit_log (action,entity_type,entity_id,entity_ref,user_name,user_role,notes,changes,ip_address) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [body.action, body.entity_type || "system", body.entity_id || null, body.entity_ref || null, body.user_name || null, body.user_role || null, body.notes || null, body.changes ?? null, body.ip_address || null])
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}
