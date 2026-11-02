export type PricingCalculationMethod =
  | "FLAT_RATE"
  | "PER_FOOT"
  | "PER_METRE"
  | "PER_TONNE"
  | "PER_SQUARE_METRE"
  | "PER_HOUR"
  | "PER_DAY"
  | "PER_WEEK"
  | "PER_MONTH"
  | "PER_UNIT"
  | "COST_PLUS"
  | "MANUAL_QUOTE"

export type PricingContext = {
  loaFt?: number | null
  loaM?: number | null
  weightT?: number | null
  areaSqM?: number | null
  hours?: number | null
  quantity?: number | null
  verifiedCostThb?: number | null
  markupPct?: number | null
  minimumChargeThb?: number | null
}

export type PricingResult = {
  amountThb: number | null
  quantity: number | null
  approvalRequired: boolean
  reason: string | null
}

/**
 * Older rate-card rows use LOA_RATE_* while newer catalog rows use PER_FOOT.
 * The billing unit is a second safety signal so a ft/day, ft/week, ft/month
 * or ft/round-trip row can never silently fall back to quantity 1.
 */
export function isPerFootRate(method: string | null | undefined, unit: string | null | undefined) {
  const normalizedMethod = String(method ?? "").toUpperCase()
  const normalizedUnit = String(unit ?? "").toLowerCase().replace(/\s+/g, "")
  return ["PER_FOOT", "LOA_RATE_QTY", "LOA_RATE_DAYS"].includes(normalizedMethod)
    || /^ft\//.test(normalizedUnit)
    || normalizedUnit === "ft"
}

/** v3.7 Tier 4 (51–60 ft) is a dynamic LOA-based rate, not a fixed 51 ft price. */
export function tier4StorageRate(unit: string, loaFt: number): number {
  if (!Number.isFinite(loaFt) || loaFt < 51 || loaFt > 60) {
    throw new Error("Tier 4 storage requires a verified LOA from 51 to 60 ft.")
  }
  const daily = 1500 + 50 * (loaFt - 50)
  const normalizedUnit = String(unit ?? "").toLowerCase().replace(/\s+/g, "")
  if (/month|30days|\/mo\b/.test(normalizedUnit)) return roundToTen(daily * 30 * 0.85)
  if (/week|7days|\/wk\b/.test(normalizedUnit)) return roundToTen(daily * 7 * 0.9)
  if (/day/.test(normalizedUnit)) return roundToTen(daily)
  throw new Error("Tier 4 storage requires a daily, weekly, or monthly billing unit.")
}

const requiredPositive = (value: number | null | undefined, label: string) => {
  if (value == null || !Number.isFinite(value) || value <= 0) throw new Error(`${label} is required for this calculation method.`)
  return value
}

export function calculatePrice(method: PricingCalculationMethod, rateThb: number, context: PricingContext = {}): PricingResult {
  if (!Number.isFinite(rateThb) || rateThb < 0) throw new Error("Rate must be a non-negative number.")
  if (method === "MANUAL_QUOTE") return { amountThb: null, quantity: null, approvalRequired: true, reason: "Manual scope and approved selling price are required." }

  let quantity = 1
  switch (method) {
    case "FLAT_RATE": quantity = 1; break
    case "PER_FOOT": quantity = requiredPositive(context.loaFt, "LOA in feet"); break
    case "PER_METRE": quantity = requiredPositive(context.loaM, "LOA in metres"); break
    case "PER_TONNE": quantity = requiredPositive(context.weightT, "Weight in tonnes"); break
    case "PER_SQUARE_METRE": quantity = requiredPositive(context.areaSqM, "Surface area"); break
    case "PER_HOUR": quantity = requiredPositive(context.hours, "Hours"); break
    case "PER_DAY":
    case "PER_WEEK":
    case "PER_MONTH":
    case "PER_UNIT": quantity = requiredPositive(context.quantity, "Quantity"); break
    case "COST_PLUS": {
      const cost = requiredPositive(context.verifiedCostThb, "Verified subcontractor cost")
      const markup = context.markupPct ?? 0
      if (!Number.isFinite(markup) || markup < 0) throw new Error("Markup must be zero or greater.")
      const amount = cost * (1 + markup / 100)
      return { amountThb: roundMoney(Math.max(amount, context.minimumChargeThb ?? 0)), quantity: 1, approvalRequired: true, reason: "Cost-plus selling price requires approval." }
    }
  }

  return { amountThb: roundMoney(Math.max(rateThb * quantity, context.minimumChargeThb ?? 0)), quantity, approvalRequired: false, reason: null }
}

export type HaulOutEligibilityInput = {
  loaFt?: number | null
  weightT?: number | null
  beamFt?: number | null
  draftFt?: number | null
  hullConfiguration?: string | null
  trailerCompatible?: boolean | null
  centreOfGravityVerified?: boolean | null
}

export type HaulOutEligibility = {
  automaticStandardQuoteAllowed: boolean
  approvalRequired: boolean
  blockers: string[]
  checks: string[]
}

export function evaluateStandardRampHaulOut(input: HaulOutEligibilityInput): HaulOutEligibility {
  const blockers: string[] = []
  const checks: string[] = []
  const loaFt = input.loaFt ?? null
  const weightT = input.weightT ?? null

  if (weightT == null || !Number.isFinite(weightT) || weightT <= 0) blockers.push("Verified operating weight is required before a standard haul-out quotation.")
  else if (weightT > 12) blockers.push(`Vessel weight ${weightT} t exceeds the verified 12 t standard ramp/trailer capacity.`)

  if (loaFt == null || !Number.isFinite(loaFt) || loaFt <= 0) blockers.push("Verified LOA is required before a standard haul-out quotation.")
  else if (loaFt > 42) blockers.push(`LOA ${loaFt} ft exceeds the typical 42 ft standard yacht handling envelope.`)

  const hull = String(input.hullConfiguration ?? "").toUpperCase()
  if (hull.includes("CATAMARAN") || hull.includes("TWIN")) {
    if (loaFt != null && loaFt > 35) blockers.push("Catamarans over approximately 35 ft require manual technical assessment.")
    else checks.push("Confirm approved modified trailer fit for the catamaran.")
  }
  if (input.trailerCompatible !== true) checks.push("Trailer compatibility must be confirmed.")
  if (input.centreOfGravityVerified !== true) checks.push("Centre of gravity must be verified.")
  checks.push("Confirm beam, draft, tide and ramp safety before operation.")

  return {
    automaticStandardQuoteAllowed: blockers.length === 0,
    approvalRequired: blockers.length > 0 || checks.length > 0,
    blockers,
    checks,
  }
}

export function assertNoDuplicateChargeCodes(codes: Array<string | null | undefined>, includedCodes: Array<string | null | undefined> = []) {
  const normalized = codes.filter(Boolean).map((code) => String(code).trim().toUpperCase())
  const duplicate = normalized.find((code, index) => normalized.indexOf(code) !== index)
  if (duplicate) throw new Error(`Duplicate chargeable service is not allowed: ${duplicate}.`)
  const included = new Set(includedCodes.filter(Boolean).map((code) => String(code).trim().toUpperCase()))
  const overlap = normalized.find((code) => included.has(code))
  if (overlap) throw new Error(`${overlap} is already included in the selected base package.`)
}

export function storageDurationMultiplier(unit: string, days: number): number {
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error("Storage duration must be a whole number from 1 to 3650 days.")
  if (/month|30\s*days/i.test(unit)) {
    if (days % 30 !== 0) throw new Error("Monthly per-foot storage requires complete 30-day periods. Use an approved daily rate or request a package quotation for the remainder.")
    return days / 30
  }
  if (/week|7\s*days/i.test(unit) || /\/wk\b/i.test(unit)) {
    if (days % 7 !== 0) throw new Error("Weekly per-foot storage requires complete 7-day periods. Use an approved daily rate or request a package quotation for the remainder.")
    return days / 7
  }
  if (/day/i.test(unit)) return days
  throw new Error("An approved storage billing period is required.")
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function roundToTen(value: number) {
  return Math.round((value + Number.EPSILON) / 10) * 10
}
