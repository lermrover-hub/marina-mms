/**
 * Tide Safety Formula Unit Tests
 *
 * Tests the exact formula from app/api/tide/calculate/route.ts.
 * No API calls, no imports — pure formula verification.
 *
 * Formula (from CLAUDE.md and route.ts):
 *   requiredActualDepth = boatDraft + trailerHeight + safetyClearance
 *   requiredTideHeight  = requiredActualDepth - rampDepthOffset
 *   SAFE when: predictedTide >= requiredTideHeight
 *
 * Approved Ko Samui 2026 defaults (mms_agent_config / agent-config.js):
 *   trailerHeight   = 0.70 m
 *   safetyClearance = 0.10 m
 *   rampDepthOffset = -1.00 m  (negative — ramp surface is 1m below tide datum)
 */

import { test } from "node:test"
import assert from "node:assert/strict"

// ── Mirror of app/api/tide/calculate/route.ts ─────────────────────────────────

function tideSafetyCalc({ boatDraft = 0, trailerHeight = 0, safetyClearance = 0, rampDepthOffset = -1.0, tideData = [] } = {}) {
  const requiredActualDepth = boatDraft + trailerHeight + safetyClearance
  const requiredTideHeight  = requiredActualDepth - rampDepthOffset

  const slots = tideData.map(slot => {
    const h = String(slot.hour).padStart(2, "0")
    return {
      hour:   slot.hour,
      time:   `${h}:00`,
      height: slot.height,
      safe:   slot.height >= requiredTideHeight,
    }
  })

  const firstSafe = slots.find(s => s.safe)
  const earliestSafeHour = firstSafe ? firstSafe.hour : null

  const safeWindows = []
  let windowStart = null
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i]
    if (s.safe && windowStart === null) windowStart = s.hour
    if (!s.safe && windowStart !== null) {
      safeWindows.push({ start: windowStart, end: slots[i - 1].hour })
      windowStart = null
    }
  }
  if (windowStart !== null) safeWindows.push({ start: windowStart, end: slots[slots.length - 1].hour })

  return {
    requiredActualDepth: Math.round(requiredActualDepth * 100) / 100,
    requiredTideHeight:  Math.round(requiredTideHeight  * 100) / 100,
    slots,
    earliestSafeHour,
    safeWindows,
  }
}

// Approved Ko Samui 2026 defaults
const DEFAULTS = { trailerHeight: 0.70, safetyClearance: 0.10, rampDepthOffset: -1.0 }

// ── TD-001: Ko Samui spreadsheet reference case (zero draft) ──────────────────
// Spreadsheet confirms: actual_depth = 0.80 m, required_tide = 1.80 m
test("TD-001: zero draft with approved defaults → actual=0.80 required_tide=1.80", () => {
  const r = tideSafetyCalc({ boatDraft: 0, ...DEFAULTS, tideData: [] })
  assert.equal(r.requiredActualDepth, 0.80)
  assert.equal(r.requiredTideHeight,  1.80)
})

// ── TD-002: typical speedboat (0.50 m draft) ──────────────────────────────────
test("TD-002: 0.50m draft with approved defaults → actual=1.30 required_tide=2.30", () => {
  const r = tideSafetyCalc({ boatDraft: 0.50, ...DEFAULTS, tideData: [] })
  assert.equal(r.requiredActualDepth, 1.30)
  assert.equal(r.requiredTideHeight,  2.30)
})

// ── TD-003: ramp offset drives required tide up (offset is negative) ───────────
test("TD-003: ramp_offset=-1.0 increases required tide by 1.00m above actual depth", () => {
  const r = tideSafetyCalc({ boatDraft: 0.50, ...DEFAULTS, tideData: [] })
  // Use Math.round to avoid floating-point subtraction noise (2.30 - 1.30 = 0.9999…)
  assert.equal(Math.round((r.requiredTideHeight - r.requiredActualDepth) * 100) / 100, 1.00)
})

// ── TD-004: SAFE classification — tide meets threshold exactly ────────────────
test("TD-004: tide exactly at required height is classified SAFE", () => {
  const r = tideSafetyCalc({
    boatDraft: 0, ...DEFAULTS,
    tideData: [{ hour: 6, height: 1.80 }],  // exactly at threshold
  })
  assert.equal(r.slots[0].safe, true)
})

// ── TD-005: UNSAFE classification — tide below threshold ──────────────────────
test("TD-005: tide below required height is classified UNSAFE", () => {
  const r = tideSafetyCalc({
    boatDraft: 0, ...DEFAULTS,
    tideData: [{ hour: 6, height: 1.79 }],  // 1 cm below
  })
  assert.equal(r.slots[0].safe, false)
  assert.equal(r.earliestSafeHour, null)
})

// ── TD-006: earliest safe hour detection ──────────────────────────────────────
test("TD-006: earliestSafeHour returns first SAFE hour", () => {
  const r = tideSafetyCalc({
    boatDraft: 0, ...DEFAULTS,
    tideData: [
      { hour: 4, height: 1.50 },  // UNSAFE
      { hour: 5, height: 1.70 },  // UNSAFE
      { hour: 6, height: 1.80 },  // SAFE
      { hour: 7, height: 2.10 },  // SAFE
    ],
  })
  assert.equal(r.earliestSafeHour, 6)
})

// ── TD-007: contiguous safe window detection ──────────────────────────────────
test("TD-007: contiguous SAFE slots grouped into one window", () => {
  const r = tideSafetyCalc({
    boatDraft: 0, ...DEFAULTS,
    tideData: [
      { hour: 4, height: 1.50 },  // UNSAFE
      { hour: 6, height: 1.80 },  // SAFE — window starts
      { hour: 7, height: 2.10 },  // SAFE
      { hour: 8, height: 2.20 },  // SAFE — window ends
      { hour: 10, height: 1.50 }, // UNSAFE
    ],
  })
  assert.equal(r.safeWindows.length, 1)
  assert.equal(r.safeWindows[0].start, 6)
  assert.equal(r.safeWindows[0].end,   8)
})

// ── TD-008: multiple disjoint safe windows ────────────────────────────────────
test("TD-008: two separate SAFE windows detected correctly", () => {
  const r = tideSafetyCalc({
    boatDraft: 0, ...DEFAULTS,
    tideData: [
      { hour: 6,  height: 1.80 }, // SAFE — window 1
      { hour: 7,  height: 1.50 }, // UNSAFE
      { hour: 14, height: 1.90 }, // SAFE — window 2
      { hour: 15, height: 2.00 }, // SAFE
    ],
  })
  assert.equal(r.safeWindows.length, 2)
  assert.equal(r.safeWindows[0].start, 6)
  assert.equal(r.safeWindows[1].start, 14)
  assert.equal(r.safeWindows[1].end,   15)
})

// ── TD-009: no safe windows → empty array ─────────────────────────────────────
test("TD-009: all UNSAFE tide data → empty safeWindows", () => {
  const r = tideSafetyCalc({
    boatDraft: 0.50, ...DEFAULTS,
    tideData: [
      { hour: 0,  height: 0.50 },
      { hour: 6,  height: 1.00 },
      { hour: 12, height: 1.50 },
    ],
  })
  assert.equal(r.safeWindows.length, 0)
  assert.equal(r.earliestSafeHour,   null)
})

// ── TD-010: floating-point precision — results rounded to 2dp ─────────────────
test("TD-010: requiredActualDepth and requiredTideHeight rounded to 2 decimal places", () => {
  const r = tideSafetyCalc({ boatDraft: 0.333, trailerHeight: 0.70, safetyClearance: 0.10, rampDepthOffset: -1.0, tideData: [] })
  assert.match(String(r.requiredActualDepth), /^\d+\.\d{1,2}$/)
  assert.match(String(r.requiredTideHeight),  /^\d+\.\d{1,2}$/)
})
