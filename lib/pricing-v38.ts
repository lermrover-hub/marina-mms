export const V38_SOURCE_VERSION = "ORM-PRICE-2026-v3.8"

export type V38VesselCategory =
  | "COMMERCIAL_SPEEDBOAT"
  | "SPORT_CRUISER"
  | "YACHT_MONOHULL"
  | "SAIL_CATAMARAN"
  | "POWER_CATAMARAN"
  | "ALL"
  | "MANAGER_REVIEW"

export type V38DurationCode = "DAILY" | "WEEKLY" | "MONTHLY" | "ONE_CYCLE" | "ROUND_TRIP"
export type V38RateBasis = "FIXED" | "PER_FT" | "PACKAGE" | "MANAGER_REVIEW"

export type V38PricingRule = {
  version: "v3.8"
  serviceType: "RAMP" | "DRY_STORAGE_SERVICE_YARD" | "HAUL_LAUNCH_PACKAGE" | "STANDALONE_COMPONENT" | "MANAGER_REVIEW"
  vesselCategory: V38VesselCategory
  tier?: string | null
  minLoaFt?: number | null
  maxLoaFt?: number | null
  maxWeightT?: number | null
  engineMin?: number | null
  engineMax?: number | null
  duration: V38DurationCode
  durationDays?: number | null
  rateBasis: V38RateBasis
  capThb?: number | null
  isPackage?: boolean
  includedServiceCodes?: string[]
  managerReview?: boolean
  capacityNote?: string | null
}

export type VesselPricingContext = {
  boatId?: string | null
  boatName?: string | null
  boatType?: string | null
  usageType?: string | null
  loaFt?: number | null
  weightT?: number | null
  numEngines?: number | null
}

export type V38PricingOption = {
  id: string
  code: string
  serviceNameEn: string
  unit: string
  rateThb: number
  sourceVersion?: string | null
  quoteAllowed?: string | null
  pricingRule?: V38PricingRule | null
}

export type V38PricingRuleColumns = {
  source_version?: string | null
  service_group?: string | null
  vessel_category?: string | null
  vessel_tier?: string | null
  loa_min_ft?: number | string | null
  loa_max_ft?: number | string | null
  max_weight_t?: number | string | null
  engine_min?: number | null
  engine_max?: number | null
  duration_code?: string | null
  duration_days?: number | null
  rate_basis?: string | null
  cap_thb?: number | string | null
  is_package?: boolean | null
  package_inclusions?: unknown
  quote_allowed?: string | null
  capacity_note?: string | null
}

export type V38CalculatedLine = {
  eligible: boolean
  reason: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
  unit: string
  capAppliedThb: number | null
  descriptionSuffix: string
  pricingInput: VesselPricingContext & {
    inferredVesselCategory: V38VesselCategory
    inferredTier: string | null
    duration: V38DurationCode
  }
}

function normalizedText(value: string | null | undefined) {
  return String(value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_")
}

export function buildV38PricingRuleFromRow(row: V38PricingRuleColumns): V38PricingRule | null {
  if (row.source_version !== V38_SOURCE_VERSION || !row.vessel_category || !row.duration_code || !row.rate_basis) return null
  const serviceType: V38PricingRule["serviceType"] =
    row.service_group === "RAMP" ? "RAMP" :
    row.service_group === "STORAGE_YARD" ? "DRY_STORAGE_SERVICE_YARD" :
    row.service_group === "HAUL_LAUNCH_PACKAGE" ? "HAUL_LAUNCH_PACKAGE" :
    row.service_group === "STANDALONE_COMPONENT" ? "STANDALONE_COMPONENT" :
    "MANAGER_REVIEW"
  const includedServiceCodes = Array.isArray(row.package_inclusions)
    ? row.package_inclusions.filter((value): value is string => typeof value === "string")
    : []
  return {
    version: "v3.8",
    serviceType,
    vesselCategory: row.vessel_category as V38PricingRule["vesselCategory"],
    tier: row.vessel_tier ?? null,
    minLoaFt: row.loa_min_ft != null ? Number(row.loa_min_ft) : null,
    maxLoaFt: row.loa_max_ft != null ? Number(row.loa_max_ft) : null,
    maxWeightT: row.max_weight_t != null ? Number(row.max_weight_t) : null,
    engineMin: row.engine_min ?? null,
    engineMax: row.engine_max ?? null,
    duration: row.duration_code as V38PricingRule["duration"],
    durationDays: row.duration_days ?? null,
    rateBasis: row.rate_basis as V38PricingRule["rateBasis"],
    capThb: row.cap_thb != null ? Number(row.cap_thb) : null,
    isPackage: row.is_package ?? false,
    includedServiceCodes,
    managerReview: row.quote_allowed !== "YES" || row.rate_basis === "MANAGER_REVIEW",
    capacityNote: row.capacity_note ?? null,
  }
}

export function parseV38PricingRule(value: unknown): V38PricingRule | null {
  if (!value) return null
  if (typeof value === "string") {
    try {
      return parseV38PricingRule(JSON.parse(value))
    } catch {
      return null
    }
  }
  if (typeof value !== "object") return null
  const candidate = value as Partial<V38PricingRule>
  return candidate.version === "v3.8" && candidate.serviceType && candidate.vesselCategory && candidate.duration && candidate.rateBasis
    ? candidate as V38PricingRule
    : null
}

export function inferV38VesselCategory(vessel: VesselPricingContext): V38VesselCategory {
  const boatType = normalizedText(vessel.boatType)
  const usageType = normalizedText(vessel.usageType)

  if (boatType.includes("CATAMARAN") || boatType.includes("CAT")) {
    if (boatType.includes("SAIL") || usageType.includes("SAIL")) return "SAIL_CATAMARAN"
    return "POWER_CATAMARAN"
  }
  if (boatType.includes("SPORT") || boatType.includes("CRUISER")) return "SPORT_CRUISER"
  if (boatType.includes("SPEED") || boatType.includes("POWERBOAT")) return "COMMERCIAL_SPEEDBOAT"
  if (boatType.includes("MONOHULL") || boatType.includes("YACHT") || boatType.includes("SAIL")) return "YACHT_MONOHULL"
  return "MANAGER_REVIEW"
}

export function inferSpeedboatTier(vessel: VesselPricingContext): string | null {
  const loa = Number(vessel.loaFt ?? 0)
  const engines = Number(vessel.numEngines ?? 0)
  const loaTier = loa > 60 ? 5 : loa > 50 ? 4 : loa > 40 ? 3 : loa > 27 ? 2 : loa > 0 ? 1 : 0
  const engineTier = engines > 4 ? 5 : engines === 4 ? 4 : engines === 3 ? 3 : engines === 2 ? 2 : engines === 1 ? 1 : 0
  const tier = Math.max(loaTier, engineTier)
  return tier >= 1 && tier <= 4 ? `SB${tier}` : tier > 4 ? "OVER_CAPACITY" : null
}

export function evaluateV38Eligibility(rule: V38PricingRule, vessel: VesselPricingContext) {
  if (rule.managerReview || rule.rateBasis === "MANAGER_REVIEW" || rule.vesselCategory === "MANAGER_REVIEW") {
    return { eligible: false, reason: rule.capacityNote || "Manager review is required." }
  }

  const inferredCategory = inferV38VesselCategory(vessel)
  if (rule.vesselCategory !== "ALL" && inferredCategory !== rule.vesselCategory) {
    return { eligible: false, reason: `Rate is for ${rule.vesselCategory.replace(/_/g, " ")}; vessel is ${inferredCategory.replace(/_/g, " ")}.` }
  }

  const loa = vessel.loaFt == null ? null : Number(vessel.loaFt)
  const weight = vessel.weightT == null ? null : Number(vessel.weightT)
  const tieredSpeedboat = /^SB[1-4]$/.test(rule.tier ?? "")
  // Engine count may promote storage and haul tiers, but cannot extend a confirmed ramp LOA band.
  const engineCanPromote = tieredSpeedboat && (
    rule.serviceType === "DRY_STORAGE_SERVICE_YARD" || rule.serviceType === "HAUL_LAUNCH_PACKAGE"
  )

  if ((rule.minLoaFt != null || rule.maxLoaFt != null) && (!loa || loa <= 0)) {
    return { eligible: false, reason: "Vessel LOA is required for this rate." }
  }
  if (!engineCanPromote && rule.minLoaFt != null && loa! < rule.minLoaFt) return { eligible: false, reason: `Minimum LOA is ${rule.minLoaFt} ft.` }
  if (rule.maxLoaFt != null && loa! > rule.maxLoaFt) return { eligible: false, reason: `Maximum LOA is ${rule.maxLoaFt} ft.` }
  if (rule.maxWeightT != null && weight != null && weight > rule.maxWeightT) return { eligible: false, reason: `Maximum weight is ${rule.maxWeightT} tonnes.` }

  if (tieredSpeedboat) {
    const inferredTier = inferSpeedboatTier(vessel)
    if (!inferredTier) return { eligible: false, reason: "LOA or engine count is required to determine the speedboat tier." }
    if (inferredTier === "OVER_CAPACITY") return { eligible: false, reason: "Vessel exceeds the automatic speedboat tiers and requires manager review." }
    if (inferredTier !== rule.tier) return { eligible: false, reason: `Higher-of LOA/engine rule selects ${inferredTier}, not ${rule.tier}.` }
  }

  return { eligible: true, reason: null }
}

export function calculateV38PricingLine(option: V38PricingOption, vessel: VesselPricingContext): V38CalculatedLine {
  const rule = parseV38PricingRule(option.pricingRule)
  const inferredVesselCategory = inferV38VesselCategory(vessel)
  const inferredTier = inferSpeedboatTier(vessel)

  if (!rule || option.sourceVersion !== V38_SOURCE_VERSION) {
    return {
      eligible: true,
      reason: null,
      quantity: 1,
      unitPrice: Number(option.rateThb),
      lineTotal: Number(option.rateThb),
      unit: option.unit,
      capAppliedThb: null,
      descriptionSuffix: "",
      pricingInput: { ...vessel, inferredVesselCategory, inferredTier, duration: "ONE_CYCLE" },
    }
  }

  if (String(option.quoteAllowed ?? "YES").toUpperCase() !== "YES") {
    return {
      eligible: false,
      reason: "This rate is not available for automatic quotation.",
      quantity: 0,
      unitPrice: 0,
      lineTotal: 0,
      unit: option.unit,
      capAppliedThb: null,
      descriptionSuffix: "",
      pricingInput: { ...vessel, inferredVesselCategory, inferredTier, duration: rule.duration },
    }
  }

  const eligibility = evaluateV38Eligibility(rule, vessel)
  if (!eligibility.eligible) {
    return {
      eligible: false,
      reason: eligibility.reason,
      quantity: 0,
      unitPrice: 0,
      lineTotal: 0,
      unit: option.unit,
      capAppliedThb: null,
      descriptionSuffix: "",
      pricingInput: { ...vessel, inferredVesselCategory, inferredTier, duration: rule.duration },
    }
  }

  const rate = Number(option.rateThb)
  if (rule.rateBasis === "PER_FT") {
    const loa = Number(vessel.loaFt)
    const rawTotal = loa * rate
    const lineTotal = rule.capThb != null ? Math.min(rawTotal, Number(rule.capThb)) : rawTotal
    const capApplied = rule.capThb != null && rawTotal > Number(rule.capThb)
    return {
      eligible: true,
      reason: null,
      quantity: capApplied ? 1 : loa,
      unitPrice: capApplied ? lineTotal : rate,
      lineTotal,
      unit: capApplied ? (rule.duration === "MONTHLY" ? "month" : option.unit) : option.unit,
      capAppliedThb: capApplied ? Number(rule.capThb) : null,
      descriptionSuffix: capApplied ? ` (${loa} ft; capped at THB ${Number(rule.capThb).toLocaleString("en-US")})` : ` (${loa} ft)`,
      pricingInput: { ...vessel, inferredVesselCategory, inferredTier, duration: rule.duration },
    }
  }

  return {
    eligible: true,
    reason: null,
    quantity: 1,
    unitPrice: rate,
    lineTotal: rate,
    unit: option.unit,
    capAppliedThb: null,
    descriptionSuffix: "",
    pricingInput: { ...vessel, inferredVesselCategory, inferredTier, duration: rule.duration },
  }
}

export function hasV38PackageConflict(options: Array<Pick<V38PricingOption, "code" | "pricingRule">>) {
  const packageItems = options.filter((option) => parseV38PricingRule(option.pricingRule)?.isPackage)
  if (packageItems.length === 0) return null
  const included = new Set(packageItems.flatMap((option) => parseV38PricingRule(option.pricingRule)?.includedServiceCodes ?? []))
  const duplicate = options.find((option) => included.has(option.code))
  return duplicate ? `Package already includes ${duplicate.code}; remove the duplicate line item.` : null
}
