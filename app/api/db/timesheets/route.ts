import { NextResponse } from "next/server"
import { OPERATIONS_WRITE_ROLES, STAFF_ROLES, requireApiActor } from "@/lib/api-auth"
import { apiServerError, finiteNonNegative } from "@/lib/api-route-utils"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const access = await requireApiActor(STAFF_ROLES)
  if ("error" in access) return access.error
  try {
    const params = new URL(req.url).searchParams
    let query = createServerClient({ requireServiceRole: true }).from("mms_timesheets").select("*").order("date", { ascending: false }).order("created_at", { ascending: false })
    if (params.get("work_order_id")) query = query.eq("work_order_id", params.get("work_order_id")!)
    if (params.get("staff_name")) query = query.ilike("staff_name", `%${params.get("staff_name")!}%`)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) { return apiServerError("timesheets.get", error) }
}

export async function POST(req: Request) {
  const access = await requireApiActor(OPERATIONS_WRITE_ROLES)
  if ("error" in access) return access.error
  try {
    const body = await req.json()
    const staffName = String(body.staff_name ?? "").trim()
    const hours = finiteNonNegative(body.hours_worked ?? 0)
    const rate = finiteNonNegative(body.hourly_rate ?? 0)
    if (!body.work_order_id || !staffName) return NextResponse.json({ error: "work_order_id and staff_name are required" }, { status: 400 })
    if (hours == null || rate == null) return NextResponse.json({ error: "hours_worked and hourly_rate must be non-negative" }, { status: 400 })
    const { data, error } = await createServerClient({ requireServiceRole: true }).from("mms_timesheets").insert({
      work_order_id: body.work_order_id, staff_name: staffName, date: body.date || new Date().toISOString().slice(0, 10),
      start_time: body.start_time || null, end_time: body.end_time || null, hours_worked: hours, hourly_rate: rate,
      total_cost: Number((hours * rate).toFixed(2)), notes: body.notes || null,
    }).select().single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) { return apiServerError("timesheets.post", error) }
}
