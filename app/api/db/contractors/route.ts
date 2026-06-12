import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status    = searchParams.get("status")
    const specialty = searchParams.get("specialty")
    const supabase  = createServerClient()

    let q = supabase.from("mms_contractors").select("*").order("name")
    if (status)    q = q.eq("status", status)
    if (specialty) q = q.eq("specialty", specialty)

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
    const { data, error } = await supabase
      .from("mms_contractors")
      .insert({ ...body, status: body.status ?? "active" })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
