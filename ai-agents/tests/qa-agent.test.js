import { test } from "node:test"
import assert from "node:assert/strict"
import { validate } from "../agents/qa-agent.js"

test("qa: finance passes with required fields", () => {
  const r = validate("finance", { overdueCount: 2, overdueTotal: 50000, upcomingCount: 1, upcomingTotal: 10000, report: "ok" })
  assert.ok(r.ok)
})

test("qa: finance flags missing overdueCount", () => {
  const r = validate("finance", { overdueTotal: 50000 })
  assert.ok(!r.ok)
  assert.ok(r.issues.some(i => i.includes("overdueCount")))
})

test("qa: comms flags empty reply", () => {
  const r = validate("comms", { reply: "  ", customer: "Test" })
  assert.ok(!r.ok)
  assert.ok(r.issues.some(i => i.includes("too short")))
})

test("qa: comms passes normal reply", () => {
  const r = validate("comms", { reply: "Thank you for contacting Ocean Rover Marina.", customer: "Test" })
  assert.ok(r.ok)
})

test("qa: tide passes with safe windows", () => {
  const r = validate("tide", { ok: true, safeWindows: [{ start: 8, end: 10 }], draftM: 0.5 })
  assert.ok(r.ok)
})

test("qa: tide flags no safe windows", () => {
  const r = validate("tide", { ok: true, safeWindows: [], draftM: 1.5 })
  assert.ok(!r.ok)
  assert.ok(r.issues.some(i => i.includes("no safe")))
})

test("qa: null result fails", () => {
  const r = validate("marina", null)
  assert.ok(!r.ok)
})

test("qa: marina passes with alerts field", () => {
  const r = validate("marina", { alerts: 0, breakdown: [] })
  assert.ok(r.ok)
})
