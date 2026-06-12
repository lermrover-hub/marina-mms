import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const workOrderId = searchParams.get("work_order_id")
    const staffName   = searchParams.get("staff_name")
    const supabase    = createServerClient()

    let q = supabase.from("mms_timesheets").select("*").order("date", { ascending: false })
    if (workOrderId) q = q.eq("work_order_id", workOrderId)
    if (staffName)   q = q.ilike("staff_name", `%${staffName}%`)

    const { data, error } = await q
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body     = await req.json()
    const supabase = createServerClient()

    const hours_worked = Number(body.hours_worked) || 0
    const hourly_rate  = Number(body.hourly_rate)  || 0
    const total_cost   = parseFloat((hours_worked * hourly_rate).toFixed(2))

    const { data, error } = await supabase
      .from("mms_timesheets")
      .insert({ ...body, hours_worked, hourly_rate, total_cost })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
