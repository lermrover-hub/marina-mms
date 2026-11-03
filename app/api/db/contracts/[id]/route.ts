import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

const supabase = createServerClient()

export const dynamic = "force-dynamic"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { data, error } = await supabase
      .from("mms_contracts")
      .select("*")
      .eq("id", id)
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    if (String(body.contract_type ?? "") === "WET_BERTH") {
      return NextResponse.json({ error: "Wet Berth is unavailable until construction is complete." }, { status: 409 })
    }
    if (body.billing_scenario == null && body.contract_type === "DRY_STORAGE") body.billing_scenario = "SPACE_LEASE"
    if (body.reminder_lead_days == null) body.reminder_lead_days = 7
    const { data, error } = await supabase
      .from("mms_contracts")
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

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { error } = await supabase
      .from("mms_contracts")
      .update({ status: "TERMINATED", updated_at: new Date().toISOString() })
      .eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
