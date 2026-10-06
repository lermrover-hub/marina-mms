import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { concealOtherCustomer, OPERATIONS_WRITE_ROLES, PORTAL_READ_ROLES, requireApiActor } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireApiActor(PORTAL_READ_ROLES)
    if ("error" in access) return access.error
    const { id } = await params
    const supabase = createServerClient({ requireServiceRole: true })
    const { data, error } = await supabase.from("mms_boats").select("*").eq("id", id).single()
    if (error) throw error
    const concealed = concealOtherCustomer(access.actor, data.owner_id)
    if (concealed) return concealed
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireApiActor(OPERATIONS_WRITE_ROLES)
    if ("error" in access) return access.error
    const { id } = await params
    const body = await req.json()
    const supabase = createServerClient({ requireServiceRole: true })
    const { data: existing, error: existingError } = await supabase.from("mms_boats").select("id,owner_id").eq("id", id).maybeSingle()
    if (existingError) throw existingError
    if (!existing) return NextResponse.json({ error: "Boat not found" }, { status: 404 })

    const ownerId = body.owner_id === undefined ? existing.owner_id : body.owner_id || null
    const captainContactId = body.captain_contact_id === undefined ? undefined : body.captain_contact_id || null
    if (captainContactId) {
      const { data: captain, error: captainError } = await supabase.from("mms_customer_contacts").select("id,customer_id,is_active").eq("id", captainContactId).maybeSingle()
      if (captainError) throw captainError
      if (!captain || captain.customer_id !== ownerId || !captain.is_active) return NextResponse.json({ error: "Selected captain is not an active contact of this boat owner." }, { status: 400 })
    }

    const allowed = [
      "owner_id", "name", "boat_type", "usage_type", "brand", "model", "year_built", "registration_number",
      "hin", "flag", "loa_ft", "beam_ft", "draft_ft", "weight_t", "hull_material", "engine_type",
      "engine_brand", "num_engines", "fuel_type", "trailer_required", "insurance_expiry", "special_handling",
      "notes", "status", "captain_contact_id", "captain_effective_from", "captain_effective_to",
    ]
    const update: Record<string, unknown> = Object.fromEntries(allowed.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]))
    if (body.captain_contact_id !== undefined && !captainContactId) {
      update.captain_contact_id = null
      update.captain_effective_from = null
      update.captain_effective_to = null
    }
    update.updated_at = new Date().toISOString()
    const { data, error } = await supabase.from("mms_boats").update(update).eq("id", id).select().single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
