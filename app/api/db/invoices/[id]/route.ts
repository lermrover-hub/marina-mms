import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

const supabase = createServerClient()

export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { data: invoice, error } = await supabase
      .from("mms_invoices")
      .select("*")
      .eq("id", id)
      .single()
    if (error) throw error
    const { data: items, error: itemsError } = await supabase
      .from("mms_invoice_items")
      .select("*")
      .eq("invoice_id", id)
      .order("sort_order")
    if (itemsError) throw itemsError
    return NextResponse.json({ ...invoice, mms_invoice_items: items ?? [] })
  } catch (e) {
    const message = e instanceof Error ? e.message : (e as { message?: string })?.message ?? String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { data, error } = await supabase
      .from("mms_invoices")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
