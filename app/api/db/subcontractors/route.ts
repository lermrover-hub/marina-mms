import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")?.trim()
    const supabase = createServerClient()
    let query = supabase.from("mms_subcontractors").select("*").order("name")
    if (search) query = query.ilike("name", `%${search}%`)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const name = String(body.name ?? "").trim()
    if (!name) return NextResponse.json({ error: "Subcontractor name is required." }, { status: 400 })
    const now = new Date().toISOString()
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("mms_subcontractors")
      .insert({
        name,
        tax_id: body.tax_id ?? null,
        specialties: body.specialties ?? null,
        contact_name: body.contact_name ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        payment_terms: body.payment_terms ?? null,
        rating: body.rating ?? null,
        status: body.status ?? "ACTIVE",
        notes: body.notes ?? null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
