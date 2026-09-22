import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { customerScope, PORTAL_READ_ROLES, requireApiActor, SERVICE_REQUEST_WRITE_ROLES } from "@/lib/api-auth"
import { calculateDepositRequired, defaultPaymentMode, deriveCreditSchedule, minimumQuotationApprover, validateDiscount } from "@/lib/service-workflow"
import { isMissingWorkflowSchema, writeLegacyWorkflowMetadata } from "@/lib/service-workflow-compat"
import { deriveRampServicePlan } from "@/lib/ramp-booking-service"
import { maxOperationalDiscountForRole } from "@/lib/workflow-access"

export const dynamic = "force-dynamic"

type RequestItem = { pricing_code?: string; description?: string; service_group?: string; operator_type?: string; qty?: number; unit?: string; unit_price?: number; direct_cost?: number; markup_pct?: number; discount_pct?: number }

export async function GET(req: Request) {
  try {
    const access = await requireApiActor(PORTAL_READ_ROLES)
    if ("error" in access) return access.error
    const { searchParams } = new URL(req.url)
    const scope = customerScope(access.actor, searchParams.get("customer_id"))
    if ("error" in scope) return scope.error
    const supabase = createServerClient()
    let query = supabase.from("mms_service_requests").select("*").order("created_at", { ascending: false })
    if (scope.customerId) query = query.eq("customer_id", scope.customerId)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const access = await requireApiActor(SERVICE_REQUEST_WRITE_ROLES)
  if ("error" in access) return access.error
  const supabase = createServerClient({ requireServiceRole: true })
  let createdServiceRequestId: string | null = null
  let createdQuotationId: string | null = null
  try {
    const body = await req.json()
    const items: RequestItem[] = Array.isArray(body.items) ? body.items : []
    if (!body.customer_id || !body.boat_id) return NextResponse.json({ error: "Customer and boat are required." }, { status: 400 })
    if (!["RAMP_SERVICE", "SERVICE_TYPE"].includes(body.request_type)) return NextResponse.json({ error: "Select Ramp Service or Service Type." }, { status: 400 })
    if (!items.length) return NextResponse.json({ error: "Add at least one service from the rate card." }, { status: 400 })
    if (body.request_type === "RAMP_SERVICE") {
      if (!body.confirmed_haul_out_date || !body.ramp_operation_plan) return NextResponse.json({ error: "Confirmed haul-out date and ramp plan are required." }, { status: 400 })
      if (body.ramp_operation_plan === "HAUL_OUT_AND_LAUNCH_CONFIRMED" && !body.confirmed_launch_date) return NextResponse.json({ error: "Confirmed launch date is required for this ramp plan." }, { status: 400 })
    }

    const pricingCodes = [...new Set(items.map((item) => String(item.pricing_code ?? "").trim()).filter(Boolean))]
    const { data: prices, error: pricingError } = pricingCodes.length
      ? await supabase.from("pricing_master").select("id,code,service_name_en,unit,rate_thb,full_rate_thb,direct_cost_thb,revenue_gl_code,cost_gl_code,pnl_category,cost_pnl_category,source_version,effective_date,updated_at").in("code", pricingCodes).eq("is_active", true)
      : { data: [], error: null }
    if (pricingError) throw pricingError
    const priceByCode = new Map((prices ?? []).map((price) => [price.code, price]))
    const unknownCodes = pricingCodes.filter((code) => !priceByCode.has(code))
    if (unknownCodes.length) return NextResponse.json({ error: `Unknown or inactive rate-card code: ${unknownCodes.join(", ")}` }, { status: 400 })

    const normalizedItems = items.map((item, index) => {
      const operatorType = String(item.operator_type ?? body.operator_type ?? "OCEAN_ROVER")
      const price = priceByCode.get(String(item.pricing_code ?? ""))
      const qty = Number(item.qty ?? 1)
      const directCost = Number(item.direct_cost ?? (price?.direct_cost_thb ?? 0))
      const markupPct = Number(item.markup_pct ?? body.markup_pct ?? 0)
      const discountPct = Number(item.discount_pct ?? 0)
      const maximumDiscount = maxOperationalDiscountForRole(access.actor.role)
      if (discountPct > maximumDiscount) throw new Error(`Line ${index + 1}: ${access.actor.role} may enter at most ${maximumDiscount}% discount.`)
      const basePrice = operatorType === "OCEAN_ROVER_SUBCONTRACTOR" ? directCost * (1 + markupPct / 100) : Number(price?.rate_thb ?? item.unit_price ?? 0)
      const validationError = validateDiscount(operatorType, discountPct, basePrice)
      if (validationError) throw new Error(`Line ${index + 1}: ${validationError}`)
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(basePrice) || basePrice < 0) throw new Error(`Line ${index + 1}: invalid quantity or price.`)
      return { pricing_master_id: price?.id ?? null, pricing_code: price?.code ?? null, description: String(item.description ?? price?.service_name_en ?? "Service"), service_group: String(item.service_group ?? body.service_type ?? "SERVICE"), operator_type: operatorType, qty, unit: String(item.unit ?? price?.unit ?? "item"), unit_price: Math.round(basePrice * 100) / 100, direct_cost: Math.max(0, directCost), markup_pct: Math.max(0, markupPct), discount_pct: discountPct, insurance_required: operatorType === "BOAT_OWNER_CONTRACTOR", sort_order: index + 1, price }
    })

    const operatorType = String(body.operator_type ?? "OCEAN_ROVER")
    const serviceType = String(body.service_type ?? (body.request_type === "RAMP_SERVICE" ? "YARD_SERVICE" : "STORAGE"))
    const paymentMode = String(body.payment_mode ?? defaultPaymentMode(serviceType, operatorType))
    const schedule = paymentMode === "CREDIT" && body.confirmed_haul_out_date ? deriveCreditSchedule(body.confirmed_haul_out_date, body.confirmed_launch_date, Boolean(body.good_credit_customer)) : null
    const storagePlan = serviceType === "STORAGE" && body.storage_period === "MONTHLY" && body.confirmed_haul_out_date
      ? deriveRampServicePlan("BOAT_STORAGE", "STORAGE_MONTHLY", body.confirmed_haul_out_date)
      : null
    const now = new Date().toISOString()
    const visibleNotes = [body.location ? `Location: ${body.location}` : null, body.notes ?? null].filter(Boolean).join("\n") || null
    const contractorCost = normalizedItems.reduce((sum, item) => sum + item.qty * item.direct_cost, 0)
    const workflowMetadata = {
      request_type: body.request_type,
      ramp_operation_plan: body.ramp_operation_plan ?? null,
      confirmed_haul_out_date: body.confirmed_haul_out_date ?? null,
      confirmed_launch_date: body.confirmed_launch_date ?? null,
      service_type: serviceType,
      storage_period: serviceType === "STORAGE" ? String(body.storage_period ?? "DAILY") : null,
      operator_type: operatorType,
      insurance_status: operatorType === "BOAT_OWNER_CONTRACTOR" ? "REQUESTED" : "NOT_REQUIRED",
      subcontractor_trade: body.subcontractor_trade ?? null,
      contractor_cost: contractorCost,
      markup_pct: Number(body.markup_pct ?? 0),
      payment_mode: paymentMode,
      payment_gate_status: "AWAITING_PAYMENT",
      quotation_id: null,
      service_order_confirmed_at: null,
    }
    const baseRequest = {
      reference: body.reference ?? `SR-${Date.now().toString().slice(-6)}`, customer_id: body.customer_id, customer_name: body.customer_name ?? null, boat_id: body.boat_id, boat_name: body.boat_name ?? null,
      category: body.request_type === "RAMP_SERVICE" ? "Ramp Service" : serviceType === "STORAGE" ? "Storage" : "Yard Service", title: body.title ?? "Service Request", description: body.description ?? null, priority: body.priority ?? "MEDIUM", status: "QUOTATION_DRAFT",
      requested_date: body.requested_date ?? body.confirmed_haul_out_date ?? null, notes: visibleNotes,
      execution_type: operatorType === "OCEAN_ROVER" ? "INTERNAL" : operatorType === "OCEAN_ROVER_SUBCONTRACTOR" ? "SUBCONTRACTOR" : "MIXED", subcontractor_required: operatorType !== "OCEAN_ROVER", procurement_status: operatorType === "OCEAN_ROVER_SUBCONTRACTOR" ? "NEEDS_SOURCING" : "NOT_REQUIRED",
      created_at: now, updated_at: now,
    }
    const firstRequest = await supabase.from("mms_service_requests").insert({
      ...baseRequest,
      request_type: body.request_type, ramp_operation_plan: body.ramp_operation_plan ?? null, confirmed_haul_out_date: body.confirmed_haul_out_date ?? null, confirmed_launch_date: body.confirmed_launch_date ?? null, service_type: serviceType, operator_type: operatorType,
      storage_period: serviceType === "STORAGE" ? String(body.storage_period ?? "DAILY") : null,
      insurance_status: workflowMetadata.insurance_status, subcontractor_trade: body.subcontractor_trade ?? null, contractor_cost: contractorCost, markup_pct: Number(body.markup_pct ?? 0), payment_mode: paymentMode, payment_gate_status: "AWAITING_PAYMENT",
    }).select().single()
    let legacySchema = false
    let serviceRequest = firstRequest.data
    if (firstRequest.error && isMissingWorkflowSchema(firstRequest.error)) {
      legacySchema = true
      const fallback = await supabase.from("mms_service_requests").insert({ ...baseRequest, notes: writeLegacyWorkflowMetadata(visibleNotes, workflowMetadata) }).select().single()
      if (fallback.error) throw fallback.error
      serviceRequest = fallback.data
    } else if (firstRequest.error) throw firstRequest.error
    if (!serviceRequest) throw new Error("Service Request insert returned no row")
    createdServiceRequestId = serviceRequest.id

    const requestItemRows = normalizedItems.map((item) => ({
      service_request_id: serviceRequest.id,
      pricing_master_id: item.pricing_master_id,
      pricing_code: item.pricing_code,
      description: item.description,
      service_group: item.service_group,
      operator_type: item.operator_type,
      qty: item.qty,
      unit: item.unit,
      unit_price: item.unit_price,
      direct_cost: item.direct_cost,
      markup_pct: item.markup_pct,
      discount_pct: item.discount_pct,
      insurance_required: item.insurance_required,
      sort_order: item.sort_order,
    }))
    if (!legacySchema) {
      const { error: itemError } = await supabase.from("mms_service_request_items").insert(requestItemRows)
      if (itemError) throw itemError
    }

    const grossSubtotal = normalizedItems.reduce((sum, item) => sum + item.qty * item.unit_price, 0)
    const discountAmount = normalizedItems.reduce((sum, item) => sum + item.qty * item.unit_price * item.discount_pct / 100, 0)
    const netSubtotal = grossSubtotal - discountAmount
    const vatAmount = Math.round(netSubtotal * 0.07)
    const totalAmount = netSubtotal + vatAmount
    const maxDiscountPct = Math.max(...normalizedItems.map((item) => item.discount_pct), 0)
    const hasNoChargeLine = normalizedItems.some((item) => item.unit_price === 0)
    const committedCost = contractorCost
    const depositPct = paymentMode === "DEPOSIT" ? 50 : paymentMode === "FULL_PREPAYMENT" ? 100 : 0
    const depositAmount = calculateDepositRequired(totalAmount, committedCost, depositPct)
    const baseQuotation = {
      quote_number: `DRAFT-${Date.now()}`, customer_id: serviceRequest.customer_id, customer_name: serviceRequest.customer_name, boat_id: serviceRequest.boat_id, boat_name: serviceRequest.boat_name, sr_id: serviceRequest.id, title: serviceRequest.title,
      execution_type: serviceRequest.execution_type, contractor_cost_estimate: committedCost, contractor_markup_pct: Number(body.markup_pct ?? 0), status: "DRAFT",
      subtotal: grossSubtotal, discount: discountAmount, vat_amount: vatAmount, total_amount: totalAmount, deposit_amount: depositAmount, valid_until: body.valid_until ?? null,
      notes: `Auto-generated from ${serviceRequest.reference}. Review before Submit for Approval.`, created_at: now, updated_at: now,
    }
    const firstQuotation = await supabase.from("mms_quotations").insert({ ...baseQuotation, internal_approval_status: "NOT_SUBMITTED", required_approver_role: minimumQuotationApprover(maxDiscountPct, hasNoChargeLine), max_discount_pct: maxDiscountPct, has_no_charge_line: hasNoChargeLine, payment_mode: paymentMode }).select().single()
    let quotation = firstQuotation.data
    if (firstQuotation.error && isMissingWorkflowSchema(firstQuotation.error)) {
      const fallback = await supabase.from("mms_quotations").insert(baseQuotation).select().single()
      if (fallback.error) throw fallback.error
      quotation = fallback.data
    } else if (firstQuotation.error) throw firstQuotation.error
    if (!quotation) throw new Error("Quotation insert returned no row")
    createdQuotationId = quotation.id

    const quotationRows = normalizedItems.map((item, index) => ({ quotation_id: quotation.id, description: item.description, qty: item.qty, unit: item.unit, unit_price: item.unit_price, discount_pct: item.discount_pct, taxable: true, pricing_master_id: item.pricing_master_id, pricing_code: item.pricing_code, full_rate_snapshot_thb: item.price?.full_rate_thb ?? item.unit_price, current_rate_snapshot_thb: item.price?.rate_thb ?? item.unit_price, direct_cost_snapshot_thb: item.direct_cost, revenue_gl_code: item.price?.revenue_gl_code ?? null, cost_gl_code: item.price?.cost_gl_code ?? null, pnl_category: item.price?.pnl_category ?? null, cost_pnl_category: item.price?.cost_pnl_category ?? null, pricing_source_version: item.price?.source_version ?? null, pricing_effective_date: item.price?.effective_date ?? null, pricing_updated_at: item.price?.updated_at ?? null, sort_order: index + 1 }))
    const firstQuoteItems = await supabase.from("mms_quotation_items").insert(quotationRows)
    if (firstQuoteItems.error && isMissingWorkflowSchema(firstQuoteItems.error)) {
      const basicRows = normalizedItems.map((item, index) => ({ quotation_id: quotation.id, description: item.description, qty: item.qty, unit: item.unit, unit_price: item.unit_price, discount_pct: item.discount_pct, taxable: true, sort_order: index + 1 }))
      const fallbackItems = await supabase.from("mms_quotation_items").insert(basicRows)
      if (fallbackItems.error) throw fallbackItems.error
    } else if (firstQuoteItems.error) throw firstQuoteItems.error

    const nextReminderDate = schedule?.firstReminderDate ?? storagePlan?.next_billing_date ?? null
    const paymentPlanPayload = { service_request_id: serviceRequest.id, quotation_id: quotation.id, customer_id: serviceRequest.customer_id, boat_id: serviceRequest.boat_id, payment_mode: paymentMode, status: "AWAITING_PAYMENT", total_amount: totalAmount, deposit_pct: depositPct, deposit_required_amount: depositAmount, committed_cost_amount: committedCost, yard_start_date: body.confirmed_haul_out_date ?? null, launch_date: body.confirmed_launch_date ?? null, first_cycle_due_date: schedule?.firstCycleDueDate ?? null, next_reminder_at: nextReminderDate ? `${nextReminderDate}T01:00:00.000Z` : null, good_credit_customer: Boolean(body.good_credit_customer), post_launch_due_date: schedule?.finalDueDate ?? null, created_at: now, updated_at: now }
    let paymentPlan: Record<string, unknown> = paymentPlanPayload
    if (!legacySchema) {
      const paymentResult = await supabase.from("mms_service_payment_plans").insert(paymentPlanPayload).select().single()
      if (paymentResult.error) throw paymentResult.error
      paymentPlan = paymentResult.data
      const { error: linkError } = await supabase.from("mms_service_requests").update({ quotation_id: quotation.id, updated_at: now }).eq("id", serviceRequest.id)
      if (linkError) throw linkError
    } else {
      const metadata = { ...workflowMetadata, quotation_id: quotation.id, payment_plan: paymentPlanPayload }
      const { error: linkError } = await supabase.from("mms_service_requests").update({ notes: writeLegacyWorkflowMetadata(visibleNotes, metadata), updated_at: now }).eq("id", serviceRequest.id)
      if (linkError) throw linkError
    }
    return NextResponse.json({ ...serviceRequest, quotation_id: quotation.id, payment_plan: paymentPlan }, { status: 201 })
  } catch (e) {
    if (createdServiceRequestId) {
      await supabase.from("mms_service_payment_plans").delete().eq("service_request_id", createdServiceRequestId)
    }
    if (createdQuotationId) {
      await supabase.from("mms_quotation_items").delete().eq("quotation_id", createdQuotationId)
      await supabase.from("mms_quotations").delete().eq("id", createdQuotationId)
    }
    if (createdServiceRequestId) {
      await supabase.from("mms_service_request_items").delete().eq("service_request_id", createdServiceRequestId)
      await supabase.from("mms_service_requests").delete().eq("id", createdServiceRequestId)
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
