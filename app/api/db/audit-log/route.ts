import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const entityType = searchParams.get("entity_type")
    const userName   = searchParams.get("user_name")
    const action     = searchParams.get("action")
    const supabase   = createServerClient()

    let q = supabase.from("mms_audit_log").select("*").order("created_at", { ascending: false }).limit(300)
    if (entityType) q = q.eq("entity_type", entityType)
    if (userName)   q = q.ilike("user_name", `%${userName}%`)
    if (action)     q = q.eq("action", action)

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
      .from("mms_audit_log")
      .insert(body)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
