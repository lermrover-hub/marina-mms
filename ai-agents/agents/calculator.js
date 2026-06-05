/**
 * Calculator — L3 Executor
 * Price / VAT / deposit / margin calculations.
 * Pure functions — no API calls, no Claude.
 */

const VAT_RATE    = 0.07
const DEPOSIT_PCT = 0.50

/** Calculate quotation totals from line items */
export function calcQuotation(items = [], { discountValue = 0, discountType = "NONE", vatRate = VAT_RATE, depositPct = DEPOSIT_PCT } = {}) {
  const subtotal = items.reduce((s, i) => s + (Number(i.qty) || 1) * (Number(i.unitPrice) || 0), 0)

  let discountAmount = 0
  if (discountType === "PERCENT") discountAmount = subtotal * (Number(discountValue) / 100)
  else if (discountType === "FIXED") discountAmount = Number(discountValue)

  const afterDiscount = Math.max(0, subtotal - discountAmount)
  const taxAmount     = Math.round(afterDiscount * vatRate)
  const grandTotal    = afterDiscount + taxAmount
  const depositReq    = Math.round(grandTotal * depositPct)

  return { subtotal, discountAmount, afterDiscount, taxAmount, grandTotal, depositReq }
}

/** Calculate job margin */
export function calcMargin({ revenue = 0, laborCost = 0, materialCost = 0, contractorCost = 0, otherCost = 0 } = {}) {
  const totalCost   = laborCost + materialCost + contractorCost + otherCost
  const grossProfit = revenue - totalCost
  const marginPct   = revenue > 0 ? (grossProfit / revenue) * 100 : 0
  return { revenue, totalCost, grossProfit, marginPct: Math.round(marginPct * 10) / 10 }
}

/** Validate a quotation object's totals — returns { ok, issues[] } */
export function validateTotals(q) {
  const issues = []
  const calc = calcQuotation(q.items ?? [], {
    discountValue: q.discount_value,
    discountType:  q.discount_type,
    vatRate:       (q.tax_rate ?? 7) / 100,
    depositPct:    (q.deposit_pct ?? 50) / 100,
  })

  const tol = 1 // ±1 THB tolerance for rounding
  if (Math.abs((q.subtotal ?? 0) - calc.subtotal) > tol)       issues.push(`subtotal mismatch: stored ${q.subtotal} vs calc ${calc.subtotal}`)
  if (Math.abs((q.tax_amount ?? 0) - calc.taxAmount) > tol)    issues.push(`tax mismatch: stored ${q.tax_amount} vs calc ${calc.taxAmount}`)
  if (Math.abs((q.grand_total ?? 0) - calc.grandTotal) > tol)  issues.push(`grand_total mismatch: stored ${q.grand_total} vs calc ${calc.grandTotal}`)

  return { ok: issues.length === 0, issues, expected: calc }
}

export function run(params = {}) {
  // Allow CEO agent to dispatch here
  const { mode = "quotation", ...rest } = params
  if (mode === "margin") return { ok: true, result: calcMargin(rest) }
  if (mode === "validate") return { ok: true, result: validateTotals(rest.quotation ?? {}) }
  return { ok: true, result: calcQuotation(rest.items ?? [], rest) }
}
