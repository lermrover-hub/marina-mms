import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { FINANCE_WRITE_ROLES, PORTAL_READ_ROLES, requireApiActor } from "@/lib/api-auth"
import { financialValidationMessage, invoiceItemInputSchema } from "@/lib/financial-input"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const access = await requireApiActor(PORTAL_READ_ROLES)
    if ("error" in access) return access.error
    const { searchParams } = new URL(req.url)
    const invoiceId = searchParams.get("invoice_id")
    const supabase = createServerClient()
    let query = supabase.from("mms_invoice_items").select("*").order("sort_order")
    if (invoiceId) query = query.eq("invoice_id", invoiceId)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireApiActor(FINANCE_WRITE_ROLES)
    if ("error" in access) return access.error
    const parsed = invoiceItemInputSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: financialValidationMessage(parsed.error) }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Invoice items must be created atomically through POST /api/db/invoices" },
      { status: 409 },
    )
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
