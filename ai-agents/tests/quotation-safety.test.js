/**
 * Quotation Agent safety tests.
 * These tests do not call the live Marina MMS API.
 */

import { test } from "node:test"
import assert from "node:assert/strict"

process.env.AI_AGENT_DRY_RUN = "true"
process.env.AI_AGENT_SKIP_CLAUDE = "true"
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "test-key"
process.env.MARINA_AGENT_API_KEY = process.env.MARINA_AGENT_API_KEY || "test-agent-key"

const defaultCfg = {
  vat_pct: 7,
  deposit_pct: 50,
  valid_days: 7,
  max_discount_pct: 15,
}

test("createAiOrder returns dry-run stub and does not require API connectivity", async () => {
  const { createAiOrder, isDryRun } = await import("../lib/api-client.js")
  assert.equal(isDryRun(), true)

  const result = await createAiOrder({
    agent_name: "quotation",
    action: "create_quotation",
    entity_type: "quotation",
    input_data: { grand_total: 1070 },
    approval_required_role: "MANAGING_DIRECTOR",
  })

  assert.equal(result.id, "dry-run-ai-order")
  assert.equal(result.status, "dry_run")
  assert.equal(result.approval_required, true)
  assert.equal(result.input_data.grand_total, 1070)
})

test("validateRuntimeContext blocks missing customer, boat, pricing, and config", async () => {
  const { validateRuntimeContext } = await import("../agents/quotation-agent.js")

  const errors = validateRuntimeContext({
    req: { id: "sr-1", status: "NEW" },
    customer: {},
    boat: {},
    pricing: [],
    cfg: { ...defaultCfg, valid_days: 0 },
  })

  assert.ok(errors.some((e) => e.includes("customer_id")))
  assert.ok(errors.some((e) => e.includes("boat_id")))
  assert.ok(errors.some((e) => e.includes("Active pricing master")))
  assert.ok(errors.some((e) => e.includes("validity")))
})

test("validateRuntimeContext allows quotation-only zero rates but blocks normal zero rates", async () => {
  const { validateRuntimeContext } = await import("../agents/quotation-agent.js")

  const errors = validateRuntimeContext({
    req: { id: "sr-1", status: "NEW", customer_id: "cust-1", boat_id: "boat-1" },
    customer: { id: "cust-1" },
    boat: { id: "boat-1" },
    pricing: [
      { code: "RAMP_SB_SPECIAL", unit: "Quotation", rateThb: 0 },
      { code: "RAMP_FISHING", unit: "trip", rateThb: 0, notes: "Complimentary" },
      { code: "SURCHARGE_HI", unit: "%", rateThb: 0, notes: "No surcharge currently" },
      { code: "STORE_SB_S_M", unit: "month", rateThb: 0 },
    ],
    cfg: defaultCfg,
  })

  assert.ok(errors.some((e) => e.includes("STORE_SB_S_M")))
  assert.ok(!errors.some((e) => e.includes("RAMP_SB_SPECIAL")))
  assert.ok(!errors.some((e) => e.includes("RAMP_FISHING")))
  assert.ok(!errors.some((e) => e.includes("SURCHARGE_HI")))
})

test("validateQuotationDraft requires positive totals and pricing match or explicit approval", async () => {
  const { validateQuotationDraft } = await import("../agents/quotation-agent.js")
  const pricing = [{ code: "STORE_SB_S_M", rateThb: 8000 }]

  const bad = validateQuotationDraft({
    draft: {
      title: "Bad quote",
      items: [{ description: "Unknown work", qty: 1, unitPrice: 0 }],
    },
    pricing,
    cfg: defaultCfg,
  })

  assert.ok(bad.some((e) => e.includes("unitPrice")))
  assert.ok(bad.some((e) => e.includes("not matched")))
  assert.ok(bad.some((e) => e.includes("subtotal")))

  const good = validateQuotationDraft({
    draft: {
      title: "Storage quote",
      items: [{ pricingCode: "STORE_SB_S_M", description: "STORE_SB_S_M monthly storage", qty: 1, unitPrice: 8000 }],
    },
    pricing,
    cfg: defaultCfg,
  })

  assert.deepEqual(good, [])
})

test("validateQuotationDraft allows custom line items only when approval is explicit", async () => {
  const { validateQuotationDraft } = await import("../agents/quotation-agent.js")

  const errors = validateQuotationDraft({
    draft: {
      title: "Custom quote",
      items: [{ pricingCode: "CUSTOM", description: "Supplier quote required", qty: 1, unitPrice: 25000, requiresApproval: true }],
    },
    pricing: [{ code: "STORE_SB_S_M", rateThb: 8000 }],
    cfg: defaultCfg,
  })

  assert.deepEqual(errors, [])
})

test("mixed pricing match is summarized but still blocks draft approval", async () => {
  const { summarizeDraftPricingMatch, validateQuotationDraft } = await import("../agents/quotation-agent.js")
  const pricing = [{ code: "RAMP_2OB", rateThb: 1200 }]
  const draft = {
    title: "Mixed quote",
    items: [
      { pricingCode: "RAMP_2OB", description: "Two outboard ramp launch", qty: 1, unitPrice: 1200 },
      { pricingCode: "LABOUR_ENGINE_SERVICE", description: "Engine service labour", qty: 1, unitPrice: 4500 },
    ],
  }

  const summary = summarizeDraftPricingMatch({ draft, pricing })
  assert.equal(summary.matched, false)
  assert.equal(summary.item_count, 2)
  assert.equal(summary.matched_count, 1)
  assert.equal(summary.unmatched_count, 1)
  assert.equal(summary.items[0].matchedCode, "RAMP_2OB")
  assert.equal(summary.items[1].matchType, "unmatched")

  const errors = validateQuotationDraft({ draft, pricing, cfg: defaultCfg })
  assert.ok(errors.some((e) => e.includes("Item 2 is not matched")))
})

test("manager escalation policy catches outsourced engine and subcontractor paint work", async () => {
  const { classifyManagerEscalation } = await import("../agents/quotation-agent.js")

  const engine = classifyManagerEscalation("UAT engine service with oil filter and impeller replacement")
  assert.equal(engine.type, "outsourced_engine")
  assert.match(engine.message, /Manager must contact the customer/)

  const paint = classifyManagerEscalation("Need antifouling paint and gelcoat repair")
  assert.equal(paint.type, "subcontractor_paint")
  assert.match(paint.message, /subcontractor pricing/)

  assert.equal(classifyManagerEscalation("monthly passive hardstand storage"), null)
})

test("selectPendingRequests allows explicit dry-run replay but blocks quoted writes", async () => {
  const { selectPendingRequests } = await import("../agents/quotation-agent.js")
  const requests = [
    { id: "sr-quoted", status: "new", customer_id: "cust-1" },
    { id: "sr-open", status: "NEW_REQUEST", customer_id: "cust-1" },
  ]
  const quotedRequestIds = new Set(["sr-quoted"])

  const writeMode = selectPendingRequests({
    requests,
    quotedRequestIds,
    srId: "sr-quoted",
    dryRun: false,
  })
  assert.deepEqual(writeMode, [])

  const dryRunReplay = selectPendingRequests({
    requests,
    quotedRequestIds,
    srId: "sr-quoted",
    dryRun: true,
  })
  assert.equal(dryRunReplay.length, 1)
  assert.equal(dryRunReplay[0].id, "sr-quoted")

  const customerDryRun = selectPendingRequests({
    requests,
    quotedRequestIds,
    customerId: "cust-1",
    dryRun: true,
  })
  assert.deepEqual(customerDryRun.map((request) => request.id), ["sr-open"])
})
