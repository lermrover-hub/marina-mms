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
        .select("*, mms_invoice_items(*)")
        .eq("id", payment.invoice_id)
        .maybeSingle()
      if (invoiceError) throw invoiceError
      if (inv) {
        const { mms_invoice_items, ...invData } = inv
        invoice = invData
        invoiceItems = Array.isArray(mms_invoice_items) ? mms_invoice_items : []
      }
    }

    return NextResponse.json({ ...payment, invoice, invoice_items: invoiceItems })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
