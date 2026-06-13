import { NextResponse } from "next/server"
import { apiErrorMessage, buildUpdate, dbQuery } from "@/lib/postgres"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const currentResult = await dbQuery("SELECT hours_worked, hourly_rate FROM mms_timesheets WHERE id=$1", [id])
    const current = currentResult.rows[0]
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const hours_worked = body.hours_worked != null ? Number(body.hours_worked) : Number(current.hours_worked)
    const hourly_rate  = body.hourly_rate  != null ? Number(body.hourly_rate)  : Number(current.hourly_rate)
    const update = buildUpdate(body, ["work_order_id","staff_name","date","start_time","end_time","hours_worked","hourly_rate","notes","approved_by","approved_at"])
    update.keys.push("total_cost")
    update.values.push(parseFloat((hours_worked * hourly_rate).toFixed(2)))
    update.clause = [...update.clause ? [update.clause] : [], `total_cost = $${update.values.length}`].join(", ")
    const result = await dbQuery(`UPDATE mms_timesheets SET ${update.clause}, updated_at=now() WHERE id=$${update.values.length + 1} RETURNING *`, [...update.values, id])
    return NextResponse.json(result.rows[0])
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await dbQuery("DELETE FROM mms_timesheets WHERE id=$1", [id])
    if (!result.rowCount) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 })
  }
}
