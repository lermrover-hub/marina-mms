/**
 * Pilot guard tests — verify production write safeguards in run.js logic.
 * Tests the guard conditions directly (not spawning run.js) to stay fast.
 */

import { test } from "node:test"
import assert from "node:assert/strict"

// Mirror the guard logic from run.js
function checkGuard({ base, dryRun, pilotMode, agentFilter, srId, customerId }) {
  const isProduction = base.includes("vercel.app") || base.includes("marina-mms.com")
  if (!isProduction || dryRun) return { ok: true }
  if (!pilotMode)    return { ok: false, reason: "requires AI_AGENT_PILOT_MODE=true" }
  if (agentFilter === "all") return { ok: false, reason: "cannot run all agents in production pilot" }
  if (agentFilter === "quotation" && !srId && !customerId)
    return { ok: false, reason: "quotation pilot requires --sr or --customer" }
  return { ok: true }
}

const PROD = "https://marina-mms.vercel.app"
const STG  = "http://localhost:3004"

test("guard: staging + dryRun=false allowed without pilot", () => {
  assert.ok(checkGuard({ base: STG, dryRun: false, pilotMode: false, agentFilter: "all" }).ok)
})

test("guard: production + dryRun=true always allowed", () => {
  assert.ok(checkGuard({ base: PROD, dryRun: true, pilotMode: false, agentFilter: "all" }).ok)
})

test("guard: production + dryRun=false + no pilot → blocked", () => {
  const r = checkGuard({ base: PROD, dryRun: false, pilotMode: false, agentFilter: "quotation" })
  assert.ok(!r.ok)
  assert.match(r.reason, /PILOT_MODE/)
})

test("guard: production + pilot + agent=all → blocked", () => {
  const r = checkGuard({ base: PROD, dryRun: false, pilotMode: true, agentFilter: "all" })
  assert.ok(!r.ok)
  assert.match(r.reason, /all agents/)
})

test("guard: production + pilot + quotation + no sr/customer → blocked", () => {
  const r = checkGuard({ base: PROD, dryRun: false, pilotMode: true, agentFilter: "quotation" })
  assert.ok(!r.ok)
  assert.match(r.reason, /sr.*customer|customer.*sr/)
})

test("guard: production + pilot + quotation + sr provided → allowed", () => {
  const r = checkGuard({ base: PROD, dryRun: false, pilotMode: true, agentFilter: "quotation", srId: "abc-123" })
  assert.ok(r.ok)
})

test("guard: production + pilot + quotation + customer provided → allowed", () => {
  const r = checkGuard({ base: PROD, dryRun: false, pilotMode: true, agentFilter: "quotation", customerId: "cust-1" })
  assert.ok(r.ok)
})

test("guard: production + pilot + marina (no id required) → allowed", () => {
  const r = checkGuard({ base: PROD, dryRun: false, pilotMode: true, agentFilter: "marina" })
  assert.ok(r.ok)
})

test("guard: vercel.app URL detected as production", () => {
  const r = checkGuard({ base: "https://marina-mms.vercel.app", dryRun: false, pilotMode: false, agentFilter: "finance" })
  assert.ok(!r.ok)
})

test("guard: localhost not detected as production", () => {
  const r = checkGuard({ base: "http://localhost:3000", dryRun: false, pilotMode: false, agentFilter: "all" })
  assert.ok(r.ok)
})
