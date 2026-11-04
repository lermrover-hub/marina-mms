import test from "node:test"
import assert from "node:assert/strict"
import { isQuotableRate, normalizeCalculationMethod, resolveRateMode, selectedRateThb } from "../lib/pricing-governance.ts"

test("legacy calculation labels map explicitly to canonical methods", () => {
  assert.equal(normalizeCalculationMethod("FLAT_QTY", "trip"), "PER_UNIT")
  assert.equal(normalizeCalculationMethod("FLAT_DAYS", "day"), "PER_DAY")
  assert.equal(normalizeCalculationMethod("LOA_RATE_QTY", "ft/week"), "PER_FOOT")
  assert.equal(normalizeCalculationMethod("LOA_RATE_DAYS", "ft/month"), "PER_FOOT")
  assert.equal(normalizeCalculationMethod("MANUAL", "quotation"), "MANUAL_QUOTE")
  assert.throws(() => normalizeCalculationMethod("UNKNOWN", "item"), /Unsupported pricing calculation method/)
})

test("rate mode selection never stacks an extra discount", () => {
  const row = { rate_thb: 750, full_rate_thb: 1000, pilot_rate_thb: null }
  assert.equal(resolveRateMode("FULL"), "FULL")
  assert.equal(resolveRateMode("PILOT"), "PILOT")
  assert.equal(selectedRateThb(row, "FULL"), 1000)
  assert.equal(selectedRateThb(row, "PILOT"), 750)
})

test("only active approved or manager-review rows are quoteable", () => {
  assert.equal(isQuotableRate({ is_active: true, price_status: "ACTIVE", quote_allowed: "YES" }), true)
  assert.equal(isQuotableRate({ is_active: true, price_status: "ACTIVE", quote_allowed: "MANAGER_REVIEW" }), true)
  assert.equal(isQuotableRate({ is_active: true, price_status: "APPROVED_CONFIRMED_LAUNCH", quote_allowed: "YES" }), true)
  assert.equal(isQuotableRate({ is_active: true, price_status: "SOFT_APPROVED_STAGING", quote_allowed: "YES" }), true)
  assert.equal(isQuotableRate({ is_active: true, price_status: "CONTACT_ONLY", quote_allowed: "YES" }), false)
  assert.equal(isQuotableRate({ is_active: true, price_status: "BLOCKED", quote_allowed: "YES" }), false)
  assert.equal(isQuotableRate({ is_active: false, price_status: "ACTIVE", quote_allowed: "YES" }), false)
})
