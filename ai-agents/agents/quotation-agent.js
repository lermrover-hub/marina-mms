/**
 * Quotation Agent
 *
 * Finds service requests that have no quotation yet, drafts a quotation using
 * the active pricing master, then creates an AI approval order. In dry-run mode
 * the approval order is returned as a stub and no production write is made.
 */

import {
  getServiceRequests,
  getQuotations,
  getBoat,
  getCustomer,
  getPricingMaster,
  createAiOrder,
  createAuditLog,
  isDryRun,
} from "../lib/api-client.js"
import { askJson } from "../lib/claude-client.js"
import { classifySpeedboat, isSpeedboatType } from "../lib/speedboat-classification.js"
import { getAgentConfig } from "../lib/agent-config.js"
import { loadPrompt } from "../lib/load-prompt.js"

const PENDING_STATUSES = ["NEW", "new", "NEW_REQUEST", "new_request", "INSPECTION_REQUIRED", "inspection_required"]

const SYSTEM_TEMPLATE = loadPrompt("quotation-agent-system", `You are a senior quotation specialist at a marina and boat yard in Ko Samui, Thailand.
Your job is to create accurate, professional quotations based on:
- The customer's service request description
- The boat's technical specifications (type, LOA, draft, etc.)
- The marina's active rate card (pricing master)

Business rules you must follow:
- Always price from the rate card when a matching service exists
- For labour, estimate hours realistically (engine service = 4-8h, antifouling = LOA x 0.5h, etc.)
- Add materials as separate line items with realistic cost estimates
- Deposit default: {{deposit_pct}}%
- VAT: {{vat_pct}}%
- Valid days: {{valid_days}}
- Return ONLY a valid JSON object - no explanation, no markdown fences.

FORBIDDEN - you must NEVER:
- Apply a discount without manager approval (discount > 0 must flag for review)
- Change or override any rate card price directly
- Set a grand_total of zero or negative
- Confirm a booking or start date
- Send a quotation to a customer (drafts only - staff reviews before sending)
- Create a quotation for a customer with unresolved overdue invoices without flagging it`)

function buildSystemPrompt(cfg) {
  const base = SYSTEM_TEMPLATE
    .replace("{{deposit_pct}}", cfg.deposit_pct)
    .replace("{{vat_pct}}", cfg.vat_pct)
    .replace("{{valid_days}}", cfg.valid_days)
  return `${base}\nMaximum discount without management escalation: ${cfg.max_discount_pct}%.\n${cfg.extra_instructions || ""}`.trim()
}

function normalizeId(entity) {
  return entity?.id ?? entity?.data?.id ?? null
}

function unwrapApiData(value) {
  return value?.data ?? value ?? {}
}

function effectivePrice(row) {
  return Number(row?.effectiveRate ?? row?.pilotRateThb ?? row?.rateThb ?? row?.rate_thb ?? 0)
}

function isQuotationOnlyRate(row) {
  const unit = String(row?.unit ?? "").toLowerCase()
  const code = String(row?.code ?? "").toUpperCase()
  return unit.includes("quotation") || code.includes("SPECIAL") || code.includes("CUSTOM")
}

function validateConfig(cfg) {
  const errors = []
  for (const key of ["vat_pct", "deposit_pct", "valid_days", "max_discount_pct"]) {
    if (!Number.isFinite(Number(cfg?.[key]))) errors.push(`Missing or invalid quotation config: ${key}`)
  }
  if (Number(cfg?.vat_pct) < 0) errors.push("VAT percent cannot be negative")
  if (Number(cfg?.deposit_pct) < 0 || Number(cfg?.deposit_pct) > 100) errors.push("Deposit percent must be 0-100")
  if (Number(cfg?.valid_days) <= 0) errors.push("Quotation validity must be greater than zero days")
  return errors
}

export function validateRuntimeContext({ req, customer, boat, pricing, cfg }) {
  const errors = validateConfig(cfg)

  if (!req?.id) errors.push("Missing service request id")
  if (!req?.customer_id) errors.push(`Service request ${req?.id ?? "unknown"} has no customer_id`)
  if (req?.customer_id && !normalizeId(customer)) errors.push(`Customer ${req.customer_id} could not be loaded`)
  if (!req?.boat_id) errors.push(`Service request ${req?.id ?? "unknown"} has no boat_id`)
  if (req?.boat_id && !normalizeId(boat)) errors.push(`Boat ${req.boat_id} could not be loaded`)
  if (!Array.isArray(pricing) || pricing.length === 0) errors.push("Active pricing master is empty or unavailable")

  const badRates = (Array.isArray(pricing) ? pricing : [])
    .filter((row) => !isQuotationOnlyRate(row) && (!Number.isFinite(effectivePrice(row)) || effectivePrice(row) <= 0))
    .map((row) => row?.code ?? "unknown")

  if (badRates.length) {
    const suffix = badRates.length > 12 ? "..." : ""
    errors.push(`Active pricing records have missing/zero rates: ${badRates.slice(0, 12).join(", ")}${suffix}`)
  }

  return errors
}

function pricingCodeSet(pricing) {
  return new Set((pricing ?? []).map((row) => String(row.code ?? "").toUpperCase()).filter(Boolean))
}

export function validateQuotationDraft({ draft, pricing, cfg }) {
  const errors = validateConfig(cfg)
  const items = Array.isArray(draft?.items) ? draft.items : []
  const knownCodes = pricingCodeSet(pricing)

  if (!items.length) errors.push("Draft quotation has no line items")

  for (const [index, item] of items.entries()) {
    const label = `Item ${index + 1}`
    const qty = Number(item?.qty ?? 1)
    const unitPrice = Number(item?.unitPrice ?? item?.unit_price ?? 0)
    const pricingCode = String(item?.pricingCode ?? item?.pricing_code ?? "").toUpperCase()
    const description = String(item?.description ?? "").toUpperCase()
    const requiresApproval = item?.requiresApproval === true || item?.requires_approval === true

    if (!Number.isFinite(qty) || qty <= 0) errors.push(`${label} has invalid quantity`)
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) errors.push(`${label} has zero or invalid unitPrice`)

    const codeInDescription = [...knownCodes].some((code) => description.includes(code))
    const customQuoted = ["CUSTOM", "QUOTE", "QUOTATION"].includes(pricingCode) && requiresApproval
    const matchedCode = knownCodes.has(pricingCode) || codeInDescription || customQuoted

    if (!matchedCode) {
      errors.push(`${label} is not matched to pricing_master and is not explicitly flagged for approval`)
    }
  }

  const subtotal = items.reduce((sum, item) => sum + (Number(item?.qty) || 1) * (Number(item?.unitPrice ?? item?.unit_price) || 0), 0)
  if (!Number.isFinite(subtotal) || subtotal <= 0) errors.push("Draft subtotal is zero or invalid")

  return errors
}

async function auditQuotation(action, { requestId = null, payload = null, result = null, error = null, durationMs = null, riskLevel = "LOW" } = {}) {
  return createAuditLog({
    agent_name: "quotation",
    action,
    tool_call: requestId ? `service_request:${requestId}` : null,
    payload,
    result,
    risk_level: riskLevel,
    error,
    duration_ms: durationMs,
    created_at: new Date().toISOString(),
  })
}

function buildBoatSummary(boat, speedboatClass) {
  if (!boat.id) return "No boat specified"
  return [
    `Boat: ${boat.name}`,
    `Type: ${boat.boat_type ?? "unknown"}`,
    `LOA: ${boat.loa_ft ?? "?"}ft`,
    `Beam: ${boat.beam_ft ?? "?"}ft`,
    `Draft: ${boat.draft_ft ?? "?"}ft`,
    `Engines: ${boat.engine_count ?? boat.num_engines ?? "?"}`,
    `Engine type: ${boat.engine_type ?? "?"}`,
    speedboatClass
      ? `Speedboat class: ${speedboatClass.label}` +
        (speedboatClass.mismatchWarning ? ` | WARNING: ${speedboatClass.mismatchWarning}` : "") +
        (speedboatClass.escalationReasons.length ? ` | Escalation: ${speedboatClass.escalationReasons.join(", ")}` : "") +
        ` | Use ramp code: ${speedboatClass.rampCode}`
      : null,
  ].filter(Boolean).join(", ")
}

function buildCustomerSummary(customer) {
  if (!customer.id) return "No customer specified"
  return `Customer: ${customer.company_name ?? [customer.first_name, customer.last_name].filter(Boolean).join(" ")}, Payment terms: ${customer.payment_terms ?? 30} days`
}

export function selectPendingRequests({ requests, quotedRequestIds, srId = null, customerId = null, dryRun = false }) {
  let pending = (Array.isArray(requests) ? requests : []).filter((request) => {
    const statusIsPending = PENDING_STATUSES.includes(request.status)
    const alreadyQuoted = quotedRequestIds.has(request.id)
    const explicitDryRunReplay = dryRun && srId && request.id === srId
    return statusIsPending && (!alreadyQuoted || explicitDryRunReplay)
  })

  if (srId) {
    pending = pending.filter((request) => request.id === srId)
  } else if (customerId) {
    pending = pending.filter((request) => request.customer_id === customerId)
  }

  return pending
}

export async function run({ srId, customerId } = {}) {
  const cfg = await getAgentConfig("quotation")
  const systemPrompt = buildSystemPrompt(cfg)
  console.log("[QuotationAgent] Starting...")
  await auditQuotation("AGENT_START", {
    payload: { srId: srId ?? null, customerId: customerId ?? null, dry_run: isDryRun() },
    result: { config_loaded: true },
  })

  let requests, quotations
  try {
    requests = await getServiceRequests()
    quotations = await getQuotations()
  } catch (err) {
    console.warn(`[QuotationAgent] API fetch failed: ${err.message}`)
    await auditQuotation("INPUT_FETCH_ERROR", {
      payload: { srId: srId ?? null, customerId: customerId ?? null },
      error: err.message,
      riskLevel: "HIGH",
    })
    return { processed: 0, error: err.message }
  }

  if (!Array.isArray(requests) || requests.length === 0) {
    console.log("[QuotationAgent] No service requests found.")
    await auditQuotation("NO_SERVICE_REQUESTS", { result: { processed: 0 } })
    return { processed: 0 }
  }

  const quotedRequestIds = new Set(
    (Array.isArray(quotations) ? quotations : [])
      .map((quotation) => quotation.sr_id)
      .filter(Boolean)
  )

  let pending = selectPendingRequests({
    requests,
    quotedRequestIds,
    srId,
    customerId,
    dryRun: isDryRun(),
  })
  if (srId) {
    console.log(`[QuotationAgent] Pilot scope: sr=${srId} -> ${pending.length} request(s)`)
  } else if (customerId) {
    console.log(`[QuotationAgent] Pilot scope: customer=${customerId} -> ${pending.length} request(s)`)
  }

  console.log(`[QuotationAgent] ${pending.length} requests need quotations (of ${requests.length} total)`)
  const results = []

  for (const req of pending) {
    try {
      console.log(`[QuotationAgent] Processing request ${req.id} - "${req.title ?? req.description ?? "no title"}"`)
      await auditQuotation("REQUEST_SELECTED", {
        requestId: req.id,
        payload: {
          service_request_id: req.id,
          status: req.status,
          customer_id: req.customer_id ?? null,
          boat_id: req.boat_id ?? null,
          dry_run: isDryRun(),
        },
      })

      const [boatData, customerData, pricingData] = await Promise.all([
        req.boat_id ? getBoat(req.boat_id).catch(() => null) : Promise.resolve(null),
        req.customer_id ? getCustomer(req.customer_id).catch(() => null) : Promise.resolve(null),
        getPricingMaster(null, true).catch(() => ({ data: [] })),
      ])

      const boat = unwrapApiData(boatData)
      const customer = unwrapApiData(customerData)
      const pricing = Array.isArray(pricingData) ? pricingData : (pricingData?.data ?? [])
      const contextErrors = validateRuntimeContext({ req, customer, boat, pricing, cfg })
      if (contextErrors.length) {
        await auditQuotation("VALIDATION_ERROR", {
          requestId: req.id,
          payload: { stage: "runtime_context", errors: contextErrors },
          error: contextErrors.join("; "),
          riskLevel: "HIGH",
        })
        throw new Error(`Runtime validation failed: ${contextErrors.join("; ")}`)
      }

      const rateCardSummary = pricing
        .map((p) => {
          const effective = p.effectiveRate ?? p.pilotRateThb ?? p.rateThb
          const tag = p.pilotRateThb != null ? " [pilot]" : ""
          return `${p.code} | ${p.serviceNameEn} | ${p.category} | THB ${Number(effective).toLocaleString()}/${p.unit}${tag}`
        })
        .join("\n")

      let speedboatClass = null
      if (boat.id && isSpeedboatType(boat.boat_type)) {
        speedboatClass = classifySpeedboat({
          loaFt: Number(boat.loa_ft ?? 0),
          engines: Number(boat.engine_count ?? boat.num_engines ?? 0) || null,
          beamFt: Number(boat.beam_ft ?? 0) || null,
          draftFt: Number(boat.draft_ft ?? 0) || null,
          weightKg: Number(boat.weight_kg ?? boat.weight ?? 0) || null,
        })
      }

      const prompt = `Create a quotation for this service request:

REQUEST: ${req.description ?? req.title ?? "(no description)"}
${buildBoatSummary(boat, speedboatClass)}
${buildCustomerSummary(customer)}

RATE CARD:
${rateCardSummary}

Return a JSON object with this exact structure:
{
  "title": "short quotation title",
  "notes": "payment terms, scope notes, warranty",
  "items": [
    { "pricingCode": "RATE_CARD_CODE_OR_CUSTOM", "description": "...", "category": "...", "unit": "...", "qty": 1, "unitPrice": 0, "requiresApproval": false }
  ]
}`

      const draft = await askJson(systemPrompt, prompt)
      const draftErrors = validateQuotationDraft({ draft, pricing, cfg })
      if (draftErrors.length) {
        await auditQuotation("VALIDATION_ERROR", {
          requestId: req.id,
          payload: { stage: "draft_output", errors: draftErrors, draft },
          error: draftErrors.join("; "),
          riskLevel: "HIGH",
        })
        throw new Error(`Draft validation failed: ${draftErrors.join("; ")}`)
      }

      await auditQuotation("PRICING_MATCH_RESULT", {
        requestId: req.id,
        payload: {
          item_count: draft.items.length,
          pricing_codes: draft.items.map((item) => item.pricingCode ?? item.pricing_code ?? null),
        },
        result: { matched: true },
      })

      const vatRate = cfg.vat_pct / 100
      const items = draft.items ?? []
      const subtotal = items.reduce((s, i) => s + (Number(i.qty) || 1) * (Number(i.unitPrice) || 0), 0)
      const taxAmount = Math.round(subtotal * vatRate)
      const grandTotal = subtotal + taxAmount
      const depositReq = Math.round(grandTotal * cfg.deposit_pct / 100)

      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() + cfg.valid_days)

      const quotationBody = {
        customer_id: req.customer_id ?? null,
        boat_id: req.boat_id ?? null,
        service_request_id: req.id,
        title: draft.title ?? `Quotation - ${req.title ?? req.id}`,
        valid_days: cfg.valid_days,
        valid_until: validUntil.toISOString().split("T")[0],
        discount_type: "NONE",
        discount_value: 0,
        tax_rate: cfg.vat_pct,
        deposit_pct: cfg.deposit_pct,
        notes: draft.notes ?? null,
        subtotal,
        discount_amount: 0,
        after_discount: subtotal,
        tax_amount: taxAmount,
        grand_total: grandTotal,
        deposit_req: depositReq,
        status: "DRAFT",
        items,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        generated_by: "ai-agent",
      }

      await auditQuotation("DRAFT_GENERATED", {
        requestId: req.id,
        payload: { service_request_id: req.id },
        result: {
          title: quotationBody.title,
          item_count: items.length,
          subtotal,
          taxAmount,
          grandTotal,
          depositReq,
          dry_run: isDryRun(),
        },
      })

      const t0 = Date.now()
      const created = await createAiOrder({
        agent_name: "quotation",
        action: "create_quotation",
        entity_type: "quotation",
        input_data: quotationBody,
        approval_required_role: "MANAGING_DIRECTOR",
      })
      const duration = Date.now() - t0

      await auditQuotation("APPROVAL_ORDER_RESULT", {
        requestId: req.id,
        payload: { service_request_id: req.id, dry_run: isDryRun() },
        result: {
          order_id: created?.id ?? null,
          order_status: created?.status ?? null,
          grandTotal,
        },
        durationMs: duration,
      })

      console.log(`[QuotationAgent] Approval order prepared: ${created?.id ?? "?"} (awaiting manager approval, THB ${grandTotal.toLocaleString()})`)
      results.push({ requestId: req.id, orderId: created?.id, grandTotal, status: "pending_approval", duration })
    } catch (err) {
      console.error(`[QuotationAgent] Failed for request ${req.id}: ${err.message}`)
      await auditQuotation("REQUEST_FAILED", {
        requestId: req.id,
        payload: { service_request_id: req.id },
        error: err.message,
        riskLevel: "HIGH",
      })
      results.push({ requestId: req.id, error: err.message })
    }
  }

  console.log(`[QuotationAgent] Done. Processed ${results.length} requests.`)
  return { processed: results.length, results }
}
