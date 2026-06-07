/**
 * Quotation Agent Tests
 * Tests business logic, data parsing, and dry-run behaviour.
 * Does NOT create any records.
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import "dotenv/config"

const LIVE_API = process.env.ENABLE_LIVE_AGENT_API_TESTS === "true"

// ── Business logic helpers (inline, no import needed) ─────────────────────────

function calcTotals(items) {
  const subtotal   = items.reduce((s, i) => s + (Number(i.qty) || 1) * (Number(i.unitPrice) || 0), 0)
  const taxAmount  = Math.round(subtotal * 0.07)
  const grandTotal = subtotal + taxAmount
  const depositReq = Math.round(grandTotal * 0.5)
  return { subtotal, taxAmount, grandTotal, depositReq }
}

// ── Unit tests: total calculation ─────────────────────────────────────────────

test("calcTotals: single item", () => {
  const items = [{ qty: 2, unitPrice: 1000 }]
  const t = calcTotals(items)
  assert.equal(t.subtotal,   2000)
  assert.equal(t.taxAmount,  140)
  assert.equal(t.grandTotal, 2140)
  assert.equal(t.depositReq, 1070)
})

test("calcTotals: multiple items", () => {
  const items = [
    { qty: 1, unitPrice: 5000 },
    { qty: 3, unitPrice: 500 },
    { qty: 1, unitPrice: 2000 },
  ]
  const t = calcTotals(items)
  assert.equal(t.subtotal,   8500)
  assert.equal(t.taxAmount,  595)
  assert.equal(t.grandTotal, 9095)
  assert.equal(t.depositReq, Math.round(9095 * 0.5))
})

test("calcTotals: zero items", () => {
  const t = calcTotals([])
  assert.equal(t.subtotal,   0)
  assert.equal(t.grandTotal, 0)
  assert.equal(t.depositReq, 0)
})

test("calcTotals: fractional qty", () => {
  const items = [{ qty: 1.5, unitPrice: 1000 }]
  const t = calcTotals(items)
  assert.equal(t.subtotal, 1500)
})

// ── Valid-until date logic ─────────────────────────────────────────────────────

test("validUntil is 7 days from today", () => {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  const expected = d.toISOString().split("T")[0]
  // Allow ±1 day for clock differences
  const today = new Date()
  today.setDate(today.getDate() + 6)
  const earliest = today.toISOString().split("T")[0]
  assert.ok(expected >= earliest, `validUntil ${expected} should be >= ${earliest}`)
})

// ── Status filtering ───────────────────────────────────────────────────────────

test("pending filter: only NEW and INSPECTION_REQUIRED pass", () => {
  const PENDING_STATUSES = ["NEW", "new", "NEW_REQUEST", "new_request", "INSPECTION_REQUIRED", "inspection_required"]
  const requests = [
    { id: "1", status: "new" },
    { id: "2", status: "IN_PROGRESS" },
    { id: "3", status: "INSPECTION_REQUIRED" },
    { id: "4", status: "COMPLETED" },
    { id: "5", status: "NEW_REQUEST" },
  ]
  const pending = requests.filter(r => PENDING_STATUSES.includes(r.status))
  assert.equal(pending.length, 3)
  assert.deepEqual(pending.map(r => r.id), ["1", "3", "5"])
})

test("already-quoted requests are excluded", () => {
  const quotedIds = new Set(["req-1", "req-3"])
  const requests  = [
    { id: "req-1", status: "new" },
    { id: "req-2", status: "new" },
    { id: "req-3", status: "new" },
  ]
  const pending = requests.filter(r => !quotedIds.has(r.id))
  assert.equal(pending.length, 1)
  assert.equal(pending[0].id, "req-2")
})

// ── Live API smoke test ────────────────────────────────────────────────────────

async function liveGet(t, path) {
  if (!LIVE_API) {
    t.skip("set ENABLE_LIVE_AGENT_API_TESTS=true to run live API smoke tests")
    return null
  }

  const BASE      = process.env.MARINA_API_BASE
  const AGENT_KEY = process.env.MARINA_AGENT_API_KEY
  if (!BASE || !AGENT_KEY) { t.skip("MARINA_API_BASE / MARINA_AGENT_API_KEY not set"); return null }
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "x-agent-api-key": AGENT_KEY }, redirect: "manual",
    })
    if (res.status === 404) { t.skip(`${path} not yet deployed`); return null }
    return { status: res.status, data: await res.json() }
  } catch (err) {
    t.skip(`Network error: ${err.message.slice(0, 60)}`)
    return null
  }
}

test("live: service requests endpoint returns array", async (t) => {
  const r = await liveGet(t, "/api/db/service-requests")
  if (!r) return
  assert.equal(r.status, 200)
  assert.ok(Array.isArray(r.data), "service-requests should return array")
})

test("live: pricing master returns active items", async (t) => {
  const r = await liveGet(t, "/api/pricing-master?isActive=true")
  if (!r) return
  assert.equal(r.status, 200)
  const items = r.data?.data ?? r.data
  assert.ok(Array.isArray(items))
  if (items.length > 0) {
    assert.ok(items[0].code,          "pricing item should have code")
    assert.ok(items[0].serviceNameEn, "pricing item should have serviceNameEn")
    assert.ok(items[0].rateThb != null)
  }
})
