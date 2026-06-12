import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body     = await req.json()
    const supabase = createServerClient()

    const qty        = Number(body.qty)        || 0
    const unit_price = Number(body.unit_price) || 0
    const line_total = parseFloat((qty * unit_price).toFixed(2))

    const { data: item, error } = await supabase
      .from("mms_purchase_order_items")
      .update({ ...body, qty, unit_price, line_total })
      .eq("id", id)
      .select()
      .single()
    if (error) throw error

    // Recalculate PO totals
    const { data: items } = await supabase
      .from("mms_purchase_order_items")
      .select("line_total")
      .eq("po_id", item.po_id)

    const subtotal   = (items ?? []).reduce((s, i) => s + Number(i.line_total), 0)
    const vat_amount = parseFloat((subtotal * 0.07).toFixed(2))
    await supabase.from("mms_purchase_orders")
      .update({ subtotal, vat_amount, total_amount: subtotal + vat_amount, updated_at: new Date().toISOString() })
      .eq("id", item.po_id)

    return NextResponse.json(item)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServerClient()

    const { data: item } = await supabase
      .from("mms_purchase_order_items").select("po_id").eq("id", id).maybeSingle()

    await supabase.from("mms_purchase_order_items").delete().eq("id", id)

    if (item?.po_id) {
      const { data: items } = await supabase
        .from("mms_purchase_order_items").select("line_total").eq("po_id", item.po_id)
      const subtotal   = (items ?? []).reduce((s, i) => s + Number(i.line_total), 0)
      const vat_amount = parseFloat((subtotal * 0.07).toFixed(2))
      await supabase.from("mms_purchase_orders")
        .update({ subtotal, vat_amount, total_amount: subtotal + vat_amount, updated_at: new Date().toISOString() })
        .eq("id", item.po_id)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
