import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const supabase = createServerClient()
    const { data: current, error: currentError } = await supabase
      .from("mms_subcontractor_quotes")
      .select("*")
      .eq("id", id)
      .single()
    if (currentError) throw currentError

    const status = String(body.status ?? "").toUpperCase()
    if (!["RECEIVED", "SHORTLISTED", "SELECTED", "COST_APPROVED", "PO_ISSUED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid subcontractor quote status." }, { status: 400 })
    }
    const now = new Date().toISOString()
    if (status === "SELECTED") {
      const { error: rejectError } = await supabase
        .from("mms_subcontractor_quotes")
        .update({ status: "REJECTED", updated_at: now })
        .eq("service_request_id", current.service_request_id)
        .neq("id", id)
        .in("status", ["RECEIVED", "SHORTLISTED", "SELECTED"])
      if (rejectError) throw rejectError
    }
    const updates: Record<string, unknown> = { status, updated_at: now }
    if (status === "SELECTED") updates.selected_at = now
    if (status === "COST_APPROVED") {
      const approvedBy = String(body.cost_approved_by ?? "").trim()
      if (current.status !== "SELECTED") {
        return NextResponse.json({ error: "Select the supplier quote before approving its cost." }, { status: 409 })
      }
      if (!approvedBy) {
        return NextResponse.json({ error: "Cost approver name is required." }, { status: 400 })
      }
      updates.cost_approved_by = approvedBy
      updates.cost_approved_at = now
    }
    if (status === "PO_ISSUED") {
      const poNumber = String(body.contractor_po_number ?? "").trim()
      if (current.status !== "COST_APPROVED") {
        return NextResponse.json({ error: "Approve contractor cost before issuing a purchase order." }, { status: 409 })
      }
      if (!poNumber) {
        return NextResponse.json({ error: "Contractor PO number is required." }, { status: 400 })
      }
      updates.contractor_po_number = poNumber
      updates.contractor_po_issued_at = now
    }
    const { data, error } = await supabase
      .from("mms_subcontractor_quotes")
      .update(updates)
      .eq("id", id)
      .select()
      .single()
    if (error) throw error

    if (["SELECTED", "COST_APPROVED", "PO_ISSUED"].includes(status)) {
      const procurementStatus =
        status === "SELECTED" ? "CONTRACTOR_SELECTED" :
        status === "COST_APPROVED" ? "COST_APPROVED" : "PO_ISSUED"
      await supabase
        .from("mms_service_requests")
        .update({ procurement_status: procurementStatus, updated_at: now })
        .eq("id", current.service_request_id)
      if (current.work_order_id) {
        await supabase
          .from("mms_work_orders")
          .update({
            subcontractor_id: current.subcontractor_id,
            subcontractor_quote_id: current.id,
            contractor_name: current.subcontractor_name,
            total_contractor_cost: current.total_amount,
            updated_at: now,
          })
          .eq("id", current.work_order_id)
      }
    }
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
