import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { customerScope, OPERATIONS_WRITE_ROLES, PORTAL_READ_ROLES, requireApiActor } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const access = await requireApiActor(PORTAL_READ_ROLES)
    if ("error" in access) return access.error
    const { searchParams } = new URL(req.url)
    const scope = customerScope(access.actor, searchParams.get("owner_id") ?? searchParams.get("customer_id"))
    if ("error" in scope) return scope.error
    const supabase = createServerClient()

    let query = supabase.from("mms_boats").select("*").order("name")
    if (scope.customerId) query = query.eq("owner_id", scope.customerId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireApiActor(OPERATIONS_WRITE_ROLES)
    if ("error" in access) return access.error
    const body = await req.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) {
      return NextResponse.json({ error: "Boat name is required" }, { status: 400 })
    }
    const boatType = body.boat_type === "SPEED_BOAT" ? "SPEEDBOAT" : body.boat_type
    const supabase = createServerClient()
    let ownerName: string | null = null
    if (body.owner_id) {
      const { data: owner, error: ownerError } = await supabase
        .from("mms_customers")
        .select("id,first_name,last_name,company_name")
        .eq("id", body.owner_id)
        .maybeSingle()
      if (ownerError) return NextResponse.json({ error: ownerError.message }, { status: 500 })
      if (!owner) return NextResponse.json({ error: "Selected owner was not found" }, { status: 400 })
      ownerName = owner.company_name ?? ([owner.first_name, owner.last_name].filter(Boolean).join(" ") || null)
    }
    const { data, error } = await supabase
      .from("mms_boats")
      .insert({
        owner_id: body.owner_id ?? null,
        owner_name: ownerName,
        name,
        boat_type: boatType ?? "OTHER",
        usage_type: body.usage_type ?? null,
        brand: body.brand ?? null,
        model: body.model ?? null,
        year_built: body.year_built ?? null,
        registration_number: body.registration_number ?? null,
        hin: body.hin ?? null,
        flag: body.flag ?? null,
        loa_ft: body.loa_ft ?? null,
        beam_ft: body.beam_ft ?? null,
        draft_ft: body.draft_ft ?? null,
        weight_t: body.weight_t ?? null,
        hull_material: body.hull_material ?? null,
        engine_type: body.engine_type ?? null,
        engine_brand: body.engine_brand ?? null,
        num_engines: body.num_engines ?? null,
        fuel_type: body.fuel_type ?? null,
        trailer_required: body.trailer_required ?? false,
        insurance_expiry: body.insurance_expiry ?? null,
        special_handling: body.special_handling ?? null,
        notes: body.notes ?? null,
        status: body.status ?? "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
