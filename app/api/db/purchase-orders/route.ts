import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status      = searchParams.get("status")
    const supplierId  = searchParams.get("supplier_id")
    const supabase    = createServerClient()

    let q = supabase.from("mms_purchase_orders").select("*").order("created_at", { ascending: false })
    if (status)     q = q.eq("status", status)
    if (supplierId) q = q.eq("supplier_id", supplierId)

    const { data, error } = await q
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body     = await req.json()
    const supabase = createServerClient()

    // Auto-generate PO number if not provided
    if (!body.po_number) {
      const year = new Date().getFullYear()
      const { count } = await supabase
        .from("mms_purchase_orders")
        .select("*", { count: "exact", head: true })
      body.po_number = `PO-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`
    }

    const { data, error } = await supabase
      .from("mms_purchase_orders")
      .insert({ ...body, status: body.status ?? "draft", subtotal: 0, vat_amount: 0, total_amount: 0 })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
