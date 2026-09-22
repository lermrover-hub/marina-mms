export const SERVICE_REQUEST_TYPES = ["RAMP_SERVICE", "SERVICE_TYPE"] as const
export const RAMP_OPERATION_PLANS = [
  "HAUL_OUT_AND_LAUNCH_CONFIRMED",
  "HAUL_OUT_CONFIRMED_LAUNCH_OPEN",
] as const
export const SERVICE_TYPES = ["STORAGE", "YARD_SERVICE"] as const
export const SERVICE_OPERATORS = [
  "OCEAN_ROVER",
  "BOAT_OWNER_CONTRACTOR",
  "OCEAN_ROVER_SUBCONTRACTOR",
] as const

export type PaymentMode = "FULL_PREPAYMENT" | "DEPOSIT" | "CREDIT"
export type PaymentGateStatus =
  | "AWAITING_PAYMENT"
  | "DEPOSIT_PAID"
  | "PAID"
  | "CREDIT_APPROVED"
  | "OVERDUE"
  | "CREDIT_HOLD"
  | "CANCELLED"

export function defaultPaymentMode(serviceType: string, operatorType: string): PaymentMode {
  return serviceType === "YARD_SERVICE" && operatorType === "OCEAN_ROVER"
    ? "DEPOSIT"
    : "FULL_PREPAYMENT"
}

export function calculateDepositRequired(
  totalAmount: number,
  committedCostAmount: number,
  depositPct = 50,
) {
  const safeTotal = Math.max(0, Number(totalAmount) || 0)
  const percentageDeposit = safeTotal * Math.max(0, Math.min(100, depositPct)) / 100
  return Math.min(safeTotal, Math.max(percentageDeposit, Math.max(0, Number(committedCostAmount) || 0)))
}

export function canConfirmServiceOrder(mode: PaymentMode, status: PaymentGateStatus) {
  if (mode === "FULL_PREPAYMENT") return status === "PAID"
  if (mode === "DEPOSIT") return status === "DEPOSIT_PAID" || status === "PAID"
  return status === "CREDIT_APPROVED" || status === "PAID"
}

export function addUtcDays(date: string, days: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null
  const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function deriveCreditSchedule(yardStartDate: string, launchDate?: string | null, goodCredit = false) {
  const firstCycleDueDate = addUtcDays(yardStartDate, 30)
  if (!firstCycleDueDate) return null
  const launchWithinFirstCycle = Boolean(launchDate && launchDate <= firstCycleDueDate)
  return {
    firstCycleDueDate,
    firstReminderDate: addUtcDays(firstCycleDueDate, -5),
    launchWithinFirstCycle,
    finalDueDate: launchDate
      ? (goodCredit ? addUtcDays(launchDate, 7) : launchDate)
      : firstCycleDueDate,
  }
}

export function minimumQuotationApprover(discountPct: number, hasNoChargeLine: boolean) {
  if (hasNoChargeLine || discountPct > 20) return "GENERAL_MANAGER"
  return "MANAGER"
}

export function validateDiscount(operatorType: string, discountPct: number, unitPrice: number) {
  if (operatorType !== "OCEAN_ROVER" && discountPct > 0) {
    return "Discounts apply only to Ocean Rover Marina-operated services."
  }
  if (operatorType !== "OCEAN_ROVER" && unitPrice === 0) {
    return "Contractor and subcontractor lines cannot be no-charge items."
  }
  if (discountPct < 0 || discountPct > 100) return "Discount must be between 0% and 100%."
  return null
}
