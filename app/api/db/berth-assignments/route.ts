import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

const supabase = createServerClient()

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const from   = searchParams.get("from")
    const to     = searchParams.get("to")
    const berthId = searchParams.get("berth_id")

    let query = supabase
      .from("mms_berth_assignments")
      .select("*")
      .neq("status", "CANCELLED")
      .order("start_date")

    // Date range: fetch assignments that overlap [from, to]
    if (from) query = query.or(`end_date.gte.${from},end_date.is.null`)
    if (to)   query = query.lte("start_date", to)
    if (berthId) query = query.eq("berth_id", berthId)

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
    const { data, error } = await supabase
      .from("mms_berth_assignments")
      .insert(body)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const body = await req.json()
    const { data, error } = await supabase
      .from("mms_berth_assignments")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const { error } = await supabase
      .from("mms_berth_assignments")
      .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
      .eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
