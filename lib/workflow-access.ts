export const QUOTATION_PRICE_EDIT_ROLES = ["SUPER_ADMIN", "MANAGING_DIRECTOR", "FINANCE"] as const
export const QUOTATION_SUBMIT_ROLES = [
  "SUPER_ADMIN", "MANAGING_DIRECTOR", "FINANCE", "MARINA_MANAGER",
] as const
export const PAYMENT_GATE_ROLES = ["SUPER_ADMIN", "MANAGING_DIRECTOR", "FINANCE"] as const
export const INSURANCE_VERIFY_ROLES = [
  "SUPER_ADMIN", "MANAGING_DIRECTOR", "MARINA_MANAGER", "BOAT_YARD_MANAGER",
] as const
export const SERVICE_ORDER_CONFIRM_ROLES = [
  "SUPER_ADMIN", "MANAGING_DIRECTOR", "MARINA_MANAGER", "BOAT_YARD_MANAGER", "STAFF",
] as const
export const WORK_ORDER_CREATE_ROLES = [
  "SUPER_ADMIN", "MANAGING_DIRECTOR", "MARINA_MANAGER", "BOAT_YARD_MANAGER",
] as const

export function roleAllowed(role: string, allowedRoles: readonly string[]) {
  return allowedRoles.includes(role)
}

export function maxOperationalDiscountForRole(role: string) {
  if (["SUPER_ADMIN", "MANAGING_DIRECTOR"].includes(role)) return 100
  if (["FINANCE", "MARINA_MANAGER", "BOAT_YARD_MANAGER"].includes(role)) return 20
  if (role === "STAFF") return 10
  return 0
}
