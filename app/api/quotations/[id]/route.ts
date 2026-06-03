import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("mms_quotations")
      .select("*, mms_quotation_items(*)")
      .eq("id", id)
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: "Quotation not found" }, { status: 404 })

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[Quotation detail error]", error)
    return NextResponse.json({ error: "Failed to fetch quotation" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const supabase = createServerClient()

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.quoteNumber !== undefined || body.quote_number !== undefined) {
      update.quote_number = body.quoteNumber ?? body.quote_number
    }
    if (body.title !== undefined || body.subject !== undefined) update.title = body.title ?? body.subject
    if (body.validUntilDate !== undefined || body.valid_until !== undefined) {
      update.valid_until = body.validUntilDate ?? body.valid_until
    }
    if (body.subtotal !== undefined) update.subtotal = Number(body.subtotal)
    if (
      body.discountAmount !== undefined ||
      body.discount_amount !== undefined ||
      body.discount !== undefined
    ) {
      update.discount = Number(body.discountAmount ?? body.discount_amount ?? body.discount)
    }
    if (body.taxAmount !== undefined || body.vat_amount !== undefined) {
      update.vat_amount = Number(body.taxAmount ?? body.vat_amount)
    }
    if (body.totalAmount !== undefined || body.total_amount !== undefined) {
      update.total_amount = Number(body.totalAmount ?? body.total_amount)
    }
    if (body.depositRequired !== undefined || body.deposit_amount !== undefined) {
      update.deposit_amount = Number(body.depositRequired ?? body.deposit_amount)
    }
    if (body.notes !== undefined) update.notes = body.notes
    if (body.status) update.status = body.status

    const { data, error } = await supabase
      .from("mms_quotations")
      .update(update)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[Quotation update error]", error)
    return NextResponse.json({ error: "Failed to update quotation" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = createServerClient()

    await supabase.from("mms_quotation_items").delete().eq("quotation_id", id)
    const { data, error } = await supabase
      .from("mms_quotations")
      .delete()
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[Quotation delete error]", error)
    return NextResponse.json({ error: "Failed to delete quotation" }, { status: 500 })
  }
}
