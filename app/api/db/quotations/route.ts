import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { sendEmail } from "@/lib/email"
import { quotationSent } from "@/lib/email-templates"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get("customer_id")
    const boatId     = searchParams.get("boat_id")
    const supabase = createServerClient()

    let query = supabase.from("mms_quotations").select("*").order("created_at", { ascending: false })
    if (customerId) query = query.eq("customer_id", customerId)
    if (boatId)     query = query.eq("boat_id", boatId)

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
      .from("mms_quotations")
      .insert(body)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Send quotation email — wrapped so it never breaks the main flow
    try {
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
            subject: `Quotation ${data.quotation_number ?? data.id} — Ocean Rover Marina`,
            html:    quotationSent({
              customerName,
              quotationNumber:    data.quotation_number ?? String(data.id),
              serviceDescription: data.subject ?? data.description ?? "Marina Services",
              totalAmount:        Number(data.total_amount ?? 0),
              currency:           "THB",
              validUntil:         data.valid_until
                ? new Date(data.valid_until).toLocaleDateString("en-GB", {
                    day:   "2-digit",
                    month: "short",
                    year:  "numeric",
                  })
                : "—",
              quotationUrl: `${process.env.NEXTAUTH_URL ?? ""}/quotations/${data.id}`,
            }),
          })
        }
      }
    } catch (emailErr) {
      console.error("[Quotation email trigger error]", emailErr)
    }

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
