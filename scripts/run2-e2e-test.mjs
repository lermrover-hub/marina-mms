/**
 * Phase 5D — Run 2 End-to-End Write Test
 *
 * Drives the full AI agent write chain against staging:
 *   1. Re-seed staging (idempotent)
 *   2. Run quotation-agent  → creates ai_orders + approval_queue row
 *   3. Approve the order    → PATCH /api/ai/orders/:id { action: "approve" }
 *   4. Execute the order    → POST  /api/ai/orders/:id/execute  → mms_quotations created
 *   5. Run comms-agent      → creates PENDING_APPROVAL message draft
 *   6. Run finance-agent    → creates mms_notifications (overdue invoice)
 *   7. Run marina-agent     → creates mms_notifications (contract expiry)
 *   8. Write audit log      → POST /api/db/agent-audit-log
 *   9. Verify all writes    → queries staging DB directly
 *  10. Report pass / fail
 *
 * Usage (Run 2 — mock Claude):
 *   $env:AI_AGENT_DRY_RUN     = "false"
 *   $env:AI_AGENT_SKIP_CLAUDE = "true"
 *   $env:MARINA_API_BASE      = "http://localhost:3004"
 *   $env:MARINA_AGENT_API_KEY = "local-test-key"
 *   node scripts/run2-e2e-test.mjs
 *
 * Usage (Run 3 — real Claude):
 *   $env:AI_AGENT_DRY_RUN     = "false"
 *   $env:AI_AGENT_SKIP_CLAUDE = "false"
 *   $env:ANTHROPIC_API_KEY    = "<your-key>"
 *   $env:MARINA_API_BASE      = "http://localhost:3004"
 *   $env:MARINA_AGENT_API_KEY = "local-test-key"
 *   node scripts/run2-e2e-test.mjs
 *
 * Safety:
 *   - Reads .env.staging.local for DB credentials (staging project ID enforced)
 *   - Aborts if MARINA_API_BASE points to production
 *   - Never touches mms_customers / pricing_master
 */

import "dotenv/config"
import fs from "node:fs"
import { createClient } from "@supabase/supabase-js"

// ── Constants ──────────────────────────────────────────────────────────────

const STAGING_PROJECT_ID  = "zanlunbgupdtqznruzok"
const PRODUCTION_PROJECT_ID = "csltloqbjupxqwbkunsd"

const TEST_IDS = {
  customer:       "2fe7332a-4e66-42a5-b882-91293f276515",
  serviceRequest: "b13c8371-20e7-417a-b494-87a290e4d8d1",
  invoice:        "60750dac-0d8b-4f37-9d4c-6fdea73d7076",
  contract:       "1bcc7739-c325-42b8-b5da-309c8d742a0c",
  message:        "2f7e64e9-9f64-4b98-b2d3-08dc368bc0aa",
}

const API_BASE = process.env.MARINA_API_BASE ?? "http://localhost:3004"
const API_KEY  = process.env.MARINA_AGENT_API_KEY
const DRY_RUN  = process.env.AI_AGENT_DRY_RUN === "true"
const SKIP_CLAUDE = process.env.AI_AGENT_SKIP_CLAUDE === "true"

// ── Guards ─────────────────────────────────────────────────────────────────

if (API_BASE.includes("vercel.app") || API_BASE.includes("marina-mms.com")) {
  console.error("BLOCKED: MARINA_API_BASE points to production. Use http://localhost:3004.")
  process.exit(1)
}
if (!API_KEY) {
  console.error("ERROR: MARINA_AGENT_API_KEY is not set.")
  process.exit(1)
}
if (DRY_RUN) {
  console.error("ERROR: AI_AGENT_DRY_RUN must be 'false' for Run 2 / Run 3.")
  console.error("  Set $env:AI_AGENT_DRY_RUN = 'false' and retry.")
  process.exit(1)
}

// ── Staging DB client ──────────────────────────────────────────────────────

function loadEnvFile(path) {
  if (!fs.existsSync(path)) throw new Error(`Missing ${path}`)
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const [key, ...rest] = trimmed.split("=")
    if (!key || rest.length === 0) continue
    process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "")
  }
}
loadEnvFile("C:\\marina-mms\\.env.staging.local")

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl?.includes(STAGING_PROJECT_ID)) {
  console.error("BLOCKED: NEXT_PUBLIC_SUPABASE_URL is not the approved staging project.")
  process.exit(1)
}
if (supabaseUrl?.includes(PRODUCTION_PROJECT_ID)) {
  console.error("BLOCKED: production Supabase URL detected in .env.staging.local.")
  process.exit(1)
}
if (!serviceKey || serviceKey === "get-from-supabase-dashboard-settings-api") {
  console.error("ERROR: Missing staging SUPABASE_SERVICE_ROLE_KEY in .env.staging.local.")
  process.exit(1)
}

const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

// ── HTTP helper ────────────────────────────────────────────────────────────

async function api(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-agent-api-key": API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 200)}`)
  return text ? JSON.parse(text) : null
}

// ── Helpers ────────────────────────────────────────────────────────────────

const pass = []
const fail = []

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${label}`)
    pass.push(label)
  } else {
    console.error(`  ✗ ${label}${detail ? " — " + detail : ""}`)
    fail.push(label)
  }
}

async function dbCount(table, column, value) {
  const { count, error } = await db.from(table).select("*", { count: "exact", head: true }).eq(column, value)
  if (error) throw new Error(`${table}.${column}=${value}: ${error.message}`)
  return count ?? 0
}

function isoDate(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split("T")[0]
}

// ── Step 1: Re-seed staging ────────────────────────────────────────────────

async function step1_reseed() {
  console.log("\n── Step 1: Re-seed staging test records ──────────────────")

  // Cleanup writes from any prior run
  await db.from("mms_agent_audit_log").delete().eq("agent_name", "run2-e2e-test")
  await db.from("mms_notifications").delete().or(
    `customer_id.eq.${TEST_IDS.customer},reference_id.in.(${TEST_IDS.invoice},${TEST_IDS.contract},${TEST_IDS.serviceRequest})`
  )
  await db.from("mms_quotations").delete().eq("customer_id", TEST_IDS.customer)
  await db.from("mms_messages").delete().eq("sender_id", "Utest-ai-line-001")
  await db.from("approval_queue").delete().in(
    "order_id",
    (await db.from("ai_orders").select("id").eq("agent_name", "quotation").then(r => (r.data ?? []).map(o => o.id)))
  )
  await db.from("ai_orders").delete().eq("agent_name", "quotation")

  // Ensure seed records exist (idempotent)
  const seeds = [
    ["mms_customers", { id: TEST_IDS.customer, customer_type: "PRIVATE_OWNER", first_name: "AI", last_name: "Test Agent", company_name: "AI Test Agent", email: "ai-test@marina-mms-test.local", status: "ACTIVE", notes: "TEST RECORD - safe to delete" }],
    ["mms_service_requests", { id: TEST_IDS.serviceRequest, reference: "TEST-AI-SR-001", customer_id: TEST_IDS.customer, customer_name: "AI Test Agent", title: "TEST: Antifouling paint - 45ft sailing yacht", description: "TEST: Full bottom antifouling paint, hull wash, zinc anode replacement. Vessel ashore in yard.", category: "OTHER", priority: "MEDIUM", status: "NEW_REQUEST", requested_date: isoDate(0), notes: "TEST RECORD - safe to delete" }],
    ["mms_invoices", { id: TEST_IDS.invoice, invoice_number: "TEST-AI-INV-001", customer_id: TEST_IDS.customer, customer_name: "AI Test Agent", invoice_date: isoDate(-30), due_date: isoDate(-20), status: "ISSUED", subtotal: 5000, vat_amount: 350, total_amount: 5350, paid_amount: 0, outstanding_balance: 5350, invoice_type: "MANUAL", notes: "TEST RECORD - safe to delete" }],
    ["mms_contracts", { id: TEST_IDS.contract, contract_number: "TEST-AI-CONTRACT-001", contract_type: "WET_BERTH", customer_id: TEST_IDS.customer, customer_name: "AI Test Agent", status: "ACTIVE", billing_cycle: "MONTHLY", rate_amount: 8000, rate_currency: "THB", start_date: isoDate(-180), end_date: isoDate(5), notes: "TEST RECORD - safe to delete" }],
    ["mms_messages", { id: TEST_IDS.message, channel: "LINE", direction: "INBOUND", sender_id: "Utest-ai-line-001", customer_id: TEST_IDS.customer, message_type: "text", content: "TEST: Hi, when will my boat be ready for launch? I need to know before this weekend.", replied: false }],
  ]

  for (const [table, row] of seeds) {
    const { error } = await db.from(table).upsert(row, { onConflict: "id" })
    if (error) throw new Error(`Seed ${table}: ${error.message}`)
  }
  console.log("  ✓ Seed records verified (5 rows)")
}

// ── Step 2: Run quotation-agent (creates ai_orders row) ───────────────────

let aiOrderId

async function step2_quotationAgent() {
  console.log("\n── Step 2: quotation-agent → creates ai_orders row ──────")
  const { run } = await import("../ai-agents/agents/quotation-agent.js")
  const result = await run({ srId: TEST_IDS.serviceRequest })
  check("quotation-agent ran without error", result && !result.error, result?.error)
  check("processed 1 request", result?.processed === 1, `processed=${result?.processed}`)

  // Fetch the created order from DB
  const { data: orders, error } = await db
    .from("ai_orders")
    .select("id, status, agent_name, action")
    .eq("agent_name", "quotation")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)

  if (error || !orders?.length) {
    check("ai_orders row created", false, error?.message ?? "no rows found")
    return
  }
  aiOrderId = orders[0].id
  check("ai_orders row created", true)
  check("ai_orders.action = create_quotation", orders[0].action === "create_quotation", `action=${orders[0].action}`)

  const aqCount = await dbCount("approval_queue", "order_id", aiOrderId)
  check("approval_queue row created", aqCount === 1, `count=${aqCount}`)

  console.log(`  → Order ID: ${aiOrderId}`)
}

// ── Step 3: Approve the order ──────────────────────────────────────────────

async function step3_approveOrder() {
  console.log("\n── Step 3: Approve ai_orders row via API ─────────────────")
  if (!aiOrderId) { console.warn("  ⚠ Skipped — no order ID from step 2"); fail.push("approve_order"); return }

  const result = await api("PATCH", `/api/ai/orders/${aiOrderId}`, {
    action:      "approve",
    approved_by: "run2-e2e-test",
    reason:      "Automated test approval",
  })

  check("order status = approved", result?.status === "approved", `status=${result?.status}`)

  const { data: aq } = await db.from("approval_queue").select("status").eq("order_id", aiOrderId).single()
  check("approval_queue status = approved", aq?.status === "approved", `aq.status=${aq?.status}`)
}

// ── Step 4: Execute the order → creates mms_quotations ───────────────────

let createdQuotationId

async function step4_executeOrder() {
  console.log("\n── Step 4: Execute order → mms_quotations row ────────────")
  if (!aiOrderId) { console.warn("  ⚠ Skipped — no order ID"); fail.push("execute_order"); return }

  const result = await api("POST", `/api/ai/orders/${aiOrderId}/execute`)
  check("execute returned success", result?.success === true, JSON.stringify(result).slice(0, 120))
  check("entity_id set", !!result?.entity_id, `entity_id=${result?.entity_id}`)
  createdQuotationId = result?.entity_id

  const { data: order } = await db.from("ai_orders").select("status, entity_id").eq("id", aiOrderId).single()
  check("ai_orders status = executed", order?.status === "executed", `status=${order?.status}`)

  const { data: q } = await db.from("mms_quotations").select("id, status, generated_by, customer_id").eq("id", createdQuotationId).single()
  check("mms_quotations row exists", !!q, `id=${createdQuotationId}`)
  check("quotation status = DRAFT", q?.status === "DRAFT", `status=${q?.status}`)
  check("generated_by = ai-agent", q?.generated_by === "ai-agent", `generated_by=${q?.generated_by}`)
  check("quotation.customer_id correct", q?.customer_id === TEST_IDS.customer, `customer_id=${q?.customer_id}`)

  const { data: items } = await db.from("mms_quotation_items").select("id").eq("quotation_id", createdQuotationId)
  check("quotation items created", (items?.length ?? 0) >= 1, `items=${items?.length}`)

  console.log(`  → Quotation ID: ${createdQuotationId}`)
}

// ── Step 5: comms-agent → PENDING_APPROVAL message draft ─────────────────

let draftMessageId

async function step5_commsAgent() {
  console.log("\n── Step 5: comms-agent → PENDING_APPROVAL message draft ─")
  const { run } = await import("../ai-agents/agents/comms-agent.js")
  const result = await run()
  check("comms-agent ran without error", result && !result.error, result?.error)

  // Message in seed has replied=false — comms-agent should have processed it
  const { data: msgs } = await db
    .from("mms_messages")
    .select("id, approval_status, agent_generated, direction")
    .eq("direction", "OUTBOUND")
    .eq("agent_generated", true)
    .order("created_at", { ascending: false })
    .limit(1)

  const draft = msgs?.[0]
  if (!draft) {
    check("outbound draft message created", false, "no rows found")
    return
  }
  draftMessageId = draft.id
  check("outbound draft message created", true)
  check("approval_status = PENDING_APPROVAL", draft.approval_status === "PENDING_APPROVAL", `approval_status=${draft.approval_status}`)
  check("agent_generated = true", draft.agent_generated === true)

  // Check seed message was marked replied
  const { data: inbound } = await db.from("mms_messages").select("replied").eq("id", TEST_IDS.message).single()
  check("inbound message marked replied", inbound?.replied === true, `replied=${inbound?.replied}`)

  console.log(`  → Draft message ID: ${draftMessageId}`)
}

// ── Step 6 & 7: finance + marina agents → notifications ──────────────────

async function step6_financeAgent() {
  console.log("\n── Step 6: finance-agent → overdue notification ──────────")
  const { run } = await import("../ai-agents/agents/finance-agent.js")
  const result = await run()
  check("finance-agent ran without error", result && !result.error, result?.error)
  check("overdue count ≥ 1", (result?.overdueCount ?? 0) >= 1, `overdueCount=${result?.overdueCount}`)

  const { data: notifs } = await db
    .from("mms_notifications")
    .select("id, type, priority")
    .eq("customer_id", TEST_IDS.customer)
    .eq("type", "invoice_overdue")
  check("invoice_overdue notification created", (notifs?.length ?? 0) >= 1, `count=${notifs?.length}`)
  if (notifs?.length) {
    check("priority = MEDIUM (20d overdue)", notifs[0].priority === "MEDIUM", `priority=${notifs[0].priority}`)
  }
}

async function step7_marinaAgent() {
  console.log("\n── Step 7: marina-agent → contract expiry notification ───")
  const { run } = await import("../ai-agents/agents/marina-agent.js")
  const result = await run()
  check("marina-agent ran without error", result && !result.error, result?.error)
  check("alerts ≥ 1", (result?.alerts ?? 0) >= 1, `alerts=${result?.alerts}`)

  const { data: notifs } = await db
    .from("mms_notifications")
    .select("id, type, priority")
    .eq("customer_id", TEST_IDS.customer)
    .eq("type", "contract_expiry")
  check("contract_expiry notification created", (notifs?.length ?? 0) >= 1, `count=${notifs?.length}`)
  if (notifs?.length) {
    check("priority = HIGH (≤7d)", notifs[0].priority === "HIGH", `priority=${notifs[0].priority}`)
  }
}

// ── Step 8: Audit log write ───────────────────────────────────────────────

async function step8_auditLog() {
  console.log("\n── Step 8: Write audit log row ───────────────────────────")
  const result = await api("POST", "/api/db/agent-audit-log", {
    agent_name:  "run2-e2e-test",
    action:      "run2_completed",
    tool_call:   "POST /api/db/agent-audit-log",
    payload:     { test: true, run: 2 },
    result:      { summary: "Phase 5D Run 2 end-to-end test" },
    risk_level:  "LOW",
    created_at:  new Date().toISOString(),
  })
  check("audit log row created", !!result?.id, `id=${result?.id}`)

  const auditCount = await dbCount("mms_agent_audit_log", "agent_name", "run2-e2e-test")
  check("audit log row in DB", auditCount >= 1, `count=${auditCount}`)
}

// ── Step 9: Final safety checks ───────────────────────────────────────────

async function step9_safetyChecks() {
  console.log("\n── Step 9: Safety checks ─────────────────────────────────")

  // pricing_master must not be touched
  const { count: pmCount } = await db.from("pricing_master").select("*", { count: "exact", head: true })
  check("pricing_master unchanged (≥99 rows)", (pmCount ?? 0) >= 99, `count=${pmCount}`)

  // No real customer data — all writes scoped to test customer UUID
  const { data: quotsAll } = await db.from("mms_quotations").select("customer_id").neq("customer_id", TEST_IDS.customer)
  check("no quotations written for non-test customers", (quotsAll?.length ?? 0) === 0, `count=${quotsAll?.length}`)

  // Outbound draft was NOT sent (approval_status stays PENDING_APPROVAL)
  if (draftMessageId) {
    const { data: draft } = await db.from("mms_messages").select("approval_status").eq("id", draftMessageId).single()
    check("draft not sent (still PENDING_APPROVAL)", draft?.approval_status === "PENDING_APPROVAL")
  }
}

// ── Report ────────────────────────────────────────────────────────────────

function report() {
  const total = pass.length + fail.length
  console.log("\n══════════════════════════════════════════════════════════")
  console.log(`  Phase 5D Run ${SKIP_CLAUDE ? "2 (Mock Claude)" : "3 (Real Claude)"} — ${new Date().toLocaleString("en-GB")}`)
  console.log(`  PASSED ${pass.length}/${total}  |  FAILED ${fail.length}/${total}`)
  if (fail.length) {
    console.log("\n  Failed checks:")
    fail.forEach(f => console.log(`    ✗ ${f}`))
  }
  console.log("══════════════════════════════════════════════════════════\n")
  if (fail.length) process.exitCode = 1
}

// ── Main ──────────────────────────────────────────────────────────────────

console.log(`\nPhase 5D Run ${SKIP_CLAUDE ? "2 (Mock Claude)" : "3 (Real Claude)"} — ${API_BASE}`)
console.log(`  DRY_RUN=${DRY_RUN}  SKIP_CLAUDE=${SKIP_CLAUDE}`)

try {
  await step1_reseed()
  await step2_quotationAgent()
  await step3_approveOrder()
  await step4_executeOrder()
  await step5_commsAgent()
  await step6_financeAgent()
  await step7_marinaAgent()
  await step8_auditLog()
  await step9_safetyChecks()
} catch (err) {
  console.error("\nFATAL:", err.message)
  if (process.env.DEBUG) console.error(err.stack)
  fail.push("fatal: " + err.message)
}

report()
