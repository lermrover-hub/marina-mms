import { z } from "zod"

const id = z.string().trim().min(1).max(120)
const optionalId = id.nullable().optional()
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional()
const money = z.coerce.number().finite().min(0).max(999_999_999.99)
const positiveMoney = z.coerce.number().finite().gt(0).max(999_999_999.99)
const percentage = z.coerce.number().finite().min(0).max(100)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must use YYYY-MM-DD")

export const INVOICE_CREATE_STATUSES = ["DRAFT", "ISSUED"] as const
export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CREDIT_CARD", "QR_PAYMENT", "CHEQUE"] as const

export const invoiceItemInputSchema = z.object({
  description: z.string().trim().min(1).max(1_000),
  category: optionalText(120),
  qty: z.coerce.number().finite().gt(0).max(1_000_000).optional(),
  quantity: z.coerce.number().finite().gt(0).max(1_000_000).optional(),
  unit: z.string().trim().min(1).max(80).optional(),
  unit_price: money.optional(),
  unitPrice: money.optional(),
  discount_pct: percentage.optional(),
  discount: percentage.optional(),
  taxable: z.boolean().optional(),
}).superRefine((value, context) => {
  if (value.unit_price === undefined && value.unitPrice === undefined) {
    context.addIssue({ code: "custom", path: ["unit_price"], message: "is required" })
  }
})

export const invoiceCreateSchema = z.object({
  invoice_number: z.string().trim().min(1).max(80).optional(),
  customer_id: id.optional(),
  boat_id: optionalId,
  quotation_id: optionalId,
  work_order_id: optionalId,
  ramp_booking_id: optionalId,
  invoice_date: date.optional(),
  due_date: date.nullable().optional(),
  status: z.enum(INVOICE_CREATE_STATUSES).default("DRAFT"),
  notes: optionalText(4_000),
  invoice_note: optionalText(4_000),
  global_discount: percentage.optional(),
  items: z.array(invoiceItemInputSchema).max(250).default([]),
}).superRefine((value, context) => {
  if (!value.quotation_id && !value.customer_id) {
    context.addIssue({ code: "custom", path: ["customer_id"], message: "is required for a manual invoice" })
  }
  if (!value.quotation_id && value.items.length === 0) {
    context.addIssue({ code: "custom", path: ["items"], message: "must contain at least one line for a manual invoice" })
  }
})

export const paymentCreateSchema = z.object({
  invoice_id: id,
  amount: positiveMoney,
  payment_method: z.enum(PAYMENT_METHODS).default("BANK_TRANSFER"),
  payment_date: date.optional(),
  reference_no: optionalText(200),
  slip_url: optionalText(2_000),
  notes: optionalText(4_000),
})

export function validateNoInitialInvoicePayment(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null

  const body = input as Record<string, unknown>
  for (const field of ["deposit_paid", "paid_amount"] as const) {
    if (body[field] === undefined || body[field] === null || body[field] === "") continue

    const amount = Number(body[field])
    if (!Number.isFinite(amount) || amount !== 0) {
      return "Record deposits and other receipts through Payments after creating the invoice"
    }
  }

  return null
}

export function financialValidationMessage(error: z.ZodError) {
  return error.issues.map((issue) => `${issue.path.join(".") || "request"}: ${issue.message}`).join("; ")
}

export function normalizeInvoiceItems(items: z.infer<typeof invoiceItemInputSchema>[]) {
  return items.map((item, index) => {
    const qty = Number(item.qty ?? item.quantity ?? 1)
    const unitPrice = Number(item.unit_price ?? item.unitPrice)
    const discountPct = Number(item.discount_pct ?? item.discount ?? 0)
    const lineTotal = roundMoney(qty * unitPrice * (1 - discountPct / 100))

    return {
      description: item.description,
      category: item.category ?? "SERVICE",
      qty,
      unit: item.unit ?? "item",
      unit_price: unitPrice,
      discount_pct: discountPct,
      taxable: item.taxable ?? true,
      line_total: lineTotal,
      sort_order: index + 1,
    }
  })
}

export function calculateInvoiceTotals(
  items: ReturnType<typeof normalizeInvoiceItems>,
  globalDiscountPct = 0,
) {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.line_total, 0))
  const discount = roundMoney(subtotal * globalDiscountPct / 100)
  const discountFactor = 1 - globalDiscountPct / 100
  const taxableAmount = roundMoney(items.reduce(
    (sum, item) => sum + (item.taxable ? item.line_total * discountFactor : 0),
    0,
  ))
  const vatAmount = roundMoney(taxableAmount * 0.07)
  const totalAmount = roundMoney(subtotal - discount + vatAmount)

  return { subtotal, discount, vatAmount, totalAmount }
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
