import type { PricingCalculationMethod } from "./pricing-engine"

/** The marina has no operational wet berths. Keep this fail-closed. */
export function isWetBerthEnabled() {
  return process.env.ENABLE_WET_BERTH === "true"
}

export function assertWetBerthUnavailable(value: string | null | undefined) {
  if (String(value ?? "").toUpperCase().includes("WET_BERTH") || /wet\s*berth/i.test(String(value ?? ""))) {
    if (!isWetBerthEnabled()) throw new Error("Wet Berth is unavailable until construction is complete.")
  }
}

/**
 * Convert legacy rate-card calculation labels into the canonical engine labels.
 * The unit remains authoritative for duration (day/week/month) and the mapping
 * is deliberately explicit so an unknown label cannot silently bill quantity 1.
 */
export function normalizeCalculationMethod(method: string | null | undefined, unit: string | null | undefined, code?: string | null): PricingCalculationMethod | "TIER4_LOA_DYNAMIC" {
  const raw = String(method ?? "").trim().toUpperCase()
  const normalizedUnit = String(unit ?? "").toLowerCase().replace(/\s+/g, "")
  if (raw === "FLAT_QTY") return "PER_UNIT"
  if (raw === "FLAT_DAYS") return "PER_DAY"
  if (raw === "LOA_RATE_QTY" || raw === "LOA_RATE_DAYS") return "PER_FOOT"
  if (raw === "MANUAL") return "MANUAL_QUOTE"
  if (raw === "TIER4_LOA_DYNAMIC") return "TIER4_LOA_DYNAMIC"
  const canonical: PricingCalculationMethod[] = [
    "FLAT_RATE", "PER_FOOT", "PER_METRE", "PER_TONNE", "PER_SQUARE_METRE",
    "PER_HOUR", "PER_DAY", "PER_WEEK", "PER_MONTH", "PER_UNIT", "COST_PLUS", "MANUAL_QUOTE",
  ]
  if (canonical.includes(raw as PricingCalculationMethod)) return raw as PricingCalculationMethod
  if (/^ft\//.test(normalizedUnit) || normalizedUnit === "ft") return "PER_FOOT"
  throw new Error(`Unsupported pricing calculation method${code ? ` for ${code}` : ""}: ${method ?? "(empty)"}`)
}

export type RateMode = "FULL" | "PILOT"

/** Developer-controlled rate mode. Default remains PILOT during the controlled test period. */
export function resolveRateMode(value?: string | null): RateMode {
  const requested = String(value ?? process.env.MMS_RATE_MODE ?? "PILOT").trim().toUpperCase()
  return requested === "FULL" ? "FULL" : "PILOT"
}

export function selectedRateThb(row: { rate_thb: number | string; full_rate_thb?: number | string | null; pilot_rate_thb?: number | string | null }, mode: RateMode) {
  if (mode === "FULL") return Number(row.full_rate_thb ?? row.rate_thb)
  return Number(row.pilot_rate_thb ?? row.rate_thb)
}

export function isQuotableRate(row: { is_active?: boolean | null; price_status?: string | null; quote_allowed?: string | null }) {
  if (row.is_active === false) return false
  const status = String(row.price_status ?? "ACTIVE").toUpperCase()
  // v3.7 uses explicit APPROVED_* workflow statuses for rates that are safe
  // to quote, while PENDING/BLOCKED/CONTACT/MANUAL rows must remain gated.
  const approvedStatus = status === "ACTIVE" || status === "APPROVED" || status.startsWith("APPROVED_") || status === "SOFT_APPROVED_STAGING"
  if (!approvedStatus) return false
  return ["YES", "MANAGER_REVIEW"].includes(String(row.quote_allowed ?? "YES").toUpperCase())
}

export function requiresManagerReview(row: { quote_allowed?: string | null }) {
  return ["MANAGER_REVIEW", "CONTACT", "MANUAL"].includes(String(row.quote_allowed ?? "").toUpperCase())
}
