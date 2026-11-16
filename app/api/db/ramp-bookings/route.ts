import { NextResponse } from "next/server"
import { isProductionBookingsEnabled, safeModeResponse } from "@/lib/safe-mode"
import { createServerClient } from "@/lib/supabase-server"
import { customerScope, PORTAL_READ_ROLES, requireApiActor } from "@/lib/api-auth"
import { deriveRampServicePlan } from "@/lib/ramp-booking-service"

const supabase = createServerClient()
const OPERATION_TYPES = new Set(["LAUNCH", "HAUL_OUT", "TOW_IN", "TOW_OUT", "MOVE_BOAT", "WASH", "FUEL", "INSPECTION"])

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
    const requestedDate = typeof body.requested_date === "string" ? body.requested_date : ""
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
      return NextResponse.json({ error: "Requested date is required" }, { status: 400 })
    }
    if (!OPERATION_TYPES.has(body.operation_type)) {
      return NextResponse.json({ error: "A valid operation type is required" }, { status: 400 })
    }
    const servicePlan = deriveRampServicePlan(
      typeof body.service_category === "string" ? body.service_category : "",
      typeof body.service_option === "string" ? body.service_option : "",
      requestedDate,
    )
    if (!servicePlan) {
      return NextResponse.json({ error: "A valid booking service type is required" }, { status: 400 })
    }
    const scope = customerScope(access.actor, body.customer_id ?? null)
    if ("error" in scope) return scope.error
    const isCustomer = access.actor.role === "CUSTOMER"
    if (!isCustomer && !body.service_request_id) {
      return NextResponse.json({ error: "Staff ramp schedules must be created from a Service Request." }, { status: 409 })
    }
    let linkedRequest: Record<string, unknown> | null = null
    if (!isCustomer) {
      const result = await supabase.from("mms_service_requests").select("id,quotation_id,customer_id,customer_name,boat_id,boat_name").eq("id", body.service_request_id).single()
      if (result.error) return NextResponse.json({ error: result.error.message }, { status: 404 })
      linkedRequest = result.data
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
        operation_type: body.operation_type,
        requested_date: requestedDate,
        requested_time: body.requested_time ?? null,
        service_request_id: isCustomer ? null : body.service_request_id,
        quotation_id: isCustomer ? null : linkedRequest?.quotation_id ?? null,
        customer_id: isCustomer ? scope.customerId : linkedRequest?.customer_id ?? null,
        customer_name: isCustomer ? body.customer_name ?? null : linkedRequest?.customer_name ?? null,
        boat_id: isCustomer ? body.boat_id ?? null : linkedRequest?.boat_id ?? null,
        boat_name: isCustomer ? body.boat_name ?? null : linkedRequest?.boat_name ?? null,
        boat_draft_ft: body.boat_draft_ft ?? null,
        trailer_height_ft: body.trailer_height_ft ?? null,
        safety_clearance_ft: body.safety_clearance_ft ?? null,
        required_tide_m: body.required_tide_m ?? null,
        assigned_staff: body.assigned_staff ?? null,
        notes: body.notes ?? null,
        ...servicePlan,
        status: isCustomer ? "REQUESTED" : (body.status ?? "REQUESTED"),
        revenue_amount: 0,
        estimated_cost_amount: 0,
        revenue_account_code: null,
        cost_account_code: null,
        financial_status: isCustomer ? "UNPRICED_REQUEST" : "QUOTATION_LINKED",
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
