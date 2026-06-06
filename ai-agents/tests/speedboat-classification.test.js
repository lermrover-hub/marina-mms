/**
 * Speedboat Engine-Group Classification tests
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { classifySpeedboat, speedboatRampCode } from "../lib/speedboat-classification.js"

// ── LOA → engine group ────────────────────────────────────────────────────────

test("LOA 20ft → group 1, Normal, RAMP_1OB", () => {
  const r = classifySpeedboat({ loaFt: 20 })
  assert.equal(r.engineGroup, 1)
  assert.equal(r.effectiveRiskFlag, "Normal")
  assert.equal(r.rampCode, "RAMP_1OB")
  assert.equal(r.mismatchWarning, null)
})

test("LOA 27ft (boundary) → group 1", () => {
  const r = classifySpeedboat({ loaFt: 27 })
  assert.equal(r.engineGroup, 1)
})

test("LOA 28ft → group 2, Normal, RAMP_2OB", () => {
  const r = classifySpeedboat({ loaFt: 28 })
  assert.equal(r.engineGroup, 2)
  assert.equal(r.effectiveRiskFlag, "Normal")
  assert.equal(r.rampCode, "RAMP_2OB")
})

test("LOA 40ft (boundary) → group 2", () => {
  const r = classifySpeedboat({ loaFt: 40 })
  assert.equal(r.engineGroup, 2)
})

test("LOA 41ft → group 3, Medium, RAMP_3OB", () => {
  const r = classifySpeedboat({ loaFt: 41 })
  assert.equal(r.engineGroup, 3)
  assert.equal(r.effectiveRiskFlag, "Medium")
  assert.equal(r.rampCode, "RAMP_3OB")
})

test("LOA 47ft (boundary) → group 3", () => {
  const r = classifySpeedboat({ loaFt: 47 })
  assert.equal(r.engineGroup, 3)
})

test("LOA 48ft → group 4, High, RAMP_3OB", () => {
  const r = classifySpeedboat({ loaFt: 48 })
  assert.equal(r.engineGroup, 4)
  assert.equal(r.effectiveRiskFlag, "High")
  assert.equal(r.rampCode, "RAMP_3OB")
})

// ── Engine count mismatch warning ─────────────────────────────────────────────

test("LOA 32ft + 1 engine → group 2, mismatch warning (LOA wins)", () => {
  const r = classifySpeedboat({ loaFt: 32, engines: 1 })
  assert.equal(r.engineGroup, 2)              // LOA says group 2
  assert.ok(r.mismatchWarning !== null)
  assert.match(r.mismatchWarning, /LOA.*takes priority/i)
})

test("LOA 25ft + 2 engines → group 1, mismatch warning", () => {
  const r = classifySpeedboat({ loaFt: 25, engines: 2 })
  assert.equal(r.engineGroup, 1)
  assert.ok(r.mismatchWarning !== null)
})

test("LOA 35ft + 2 engines → no mismatch (agree)", () => {
  const r = classifySpeedboat({ loaFt: 35, engines: 2 })
  assert.equal(r.mismatchWarning, null)
})

// ── Secondary risk escalation ─────────────────────────────────────────────────

test("Group 2 + wide beam (9.5ft) → escalate to Medium", () => {
  const r = classifySpeedboat({ loaFt: 35, beamFt: 9.5 })
  assert.equal(r.primaryRiskFlag, "Normal")
  assert.equal(r.effectiveRiskFlag, "Medium")
  assert.ok(r.escalationReasons.some(s => s.includes("beam")))
})

test("Group 3 + deep draft (2.6ft) → escalate to High", () => {
  const r = classifySpeedboat({ loaFt: 43, draftFt: 2.6 })
  assert.equal(r.primaryRiskFlag, "Medium")
  assert.equal(r.effectiveRiskFlag, "High")
})

test("Group 3 + heavy (4500kg) → escalate to High", () => {
  const r = classifySpeedboat({ loaFt: 44, weightKg: 4500 })
  assert.equal(r.effectiveRiskFlag, "High")
  assert.ok(r.escalationReasons.some(s => s.includes("kg")))
})

test("Group 3 + beam + weight → escalate to Special Handling (max 2 steps)", () => {
  const r = classifySpeedboat({ loaFt: 44, beamFt: 9.5, weightKg: 5000 })
  assert.equal(r.effectiveRiskFlag, "Special Handling")
})

test("Group 4 + all escalators → stays at Special Handling (capped)", () => {
  const r = classifySpeedboat({ loaFt: 52, beamFt: 10, draftFt: 3, weightKg: 6000 })
  assert.equal(r.effectiveRiskFlag, "Special Handling")
})

// ── Convenience function ──────────────────────────────────────────────────────

test("speedboatRampCode returns correct code", () => {
  assert.equal(speedboatRampCode({ loaFt: 20 }), "RAMP_1OB")
  assert.equal(speedboatRampCode({ loaFt: 35 }), "RAMP_2OB")
  assert.equal(speedboatRampCode({ loaFt: 45 }), "RAMP_3OB")
})

test("no input → defaults to group 1 (LOA 0)", () => {
  const r = classifySpeedboat({})
  assert.equal(r.engineGroup, 1)
  assert.equal(r.rampCode, "RAMP_1OB")
})
