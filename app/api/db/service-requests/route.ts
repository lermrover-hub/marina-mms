import { NextResponse } from "next/server"
import { getServiceRequests } from "@/lib/db"
import { createServerClient } from "@/lib/supabase-server"

const supabase = createServerClient()

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const data = await getServiceRequests()
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
      .from("mms_service_requests")
      .insert({
        reference: body.reference,
        customer_id: body.customer_id ?? null,
        customer_name: body.customer_name ?? null,
        boat_id: body.boat_id ?? null,
        boat_name: body.boat_name ?? null,
        category: body.category,
        title: body.title,
        description: body.description ?? null,
        priority: body.priority === "NORMAL" ? "MEDIUM" : (body.priority ?? "MEDIUM"),
        status: body.status ?? "NEW_REQUEST",
        assigned_to: body.assigned_to ?? null,
        requested_date: body.requested_date ?? null,
        scheduled_date: body.scheduled_date ?? null,
        completed_date: body.completed_date ?? null,
        notes: [
          body.location ? `Location: ${body.location}` : null,
          body.requires_inspection != null ? `Requires inspection: ${body.requires_inspection ? "yes" : "no"}` : null,
          body.estimated_budget ? `Estimated budget: ${body.estimated_budget}` : null,
          body.deposit_pct ? `Deposit %: ${body.deposit_pct}` : null,
          body.labor_rate ? `Labor rate: ${body.labor_rate}` : null,
          body.contractor_markup ? `Contractor markup %: ${body.contractor_markup}` : null,
          body.notes ?? null,
        ].filter(Boolean).join("\n") || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
