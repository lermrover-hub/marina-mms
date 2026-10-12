import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { customerScope, PORTAL_READ_ROLES, requireApiActor, SERVICE_REQUEST_WRITE_ROLES } from "@/lib/api-auth"
import { calculateDepositRequired, defaultPaymentMode, deriveCreditSchedule, deriveRampMovementPlan, minimumQuotationApprover, validateDiscount } from "@/lib/service-workflow"
import { isMissingWorkflowSchema, writeLegacyWorkflowMetadata } from "@/lib/service-workflow-compat"
import { deriveRampServicePlan } from "@/lib/ramp-booking-service"
import { maxOperationalDiscountForRole, QUOTATION_PRICE_EDIT_ROLES, roleAllowed } from "@/lib/workflow-access"
import { classifySpeedboat, isSpeedboatType } from "@/lib/speedboat-classification"
import { lowestStoragePackage, speedboatStorageClass, storageRateCodes, validateSb4Storage, type StorageClass, type StorageMethod, type StorageSlot } from "@/lib/storage-pricing"
import { assertNoDuplicateChargeCodes, evaluateStandardRampHaulOut, storageDurationMultiplier } from "@/lib/pricing-engine"

export const dynamic = "force-dynamic"

type RequestItem = { pricing_code?: string; description?: string; service_group?: string; operator_type?: string; qty?: number; unit?: string; unit_price?: number; direct_cost?: number; markup_pct?: number; discount_pct?: number; is_open_rate?: boolean }

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
  let createdRampBookingIds: string[] = []
  try {
    const body = await req.json()
    const items: RequestItem[] = Array.isArray(body.items) ? body.items : []
    if (!body.customer_id || !body.boat_id) return NextResponse.json({ error: "Customer and boat are required." }, { status: 400 })
    if (!["RAMP_SERVICE", "SERVICE_TYPE"].includes(body.request_type)) return NextResponse.json({ error: "Select Ramp Service or Service Type." }, { status: 400 })
    let operationalContact: { id: string; full_name: string; phone: string | null; email: string | null; preferred_channel: string } | null = null
    if (body.operational_contact_id) {
      const { data: contact, error: contactError } = await supabase
        .from("mms_customer_contacts")
        .select("id,customer_id,full_name,phone,email,preferred_channel,is_active")
        .eq("id", body.operational_contact_id)
        .maybeSingle()
      if (contactError) throw contactError
      if (!contact || contact.customer_id !== body.customer_id || !contact.is_active) return NextResponse.json({ error: "Selected operational contact is not active for this customer." }, { status: 400 })
      operationalContact = contact
    }
    const movement = deriveRampMovementPlan({
      haulOut: body.haul_out === true,
      haulOutDate: body.confirmed_haul_out_date,
      towIn: body.tow_in === true,
      towInDate: body.tow_in_date,
      launch: body.launch === true,
      launchDate: body.confirmed_launch_date,
      towOut: body.tow_out === true,
      towOutDate: body.tow_out_date,
    })
    if (body.request_type === "RAMP_SERVICE" && movement.error) return NextResponse.json({ error: movement.error }, { status: 400 })

    const { data: boat, error: boatError } = await supabase
      .from("mms_boats")
      .select("id,owner_id,boat_type,loa_ft,beam_ft,draft_ft,num_engines,weight_t")
      .eq("id", body.boat_id)
      .maybeSingle()
    if (boatError) throw boatError
    if (!boat || (boat.owner_id && boat.owner_id !== body.customer_id)) return NextResponse.json({ error: "The selected boat does not belong to the selected customer." }, { status: 400 })

    const operatorType = String(body.operator_type ?? "OCEAN_ROVER")
    const requestedServiceTypes = Array.isArray(body.service_types)
      ? body.service_types.map(String).filter((value: string) => ["STORAGE", "YARD_SERVICE"].includes(value))
      : [String(body.service_type ?? (body.request_type === "RAMP_SERVICE" ? "YARD_SERVICE" : "STORAGE"))]
    const includesStorage = requestedServiceTypes.includes("STORAGE")
    const includesYardService = requestedServiceTypes.includes("YARD_SERVICE")
    const serviceType = includesYardService ? "YARD_SERVICE" : "STORAGE"
    if (!includesStorage && !includesYardService) return NextResponse.json({ error: "Select Storage, Yard Service, or both." }, { status: 400 })

    let automaticStorage: { storageClass: StorageClass; codes: string[]; days: number; slot: StorageSlot; method: StorageMethod | null; reviewWarning: string | null } | null = null
    if (includesStorage) {
      if (isSpeedboatType(boat.boat_type)) {
        let storageClass: StorageClass
        try { storageClass = speedboatStorageClass(Number(boat.loa_ft)) }
        catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 }) }
        const classification = classifySpeedboat({ loaFt: Number(boat.loa_ft), engines: boat.num_engines, weightKg: boat.weight_t == null ? null : Number(boat.weight_t) * 1000 })
        const days = Number(body.storage_days)
        if (!Number.isInteger(days) || days < 1 || days > 3650) return NextResponse.json({ error: "Storage duration must be a whole number from 1 to 3650 days." }, { status: 400 })
        const slot = storageClass === "SB4" ? String(body.storage_slot_code ?? "") as StorageSlot : "ANY_APPROVED"
        const method = storageClass === "SB4" ? String(body.storage_method ?? "") as StorageMethod : null
        if (storageClass === "SB4") {
          try { validateSb4Storage(slot, method) }
          catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 }) }
          const { data: berth, error: berthError } = await supabase.from("mms_berths").select("id,code,status,current_boat_id,max_loa_ft").eq("code", slot).maybeSingle()
          if (berthError) throw berthError
          if (!berth) return NextResponse.json({ error: `${slot} is not configured in the storage map.` }, { status: 400 })
          if (berth.max_loa_ft != null && Number(boat.loa_ft) > Number(berth.max_loa_ft)) return NextResponse.json({ error: `${slot} is not configured for a ${boat.loa_ft} ft vessel.` }, { status: 400 })
          if (berth.status !== "AVAILABLE" && berth.current_boat_id !== boat.id) return NextResponse.json({ error: `${slot} is not available for this vessel. Select another approved option or waitlist it.` }, { status: 409 })
        }
        automaticStorage = { storageClass, codes: storageRateCodes(storageClass, slot), days, slot, method, reviewWarning: classification.mismatchWarning }
      }
    }
    if (!items.length && !automaticStorage) return NextResponse.json({ error: "Add at least one service from the rate card." }, { status: 400 })

    const pricingCodes = [...new Set([...items.map((item) => String(item.pricing_code ?? "").trim()).filter(Boolean), ...(automaticStorage?.codes ?? [])])]
    const { data: prices, error: pricingError } = pricingCodes.length
      ? await supabase.from("pricing_master").select("id,code,service_name_en,unit,rate_thb,full_rate_thb,direct_cost_thb,revenue_gl_code,cost_gl_code,pnl_category,cost_pnl_category,service_group,subgroup,calc_type,quote_allowed,price_status,source_version,effective_date,updated_at").in("code", pricingCodes).eq("is_active", true)
      : { data: [], error: null }
    if (pricingError) throw pricingError
    const priceByCode = new Map((prices ?? []).map((price) => [price.code, price]))
    const unknownCodes = pricingCodes.filter((code) => !priceByCode.has(code))
    if (unknownCodes.length) return NextResponse.json({ error: `Unknown or inactive rate-card code: ${unknownCodes.join(", ")}` }, { status: 400 })
    assertNoDuplicateChargeCodes(items.filter((item) => !item.is_open_rate).map((item) => item.pricing_code))

    let normalizedItems = items.map((item, index) => {
      const price = priceByCode.get(String(item.pricing_code ?? ""))
      const isOpenRate = item.is_open_rate === true
      if (!price && !isOpenRate) throw new Error(`Line ${index + 1}: select an active rate-card item.`)
      if (isOpenRate && !roleAllowed(access.actor.role, QUOTATION_PRICE_EDIT_ROLES)) throw new Error(`Line ${index + 1}: Open Rate may be entered only by Admin, Managing Director, or Finance.`)
      if (isOpenRate && !String(item.description ?? "").trim()) throw new Error(`Line ${index + 1}: Open Rate requires a description and reason.`)
      const searchable = `${price?.code ?? ""} ${price?.service_name_en ?? ""} ${price?.subgroup ?? ""}`
      const canonicalGroup = isOpenRate
        ? String(item.service_group ?? "")
        : price?.service_group?.startsWith("1.") || price?.service_group?.startsWith("2.") || /tow|truck/i.test(searchable)
          ? "RAMP"
          : price?.service_group?.startsWith("4.") ? "STORAGE" : "YARD"
      if (!["RAMP", "STORAGE", "YARD"].includes(canonicalGroup)) throw new Error(`Line ${index + 1}: select its workflow section.`)
      const operatorType = canonicalGroup === "YARD" ? String(item.operator_type ?? body.operator_type ?? "OCEAN_ROVER") : "OCEAN_ROVER"
      if (!isOpenRate && price?.quote_allowed === "NO") throw new Error(`Line ${index + 1}: ${price.code} is reference-only and cannot be quoted.`)
      let qty = Number(item.qty ?? 1)
      const directCost = Number(isOpenRate ? item.direct_cost ?? 0 : price?.direct_cost_thb ?? 0)
      const markupPct = Number(item.markup_pct ?? body.markup_pct ?? 0)
      const discountPct = Number(item.discount_pct ?? 0)
      const maximumDiscount = maxOperationalDiscountForRole(access.actor.role)
      if (discountPct > maximumDiscount) throw new Error(`Line ${index + 1}: ${access.actor.role} may enter at most ${maximumDiscount}% discount.`)
      let basePrice = isOpenRate
        ? Number(item.unit_price ?? 0)
        : operatorType === "OCEAN_ROVER_SUBCONTRACTOR"
          ? directCost * (1 + markupPct / 100)
          : Number(price?.rate_thb ?? 0)
      if (!isOpenRate && operatorType !== "OCEAN_ROVER_SUBCONTRACTOR") {
        const method = String(price?.calc_type ?? "FLAT_QTY").toUpperCase()
        if (method === "FLAT_RATE") qty = 1
        if (method === "PER_FOOT") qty = Number(boat.loa_ft ?? 0)
        if (method === "PER_METRE") qty = Number(boat.loa_ft ?? 0) * 0.3048
        if (method === "PER_TONNE") qty = Number(boat.weight_t ?? 0)
        if (canonicalGroup === "STORAGE" && ["PER_FOOT", "PER_METRE"].includes(method)) qty *= storageDurationMultiplier(String(price?.unit ?? ""), Number(body.storage_days))
        if (method === "MANUAL_QUOTE") throw new Error(`Line ${index + 1}: ${price?.code} requires an approved manual quotation.`)
        if (method === "COST_PLUS") {
          if (directCost <= 0) throw new Error(`Line ${index + 1}: verified subcontractor cost is required.`)
          basePrice = directCost * (1 + markupPct / 100)
          qty = 1
        }
      }
      const validationError = validateDiscount(operatorType, discountPct, basePrice)
      if (validationError) throw new Error(`Line ${index + 1}: ${validationError}`)
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(basePrice) || basePrice < 0) throw new Error(`Line ${index + 1}: invalid quantity or price.`)
      return { pricing_master_id: price?.id ?? null, pricing_code: price?.code ?? null, description: String(isOpenRate ? item.description : price?.service_name_en), service_group: canonicalGroup, operator_type: operatorType, qty, unit: String(isOpenRate ? item.unit ?? "item" : price?.unit ?? "item"), unit_price: Math.round(basePrice * 100) / 100, direct_cost: Math.max(0, directCost), markup_pct: Math.max(0, markupPct), discount_pct: discountPct, insurance_required: operatorType === "BOAT_OWNER_CONTRACTOR", sort_order: index + 1, price }
    })

    if (automaticStorage) {
      const rates = automaticStorage.codes.map((code) => {
        const price = priceByCode.get(code)
        if (!price) throw new Error(`Approved v3.6 rate ${code} is not active.`)
        return { code, rateThb: Number(price.rate_thb), fullRateThb: Number(price.full_rate_thb), unit: String(price.unit) }
      })
      const packages = lowestStoragePackage(automaticStorage.days, rates)
      const storageLines = packages.map((pack, index) => {
        const price = priceByCode.get(pack.code)!
        return { pricing_master_id: price.id, pricing_code: price.code, description: String(price.service_name_en), service_group: "STORAGE", operator_type: "OCEAN_ROVER", qty: pack.qty, unit: String(price.unit), unit_price: Number(price.rate_thb), direct_cost: Number(price.direct_cost_thb ?? 0), markup_pct: 0, discount_pct: 0, insurance_required: false, sort_order: index + 1, price }
      })
      normalizedItems = [...normalizedItems.filter((item) => item.service_group !== "STORAGE"), ...storageLines]
    }
    if (body.request_type === "RAMP_SERVICE" && (body.haul_out === true || body.launch === true) && !normalizedItems.some((item) => item.service_group === "RAMP")) return NextResponse.json({ error: "Add at least one Ramp, Haul-out, or Launch rate-card item." }, { status: 400 })
    if (includesStorage && !normalizedItems.some((item) => item.service_group === "STORAGE")) return NextResponse.json({ error: "Add at least one Storage rate-card item." }, { status: 400 })
    if (includesYardService && !normalizedItems.some((item) => item.service_group === "YARD")) return NextResponse.json({ error: "Add at least one Yard / Other Service rate-card item." }, { status: 400 })
    const standardRampAssessment = evaluateStandardRampHaulOut({
      loaFt: boat.loa_ft == null ? null : Number(boat.loa_ft),
      weightT: boat.weight_t == null ? null : Number(boat.weight_t),
      beamFt: boat.beam_ft == null ? null : Number(boat.beam_ft),
      draftFt: boat.draft_ft == null ? null : Number(boat.draft_ft),
      hullConfiguration: String(boat.boat_type ?? ""),
    })
    const hasWaterMovement = body.haul_out === true || body.launch === true || normalizedItems.some((item) => /haul|launch|^RAMP_/i.test(`${item.pricing_code ?? ""} ${item.description}`))
    const rampPrices = normalizedItems.filter((item) => item.service_group === "RAMP").map((item) => item.price).filter(Boolean)
    const hasManagerReviewRampRate = rampPrices.some((price) => price?.quote_allowed === "MANAGER_REVIEW" || price?.quote_allowed === "CONTACT")
    if (hasWaterMovement && standardRampAssessment.blockers.length) {
      return NextResponse.json({
        error: `Automatic standard haul-out quotation blocked. Manual handling assessment required: ${standardRampAssessment.blockers.join(" ")}`,
        code: "MANUAL_HANDLING_ASSESSMENT_REQUIRED",
      }, { status: 422 })
    }
    const operationalApprovalRequired = Boolean(automaticStorage?.reviewWarning) || (hasWaterMovement && (standardRampAssessment.approvalRequired || hasManagerReviewRampRate))
    const paymentMode = String(body.payment_mode ?? defaultPaymentMode(serviceType, operatorType))
    const yardStartDate = movement.error ? null : movement.yardStartDate
    const exitDate = movement.error ? null : movement.exitDate
    const schedule = paymentMode === "CREDIT" && yardStartDate ? deriveCreditSchedule(yardStartDate, exitDate, Boolean(body.good_credit_customer)) : null
    const storagePlan = includesStorage && body.storage_period === "MONTHLY" && yardStartDate
      ? deriveRampServicePlan("BOAT_STORAGE", "STORAGE_MONTHLY", yardStartDate)
      : null
    const now = new Date().toISOString()
    const storageNote = automaticStorage ? `Storage v3.6: ${automaticStorage.storageClass}; ${automaticStorage.days} day(s); slot ${automaticStorage.slot}; method ${automaticStorage.method ?? "approved slot"}.${automaticStorage.reviewWarning ? ` Manager review: ${automaticStorage.reviewWarning}` : ""}` : null
    const operationalNote = operationalApprovalRequired ? `Operational approval required: ${[...standardRampAssessment.blockers, ...standardRampAssessment.checks].join(" ")}` : null
    const visibleNotes = [body.location ? `Location: ${body.location}` : null, storageNote, operationalNote, body.notes ?? null].filter(Boolean).join("\n") || null
    const contractorCost = normalizedItems.reduce((sum, item) => sum + item.qty * item.direct_cost, 0)
    const workflowMetadata = {
      request_type: body.request_type,
      ramp_operation_plan: movement.error ? null : movement.rampOperationPlan,
      confirmed_haul_out_date: body.confirmed_haul_out_date ?? null,
      confirmed_launch_date: body.confirmed_launch_date ?? null,
      tow_in_date: body.tow_in_date ?? null,
      tow_out_date: body.tow_out_date ?? null,
      service_type: serviceType,
      service_types: requestedServiceTypes,
      storage_period: includesStorage ? String(body.storage_period ?? "DAILY") : null,
      storage_days: automaticStorage?.days ?? null,
      storage_slot_code: automaticStorage?.slot ?? null,
      storage_method: automaticStorage?.method ?? null,
      operator_type: operatorType,
      insurance_status: operatorType === "BOAT_OWNER_CONTRACTOR" ? "REQUESTED" : "NOT_REQUIRED",
      subcontractor_trade: body.subcontractor_trade ?? null,
      contractor_cost: contractorCost,
      markup_pct: Number(body.markup_pct ?? 0),
      payment_mode: paymentMode,
      payment_gate_status: "AWAITING_PAYMENT",
      quotation_id: null,
      service_order_confirmed_at: null,
      operational_contact_id: operationalContact?.id ?? null,
      operational_contact_name: operationalContact?.full_name ?? null,
      operational_contact_phone: operationalContact?.phone ?? null,
      operational_contact_email: operationalContact?.email ?? null,
      operational_contact_preferred_channel: operationalContact?.preferred_channel ?? null,
    }
    const baseRequest = {
      reference: body.reference ?? `SR-${Date.now().toString().slice(-6)}`, customer_id: body.customer_id, customer_name: body.customer_name ?? null, boat_id: body.boat_id, boat_name: body.boat_name ?? null,
      category: body.request_type === "RAMP_SERVICE" ? "Ramp Service" : includesStorage && includesYardService ? "Storage + Yard Service" : includesStorage ? "Storage" : "Yard Service", title: body.title ?? "Service Request", description: body.description ?? null, priority: body.priority ?? "MEDIUM", status: "QUOTATION_DRAFT",
      requested_date: body.requested_date ?? yardStartDate ?? null, notes: visibleNotes,
      execution_type: operatorType === "OCEAN_ROVER" ? "INTERNAL" : operatorType === "OCEAN_ROVER_SUBCONTRACTOR" ? "SUBCONTRACTOR" : "MIXED", subcontractor_required: operatorType !== "OCEAN_ROVER", procurement_status: operatorType === "OCEAN_ROVER_SUBCONTRACTOR" ? "NEEDS_SOURCING" : "NOT_REQUIRED",
      created_at: now, updated_at: now,
    }
    const firstRequest = await supabase.from("mms_service_requests").insert({
      ...baseRequest,
      request_type: body.request_type, ramp_operation_plan: movement.error ? null : movement.rampOperationPlan, confirmed_haul_out_date: body.confirmed_haul_out_date ?? null, confirmed_launch_date: body.confirmed_launch_date ?? null, tow_in_date: body.tow_in_date ?? null, tow_out_date: body.tow_out_date ?? null, service_type: serviceType, operator_type: operatorType,
      storage_period: includesStorage ? String(body.storage_period ?? "DAILY") : null,
      insurance_status: workflowMetadata.insurance_status, subcontractor_trade: body.subcontractor_trade ?? null, contractor_cost: contractorCost, markup_pct: Number(body.markup_pct ?? 0), payment_mode: paymentMode, payment_gate_status: "AWAITING_PAYMENT",
      operational_contact_id: operationalContact?.id ?? null, operational_contact_name: operationalContact?.full_name ?? null,
      operational_contact_phone: operationalContact?.phone ?? null, operational_contact_email: operationalContact?.email ?? null,
      operational_contact_preferred_channel: operationalContact?.preferred_channel ?? null,
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
    const firstQuotation = await supabase.from("mms_quotations").insert({ ...baseQuotation, internal_approval_status: "NOT_SUBMITTED", required_approver_role: operationalApprovalRequired ? "GENERAL_MANAGER" : minimumQuotationApprover(maxDiscountPct, hasNoChargeLine), max_discount_pct: maxDiscountPct, has_no_charge_line: hasNoChargeLine, payment_mode: paymentMode }).select().single()
    let quotation = firstQuotation.data
    if (firstQuotation.error && isMissingWorkflowSchema(firstQuotation.error)) {
      const fallback = await supabase.from("mms_quotations").insert(baseQuotation).select().single()
      if (fallback.error) throw fallback.error
      quotation = fallback.data
    } else if (firstQuotation.error) throw firstQuotation.error
    if (!quotation) throw new Error("Quotation insert returned no row")
    createdQuotationId = quotation.id

    const rampOperations = [
      ...(body.haul_out === true ? [{ operation_type: "HAUL_OUT", requested_date: body.confirmed_haul_out_date, requested_time: null }] : []),
      ...(body.tow_in === true ? [{ operation_type: "TOW_IN", requested_date: body.tow_in_date, requested_time: null }] : []),
      ...(body.launch === true ? [{ operation_type: "LAUNCH", requested_date: body.confirmed_launch_date, requested_time: null }] : []),
      ...(body.tow_out === true ? [{ operation_type: "TOW_OUT", requested_date: body.tow_out_date, requested_time: null }] : []),
    ]
    const rampRows = rampOperations.map((operation) => ({
      ...operation,
      service_request_id: serviceRequest.id,
      quotation_id: quotation.id,
      customer_id: serviceRequest.customer_id,
      customer_name: serviceRequest.customer_name,
      boat_id: serviceRequest.boat_id,
      boat_name: serviceRequest.boat_name,
      status: "REQUESTED",
      revenue_amount: 0,
      estimated_cost_amount: 0,
      financial_status: "QUOTATION_LINKED",
      notes: `Auto-created from ${serviceRequest.reference}; pricing is held in quotation ${quotation.quote_number}.`,
      created_at: now,
      updated_at: now,
    }))
    const rampInsert = await supabase.from("mms_ramp_bookings").insert(rampRows).select("id")
    if (rampInsert.error) throw rampInsert.error
    createdRampBookingIds = (rampInsert.data ?? []).map((row) => row.id)

    const quotationRows = normalizedItems.map((item, index) => ({ quotation_id: quotation.id, description: item.description, qty: item.qty, unit: item.unit, unit_price: item.unit_price, discount_pct: item.discount_pct, taxable: true, pricing_master_id: item.pricing_master_id, pricing_code: item.pricing_code, full_rate_snapshot_thb: item.price?.full_rate_thb ?? item.unit_price, current_rate_snapshot_thb: item.price?.rate_thb ?? item.unit_price, direct_cost_snapshot_thb: item.direct_cost, revenue_gl_code: item.price?.revenue_gl_code ?? null, cost_gl_code: item.price?.cost_gl_code ?? null, pnl_category: item.price?.pnl_category ?? null, cost_pnl_category: item.price?.cost_pnl_category ?? null, pricing_source_version: item.price?.source_version ?? null, pricing_effective_date: item.price?.effective_date ?? null, pricing_updated_at: item.price?.updated_at ?? null, sort_order: index + 1 }))
    const firstQuoteItems = await supabase.from("mms_quotation_items").insert(quotationRows)
    if (firstQuoteItems.error && isMissingWorkflowSchema(firstQuoteItems.error)) {
      const basicRows = normalizedItems.map((item, index) => ({ quotation_id: quotation.id, description: item.description, qty: item.qty, unit: item.unit, unit_price: item.unit_price, discount_pct: item.discount_pct, taxable: true, sort_order: index + 1 }))
      const fallbackItems = await supabase.from("mms_quotation_items").insert(basicRows)
      if (fallbackItems.error) throw fallbackItems.error
    } else if (firstQuoteItems.error) throw firstQuoteItems.error

    const nextReminderDate = schedule?.firstReminderDate ?? storagePlan?.next_billing_date ?? null
    const paymentPlanPayload = { service_request_id: serviceRequest.id, quotation_id: quotation.id, customer_id: serviceRequest.customer_id, boat_id: serviceRequest.boat_id, payment_mode: paymentMode, status: "AWAITING_PAYMENT", total_amount: totalAmount, deposit_pct: depositPct, deposit_required_amount: depositAmount, committed_cost_amount: committedCost, yard_start_date: yardStartDate, launch_date: exitDate, first_cycle_due_date: schedule?.firstCycleDueDate ?? null, next_reminder_at: nextReminderDate ? `${nextReminderDate}T01:00:00.000Z` : null, good_credit_customer: Boolean(body.good_credit_customer), post_launch_due_date: schedule?.finalDueDate ?? null, created_at: now, updated_at: now }
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
    if (createdRampBookingIds.length) {
      await supabase.from("mms_ramp_bookings").delete().in("id", createdRampBookingIds)
    }
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
