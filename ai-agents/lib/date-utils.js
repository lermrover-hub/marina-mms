/**
 * Shared date utility helpers used across multiple agents.
 * Extracted from customer-service-agent.js to avoid duplication.
 */

export function daysOverdue(dueDateStr) {
  if (!dueDateStr) return null
  const d = new Date(dueDateStr)
  return Math.ceil((new Date() - d) / (1000 * 60 * 60 * 24))
}

export function isOverdueInvoice(invoice) {
  if (["paid", "PAID", "cancelled", "CANCELLED"].includes(invoice.status)) return false
  if (invoice.status === "overdue" || invoice.status === "OVERDUE") return true
  const days = daysOverdue(invoice.due_date)
  return days !== null && days > 0
}
