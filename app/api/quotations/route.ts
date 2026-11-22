import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { POST as createCanonicalQuotation } from "@/app/api/db/quotations/route"

export const dynamic = "force-dynamic"

// Compatibility list endpoint. New application code uses /api/db/quotations.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get("customerId") ?? searchParams.get("customer_id")
    const status = searchParams.get("status")
    const supabase = createServerClient()

    let query = supabase
      .from("mms_quotations")
      .select("*, mms_quotation_items(*)")
      .order("created_at", { ascending: false })

    if (customerId) query = query.eq("customer_id", customerId)
    if (status) query = query.eq("status", status)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ data: data ?? [] })
  } catch (error) {
    console.error("[Quotation list error]", error)
    return NextResponse.json({ error: "Failed to fetch quotations" }, { status: 500 })
  }
}

// Keep the legacy URL safe by delegating every create to the canonical,
// server-recalculated v3.8 quotation workflow.
export async function POST(req: NextRequest) {
  return createCanonicalQuotation(req)
}
