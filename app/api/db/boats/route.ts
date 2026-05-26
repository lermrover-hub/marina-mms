import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const ownerId = searchParams.get("owner_id")
    const supabase = createServerClient()

    let query = supabase.from("mms_boats").select("*").order("name")
    if (ownerId) query = query.eq("owner_id", ownerId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const boatType = body.boat_type === "SPEED_BOAT" ? "SPEEDBOAT" : body.boat_type
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("mms_boats")
      .insert({
        owner_id: body.owner_id ?? null,
        name: body.name,
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
