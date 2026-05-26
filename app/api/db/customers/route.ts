import { NextResponse } from "next/server"
import { getCustomers, createCustomer } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const data = await getCustomers()
    return NextResponse.json(data)
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
