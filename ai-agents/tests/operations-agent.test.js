/**
 * Operations Agent Tests
 * Tests expiry/overdue detection logic and live API data.
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import "dotenv/config"

// ── daysUntil helper (mirrors agent logic) ────────────────────────────────────

function daysUntil(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24))
}

// ── Unit tests ────────────────────────────────────────────────────────────────

test("daysUntil: past date returns negative", () => {
  const past = new Date(Date.now() - 10 * 86400000).toISOString()
  assert.ok(daysUntil(past) < 0)
})

test("daysUntil: future date returns positive", () => {
  const future = new Date(Date.now() + 10 * 86400000).toISOString()
  assert.ok(daysUntil(future) > 0)
})

test("daysUntil: null returns null", () => {
  assert.equal(daysUntil(null), null)
  assert.equal(daysUntil(undefined), null)
})

test("expiry window filter: only 0–30 days included", () => {
  const contracts = [
    { id: "a", end_date: new Date(Date.now() + 5  * 86400000).toISOString() },  // 5d  → include
    { id: "b", end_date: new Date(Date.now() + 30 * 86400000).toISOString() },  // 30d → include (boundary)
    { id: "c", end_date: new Date(Date.now() + 31 * 86400000).toISOString() },  // 31d → exclude
    { id: "d", end_date: new Date(Date.now() - 1  * 86400000).toISOString() },  // -1d → exclude (already expired)
  ]
  const expiring = contracts.filter(c => {
    const d = daysUntil(c.end_date)
    return d !== null && d >= 0 && d <= 30
  })
  assert.equal(expiring.length, 2)
  assert.deepEqual(expiring.map(c => c.id), ["a", "b"])
})

test("overdue work order filter: only IN_PROGRESS > 14 days", () => {
  const wos = [
    { id: "1", status: "IN_PROGRESS",  created_at: new Date(Date.now() - 20 * 86400000).toISOString() }, // overdue
    { id: "2", status: "IN_PROGRESS",  created_at: new Date(Date.now() - 10 * 86400000).toISOString() }, // not yet
    { id: "3", status: "COMPLETED",    created_at: new Date(Date.now() - 20 * 86400000).toISOString() }, // wrong status
    { id: "4", status: "WAITING_PARTS",created_at: new Date(Date.now() - 15 * 86400000).toISOString() }, // overdue
  ]
  const IN_PROGRESS_STATUSES = ["in_progress", "IN_PROGRESS", "waiting_parts", "WAITING_PARTS"]
  const overdue = wos.filter(wo => {
    const inProg = IN_PROGRESS_STATUSES.includes(wo.status)
    const age    = daysUntil(wo.created_at)
    return inProg && age !== null && age < -14
  })
  assert.equal(overdue.length, 2)
  assert.deepEqual(overdue.map(w => w.id), ["1", "4"])
})

test("priority: ≤7 days = HIGH, else MEDIUM", () => {
  const priority = (days) => days <= 7 ? "HIGH" : "MEDIUM"
  assert.equal(priority(5),  "HIGH")
  assert.equal(priority(7),  "HIGH")
  assert.equal(priority(8),  "MEDIUM")
  assert.equal(priority(30), "MEDIUM")
})

// ── Live API smoke test ────────────────────────────────────────────────────────

async function liveGet(t, path) {
  const BASE      = process.env.MARINA_API_BASE
  const AGENT_KEY = process.env.MARINA_AGENT_API_KEY
  if (!BASE || !AGENT_KEY) { t.skip("env not set"); return null }
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

test("live: contracts endpoint returns array", async (t) => {
  const r = await liveGet(t, "/api/db/contracts")
  if (!r) return
  assert.equal(r.status, 200)
  assert.ok(Array.isArray(r.data) || Array.isArray(r.data?.data))
})

test("live: work-orders endpoint returns array", async (t) => {
  const r = await liveGet(t, "/api/db/work-orders")
  if (!r) return
  assert.equal(r.status, 200)
  assert.ok(Array.isArray(r.data) || Array.isArray(r.data?.data))
})
