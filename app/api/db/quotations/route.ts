import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { sendEmail } from "@/lib/email"
import { quotationSent } from "@/lib/email-templates"

export const dynamic = "force-dynamic"

type QuotationLineItem = {
  description?: string
  qty?: number
  quantity?: number
  unit?: string
  unitPrice?: number
  unit_price?: number
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get("customer_id")
    const boatId = searchParams.get("boat_id")
    const supabase = createServerClient()

    let query = supabase.from("mms_quotations").select("*").order("created_at", { ascending: false })
    if (customerId) query = query.eq("customer_id", customerId)
    if (boatId) query = query.eq("boat_id", boatId)

    const { data, error } = await query
    if (error) {
      console.error("[Quotation list error]", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data ?? [])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const supabase = createServerClient()

    const customerId = body.customer_id || null
    const boatId = body.boat_id || null

    const [{ data: customer }, { data: boat }] = await Promise.all([
      customerId
        ? supabase
            .from("mms_customers")
            .select("company_name, first_name, last_name, email")
            .eq("id", customerId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      boatId
        ? supabase
            .from("mms_boats")
            .select("name")
            .eq("id", boatId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const customerName =
      customer?.company_name ??
      ([customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || null)

    const subtotal = Number(body.subtotal ?? 0)
    const discount = Number(body.discount_amount ?? body.discount ?? 0)
    const vatAmount = Number(body.tax_amount ?? body.vat_amount ?? 0)
    const totalAmount = Number(body.grand_total ?? body.total_amount ?? 0)
    const depositAmount = Number(body.deposit_req ?? body.deposit_amount ?? 0)
    const status = body.status === "SENT" ? "SENT" : "DRAFT"

    const { data, error } = await supabase
      .from("mms_quotations")
      .insert({
        quote_number: body.quote_number ?? `DRAFT-${Date.now()}`,
        customer_id: customerId,
        customer_name: customerName,
        boat_id: boatId,
        boat_name: boat?.name ?? null,
        title: body.title ?? null,
        status,
        subtotal,
        discount,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        valid_until: body.valid_until ?? null,
        notes: body.notes ?? null,
        created_at: body.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (Array.isArray(body.items) && body.items.length > 0) {
      const items = body.items.map((item: QuotationLineItem, index: number) => {
        const qty = Number(item.qty ?? item.quantity ?? 1)
        const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0)

        return {
          quotation_id: data.id,
          description: item.description ?? "",
          qty,
          unit: item.unit ?? "item",
          unit_price: unitPrice,
          discount_pct: 0,
          taxable: vatAmount > 0,
          sort_order: index + 1,
        }
      })

      const { error: itemError } = await supabase
        .from("mms_quotation_items")
        .insert(items)

      if (itemError) {
        console.error("[Quotation item create error]", itemError)
        await supabase.from("mms_quotations").delete().eq("id", data.id)
        return NextResponse.json({ error: itemError.message }, { status: 500 })
      }
    }

    // Email is only sent for explicit Send flow. Draft saves must stay internal.
    try {
      if (status === "SENT" && data?.customer_id) {
        const recipientEmail = customer?.email
        const recipientName = customerName ?? "Valued Customer"

        if (recipientEmail) {
          await sendEmail({
            to: recipientEmail,
            subject: `Quotation ${data.quote_number ?? data.id} - Ocean Rover Marina`,
            html: quotationSent({
              customerName: recipientName,
              quotationNumber: data.quote_number ?? String(data.id),
              serviceDescription: data.title ?? "Marina Services",
              totalAmount: Number(data.total_amount ?? 0),
              currency: "THB",
              validUntil: data.valid_until
                ? new Date(data.valid_until).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "-",
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
    console.error("[Quotation API unexpected error]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
