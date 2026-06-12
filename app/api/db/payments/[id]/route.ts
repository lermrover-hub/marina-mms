import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServerClient()

    const { data: payment, error } = await supabase
      .from("mms_payments")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (error) throw error
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    if (payment.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "Receipt is available only for confirmed payments" },
        { status: 409 }
      )
    }

    // Attach linked invoice + its items for receipt rendering
    let invoice = null
    let invoiceItems: unknown[] = []
    if (payment.invoice_id) {
      const { data: inv, error: invoiceError } = await supabase
        .from("mms_invoices")
        .select("*")
        .eq("id", payment.invoice_id)
        .maybeSingle()
      if (invoiceError) throw invoiceError
      if (inv) {
        const { data: items, error: itemsError } = await supabase
          .from("mms_invoice_items")
          .select("*")
          .eq("invoice_id", payment.invoice_id)
          .order("sort_order")
        if (itemsError) throw itemsError
        invoice = inv
        invoiceItems = items ?? []
      }
    }

    return NextResponse.json({ ...payment, invoice, invoice_items: invoiceItems })
  } catch (e) {
    const message = e instanceof Error ? e.message : (e as { message?: string })?.message ?? String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
