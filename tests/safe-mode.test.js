/**
 * Safe-mode flag evaluation tests.
 *
 * Validates the fail-closed rule used in lib/safe-mode.ts:
 * only the exact string "true" enables a flag — everything else blocks.
 *
 * These are pure-logic tests (no TypeScript, no server required).
 * Run with: node --test tests/safe-mode.test.js
 */

import { test } from "node:test"
import assert   from "node:assert/strict"

// Mirror of the flag check in lib/safe-mode.ts
const flag = (val) => val === "true"

// ── Fail-closed cases ──────────────────────────────────────────────────────────

test("blocks: undefined",       () => assert.equal(flag(undefined),   false))
test("blocks: null",            () => assert.equal(flag(null),        false))
test("blocks: empty string",    () => assert.equal(flag(""),          false))
test("blocks: string 'false'",  () => assert.equal(flag("false"),     false))
test("blocks: string '0'",      () => assert.equal(flag("0"),         false))
test("blocks: string '1'",      () => assert.equal(flag("1"),         false))
test("blocks: 'True' (wrong case)", () => assert.equal(flag("True"),  false))
test("blocks: 'TRUE' (wrong case)", () => assert.equal(flag("TRUE"),  false))
test("blocks: ' true' (leading space)", () => assert.equal(flag(" true"), false))
test("blocks: 'true ' (trailing space)", () => assert.equal(flag("true "), false))

// ── Only exact "true" enables ─────────────────────────────────────────────────

test("enables: exact string 'true'", () => assert.equal(flag("true"), true))

// ── All 5 safety flags share the same pattern ─────────────────────────────────

const FLAGS = [
  "AI_AGENT_DRY_RUN",
  "ENABLE_AI_AGENT_WRITES",
  "ENABLE_REAL_CUSTOMER_MESSAGES",
  "ENABLE_PRODUCTION_BOOKINGS",
  "ENABLE_AUTOMATION_WRITES",
]

for (const name of FLAGS) {
  test(`${name}: blocks when not set`, () => {
    const saved = process.env[name]
    delete process.env[name]
    assert.equal(flag(process.env[name]), false)
    if (saved !== undefined) process.env[name] = saved
  })

  test(`${name}: blocks when 'false'`, () => {
    const saved = process.env[name]
    process.env[name] = "false"
    assert.equal(flag(process.env[name]), false)
    if (saved !== undefined) process.env[name] = saved; else delete process.env[name]
  })

  test(`${name}: enables when 'true'`, () => {
    const saved = process.env[name]
    process.env[name] = "true"
    assert.equal(flag(process.env[name]), true)
    if (saved !== undefined) process.env[name] = saved; else delete process.env[name]
  })
}

// ── Middleware write-guard logic ───────────────────────────────────────────────
// Mirrors the decision made in middleware.ts so the guard contract is tested
// without spinning up a Next.js server.

function middlewareWriteAllowed(pathname, method, agentWritesEnabled) {
  const isAgentApiRoute =
    pathname.startsWith("/api/db/") ||
    pathname.startsWith("/api/pricing-master") ||
    pathname.startsWith("/api/tide/") ||
    pathname === "/api/ai/orders" ||
    /^\/api\/ai\/orders\/[^/]+$/.test(pathname)

  if (!isAgentApiRoute) return true  // falls through to session auth

  // POST /api/tide/calculate is pure computation — no DB write, exempt from guard
  const isTideCalculation = pathname === "/api/tide/calculate"
  const isReadOnly = method === "GET" || method === "HEAD" || isTideCalculation

  if (!isReadOnly && agentWritesEnabled !== "true") return false
  return true
}

// Tide calculation: allowed in safe mode (writes disabled)
test("middleware: POST /api/tide/calculate allowed when writes disabled",
  () => assert.equal(middlewareWriteAllowed("/api/tide/calculate", "POST", "false"), true))

test("middleware: POST /api/tide/calculate allowed when writes enabled",
  () => assert.equal(middlewareWriteAllowed("/api/tide/calculate", "POST", "true"),  true))

// Write routes still blocked in safe mode
test("middleware: POST /api/db/messages blocked when writes disabled",
  () => assert.equal(middlewareWriteAllowed("/api/db/messages",      "POST", "false"), false))

test("middleware: POST /api/db/ramp-bookings blocked when writes disabled",
  () => assert.equal(middlewareWriteAllowed("/api/db/ramp-bookings", "POST", "false"), false))

test("middleware: POST /api/db/quotations blocked when writes disabled",
  () => assert.equal(middlewareWriteAllowed("/api/db/quotations",    "POST", "false"), false))

// Read routes always pass
test("middleware: GET /api/db/customers allowed when writes disabled",
  () => assert.equal(middlewareWriteAllowed("/api/db/customers",     "GET",  "false"), true))

test("middleware: GET /api/tide/calculate allowed (GET) when writes disabled",
  () => assert.equal(middlewareWriteAllowed("/api/tide/calculate",   "GET",  "false"), true))

// Non-tide POST routes under /api/tide/ remain blocked (future-proofing)
test("middleware: POST /api/tide/other-route blocked when writes disabled",
  () => assert.equal(middlewareWriteAllowed("/api/tide/other",       "POST", "false"), false))
