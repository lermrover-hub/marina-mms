import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

const supabase = createServerClient()

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json()

    const update: Record<string, unknown> = {}

    if (body.description !== undefined) update.description = body.description
    if (body.qty !== undefined || body.quantity !== undefined) {
      update.qty = Number(body.qty ?? body.quantity)
    }
    if (body.unit !== undefined) update.unit = body.unit
    if (body.unit_price !== undefined || body.unitPrice !== undefined) {
      update.unit_price = Number(body.unit_price ?? body.unitPrice)
    }
    if (body.discount_pct !== undefined || body.discountPct !== undefined) {
      update.discount_pct = Number(body.discount_pct ?? body.discountPct)
    }
    if (body.taxable !== undefined) update.taxable = Boolean(body.taxable)
    if (body.sort_order !== undefined || body.sortOrder !== undefined) {
      update.sort_order = Number(body.sort_order ?? body.sortOrder)
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No supported fields to update" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("mms_quotation_items")
      .update(update)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    const message = e instanceof Error ? e.message : JSON.stringify(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
