export const QUOTATION_INTERNAL_APPROVER_ROLES = ["SUPER_ADMIN", "MANAGING_DIRECTOR"] as const
export const QUOTATION_MANAGER_APPROVER_ROLES = [
  "SUPER_ADMIN", "MANAGING_DIRECTOR", "MARINA_MANAGER", "BOAT_YARD_MANAGER",
] as const

export const CUSTOMER_VISIBLE_QUOTATION_STATUSES = [
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CONVERTED",
] as const

export function canApproveQuotationInternally(role: string): boolean {
  return (QUOTATION_INTERNAL_APPROVER_ROLES as readonly string[]).includes(role)
}

export function canApproveQuotationForLevel(role: string, level: string): boolean {
  return level === "GENERAL_MANAGER"
    ? canApproveQuotationInternally(role)
    : (QUOTATION_MANAGER_APPROVER_ROLES as readonly string[]).includes(role)
}

export function canEditQuotation(status: string): boolean {
  return status === "DRAFT"
}

export function calculateQuotationLineTotal(item: {
  qty: number
  unit_price: number
  discount_pct?: number | null
}): number {
  const qty = Number(item.qty)
  const unitPrice = Number(item.unit_price)
  const discountPct = Number(item.discount_pct ?? 0)
  if (![qty, unitPrice, discountPct].every(Number.isFinite)) return 0
  return Math.round(qty * unitPrice * (1 - discountPct / 100) * 100) / 100
}

export function validateQuotationTransition(
  currentStatus: string,
  action: string,
  actorRole: string,
): string | null {
  if (action === "submit_for_approval") {
    return currentStatus === "DRAFT"
      ? null
      : "Only a DRAFT quotation can be submitted for approval."
  }

  if (action === "approve_internal") {
    if (!(QUOTATION_MANAGER_APPROVER_ROLES as readonly string[]).includes(actorRole)) {
      return "Only an authorised Manager, Managing Director, or Super Admin can approve a quotation."
    }
    return currentStatus === "PENDING_APPROVAL"
      ? null
      : "Only a PENDING_APPROVAL quotation can be approved."
  }

  if (action === "send_to_customer" || action === "approve_and_send") {
    return currentStatus === "APPROVED"
      ? null
      : "Only an internally APPROVED quotation can be sent to the customer."
  }

  if (action === "return_to_draft") {
    if (!canApproveQuotationInternally(actorRole)) {
      return "Only a Managing Director or Super Admin can return a quotation to draft."
    }
    return currentStatus === "PENDING_APPROVAL"
      ? null
      : "Only a PENDING_APPROVAL quotation can be returned to draft."
  }

  if (action === "customer_approve" || action === "record_customer_acceptance") {
    return currentStatus === "SENT"
      ? null
      : "Only a SENT quotation can be accepted by the customer."
  }

  if (action === "customer_reject") {
    return ["SENT", "ACCEPTED"].includes(currentStatus)
      ? null
      : "Only a SENT or ACCEPTED quotation can be rejected."
  }

  return "Unsupported quotation workflow action."
}
