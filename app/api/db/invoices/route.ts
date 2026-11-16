import { NextResponse } from "next/server"
import { isRealCustomerMessagesEnabled } from "@/lib/safe-mode"
import { createServerClient } from "@/lib/supabase-server"
import { sendEmail } from "@/lib/email"
import { invoiceIssued } from "@/lib/email-templates"
import { customerScope, FINANCE_WRITE_ROLES, PORTAL_READ_ROLES, requireApiActor } from "@/lib/api-auth"
import {
  calculateInvoiceTotals,
  financialValidationMessage,
  invoiceCreateSchema,
  normalizeInvoiceItems,
  validateNoInitialInvoicePayment,
} from "@/lib/financial-input"

export const dynamic = "force-dynamic"

type InvoiceRpcRow = {
  id?: string
  invoice_number?: string
  customer_id?: string | null
  total_amount?: number | null
  due_date?: string | null
}

export async function GET(req: Request) {
  try {
    const access = await requireApiActor(PORTAL_READ_ROLES)
    if ("error" in access) return access.error
    const { searchParams } = new URL(req.url)
    const scope = customerScope(access.actor, searchParams.get("customer_id"))
    if ("error" in scope) return scope.error
    const boatId     = searchParams.get("boat_id")
    const status     = searchParams.get("status")
    const supabase = createServerClient()

    let query = supabase.from("mms_invoices").select("*").order("created_at", { ascending: false })
    if (scope.customerId) query = query.eq("customer_id", scope.customerId)
    if (boatId)     query = query.eq("boat_id", boatId)
    if (status)     query = query.eq("status", status)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireApiActor(FINANCE_WRITE_ROLES)
    if ("error" in access) return access.error
    const body = await req.json()
    const initialPaymentError = validateNoInitialInvoicePayment(body)
    if (initialPaymentError) {
      return NextResponse.json({ error: initialPaymentError }, { status: 400 })
    }

    const parsed = invoiceCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: financialValidationMessage(parsed.error) }, { status: 400 })
    }

    const input = parsed.data
    const supabase = createServerClient({ requireServiceRole: true })
    const invoiceNumber = input.invoice_number ?? generateInvoiceNumber()

    let data: InvoiceRpcRow | null = null
    let error: { message: string; code?: string } | null = null

    if (input.quotation_id) {
      const result = await supabase.rpc("mms_convert_accepted_quotation_to_invoice", {
        p_quotation_id: input.quotation_id,
        p_invoice_number: invoiceNumber,
        p_due_date: input.due_date ?? null,
        p_status: input.status,
        p_paid_amount: 0,
        p_notes: input.notes ?? input.invoice_note ?? null,
      })
      data = firstRow(result.data)
      error = result.error
    } else {
      if (!input.customer_id) {
        return NextResponse.json({ error: "customer_id is required for a manual invoice" }, { status: 400 })
      }
      const [{ data: customer, error: customerError }, { data: boat, error: boatError }] = await Promise.all([
        supabase
          .from("mms_customers")
          .select("company_name, first_name, last_name")
          .eq("id", input.customer_id)
          .maybeSingle(),
        input.boat_id
          ? supabase.from("mms_boats").select("name, owner_id").eq("id", input.boat_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])

      if (customerError) return NextResponse.json({ error: customerError.message }, { status: 500 })
      if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 })
      if (boatError) return NextResponse.json({ error: boatError.message }, { status: 500 })
      if (input.boat_id && (!boat || boat.owner_id !== input.customer_id)) {
        return NextResponse.json({ error: "Boat does not belong to the selected customer" }, { status: 400 })
      }

      const items = normalizeInvoiceItems(input.items)
      const totals = calculateInvoiceTotals(items, input.global_discount ?? 0)
      const customerName = customer.company_name
        ?? ([customer.first_name, customer.last_name].filter(Boolean).join(" ") || null)

      const result = await supabase.rpc("mms_create_manual_invoice", {
        p_invoice_number: invoiceNumber,
        p_customer_id: input.customer_id,
        p_customer_name: customerName,
        p_boat_id: input.boat_id ?? null,
        p_boat_name: boat?.name ?? null,
        p_work_order_id: input.work_order_id ?? null,
        p_ramp_booking_id: input.ramp_booking_id ?? null,
        p_invoice_date: input.invoice_date ?? new Date().toISOString().slice(0, 10),
        p_due_date: input.due_date ?? null,
        p_status: input.status,
        p_subtotal: totals.subtotal,
        p_discount: totals.discount,
        p_vat_amount: totals.vatAmount,
        p_total_amount: totals.totalAmount,
        p_paid_amount: 0,
        p_outstanding_balance: totals.totalAmount,
        p_notes: input.notes ?? input.invoice_note ?? null,
        p_items: items,
      })
      data = firstRow(result.data)
      error = result.error
    }

    if (error) {
      if (error.code === "PGRST202" || error.code === "42883") {
        return NextResponse.json({ error: "Required atomic invoice migration is not installed" }, { status: 503 })
      }
      if (input.quotation_id && ["P0001", "23505"].includes(error.code ?? "")) {
        return NextResponse.json(
          { error: "Only an accepted quotation can be converted, and it can be invoiced once" },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: "Invoice RPC returned no invoice" }, { status: 500 })

    // Send invoice email — only when real customer messages are enabled
    if (isRealCustomerMessagesEnabled()) try {
      // Fetch customer email if we have a customer_id
      if (data?.customer_id) {
        const { data: customer } = await supabase
          .from("mms_customers")
          .select("full_name, company_name, email")
          .eq("id", data.customer_id)
          .single()

        const recipientEmail = customer?.email
        const customerName   =
          customer?.full_name ?? customer?.company_name ?? "Valued Customer"

        if (recipientEmail) {
          await sendEmail({
            to:      recipientEmail,
            subject: `Invoice ${data.invoice_number ?? data.id} — Ocean Rover Marina`,
            html:    invoiceIssued({
              customerName,
              invoiceNumber: data.invoice_number ?? String(data.id),
              amount:        Number(data.total_amount ?? 0),
              currency:      "THB",
              dueDate:       data.due_date
                ? new Date(data.due_date).toLocaleDateString("en-GB", {
                    day:   "2-digit",
                    month: "short",
                    year:  "numeric",
                  })
                : "—",
              invoiceUrl: `${process.env.NEXTAUTH_URL ?? ""}/invoices/${data.id}`,
            }),
          })
        }
      }
    } catch (emailErr) {
      console.error("[Invoice email trigger error]", emailErr)
    }

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

function firstRow(value: unknown): InvoiceRpcRow | null {
  const row = Array.isArray(value) ? value[0] : value
  return row && typeof row === "object" ? row as InvoiceRpcRow : null
}

function generateInvoiceNumber() {
  const month = new Date().toISOString().slice(0, 7).replace("-", "")
  return `INV-${month}-${Date.now().toString(36).toUpperCase()}`
}
