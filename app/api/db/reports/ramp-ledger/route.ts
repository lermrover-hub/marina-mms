import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: bookings, error: bookingError } = await supabase
      .from("mms_ramp_bookings")
      .select("id,reference,operation_type,customer_id,customer_name,boat_id,boat_name,requested_date,status,revenue_amount,estimated_cost_amount,revenue_account_code,cost_account_code,financial_status,invoice_id,service_request_id,work_order_id,quotation_id")
      .order("requested_date", { ascending: false })
    if (bookingError) throw bookingError

    const referencedInvoiceIds = [...new Set((bookings ?? []).map((booking) => booking.invoice_id).filter((id): id is string => Boolean(id)))]
    const [{ data: bookingInvoices, error: bookingInvoiceError }, referencedInvoiceResult] = await Promise.all([
      supabase
        .from("mms_invoices")
        .select("id,invoice_number,ramp_booking_id,status,total_amount")
        .not("ramp_booking_id", "is", null),
      referencedInvoiceIds.length > 0
        ? supabase
            .from("mms_invoices")
            .select("id,invoice_number,ramp_booking_id,status,total_amount")
            .in("id", referencedInvoiceIds)
        : Promise.resolve({ data: [], error: null }),
    ])
    if (bookingInvoiceError) throw bookingInvoiceError
    if (referencedInvoiceResult.error) throw referencedInvoiceResult.error

    const invoices = [...new Map(
      [...(bookingInvoices ?? []), ...(referencedInvoiceResult.data ?? [])].map((invoice) => [invoice.id, invoice]),
    ).values()]

    const invoiceByBooking = new Map(invoices.map((invoice) => [invoice.ramp_booking_id, invoice]))
    const rows = (bookings ?? []).map((booking) => {
      const revenue = Number(booking.revenue_amount ?? 0)
      const cost = Number(booking.estimated_cost_amount ?? 0)
      const invoice = booking.invoice_id ? invoices.find((item) => item.id === booking.invoice_id) : invoiceByBooking.get(booking.id)
      return {
        ...booking,
        revenue_amount: revenue,
        estimated_cost_amount: cost,
        margin_amount: revenue - cost,
        invoice_number: invoice?.invoice_number ?? null,
        invoice_id: invoice?.id ?? null,
        invoice_status: invoice?.status ?? null,
        invoice_total_amount: invoice?.total_amount ?? null,
      }
    })

    return NextResponse.json({
      rows,
      summary: {
        revenue: rows.reduce((sum, row) => sum + row.revenue_amount, 0),
        cost: rows.reduce((sum, row) => sum + row.estimated_cost_amount, 0),
        margin: rows.reduce((sum, row) => sum + row.margin_amount, 0),
        count: rows.length,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
