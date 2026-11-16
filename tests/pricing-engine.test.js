import test from "node:test"
import assert from "node:assert/strict"
import { assertNoDuplicateChargeCodes, calculatePrice, evaluateStandardRampHaulOut, isPerFootRate, storageDurationMultiplier, tier4StorageRate } from "../lib/pricing-engine.ts"

test("per-foot storage includes duration without inventing partial monthly rates", () => {
  assert.equal(40 * 30 * storageDurationMultiplier("ft/day", 10), 12000)
  assert.equal(40 * 525 * storageDurationMultiplier("ft/month", 60), 42000)
  assert.throws(() => storageDurationMultiplier("ft/month", 31), /30-day/)
  assert.equal(storageDurationMultiplier("ft/week", 7), 1)
})

test("per-foot safeguards cover weekly yacht rates and stale calc types", () => {
  assert.equal(isPerFootRate("LOA_RATE_QTY", "ft/week"), true)
  assert.equal(isPerFootRate("FLAT_QTY", "ft/week"), true)
  assert.equal(isPerFootRate("FLAT_QTY", "stand/wk"), false)
  assert.equal(storageDurationMultiplier("ft/week", 21), 3)
  assert.equal(storageDurationMultiplier("THB/ft/7 days", 14), 2)
  assert.equal(storageDurationMultiplier("THB/ft/30 days", 60), 2)
  assert.throws(() => storageDurationMultiplier("ft/week", 10), /7-day/)
  assert.equal(tier4StorageRate("THB/day", 55), 1750)
  assert.equal(tier4StorageRate("THB/7 days", 55), 11030)
  assert.equal(tier4StorageRate("THB/30 days", 60), 51000)
  assert.equal(tier4StorageRate("THB/30 days", 55), 44630)
  assert.throws(() => tier4StorageRate("THB/day", 61), /51 to 60/)
})

test("weekly yacht and boat-stand quantities multiply instead of defaulting to one", () => {
  const yachtLoa = 40
  const yachtWeeklyRate = 220
  assert.equal(yachtLoa * yachtWeeklyRate * storageDurationMultiplier("THB/ft/week", 21), 26400)
  assert.equal(calculatePrice("PER_WEEK", 5400, { quantity: 3 }).amountThb, 16200)
})

test("calculation methods cover flat, dimensions, time, unit and cost-plus", () => {
  assert.equal(calculatePrice("FLAT_RATE", 12000).amountThb, 12000)
  assert.equal(calculatePrice("PER_FOOT", 315, { loaFt: 40 }).amountThb, 12600)
  assert.equal(calculatePrice("PER_METRE", 1000, { loaM: 12 }).amountThb, 12000)
  assert.equal(calculatePrice("PER_TONNE", 500, { weightT: 10 }).amountThb, 5000)
  assert.equal(calculatePrice("PER_SQUARE_METRE", 450, { areaSqM: 20 }).amountThb, 9000)
  assert.equal(calculatePrice("PER_HOUR", 650, { hours: 5 }).amountThb, 3250)
  assert.equal(calculatePrice("PER_DAY", 700, { quantity: 3 }).amountThb, 2100)
  assert.equal(calculatePrice("PER_WEEK", 4200, { quantity: 1 }).amountThb, 4200)
  assert.equal(calculatePrice("PER_MONTH", 18000, { quantity: 1 }).amountThb, 18000)
  assert.equal(calculatePrice("PER_UNIT", 12000, { quantity: 2 }).amountThb, 24000)
  assert.equal(calculatePrice("COST_PLUS", 0, { verifiedCostThb: 10000, markupPct: 15 }).amountThb, 11500)
  assert.equal(calculatePrice("MANUAL_QUOTE", 0).approvalRequired, true)
})

test("standard ramp gate hard-blocks vessels over 12 tonnes", () => {
  const result = evaluateStandardRampHaulOut({ loaFt: 40, weightT: 12.1, trailerCompatible: true, centreOfGravityVerified: true })
  assert.equal(result.automaticStandardQuoteAllowed, false)
  assert.match(result.blockers.join(" "), /12 t/i)
})

test("60 ft SB4 storage classification does not authorize standard haul-out", () => {
  const result = evaluateStandardRampHaulOut({ loaFt: 60, weightT: 10, trailerCompatible: true, centreOfGravityVerified: true })
  assert.equal(result.automaticStandardQuoteAllowed, false)
  assert.match(result.blockers.join(" "), /42 ft/i)
})

test("duplicate and included add-on charges are rejected", () => {
  assert.throws(() => assertNoDuplicateChargeCodes(["CRANE", "CRANE"]), /duplicate/i)
  assert.throws(() => assertNoDuplicateChargeCodes(["BOAT_STANDS"], ["BOAT_STANDS"]), /included/i)
})
