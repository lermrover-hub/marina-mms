import { NextResponse } from "next/server"
import { getWorkOrders } from "@/lib/db"
import { createServerClient } from "@/lib/supabase-server"
import { PORTAL_READ_ROLES, requireApiActor } from "@/lib/api-auth"
import { readLegacyWorkflowMetadata } from "@/lib/service-workflow-compat"
import { WORK_ORDER_CREATE_ROLES } from "@/lib/workflow-access"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const access = await requireApiActor(PORTAL_READ_ROLES)
    if ("error" in access) return access.error
    const data = await getWorkOrders()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireApiActor(WORK_ORDER_CREATE_ROLES)
    if ("error" in access) return access.error
    const body = await req.json()
    const supabase = createServerClient({ requireServiceRole: true })
    const reference = String(body.reference ?? body.wo_number ?? `WO-${Date.now().toString().slice(-6)}`).trim()
    if (!reference) {
      return NextResponse.json({ error: "Work order reference is required" }, { status: 400 })
    }
    let serviceRequestId = String(body.service_request_id ?? body.sr_id ?? "").trim()
    if (!serviceRequestId && body.quotation_id) {
      const { data: linkedQuotation, error: quotationError } = await supabase
        .from("mms_quotations").select("sr_id").eq("id", body.quotation_id).single()
      if (quotationError) return NextResponse.json({ error: quotationError.message }, { status: 404 })
      serviceRequestId = String(linkedQuotation?.sr_id ?? "").trim()
    }
    if (!serviceRequestId) {
      return NextResponse.json({ error: "Create a Service Request and clear its payment gate before creating a Work Order." }, { status: 409 })
    }
    if (serviceRequestId) {
      const { data: serviceRequest, error: requestError } = await supabase
        .from("mms_service_requests")
        .select("*")
        .eq("id", serviceRequestId)
        .single()
      if (requestError) return NextResponse.json({ error: requestError.message }, { status: 404 })
      const legacy = readLegacyWorkflowMetadata(serviceRequest.notes)
      const paymentMode = serviceRequest.payment_mode ?? legacy.payment_mode
      const paymentGateStatus = serviceRequest.payment_gate_status ?? legacy.payment_gate_status
      const serviceOrderConfirmedAt = serviceRequest.service_order_confirmed_at ?? legacy.service_order_confirmed_at
      if (serviceRequest.status !== "SERVICE_ORDER_CONFIRMED" || !serviceOrderConfirmedAt) {
        return NextResponse.json({
          error: `Confirm the Service Order after payment clearance before creating a Work Order (${paymentMode}: ${paymentGateStatus}).`,
        }, { status: 409 })
      }
      body.service_request_id = serviceRequestId
      body.sr_id = serviceRequestId
    }
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from("mms_work_orders")
      .insert({
        ...body,
        reference,
        // Staging retains the legacy NOT NULL wo_number column; production uses reference.
        // Persist both to keep one API contract across the two schemas.
        wo_number: String(body.wo_number ?? reference),
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
