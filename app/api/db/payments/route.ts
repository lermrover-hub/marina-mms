import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { customerScope, FINANCE_WRITE_ROLES, PORTAL_READ_ROLES, requireApiActor } from "@/lib/api-auth"
import { financialValidationMessage, paymentCreateSchema } from "@/lib/financial-input"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const access = await requireApiActor(PORTAL_READ_ROLES)
    if ("error" in access) return access.error
    const { searchParams } = new URL(req.url)
    const invoiceId  = searchParams.get("invoice_id")
    const scope = customerScope(access.actor, searchParams.get("customer_id"))
    if ("error" in scope) return scope.error
    const supabase = createServerClient()

    let query = supabase.from("mms_payments").select("*").order("payment_date", { ascending: false })
    if (invoiceId)  query = query.eq("invoice_id", invoiceId)
    if (scope.customerId) query = query.eq("customer_id", scope.customerId)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireApiActor(FINANCE_WRITE_ROLES)
    if ("error" in access) return access.error
    const parsed = paymentCreateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: financialValidationMessage(parsed.error) }, { status: 400 })
    }

    const input = parsed.data
    const supabase = createServerClient({ requireServiceRole: true })
    const { data, error } = await supabase.rpc("mms_record_confirmed_payment", {
      p_invoice_id: input.invoice_id,
      p_amount: input.amount,
      p_payment_method: input.payment_method,
      p_payment_date: input.payment_date ?? new Date().toISOString().slice(0, 10),
      p_reference_no: input.reference_no ?? null,
      p_slip_url: input.slip_url ?? null,
      p_notes: input.notes ?? null,
    })
    if (error) {
      if (error.code === "PGRST202" || error.code === "42883") {
        return NextResponse.json({ error: "Atomic payment migration is not installed" }, { status: 503 })
      }
      if (["22023", "23514", "23505"].includes(error.code ?? "")) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
      if (error.code === "P0002") {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const payment = Array.isArray(data) ? data[0] : data
    if (!payment) return NextResponse.json({ error: "Payment RPC returned no payment" }, { status: 500 })
    return NextResponse.json(payment, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
