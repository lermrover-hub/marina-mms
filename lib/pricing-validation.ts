import { z } from "zod"

const money = z.coerce.number().finite().min(0).max(999_999_999.99)
const percentage = z.coerce.number().finite().min(0).max(100)
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional()
const effectiveDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "effectiveDate must use YYYY-MM-DD")
  .nullable()
  .optional()

export const PRICING_CALC_TYPES = ["FLAT_QTY", "FLAT_DAYS", "LOA_RATE_QTY", "LOA_RATE_DAYS", "MANUAL"] as const
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
  description: optionalText(2_000),
  notes: optionalText(4_000),
  ...accountingFields,
  discountPct: percentage.default(0),
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
  isActive: z.boolean().optional(),
  ...accountingFields,
})

export function pricingValidationMessage(error: z.ZodError) {
  return error.issues.map((issue) => `${issue.path.join(".") || "request"}: ${issue.message}`).join("; ")
}
