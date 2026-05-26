import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { sendEmail } from "@/lib/email"
import { invoiceIssued } from "@/lib/email-templates"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get("customer_id")
    const boatId     = searchParams.get("boat_id")
    const status     = searchParams.get("status")
    const supabase = createServerClient()

    let query = supabase.from("mms_invoices").select("*").order("created_at", { ascending: false })
    if (customerId) query = query.eq("customer_id", customerId)
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
    const body = await req.json()
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("mms_invoices")
      .insert(body)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Send invoice email — wrapped so it never breaks the main flow
    try {
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
