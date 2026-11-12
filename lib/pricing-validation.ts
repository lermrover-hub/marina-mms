import { z } from "zod"

const money = z.coerce.number().finite().min(0).max(999_999_999.99)
const percentage = z.coerce.number().finite().min(0).max(100)
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional()
const effectiveDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "effectiveDate must use YYYY-MM-DD")
  .nullable()
  .optional()

export const PRICING_CALC_TYPES = ["FLAT_QTY", "FLAT_DAYS", "LOA_RATE_QTY", "LOA_RATE_DAYS", "LOA_MULTIPLIER", "TIER4_LOA_DYNAMIC", "MANUAL", "FLAT_RATE", "PER_FOOT", "PER_METRE", "PER_TONNE", "PER_SQUARE_METRE", "PER_HOUR", "PER_DAY", "PER_WEEK", "PER_MONTH", "PER_UNIT", "COST_PLUS", "MANUAL_QUOTE"] as const
export const PRICING_QUOTE_RULES = ["YES", "NO", "CONTACT", "MANAGER_REVIEW", "MANUAL"] as const
export const PRICING_STATUSES = ["ACTIVE", "INACTIVE", "CONTACT_ONLY", "PENDING_PAINT_TEAM", "MANUAL_QUOTE"] as const

const accountingFields = {
  fullRateThb: money.optional(),
  discountPct: percentage.optional(),
  sourceDiscountPct: percentage.optional(),
  directCostThb: money.nullable().optional(),
  revenueGlCode: optionalText(50),
  costGlCode: optionalText(50),
  pnlCategory: optionalText(120),
  costPnlCategory: optionalText(120),
  costBasis: optionalText(500),
  calcType: z.enum(PRICING_CALC_TYPES).optional(),
  serviceGroup: optionalText(120),
  subgroup: optionalText(120),
  providerType: optionalText(160),
  quoteAllowed: z.enum(PRICING_QUOTE_RULES).optional(),
  priceStatus: z.enum(PRICING_STATUSES).optional(),
  sourceVersion: optionalText(100),
  effectiveDate,
}

export const pricingCreateSchema = z.object({
  code: z.string().trim().min(1).max(80),
  serviceNameEn: z.string().trim().min(1).max(240),
  serviceNameTh: optionalText(240),
  category: z.string().trim().min(1).max(120),
  unit: z.string().trim().min(1).max(80),
  rateThb: money,
  pilotRateThb: money.nullable().optional(),
  pilotNotes: optionalText(1_000),
  description: optionalText(2_000),
  notes: optionalText(4_000),
  ...accountingFields,
  discountPct: percentage.default(0),
}).superRefine((value, context) => {
  if (value.priceStatus === "ACTIVE" && ["YES", "MANAGER_REVIEW"].includes(value.quoteAllowed ?? "NO") && value.rateThb <= 0) {
    context.addIssue({ code: "custom", path: ["rateThb"], message: "An approved selling price is required for automatic quotation" })
  }
  if (value.priceStatus === "ACTIVE" && ["YES", "MANAGER_REVIEW"].includes(value.quoteAllowed ?? "NO") && value.pilotRateThb === 0) {
    context.addIssue({ code: "custom", path: ["pilotRateThb"], message: "Pilot rate must be positive for an active quotable service" })
  }
})

export const pricingUpdateSchema = z.object({
  serviceNameEn: z.string().trim().min(1).max(240).optional(),
  serviceNameTh: optionalText(240),
  category: z.string().trim().min(1).max(120).optional(),
  unit: z.string().trim().min(1).max(80).optional(),
  rateThb: money.optional(),
  pilotRateThb: money.nullable().optional(),
  pilotNotes: optionalText(1_000),
  description: optionalText(2_000),
  notes: optionalText(4_000),
  ...accountingFields,
  // Existing v3.7 records carry approved workflow-specific statuses. The API
  // checks transitions against the stored row before writing either status.
  priceStatus: z.string().trim().min(1).max(100).optional(),
})

export function validatePricingTransition(
  current: { priceStatus: string; quoteAllowed: string; rateThb: number; pilotRateThb?: number | null },
  update: { priceStatus?: string; quoteAllowed?: string; rateThb?: number; pilotRateThb?: number | null },
): string | null {
  const nextStatus = update.priceStatus ?? current.priceStatus
  const nextQuoteRule = update.quoteAllowed ?? current.quoteAllowed
  const nextRate = update.rateThb ?? current.rateThb
  const nextPilot = update.pilotRateThb === undefined ? current.pilotRateThb : update.pilotRateThb

  if (update.priceStatus && update.priceStatus !== current.priceStatus) {
    if (!(["ACTIVE", "INACTIVE"] as string[]).includes(update.priceStatus)) {
      return "Only ACTIVE or INACTIVE can be selected for a status change. Existing approved workflow statuses are preserved."
    }
    if (["LEGACY_ALIAS", "REFERENCE_ONLY", "BLOCKED_WET_BERTH"].includes(current.priceStatus) && update.priceStatus === "ACTIVE") {
      return "Retired legacy, reference or blocked wet-berth codes cannot be reactivated. Create a new approved rate code."
    }
  }
  const autoQuotableStatus = nextStatus === "ACTIVE" || nextStatus === "APPROVED" || nextStatus.startsWith("APPROVED_") || nextStatus === "SOFT_APPROVED_STAGING"
  if (autoQuotableStatus && ["YES", "MANAGER_REVIEW"].includes(nextQuoteRule) && nextRate <= 0) {
    return "An approved selling price is required for automatic quotation."
  }
  if (autoQuotableStatus && ["YES", "MANAGER_REVIEW"].includes(nextQuoteRule) && nextPilot === 0) {
    return "Pilot rate must be positive for an active quotable service."
  }
  return null
}

export function pricingValidationMessage(error: z.ZodError) {
  return error.issues.map((issue) => `${issue.path.join(".") || "request"}: ${issue.message}`).join("; ")
}
