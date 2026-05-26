import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { createPayment, updateInvoiceAfterPayment } from "@/lib/db"

const supabase = createServerClient()

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const invoiceId  = searchParams.get("invoice_id")
    const customerId = searchParams.get("customer_id")

    let query = supabase.from("mms_payments").select("*").order("payment_date", { ascending: false })
    if (invoiceId)  query = query.eq("invoice_id", invoiceId)
    if (customerId) query = query.eq("customer_id", customerId)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body    = await request.json()
    const payment = await createPayment(body)
    // Update invoice paid_amount, outstanding_balance, and status
    if (body.invoice_id && body.amount) {
      await updateInvoiceAfterPayment(body.invoice_id, Number(body.amount))
    }
    return NextResponse.json(payment, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
