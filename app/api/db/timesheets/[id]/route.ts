import { NextResponse } from "next/server"
import { OPERATIONS_WRITE_ROLES, requireApiActor } from "@/lib/api-auth"
import { apiServerError, finiteNonNegative, pickFields } from "@/lib/api-route-utils"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"
const fields = ["work_order_id","staff_name","date","start_time","end_time","hours_worked","hourly_rate","notes"] as const

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireApiActor(OPERATIONS_WRITE_ROLES)
  if ("error" in access) return access.error
  try {
    const { id } = await params
    const client = createServerClient({ requireServiceRole: true })
    const { data: current, error: readError } = await client.from("mms_timesheets").select("hours_worked,hourly_rate").eq("id", id).maybeSingle()
    if (readError) throw readError
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const body = await req.json()
    const update = pickFields(body, fields)
    if (!Object.keys(update).length) return NextResponse.json({ error: "No supported fields" }, { status: 400 })
    const hours = finiteNonNegative(body.hours_worked ?? current.hours_worked)
    const rate = finiteNonNegative(body.hourly_rate ?? current.hourly_rate)
    if (hours == null || rate == null) return NextResponse.json({ error: "hours_worked and hourly_rate must be non-negative" }, { status: 400 })
    const { data, error } = await client.from("mms_timesheets").update({ ...update, total_cost: Number((hours * rate).toFixed(2)), updated_at: new Date().toISOString() }).eq("id", id).select().maybeSingle()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) { return apiServerError("timesheets.patch", error) }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireApiActor(OPERATIONS_WRITE_ROLES)
  if ("error" in access) return access.error
  try {
    const { id } = await params
    const { data, error } = await createServerClient({ requireServiceRole: true }).from("mms_timesheets").delete().eq("id", id).select("id").maybeSingle()
    if (error) throw error
    return data ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (error) { return apiServerError("timesheets.delete", error) }
}
