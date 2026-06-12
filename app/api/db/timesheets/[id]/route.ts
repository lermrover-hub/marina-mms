import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body     = await req.json()
    const supabase = createServerClient()

    const hours_worked = body.hours_worked != null ? Number(body.hours_worked) : undefined
    const hourly_rate  = body.hourly_rate  != null ? Number(body.hourly_rate)  : undefined
    const update: Record<string, unknown> = { ...body, updated_at: new Date().toISOString() }
    if (hours_worked !== undefined && hourly_rate !== undefined) {
      update.total_cost = parseFloat((hours_worked * hourly_rate).toFixed(2))
    }

    const { data, error } = await supabase
      .from("mms_timesheets")
      .update(update)
      .eq("id", id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServerClient()
    await supabase.from("mms_timesheets").delete().eq("id", id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
