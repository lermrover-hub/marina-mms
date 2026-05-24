import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get("customer_id")
    const boatId     = searchParams.get("boat_id")
    const status     = searchParams.get("status")
    const date       = searchParams.get("date")

    let query = supabase.from("mms_ramp_bookings").select("*").order("requested_date", { ascending: false })
    if (customerId) query = query.eq("customer_id", customerId)
    if (boatId)     query = query.eq("boat_id", boatId)
    if (status)     query = query.eq("status", status)
    if (date)       query = query.eq("requested_date", date)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from("mms_ramp_bookings")
      .insert({ ...body, created_at: now, updated_at: now })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
