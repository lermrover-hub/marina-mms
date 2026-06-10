/**
 * Quotation Agent
 *
 * Finds service requests that have no quotation yet, then uses Claude
 * to draft a quotation based on the request description, boat data,
 * and the active pricing master. Creates an AI order for approval
 * instead of writing directly to database.
 *
 * Does NOT touch the web app codebase.
 */

import { getServiceRequests, getQuotations, getBoat, getCustomer, getPricingMaster, apiFetch } from "../lib/api-client.js"
import { askJson } from "../lib/claude-client.js"
import { classifySpeedboat, isSpeedboatType } from "../lib/speedboat-classification.js"
import { getAgentConfig } from "../lib/agent-config.js"
import { loadPrompt } from "../lib/load-prompt.js"

const SYSTEM_TEMPLATE = loadPrompt("quotation-agent-system", `You are a senior quotation specialist at a marina and boat yard in Ko Samui, Thailand.
Your job is to create accurate, professional quotations based on:
- The customer's service request description
- The boat's technical specifications (type, LOA, draft, etc.)
- The marina's active rate card (pricing master)

Business rules you must follow:
- Always price from the rate card when a matching service exists
- For labour, estimate hours realistically (engine service = 4–8h, antifouling = LOA × 0.5h, etc.)
- Add materials as separate line items with realistic cost estimates
- Deposit default: {{deposit_pct}}%
- VAT: {{vat_pct}}%
- Valid days: {{valid_days}}
- Return ONLY a valid JSON object — no explanation, no markdown fences.

FORBIDDEN — you must NEVER:
- Apply a discount without manager approval (discount > 0 must flag for review)
- Change or override any rate card price directly
- Set a grand_total of zero or negative
- Confirm a booking or start date
- Send a quotation to a customer (drafts only — staff reviews before sending)
- Create a quotation for a customer with unresolved overdue invoices without flagging it`)

function buildSystemPrompt(cfg) {
  return SYSTEM_TEMPLATE
    .replace("{{deposit_pct}}", cfg.deposit_pct)
    .replace("{{vat_pct}}",     cfg.vat_pct)
    .replace("{{valid_days}}",  cfg.valid_days)
}

export async function run({ srId, customerId } = {}) {
  const cfg = await getAgentConfig("quotation")
  const systemPrompt = buildSystemPrompt(cfg)
  console.log("[QuotationAgent] Starting…")

  // 1. Fetch service requests and existing quotations (sequential to avoid cold-start timeouts)
  let requests, quotations
  try {
    requests   = await getServiceRequests()
    quotations = await getQuotations()
  } catch (err) {
    console.warn(`[QuotationAgent] API fetch failed — ${err.message}`)
    return { processed: 0, error: err.message }
  }
  if (!Array.isArray(requests) || requests.length === 0) {
    console.log("[QuotationAgent] No service requests found.")
    return { processed: 0 }
  }

  // Quotations link back to requests through mms_quotations.sr_id.
  const quotedRequestIds = new Set(
    (Array.isArray(quotations) ? quotations : [])
      .map((quotation) => quotation.sr_id)
      .filter(Boolean)
  )
  let pending = requests.filter(
    (r) =>
      ["NEW", "new", "NEW_REQUEST", "new_request", "INSPECTION_REQUIRED", "inspection_required"].includes(r.status)
      && !quotedRequestIds.has(r.id)
  )

  // Pilot mode: scope to explicit sr or customer only
  if (srId) {
    pending = pending.filter(r => r.id === srId)
    console.log(`[QuotationAgent] Pilot scope: sr=${srId} → ${pending.length} request(s)`)
  } else if (customerId) {
    pending = pending.filter(r => r.customer_id === customerId)
    console.log(`[QuotationAgent] Pilot scope: customer=${customerId} → ${pending.length} request(s)`)
  }

  console.log(`[QuotationAgent] ${pending.length} requests need quotations (of ${requests.length} total)`)

  const results = []

  for (const req of pending) {
    try {
      console.log(`[QuotationAgent] Processing request ${req.id} — "${req.title ?? req.description ?? "no title"}"`)

      // 3. Fetch boat and customer context
      const [boatData, customerData, pricingData] = await Promise.all([
        req.boat_id ? getBoat(req.boat_id).catch(() => null) : Promise.resolve(null),
        req.customer_id ? getCustomer(req.customer_id).catch(() => null) : Promise.resolve(null),
        getPricingMaster(null, true).catch(() => ({ data: [] })),
      ])

      const boat     = boatData ?? {}
      const customer = customerData ?? {}
      const pricing  = pricingData?.data ?? []

      // Use pilot_rate_thb when set; fall back to standard rate_thb
      const rateCardSummary = pricing
        .map((p) => {
          const effective = p.effectiveRate ?? p.pilotRateThb ?? p.rateThb
          const tag = (p.pilotRateThb != null) ? " [pilot]" : ""
          return `${p.code} | ${p.serviceNameEn} | ${p.category} | ฿${Number(effective).toLocaleString()}/${p.unit}${tag}`
        })
        .join("\n")

      // Speedboat classification (LOA-primary rule)
      let speedboatClass = null
      if (boat.id && isSpeedboatType(boat.boat_type)) {
        speedboatClass = classifySpeedboat({
          loaFt:    Number(boat.loa_ft  ?? 0),
          engines:  Number(boat.engine_count ?? boat.num_engines ?? 0) || null,
          beamFt:   Number(boat.beam_ft  ?? 0) || null,
          draftFt:  Number(boat.draft_ft ?? 0) || null,
          weightKg: Number(boat.weight_kg ?? boat.weight ?? 0) || null,
        })
      }

      const boatSummary = boat.id
        ? [
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
        : "No boat specified"

      const customerSummary = customer.id
        ? `Customer: ${customer.company_name ?? [customer.first_name, customer.last_name].filter(Boolean).join(" ")}, Payment terms: ${customer.payment_terms ?? 30} days`
        : "No customer specified"

      // 4. Ask Claude to draft line items
      const prompt = `Create a quotation for this service request:

REQUEST: ${req.description ?? req.title ?? "(no description)"}
${boatSummary}
${customerSummary}

RATE CARD:
${rateCardSummary || "No rate card available — use standard estimates."}

Return a JSON object with this exact structure:
{
  "title": "short quotation title",
  "notes": "payment terms, scope notes, warranty",
  "items": [
    { "description": "...", "category": "...", "unit": "...", "qty": 1, "unitPrice": 0 }
  ]
}`

      const draft = await askJson(systemPrompt, prompt)

      // 5. Calculate totals using DB-sourced config
      const vatRate    = cfg.vat_pct / 100
      const items      = draft.items ?? []
      const subtotal   = items.reduce((s, i) => s + (Number(i.qty) || 1) * (Number(i.unitPrice) || 0), 0)
      const taxAmount  = Math.round(subtotal * vatRate)
      const grandTotal = subtotal + taxAmount
      const depositReq = Math.round(grandTotal * cfg.deposit_pct / 100)

      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() + cfg.valid_days)

      const quotationBody = {
        customer_id:     req.customer_id ?? null,
        boat_id:         req.boat_id ?? null,
        service_request_id: req.id,
        title:           draft.title ?? `Quotation — ${req.title ?? req.id}`,
        valid_days:      cfg.valid_days,
        valid_until:     validUntil.toISOString().split("T")[0],
        discount_type:   "NONE",
        discount_value:  0,
        tax_rate:        cfg.vat_pct,
        deposit_pct:     cfg.deposit_pct,
        notes:           draft.notes ?? null,
        subtotal,
        discount_amount: 0,
        after_discount:  subtotal,
        tax_amount:      taxAmount,
        grand_total:     grandTotal,
        deposit_req:     depositReq,
        status:          "DRAFT",
        items,
        created_at:      new Date().toISOString(),
        updated_at:      new Date().toISOString(),
        generated_by:    "ai-agent",
      }

      // Create approval order instead of direct write
      // Manager must approve before quotation is actually created
      const t0 = Date.now()
      const created = await apiFetch("/api/ai/orders", {
        method: "POST",
        body: JSON.stringify({
          agent_name: "quotation",
          action: "create_quotation",
          entity_type: "quotation",
          input_data: quotationBody,
          approval_required_role: "MANAGING_DIRECTOR",
        }),
      })
      const duration = Date.now() - t0

      console.log(`[QuotationAgent] ✓ Approval order created: ${created?.id ?? "?"} (awaiting manager approval, ฿${grandTotal.toLocaleString()})`)
      results.push({ requestId: req.id, orderId: created?.id, grandTotal, status: "pending_approval", duration })

    } catch (err) {
      console.error(`[QuotationAgent] ✗ Failed for request ${req.id}: ${err.message}`)
      results.push({ requestId: req.id, error: err.message })
    }
  }

  console.log(`[QuotationAgent] Done. Processed ${results.length} requests.`)
  return { processed: results.length, results }
}
