export type ServiceRateCardItem = {
  code: string
  serviceNameEn: string
  category: string
  unit: string
  rateThb: number
  directCostThb: number | null
  serviceGroup?: string | null
  subgroup?: string | null
  revenueGlCode?: string | null
  costGlCode?: string | null
  pnlCategory?: string | null
}

export type ServiceWorkflowSection = "RAMP" | "STORAGE" | "YARD"

const TOW_PATTERN = /tow|truck/i

export function workflowSectionForRate(item: ServiceRateCardItem): ServiceWorkflowSection {
  const group = item.serviceGroup ?? ""
  const searchable = `${item.code} ${item.serviceNameEn} ${item.subgroup ?? ""}`
  if (group.startsWith("1.") || group.startsWith("2.") || TOW_PATTERN.test(searchable)) return "RAMP"
  if (group.startsWith("4.")) return "STORAGE"
  return "YARD"
}

export function rateCardItemsForSection<T extends ServiceRateCardItem>(items: T[], section: ServiceWorkflowSection): T[] {
  return items.filter((item) => workflowSectionForRate(item) === section)
}

export function serviceCategories(items: ServiceRateCardItem[]) {
  return [...new Set(items.map((item) => item.subgroup || item.category).filter(Boolean))].sort()
}

export function storagePeriodMatches(item: ServiceRateCardItem, period: string) {
  const unit = item.unit.toLowerCase()
  if (period === "DAILY") return unit.includes("day")
  if (period === "WEEKLY") return unit.includes("week")
  if (period === "MONTHLY") return unit.includes("month")
  return true
}
