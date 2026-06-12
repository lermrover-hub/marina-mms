import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body     = await req.json()
    const supabase = createServerClient()

    const qty        = Number(body.qty)        || 0
    const unit_price = Number(body.unit_price) || 0
    const line_total = parseFloat((qty * unit_price).toFixed(2))

    const { data: item, error: itemErr } = await supabase
      .from("mms_purchase_order_items")
      .insert({ ...body, qty, unit_price, line_total })
      .select()
      .single()
    if (itemErr) throw itemErr

    // Recalculate PO totals
    const { data: items } = await supabase
      .from("mms_purchase_order_items")
      .select("line_total")
      .eq("po_id", body.po_id)

    const subtotal   = (items ?? []).reduce((s, i) => s + Number(i.line_total), 0)
    const vat_amount = parseFloat((subtotal * 0.07).toFixed(2))
    const total_amount = parseFloat((subtotal + vat_amount).toFixed(2))

    await supabase.from("mms_purchase_orders")
      .update({ subtotal, vat_amount, total_amount, updated_at: new Date().toISOString() })
      .eq("id", body.po_id)

    return NextResponse.json(item, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
