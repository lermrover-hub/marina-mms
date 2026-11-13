import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const serviceRequestId = searchParams.get("service_request_id")
    const workOrderId = searchParams.get("work_order_id")
    const supabase = createServerClient()
    let query = supabase.from("mms_subcontractor_quotes").select("*").order("total_amount", { ascending: true })
    if (serviceRequestId) query = query.eq("service_request_id", serviceRequestId)
    if (workOrderId) query = query.eq("work_order_id", workOrderId)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const serviceRequestId = String(body.service_request_id ?? "").trim()
    const subcontractorName = String(body.subcontractor_name ?? "").trim()
    const scope = String(body.scope ?? "").trim()
    const quotedAmount = Number(body.quoted_amount ?? 0)
    const vatAmount = Number(body.vat_amount ?? 0)
    if (!serviceRequestId || !subcontractorName || !scope) {
      return NextResponse.json({ error: "Service request, subcontractor, and scope are required." }, { status: 400 })
    }
    if (!Number.isFinite(quotedAmount) || quotedAmount < 0 || !Number.isFinite(vatAmount) || vatAmount < 0) {
      return NextResponse.json({ error: "Quote amounts must be non-negative numbers." }, { status: 400 })
    }
    const now = new Date().toISOString()
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("mms_subcontractor_quotes")
      .insert({
        quote_reference: body.quote_reference ?? `SCQ-${Date.now()}`,
        service_request_id: serviceRequestId,
        work_order_id: body.work_order_id ?? null,
        subcontractor_id: body.subcontractor_id ?? null,
        subcontractor_name: subcontractorName,
        scope,
        quoted_amount: quotedAmount,
        vat_amount: vatAmount,
        total_amount: Number(body.total_amount ?? quotedAmount + vatAmount),
        lead_time_days: body.lead_time_days ?? null,
        warranty_months: body.warranty_months ?? null,
        payment_terms: body.payment_terms ?? null,
        valid_until: body.valid_until ?? null,
        status: "RECEIVED",
        notes: body.notes ?? null,
        received_at: body.received_at ?? now,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()
    if (error) throw error
    await supabase
      .from("mms_service_requests")
      .update({ procurement_status: "QUOTES_RECEIVED", updated_at: now })
      .eq("id", serviceRequestId)
      .in("execution_type", ["SUBCONTRACTOR", "MIXED"])
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
