import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  calculateInvoiceTotals,
  invoiceCreateSchema,
  normalizeInvoiceItems,
  paymentCreateSchema,
  validateNoInitialInvoicePayment,
} from "../lib/financial-input.ts"

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8")

test("invoice input strips server-owned financial and audit fields", () => {
  const result = invoiceCreateSchema.parse({
    customer_id: "customer-1",
    status: "ISSUED",
    total_amount: 1,
    paid_amount: 999_999,
    outstanding_balance: -999_998,
    customer_name: "Injected name",
    created_at: "2000-01-01T00:00:00Z",
    items: [{ description: "Haul-out", qty: 2, unit_price: 1_000 }],
  })

  assert.equal("total_amount" in result, false)
  assert.equal("paid_amount" in result, false)
  assert.equal("outstanding_balance" in result, false)
  assert.equal("customer_name" in result, false)
  assert.equal("created_at" in result, false)
})

test("invoice totals are calculated from normalized allowlisted items", () => {
  const items = normalizeInvoiceItems([
    { description: "Taxable service", qty: 2, unit_price: 1_000, discount_pct: 10, taxable: true },
    { description: "Non-taxable service", quantity: 1, unitPrice: 500, taxable: false },
  ])

  assert.deepEqual(calculateInvoiceTotals(items, 10), {
    subtotal: 2_300,
    discount: 230,
    vatAmount: 113.4,
    totalAmount: 2_183.4,
  })
  assert.deepEqual(Object.keys(items[0]), [
    "description", "category", "qty", "unit", "unit_price",
    "discount_pct", "taxable", "line_total", "sort_order",
  ])
})

test("invoice validation rejects unsafe statuses and malformed line values", () => {
  const base = { customer_id: "customer-1", items: [{ description: "Service", unit_price: 1 }] }
  assert.equal(invoiceCreateSchema.safeParse({ ...base, status: "PAID" }).success, false)
  assert.equal(invoiceCreateSchema.safeParse({ ...base, items: [{ description: "", unit_price: 1 }] }).success, false)
  assert.equal(invoiceCreateSchema.safeParse({ ...base, items: [{ description: "Service", unit_price: -1 }] }).success, false)
  assert.equal(invoiceCreateSchema.safeParse({ quotation_id: "quotation-1" }).success, true)
  assert.equal(invoiceCreateSchema.safeParse({ customer_id: "customer-1", items: [] }).success, false)
})

test("initial invoice payments must use the payment workflow", () => {
  assert.equal(validateNoInitialInvoicePayment({ deposit_paid: 0 }), null)
  assert.equal(validateNoInitialInvoicePayment({ paid_amount: "0" }), null)
  assert.match(validateNoInitialInvoicePayment({ deposit_paid: 100 }), /through Payments/)
  assert.match(validateNoInitialInvoicePayment({ paid_amount: "invalid" }), /through Payments/)
})

test("payment input strips identity and status fields and validates finance values", () => {
  const parsed = paymentCreateSchema.parse({
    invoice_id: "invoice-1",
    amount: 500,
    payment_method: "BANK_TRANSFER",
    customer_id: "injected-customer",
    customer_name: "Injected name",
    status: "REFUNDED",
    created_at: "2000-01-01T00:00:00Z",
  })

  assert.deepEqual(parsed, {
    invoice_id: "invoice-1",
    amount: 500,
    payment_method: "BANK_TRANSFER",
  })
  assert.equal(paymentCreateSchema.safeParse({ invoice_id: "invoice-1", amount: 0 }).success, false)
  assert.equal(paymentCreateSchema.safeParse({ invoice_id: "invoice-1", amount: 10, payment_method: "CRYPTO" }).success, false)
})

test("financial POST routes use finance authorization and existing atomic RPCs", () => {
  const invoices = read("../app/api/db/invoices/route.ts")
  const invoiceItems = read("../app/api/db/invoice-items/route.ts")
  const payments = read("../app/api/db/payments/route.ts")

  for (const source of [invoices, invoiceItems, payments]) {
    assert.match(source, /requireApiActor\(FINANCE_WRITE_ROLES\)/)
    assert.doesNotMatch(source, /\.insert\(body\)/)
  }
  assert.match(invoices, /rpc\("mms_create_manual_invoice"/)
  assert.match(invoices, /rpc\("mms_convert_accepted_quotation_to_invoice"/)
  assert.match(invoiceItems, /must be created atomically through POST \/api\/db\/invoices/)
  assert.match(payments, /rpc\("mms_record_confirmed_payment"/)
  assert.doesNotMatch(payments, /updateInvoiceAfterPayment|createPayment/)

  const db = read("../lib/db.ts")
  assert.doesNotMatch(db, /export async function (createPayment|updateInvoiceAfterPayment)/)

  const invoiceForm = read("../app/(dashboard)/invoices/new/page.tsx")
  assert.doesNotMatch(invoiceForm, /deposit_paid|Deposit Already Paid/)
  assert.match(invoiceForm, /Record any deposit in Payments/)

  const quotationPage = read("../app/(dashboard)/quotations/[id]/page.tsx")
  assert.doesNotMatch(quotationPage, /Mark quotation as converted/)
  assert.equal((quotationPage.match(/status: "CONVERTED"/g) ?? []).length, 1)
})

test("atomic finance migrations lock records and restrict RPC execution", () => {
  const conversion = read("../supabase/migrations/20260907170650_support_generated_invoice_columns.sql")
  const payment = read("../supabase/migrations/20260907194830_deploy_atomic_payment_generated_balance.sql")
  const manualInvoice = read("../supabase/migrations/20260908000003_manual_invoice_atomic.sql")

  assert.match(conversion, /WHERE id = p_quotation_id FOR UPDATE/)
  assert.match(conversion, /status <> 'ACCEPTED'/)
  assert.match(conversion, /INSERT INTO public\.mms_invoice_items/)
  assert.match(conversion, /UPDATE public\.mms_quotations SET status = 'CONVERTED'/)
  assert.match(payment, /WHERE id = p_invoice_id FOR UPDATE/)
  assert.match(payment, /Payment exceeds outstanding balance/)
  assert.match(payment, /mms_payments_invoice_reference_key/)
  assert.match(manualInvoice, /jsonb_array_elements/)
  assert.match(manualInvoice, /INSERT INTO public\.mms_invoice_items/)

  for (const migration of [conversion, payment, manualInvoice]) {
    assert.match(migration, /SECURITY INVOKER/)
    assert.match(migration, /REVOKE ALL ON FUNCTION/)
    assert.match(migration, /FROM PUBLIC, anon, authenticated/)
    assert.match(migration, /GRANT EXECUTE ON FUNCTION[\s\S]*TO service_role/)
  }
})
