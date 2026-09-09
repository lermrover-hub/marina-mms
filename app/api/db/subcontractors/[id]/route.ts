import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createServerClient()
    const { data, error } = await supabase.from("mms_subcontractors").select("*").eq("id", id).single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, ...rest } = body
    const updates = { ...rest, ...(name ? { name: String(name).trim() } : {}), updated_at: new Date().toISOString() }
    const supabase = createServerClient()
    const { data, error } = await supabase.from("mms_subcontractors").update(updates).eq("id", id).select().single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
