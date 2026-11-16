export const RAMP_SERVICE_CATEGORIES = [
  {
    value: "BOAT_STORAGE",
    code: "A",
    label: "Boat Storage",
    description: "Storage billing by day, week, or month",
  },
  {
    value: "HARDSTAND_SERVICE",
    code: "B",
    label: "Hardstand Service",
    description: "Repair responsibility and commercial model",
  },
] as const

export const RAMP_SERVICE_OPTIONS = {
  BOAT_STORAGE: [
    { value: "STORAGE_DAILY", code: "A1", label: "Daily", description: "Daily boat storage", billingCycle: "DAILY" },
    { value: "STORAGE_WEEKLY", code: "A2", label: "Weekly", description: "Weekly boat storage", billingCycle: "WEEKLY" },
    { value: "STORAGE_MONTHLY", code: "A3", label: "Monthly", description: "Monthly storage with officer billing reminder", billingCycle: "MONTHLY" },
  ],
  HARDSTAND_SERVICE: [
    { value: "OWNER_CONTRACTOR", code: "B1", label: "Owner-appointed contractor", description: "Boat owner appoints and manages the repair contractor", billingCycle: "ONE_TIME" },
    { value: "MARINA_SUBCONTRACTOR", code: "B2", label: "Marina-arranged subcontractor", description: "Marina sources the subcontractor; default markup is 10% of subcontractor quotation", billingCycle: "ONE_TIME" },
    { value: "TURNKEY_PROJECT", code: "B3", label: "Turnkey boat project", description: "Marina manages the complete repair project; default overhead is 15%", billingCycle: "ONE_TIME" },
  ],
} as const

export type RampServiceCategory = keyof typeof RAMP_SERVICE_OPTIONS
export type RampServiceOption = (typeof RAMP_SERVICE_OPTIONS)[RampServiceCategory][number]["value"]

function addOneCalendarMonth(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])
  const targetMonthStart = new Date(Date.UTC(year, monthIndex + 1, 1))
  const targetYear = targetMonthStart.getUTCFullYear()
  const targetMonth = targetMonthStart.getUTCMonth()
  const lastTargetDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const targetDay = Math.min(day, lastTargetDay)

  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`
}

export function getRampServiceOption(category: string, option: string) {
  if (!(category in RAMP_SERVICE_OPTIONS)) return null
  const categoryOptions = RAMP_SERVICE_OPTIONS[category as RampServiceCategory]
  return categoryOptions.find((item) => item.value === option) ?? null
}

export function deriveRampServicePlan(category: string, option: string, requestedDate: string) {
  const selected = getRampServiceOption(category, option)
  if (!selected) return null

  const isMonthly = selected.value === "STORAGE_MONTHLY"
  const isSubcontractor = selected.value === "MARINA_SUBCONTRACTOR"
  const isTurnkey = selected.value === "TURNKEY_PROJECT"

  return {
    service_category: category as RampServiceCategory,
    service_option: selected.value,
    billing_cycle: selected.billingCycle,
    recurring_billing: isMonthly,
    next_billing_date: isMonthly ? addOneCalendarMonth(requestedDate) : null,
    pricing_adjustment_type: isSubcontractor
      ? "SUBCONTRACTOR_MARKUP"
      : isTurnkey
        ? "PROJECT_OVERHEAD"
        : "NONE",
    pricing_adjustment_pct: isSubcontractor ? 10 : isTurnkey ? 15 : 0,
  }
}

export function rampServiceLabel(category: string | null | undefined, option: string | null | undefined) {
  if (!category || !option) return "Not specified"
  const categoryItem = RAMP_SERVICE_CATEGORIES.find((item) => item.value === category)
  const optionItem = getRampServiceOption(category, option)
  if (!categoryItem || !optionItem) return option.replace(/_/g, " ")
  return `${optionItem.code}. ${categoryItem.label} — ${optionItem.label}`
}

export function calculateRampCustomerCharge(estimatedCost: number, adjustmentPct: number) {
  if (!Number.isFinite(estimatedCost) || estimatedCost < 0) return 0
  if (!Number.isFinite(adjustmentPct) || adjustmentPct < 0) return 0
  return Math.round(estimatedCost * (1 + adjustmentPct / 100) * 100) / 100
}
