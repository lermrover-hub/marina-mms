import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

type QuotationLineItem = {
  description?: string
  qty?: number
  quantity?: number
  unit?: string
  unitPrice?: number
  unit_price?: number
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get("customerId")
    const status = searchParams.get("status")
    const supabase = createServerClient()

    let query = supabase
      .from("mms_quotations")
      .select("*, mms_quotation_items(*)")
      .order("created_at", { ascending: false })

    if (customerId) query = query.eq("customer_id", customerId)
    if (status) query = query.eq("status", status)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ data: data ?? [] })
  } catch (error) {
    console.error("[Quotation list error]", error)
    return NextResponse.json({ error: "Failed to fetch quotations" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createServerClient()
    const customerId = body.customerId ?? body.customer_id ?? null
    const boatId = body.boatId ?? body.boat_id ?? null

    if (!customerId) {
      return NextResponse.json({ error: "Missing required field: customerId" }, { status: 400 })
    }

    const [{ data: customer }, { data: boat }] = await Promise.all([
      supabase
        .from("mms_customers")
        .select("company_name, first_name, last_name")
        .eq("id", customerId)
        .maybeSingle(),
      boatId
        ? supabase.from("mms_boats").select("name").eq("id", boatId).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const customerName =
      customer?.company_name ??
      ([customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || null)

    const subtotal = Number(body.subtotal ?? 0)
    const discount = Number(body.discountAmount ?? body.discount_amount ?? body.discount ?? 0)
    const vatAmount = Number(body.taxAmount ?? body.vat_amount ?? 0)
    const totalAmount = Number(body.totalAmount ?? body.total_amount ?? subtotal)
    const depositAmount = Number(body.depositRequired ?? body.deposit_amount ?? 0)

    const { data, error } = await supabase
      .from("mms_quotations")
      .insert({
        quote_number: body.quoteNumber ?? body.quote_number ?? `DRAFT-${Date.now()}`,
        customer_id: customerId,
        customer_name: customerName,
        boat_id: boatId,
        boat_name: boat?.name ?? null,
        title: body.title ?? body.subject ?? null,
        status: body.status ?? "DRAFT",
        subtotal,
        discount,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        valid_until: body.validUntilDate ?? body.valid_until ?? null,
        notes: body.notes ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

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

      const { error: itemError } = await supabase.from("mms_quotation_items").insert(items)
      if (itemError) {
        await supabase.from("mms_quotations").delete().eq("id", data.id)
        throw itemError
      }
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("[Quotation create error]", error)
    return NextResponse.json({ error: "Failed to create quotation" }, { status: 500 })
  }
}
