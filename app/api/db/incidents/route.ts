import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

const supabase = createServerClient()

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get("customer_id")
    const boatId     = searchParams.get("boat_id")
    const severity   = searchParams.get("severity")
    const status     = searchParams.get("status")

    let query = supabase.from("mms_incidents").select("*").order("incident_date", { ascending: false })
    if (customerId) query = query.eq("customer_id", customerId)
    if (boatId)     query = query.eq("boat_id", boatId)
    if (severity)   query = query.eq("severity", severity)
    if (status)     query = query.eq("status", status)

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
      .from("mms_incidents")
      .insert({ ...body, created_at: now, updated_at: now })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
