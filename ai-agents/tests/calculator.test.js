import { test } from "node:test"
import assert from "node:assert/strict"
import { calcQuotation, calcMargin, validateTotals } from "../agents/calculator.js"

test("calcQuotation: basic totals", () => {
  const r = calcQuotation([{ qty: 2, unitPrice: 5000 }, { qty: 1, unitPrice: 3000 }])
  assert.equal(r.subtotal, 13000)
  assert.equal(r.taxAmount, 910)
  assert.equal(r.grandTotal, 13910)
  assert.equal(r.depositReq, 6955)
})

test("calcQuotation: percent discount", () => {
  const r = calcQuotation([{ qty: 1, unitPrice: 10000 }], { discountType: "PERCENT", discountValue: 10 })
  assert.equal(r.afterDiscount, 9000)
  assert.equal(r.grandTotal, 9630)
})

test("calcQuotation: fixed discount", () => {
  const r = calcQuotation([{ qty: 1, unitPrice: 10000 }], { discountType: "FIXED", discountValue: 1000 })
  assert.equal(r.afterDiscount, 9000)
})

test("calcQuotation: empty items = zero totals", () => {
  const r = calcQuotation([])
  assert.equal(r.grandTotal, 0)
})

test("calcMargin: basic margin", () => {
  const r = calcMargin({ revenue: 100000, laborCost: 30000, materialCost: 20000, contractorCost: 10000 })
  assert.equal(r.grossProfit, 40000)
  assert.equal(r.marginPct, 40)
})

test("calcMargin: zero revenue = 0% margin", () => {
  const r = calcMargin({ revenue: 0, laborCost: 1000 })
  assert.equal(r.marginPct, 0)
})

test("validateTotals: passes correct quotation", () => {
  const q = {
    items: [{ qty: 1, unitPrice: 10000 }],
    discount_type: "NONE", discount_value: 0, tax_rate: 7, deposit_pct: 50,
    subtotal: 10000, tax_amount: 700, grand_total: 10700,
  }
  const r = validateTotals(q)
  assert.ok(r.ok)
  assert.equal(r.issues.length, 0)
})

test("validateTotals: catches wrong grand_total", () => {
  const q = {
    items: [{ qty: 1, unitPrice: 10000 }],
    discount_type: "NONE", discount_value: 0, tax_rate: 7, deposit_pct: 50,
    subtotal: 10000, tax_amount: 700, grand_total: 99999,
  }
  const r = validateTotals(q)
  assert.ok(!r.ok)
  assert.ok(r.issues.some(i => i.includes("grand_total")))
})
