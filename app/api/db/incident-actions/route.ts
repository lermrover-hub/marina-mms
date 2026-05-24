import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const incidentId = searchParams.get("incident_id")

    let query = supabase
      .from("mms_incident_actions")
      .select("*")
      .order("created_at", { ascending: true })

    if (incidentId) query = query.eq("incident_id", incidentId)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from("mms_incident_actions")
      .insert({
        incident_id:  body.incident_id,
        action:       body.action,
        assigned_to:  body.assigned_to ?? null,
        due_date:     body.due_date ?? null,
        status:       body.status ?? "TODO",
        notes:        body.notes ?? null,
        created_by:   body.created_by ?? null,
        created_at:   now,
        updated_at:   now,
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
