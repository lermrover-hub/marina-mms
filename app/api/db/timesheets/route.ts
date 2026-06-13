import { NextResponse } from "next/server"
import { apiErrorMessage, dbQuery } from "@/lib/postgres"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const workOrderId = searchParams.get("work_order_id")
    const staffName   = searchParams.get("staff_name")
    const where: string[] = []
    const values: unknown[] = []
    if (workOrderId) { values.push(workOrderId); where.push(`work_order_id = $${values.length}`) }
    if (staffName) { values.push(`%${staffName}%`); where.push(`staff_name ILIKE $${values.length}`) }
    const result = await dbQuery(`SELECT * FROM mms_timesheets${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY date DESC, created_at DESC`, values)
    return NextResponse.json(result.rows)
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const hours_worked = Number(body.hours_worked) || 0
    const hourly_rate  = Number(body.hourly_rate)  || 0
    const total_cost   = parseFloat((hours_worked * hourly_rate).toFixed(2))

    if (!body.work_order_id || !String(body.staff_name ?? "").trim()) return NextResponse.json({ error: "work_order_id and staff_name are required" }, { status: 400 })
    const date = body.date || new Date().toISOString().slice(0, 10)
    const result = await dbQuery(`INSERT INTO mms_timesheets (work_order_id,staff_name,date,start_time,end_time,hours_worked,hourly_rate,total_cost,notes,approved_by,approved_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [body.work_order_id, body.staff_name, date, body.start_time || null, body.end_time || null, hours_worked, hourly_rate, total_cost, body.notes || null, body.approved_by || null, body.approved_at || null])
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}
