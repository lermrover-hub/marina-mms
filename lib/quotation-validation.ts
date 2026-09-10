export function validateQuotationCreateInput(body: Record<string, unknown>): string | null {
  if (!String(body.customer_id ?? "").trim()) {
    return "customer_id is required"
  }
  if (!String(body.title ?? "").trim()) {
    return "title is required"
  }
  return null
}
