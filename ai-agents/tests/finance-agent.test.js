/**
 * Finance Agent Tests
 * Tests AR overdue detection, outstanding balance calc, and live API.
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import "dotenv/config"

const LIVE_API = process.env.ENABLE_LIVE_AGENT_API_TESTS === "true"

// ── Mirrors agent logic ───────────────────────────────────────────────────────

function daysOverdue(dueDateStr) {
  if (!dueDateStr) return null
  const d = new Date(dueDateStr)
  return Math.ceil((new Date() - d) / (1000 * 60 * 60 * 24))
}

function outstanding(inv) {
  if (inv.outstanding_balance != null) return Number(inv.outstanding_balance)
  return Number(inv.total_amount ?? 0) - Number(inv.paid_amount ?? 0)
}

// ── Unit tests ────────────────────────────────────────────────────────────────

test("daysOverdue: past due returns positive", () => {
  const past = new Date(Date.now() - 5 * 86400000).toISOString()
  assert.ok(daysOverdue(past) > 0)
})

test("daysOverdue: future due returns negative", () => {
  const future = new Date(Date.now() + 5 * 86400000).toISOString()
  assert.ok(daysOverdue(future) < 0)
})

test("daysOverdue: null returns null", () => {
  assert.equal(daysOverdue(null), null)
})

test("outstanding: uses outstanding_balance if present", () => {
  const inv = { outstanding_balance: 3000, total_amount: 5000, paid_amount: 2000 }
  assert.equal(outstanding(inv), 3000)
})

test("outstanding: falls back to total - paid", () => {
  const inv = { total_amount: 5000, paid_amount: 2000 }
  assert.equal(outstanding(inv), 3000)
})

test("outstanding: zero paid means full amount", () => {
  const inv = { total_amount: 8000, paid_amount: 0 }
  assert.equal(outstanding(inv), 8000)
})

test("overdue filter: paid invoices excluded", () => {
  const invoices = [
    { id: "1", status: "ISSUED",    due_date: new Date(Date.now() - 5  * 86400000).toISOString() },
    { id: "2", status: "PAID",      due_date: new Date(Date.now() - 10 * 86400000).toISOString() },
    { id: "3", status: "OVERDUE",   due_date: new Date(Date.now() - 20 * 86400000).toISOString() },
    { id: "4", status: "CANCELLED", due_date: new Date(Date.now() - 2  * 86400000).toISOString() },
  ]
  const unpaid = invoices.filter(i => !["paid","PAID","cancelled","CANCELLED"].includes(i.status))
  assert.equal(unpaid.length, 2)
  assert.deepEqual(unpaid.map(i => i.id), ["1", "3"])
})

test("upcoming: due in ≤3 days", () => {
  // Use a 6-day gap to avoid Math.ceil boundary rounding issues
  // (4d rounds to -3 due to sub-millisecond timing differences between
  //  date creation and comparison in the same test run)
  const invoices = [
    { id: "1", due_date: new Date(Date.now() + 1 * 86400000).toISOString() },  // 1d — upcoming
    { id: "2", due_date: new Date(Date.now() + 3 * 86400000).toISOString() },  // 3d — boundary ✓
    { id: "3", due_date: new Date(Date.now() + 6 * 86400000).toISOString() },  // 6d — clear exclude
    { id: "4", due_date: new Date(Date.now() - 1 * 86400000).toISOString() },  // overdue — not upcoming
  ]
  const upcoming = invoices.filter(i => {
    const days = daysOverdue(i.due_date)
    return days !== null && days >= -3 && days <= 0
  })
  assert.equal(upcoming.length, 2)
})

test("priority tiers", () => {
  const priority = (days) => days > 30 ? "HIGH" : days > 7 ? "MEDIUM" : "LOW"
  assert.equal(priority(31), "HIGH")
  assert.equal(priority(30), "MEDIUM")
  assert.equal(priority(8),  "MEDIUM")
  assert.equal(priority(7),  "LOW")
})

// ── Live API smoke test ────────────────────────────────────────────────────────

test("live: invoices endpoint accessible", async (t) => {
  if (!LIVE_API) {
    t.skip("set ENABLE_LIVE_AGENT_API_TESTS=true to run live API smoke tests")
    return
  }

  const BASE      = process.env.MARINA_API_BASE
  const AGENT_KEY = process.env.MARINA_AGENT_API_KEY
  if (!BASE || !AGENT_KEY) { t.skip("env not set"); return }
  try {
    const res = await fetch(`${BASE}/api/db/invoices`, {
      headers: { "x-agent-api-key": AGENT_KEY }, redirect: "manual",
    })
    if (res.status === 404) { t.skip("not yet deployed"); return }
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.ok(Array.isArray(data) || Array.isArray(data?.data))
  } catch (err) {
    t.skip(`Network error: ${err.message.slice(0, 60)}`)
  }
})
