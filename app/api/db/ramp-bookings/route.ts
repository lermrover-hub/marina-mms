import { NextResponse } from "next/server"
import { isProductionBookingsEnabled, safeModeResponse } from "@/lib/safe-mode"
import { createServerClient } from "@/lib/supabase-server"

const supabase = createServerClient()

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get("customer_id")
    const boatId     = searchParams.get("boat_id")
    const status     = searchParams.get("status")
    const date       = searchParams.get("date")

    let query = supabase.from("mms_ramp_bookings").select("*").order("requested_date", { ascending: false })
    if (customerId) query = query.eq("customer_id", customerId)
    if (boatId)     query = query.eq("boat_id", boatId)
    if (status)     query = query.eq("status", status)
    if (date)       query = query.eq("requested_date", date)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!isProductionBookingsEnabled()) {
    return safeModeResponse("ENABLE_PRODUCTION_BOOKINGS")
  }

  try {
    const body = await req.json()
    const revenueAmount = Number(body.revenue_amount ?? 0)
    const estimatedCostAmount = Number(body.estimated_cost_amount ?? 0)
    if (!Number.isFinite(revenueAmount) || revenueAmount < 0) {
      return NextResponse.json({ error: "Revenue amount must be zero or greater" }, { status: 400 })
    }
    if (!Number.isFinite(estimatedCostAmount) || estimatedCostAmount < 0) {
      return NextResponse.json({ error: "Estimated cost must be zero or greater" }, { status: 400 })
    }
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from("mms_ramp_bookings")
      .insert({
        ...body,
        revenue_amount: revenueAmount,
        estimated_cost_amount: estimatedCostAmount,
        revenue_account_code: body.revenue_account_code ?? "4100-RAMP",
        cost_account_code: body.cost_account_code ?? "5100-RAMP",
        financial_status: body.financial_status ?? "ESTIMATED",
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
