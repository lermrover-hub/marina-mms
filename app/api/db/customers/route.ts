import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { createCustomer } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const search = searchParams.get("search")?.trim()
    const limit = Number(searchParams.get("limit") ?? 0)
    const supabase = createServerClient()

    let query = supabase
      .from("mms_customers")
      .select("*")
      .order("created_at", { ascending: false })

    if (id) query = query.eq("id", id)
    if (search) {
      const escaped = search.replaceAll("%", "\\%").replaceAll("_", "\\_")
      query = query.or(
        `company_name.ilike.%${escaped}%,first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,email.ilike.%${escaped}%,phone.ilike.%${escaped}%`
      )
    }
    if (Number.isFinite(limit) && limit > 0) query = query.limit(Math.min(limit, 200))

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = await createCustomer({
      customer_type: body.customer_type,
      first_name: body.first_name ?? null,
      last_name: body.last_name ?? null,
      company_name: body.company_name ?? null,
      nationality: body.nationality ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      line_user_id: body.line_user_id ?? null,
      whatsapp_number: body.whatsapp_number ?? null,
      address: body.address ?? null,
      tax_id: body.tax_id ?? null,
      passport_id: body.passport_id ?? null,
      preferred_language: body.preferred_language ?? null,
      payment_terms: body.payment_terms ?? null,
      credit_limit: body.credit_limit ?? null,
      status: body.status ?? "ACTIVE",
      notes: body.notes ?? null,
    } as never)
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
