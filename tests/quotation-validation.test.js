import assert from "node:assert/strict"
import test from "node:test"

import { validateQuotationCreateInput } from "../lib/quotation-validation.ts"

test("quotation creation requires a customer", () => {
  assert.equal(validateQuotationCreateInput({ title: "Service quotation" }), "customer_id is required")
})

test("quotation creation requires a title", () => {
  assert.equal(validateQuotationCreateInput({ customer_id: "customer-1" }), "title is required")
})

test("quotation creation accepts trimmed required fields", () => {
  assert.equal(
    validateQuotationCreateInput({ customer_id: " customer-1 ", title: " Service quotation " }),
    null
  )
})
