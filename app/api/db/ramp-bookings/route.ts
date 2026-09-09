import { NextResponse } from "next/server"
import { isProductionBookingsEnabled, safeModeResponse } from "@/lib/safe-mode"
import { createServerClient } from "@/lib/supabase-server"
import { customerScope, PORTAL_READ_ROLES, requireApiActor } from "@/lib/api-auth"

const supabase = createServerClient()

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const access = await requireApiActor(PORTAL_READ_ROLES)
    if ("error" in access) return access.error
    const { searchParams } = new URL(req.url)
    const scope = customerScope(access.actor, searchParams.get("customer_id"))
    if ("error" in scope) return scope.error
    const boatId     = searchParams.get("boat_id")
    const status     = searchParams.get("status")
    const date       = searchParams.get("date")

    let query = supabase.from("mms_ramp_bookings").select("*").order("requested_date", { ascending: false })
    if (scope.customerId) query = query.eq("customer_id", scope.customerId)
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
    const access = await requireApiActor(PORTAL_READ_ROLES)
    if ("error" in access) return access.error
    const body = await req.json()
    const scope = customerScope(access.actor, body.customer_id ?? null)
    if ("error" in scope) return scope.error
    const isCustomer = access.actor.role === "CUSTOMER"
    const revenueAmount = Number(isCustomer ? 0 : (body.revenue_amount ?? 0))
    const estimatedCostAmount = Number(isCustomer ? 0 : (body.estimated_cost_amount ?? 0))
    if (!Number.isFinite(revenueAmount) || revenueAmount < 0) {
      return NextResponse.json({ error: "Revenue amount must be zero or greater" }, { status: 400 })
    }
    if (!Number.isFinite(estimatedCostAmount) || estimatedCostAmount < 0) {
      return NextResponse.json({ error: "Estimated cost must be zero or greater" }, { status: 400 })
    }

    if (isCustomer) {
      if (!body.boat_id) {
        return NextResponse.json({ error: "A linked boat is required" }, { status: 400 })
      }
      const { data: ownedBoat, error: ownedBoatError } = await supabase
        .from("mms_boats")
        .select("id,name")
        .eq("id", body.boat_id)
        .eq("owner_id", scope.customerId)
        .maybeSingle()
      if (ownedBoatError) throw ownedBoatError
      if (!ownedBoat) return NextResponse.json({ error: "Boat not found" }, { status: 404 })
      body.boat_name = ownedBoat.name
    }

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from("mms_ramp_bookings")
      .insert({
        ...body,
        customer_id: scope.customerId,
        status: isCustomer ? "REQUESTED" : (body.status ?? "REQUESTED"),
        revenue_amount: revenueAmount,
        estimated_cost_amount: estimatedCostAmount,
        revenue_account_code: isCustomer ? "4100-RAMP" : (body.revenue_account_code ?? "4100-RAMP"),
        cost_account_code: isCustomer ? "5100-RAMP" : (body.cost_account_code ?? "5100-RAMP"),
        financial_status: isCustomer ? "ESTIMATED" : (body.financial_status ?? "ESTIMATED"),
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
