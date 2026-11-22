import assert from "node:assert/strict"
import test from "node:test"
// @ts-expect-error Node's native type stripping requires the explicit .ts extension here.
import { V38_SOURCE_VERSION, buildV38PricingRuleFromRow, calculateV38PricingLine, evaluateV38Eligibility, hasV38PackageConflict, inferSpeedboatTier, type V38PricingOption } from "../lib/pricing-v38.ts"
import { generateApprovedV38Rates } from "../scripts/seed-pricing-v38.mjs"

const rows = generateApprovedV38Rates()

function option(code: string): V38PricingOption {
  const row = rows.find((candidate) => candidate.code === code)
  assert.ok(row, `Missing seed row ${code}`)
  return {
    id: code,
    code,
    serviceNameEn: row.service_name_en,
    unit: row.unit,
    rateThb: row.rate_thb,
    sourceVersion: row.source_version,
    quoteAllowed: row.quote_allowed,
    pricingRule: buildV38PricingRuleFromRow(row),
  }
}

test("seed generates the complete approved v3.8 catalog", () => {
  assert.equal(rows.length, 52)
  assert.ok(rows.every((row) => row.source_version === "ORM-PRICE-2026-v3.8"))
  assert.ok(rows.every((row) => row.rate_card_version_id === "orm-price-2026-v3-8"))
  assert.equal(rows.filter((row) => row.service_group === "STORAGE_YARD").length, 30)
  assert.equal(rows.filter((row) => row.service_group === "HAUL_LAUNCH_PACKAGE").length, 15)
  assert.equal(rows.filter((row) => row.service_group === "STANDALONE_COMPONENT").length, 2)
  assert.equal(rows.filter((row) => row.service_group === "MANAGER_REVIEW").length, 5)
  const haulCodes = rows.filter((row) => row.service_group === "HAUL_LAUNCH_PACKAGE" && row.vessel_category === "COMMERCIAL_SPEEDBOAT")
  assert.deepEqual(haulCodes.map((row) => row.code), [
    "HAUL_SB_1ENG_15_27", "HAUL_SB_2ENG_28_40", "HAUL_SB_3ENG_41_50", "HAUL_SB_4ENG_51_60",
  ])
  assert.deepEqual(haulCodes.map((row) => row.rate_thb), [7000, 9500, 12500, 16000])
  assert.ok(haulCodes.every((row) => row.is_package && row.rate_basis === "PACKAGE" && row.package_inclusions.includes("TOW-ROUND-TRIP")))
  assert.ok(rows.every((row) => !/^PKG-HL-SB[1-4]$/.test(row.code)))
})

test("speedboat tier boundaries follow the approved LOA ranges", () => {
  assert.equal(inferSpeedboatTier({ loaFt: 27, numEngines: 1 }), "SB1")
  assert.equal(inferSpeedboatTier({ loaFt: 28, numEngines: 1 }), "SB2")
  assert.equal(inferSpeedboatTier({ loaFt: 40, numEngines: 2 }), "SB2")
  assert.equal(inferSpeedboatTier({ loaFt: 41, numEngines: 2 }), "SB3")
  assert.equal(inferSpeedboatTier({ loaFt: 50, numEngines: 3 }), "SB3")
  assert.equal(inferSpeedboatTier({ loaFt: 51, numEngines: 3 }), "SB4")
  assert.equal(inferSpeedboatTier({ loaFt: 61, numEngines: 4 }), "OVER_CAPACITY")
})

test("higher-of LOA and engine count selects the more expensive tier", () => {
  assert.equal(inferSpeedboatTier({ loaFt: 25, numEngines: 3 }), "SB3")
  assert.equal(inferSpeedboatTier({ loaFt: 45, numEngines: 1 }), "SB3")

  const sb1 = option("STG-SB1-D")
  const result = calculateV38PricingLine(sb1, { boatType: "Speedboat", loaFt: 25, numEngines: 3 })
  assert.equal(result.eligible, false)
  assert.match(result.reason ?? "", /selects SB3, not SB1/)
  const promoted = calculateV38PricingLine(option("STG-SB3-D"), { boatType: "Speedboat", loaFt: 25, numEngines: 3, weightT: 5 })
  assert.equal(promoted.eligible, true)
  assert.equal(promoted.lineTotal, 900)
  assert.equal(inferSpeedboatTier({ loaFt: 49, numEngines: 5 }), "OVER_CAPACITY")
})

test("approved fixed M3 price uses LOA to select a band, not to multiply the rate", () => {
  const rule = buildV38PricingRuleFromRow({
    source_version: V38_SOURCE_VERSION, service_group: "STORAGE_YARD",
    vessel_category: "YACHT_MONOHULL", vessel_tier: "M3", loa_min_ft: 39,
    loa_max_ft: 42.99, max_weight_t: 14, duration_code: "MONTHLY", rate_basis: "FIXED", quote_allowed: "YES",
  })
  const fixed = { ...option("STG-MONO-M"), pricingRule: rule, rateThb: 26000, unit: "month" }
  for (const loaFt of [39, 40, 42.99]) {
    const result = calculateV38PricingLine(fixed, { boatType: "SAILING_YACHT", loaFt, weightT: 14 })
    assert.equal(result.eligible, true)
    assert.equal(result.quantity, 1)
    assert.equal(result.lineTotal, 26000)
  }
  assert.equal(calculateV38PricingLine(fixed, { boatType: "MOTOR_YACHT", loaFt: 43, weightT: 12 }).eligible, false)
  assert.equal(calculateV38PricingLine(fixed, { boatType: "MOTOR_YACHT", loaFt: 40, weightT: 14.01 }).eligible, false)
})

test("approved storage rates and Sport Cruiser multiplier are preserved", () => {
  assert.equal(option("STG-SB1-D").rateThb, 500)
  assert.equal(option("STG-SB2-W").rateThb, 4410)
  assert.equal(option("STG-SB3-M").rateThb, 20250)
  assert.equal(option("STG-SB4-M").rateThb, 26000)
  assert.equal(option("STG-SC-SB2-M").rateThb, 18900)
  assert.equal(option("STG-SC-SB4-M").rateThb, 31200)
})

test("Yacht Monohull monthly per-foot calculation applies the THB 26,000 cap", () => {
  const result = calculateV38PricingLine(option("STG-MONO-M"), {
    boatType: "Yacht Monohull",
    loaFt: 45,
    weightT: 13,
  })
  assert.equal(result.eligible, true)
  assert.equal(result.lineTotal, 26000)
  assert.equal(result.capAppliedThb, 26000)
  assert.equal(result.quantity, 1)
  assert.equal(result.unit, "month")
})

test("Sail Catamaran uses 1.5x rates and applies the THB 39,000 monthly cap", () => {
  const monthly = option("STG-SAILCAT-M")
  assert.equal(monthly.rateThb, 975)
  const result = calculateV38PricingLine(monthly, {
    boatType: "Sail Catamaran",
    loaFt: 41,
  })
  assert.equal(result.eligible, true)
  assert.equal(result.lineTotal, 39000)
  assert.equal(result.capAppliedThb, 39000)
})

test("package conflict rejects separately added included services", () => {
  const conflict = hasV38PackageConflict([
    option("HAUL_SB_2ENG_28_40"),
    option("TOW-ROUND-TRIP"),
  ])
  assert.match(conflict ?? "", /already includes TOW-ROUND-TRIP/)
  assert.equal(hasV38PackageConflict([option("HAUL_SB_2ENG_28_40")]), null)
})

test("manager-review placeholders cannot be auto-quoted", () => {
  const powerCat = option("MR-POWER-CAT")
  assert.equal(powerCat.sourceVersion, V38_SOURCE_VERSION)
  const rule = powerCat.pricingRule
  assert.ok(rule)
  const eligibility = evaluateV38Eligibility(rule, { boatType: "Power Catamaran", loaFt: 38 })
  assert.equal(eligibility.eligible, false)
  assert.match(eligibility.reason ?? "", /review/i)

  const calculated = calculateV38PricingLine(powerCat, { boatType: "Power Catamaran", loaFt: 38 })
  assert.equal(calculated.eligible, false)
  assert.equal(calculated.lineTotal, 0)
})

test("capacity metadata uses the approved limits without adding unapproved prices", () => {
  for (const code of ["STG-SB4-M", "STG-SC-SB4-M", "HAUL_SB_4ENG_51_60", "PKG-HL-SC-SB4", "PKG-HL-MONO-43-45"]) {
    assert.equal(option(code).pricingRule?.maxWeightT, 14)
  }
  for (const code of ["STG-SAILCAT-M", "PKG-HL-SAILCAT-39-41", "MR-POWER-CAT"]) {
    assert.equal(option(code).pricingRule?.maxWeightT, 12)
    assert.equal(option(code).pricingRule?.maxLoaFt, 41)
  }
  assert.equal(calculateV38PricingLine(option("STG-SB4-M"), { boatType: "SPEEDBOAT", loaFt: 60, weightT: 14, numEngines: 4 }).eligible, true)
  assert.equal(calculateV38PricingLine(option("STG-SB4-M"), { boatType: "SPEEDBOAT", loaFt: 60, weightT: 14.01, numEngines: 4 }).eligible, false)
  assert.equal(calculateV38PricingLine(option("PKG-HL-SAILCAT-39-41"), { boatType: "Sail Catamaran", loaFt: 41, weightT: 12.01 }).eligible, false)
  assert.ok(rows.filter(row => row.rate_basis === "PER_FT").every(row => row.calc_type === "LOA_RATE_QTY"))
})
