import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { concealOtherCustomer, FINANCE_WRITE_ROLES, PORTAL_READ_ROLES, requireApiActor, SERVICE_REQUEST_WRITE_ROLES } from "@/lib/api-auth"
import { canConfirmServiceOrder } from "@/lib/service-workflow"
import { isMissingWorkflowSchema, readLegacyWorkflowMetadata, writeLegacyWorkflowMetadata } from "@/lib/service-workflow-compat"
import { INSURANCE_VERIFY_ROLES, SERVICE_ORDER_CONFIRM_ROLES, roleAllowed } from "@/lib/workflow-access"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireApiActor(PORTAL_READ_ROLES)
    if ("error" in access) return access.error
    const { id } = await params
    const supabase = createServerClient()
    const { data, error } = await supabase.from("mms_service_requests").select("*").eq("id", id).single()
    if (error) throw error
    const concealed = concealOtherCustomer(access.actor, data.customer_id)
    if (concealed) return concealed
    const legacy = readLegacyWorkflowMetadata(data.notes)

    let items: Record<string, unknown>[] = []
    const itemResult = await supabase.from("mms_service_request_items").select("*").eq("service_request_id", id).order("sort_order")
    if (itemResult.error && !isMissingWorkflowSchema(itemResult.error)) throw itemResult.error
    if (!itemResult.error) items = itemResult.data ?? []
    const quotationId = data.quotation_id ?? legacy.quotation_id ?? null
    if (!items.length && quotationId) {
      const quoteItems = await supabase.from("mms_quotation_items").select("*").eq("quotation_id", quotationId).order("sort_order")
      if (quoteItems.error) throw quoteItems.error
      items = (quoteItems.data ?? []).map((item) => ({ ...item, operator_type: legacy.operator_type ?? data.execution_type, direct_cost: item.direct_cost_snapshot_thb ?? 0 }))
    }

    let paymentPlan: Record<string, unknown> | null = null
    const planResult = await supabase.from("mms_service_payment_plans").select("*").eq("service_request_id", id).maybeSingle()
    if (planResult.error && !isMissingWorkflowSchema(planResult.error)) throw planResult.error
    if (!planResult.error) paymentPlan = planResult.data
    if (!paymentPlan && legacy.payment_plan) paymentPlan = legacy.payment_plan
    return NextResponse.json({ ...data, ...legacy, quotation_id: quotationId, items, payment_plan: paymentPlan })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireApiActor([...SERVICE_REQUEST_WRITE_ROLES, ...FINANCE_WRITE_ROLES])
    if ("error" in access) return access.error
    const { id } = await params
    const body = await req.json()
    const supabase = createServerClient({ requireServiceRole: true })
    const { data: current, error: currentError } = await supabase.from("mms_service_requests").select("*").eq("id", id).single()
    if (currentError) throw currentError
    const legacy = readLegacyWorkflowMetadata(current.notes)
    const effective = { ...current, ...legacy }
    const now = new Date().toISOString()

    async function updateWorkflow(columns: Record<string, unknown>, metadata: Record<string, unknown>) {
      const result = await supabase.from("mms_service_requests").update({ ...columns, updated_at: now }).eq("id", id).select().single()
      if (!result.error) return result.data
      if (!isMissingWorkflowSchema(result.error)) throw result.error
      const nextMetadata = { ...legacy, ...metadata }
      const fallback = await supabase.from("mms_service_requests").update({ notes: writeLegacyWorkflowMetadata(current.notes, nextMetadata), ...(columns.status ? { status: columns.status } : {}), updated_at: now }).eq("id", id).select().single()
      if (fallback.error) throw fallback.error
      return { ...fallback.data, ...nextMetadata }
    }

    if (body.action === "set_payment_gate") {
      if (!FINANCE_WRITE_ROLES.includes(access.actor.role as (typeof FINANCE_WRITE_ROLES)[number])) return NextResponse.json({ error: "Only Finance, Managing Director, or Super Admin may update payment clearance." }, { status: 403 })
      const next = String(body.status ?? "")
      if (!["AWAITING_PAYMENT", "DEPOSIT_PAID", "PAID", "CREDIT_APPROVED", "OVERDUE", "CREDIT_HOLD", "CANCELLED"].includes(next)) return NextResponse.json({ error: "Invalid payment gate status." }, { status: 400 })
      if (next === "CREDIT_APPROVED" && effective.payment_mode !== "CREDIT") return NextResponse.json({ error: "Credit approval applies only to a CREDIT payment plan." }, { status: 409 })
      const planUpdate: Record<string, unknown> = { status: next, updated_at: now }
      if (next === "CREDIT_APPROVED") {
        planUpdate.credit_approved_by = access.actor.userId
        planUpdate.credit_approved_at = now
        planUpdate.credit_limit_snapshot = Number(body.credit_limit ?? 0)
        planUpdate.credit_expires_at = body.credit_expires_at ?? null
      }
      const planResult = await supabase.from("mms_service_payment_plans").update(planUpdate).eq("service_request_id", id)
      if (planResult.error && !isMissingWorkflowSchema(planResult.error)) throw planResult.error
      const legacyPlan = legacy.payment_plan ? { ...legacy.payment_plan, ...planUpdate } : null
      const data = await updateWorkflow({ payment_gate_status: next }, { payment_gate_status: next, payment_plan: legacyPlan })
      return NextResponse.json(data)
    }

    if (body.action === "verify_insurance") {
      if (!roleAllowed(access.actor.role, INSURANCE_VERIFY_ROLES)) return NextResponse.json({ error: "Manager or Chief Engineer must verify contractor insurance." }, { status: 403 })
      if (effective.operator_type !== "BOAT_OWNER_CONTRACTOR") return NextResponse.json({ error: "Insurance verification is required only for a boat-owner contractor." }, { status: 409 })
      return NextResponse.json(await updateWorkflow({ insurance_status: "VERIFIED" }, { insurance_status: "VERIFIED" }))
    }

    if (body.action === "confirm_service_order") {
      if (!roleAllowed(access.actor.role, SERVICE_ORDER_CONFIRM_ROLES)) return NextResponse.json({ error: "Operations staff must confirm the Service Order." }, { status: 403 })
      if (!canConfirmServiceOrder(effective.payment_mode, effective.payment_gate_status)) return NextResponse.json({ error: `Payment gate is not cleared (${effective.payment_mode}: ${effective.payment_gate_status}).` }, { status: 409 })
      if (effective.operator_type === "BOAT_OWNER_CONTRACTOR" && effective.insurance_status !== "VERIFIED") return NextResponse.json({ error: "Verify the boat-owner contractor insurance before confirming service." }, { status: 409 })
      return NextResponse.json(await updateWorkflow({ status: "SERVICE_ORDER_CONFIRMED", service_order_confirmed_at: now }, { service_order_confirmed_at: now }))
    }

    const allowedStatuses = ["NEW_REQUEST", "INSPECTION_REQUIRED", "QUOTATION_DRAFT", "CANCELLED", "COMPLETED"]
    if (body.action === "set_status" && allowedStatuses.includes(String(body.status))) {
      return NextResponse.json(await updateWorkflow({ status: body.status }, {}))
    }
    return NextResponse.json({ error: "Unsupported service-request action." }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
