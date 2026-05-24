import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const boatId   = searchParams.get("boat_id")
    const type     = searchParams.get("movement_type")
    const limit    = parseInt(searchParams.get("limit") ?? "100")

    let query = supabase
      .from("mms_boat_movements")
      .select("*")
      .order("moved_at", { ascending: false })
      .limit(limit)

    if (boatId) query = query.eq("boat_id", boatId)
    if (type)   query = query.eq("movement_type", type)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { data, error } = await supabase
      .from("mms_boat_movements")
      .insert({
        boat_id:       body.boat_id ?? null,
        boat_name:     body.boat_name ?? null,
        from_location: body.from_location ?? null,
        to_location:   body.to_location,
        movement_type: body.movement_type ?? "MOVE",
        operated_by:   body.operated_by ?? null,
        notes:         body.notes ?? null,
        moved_at:      body.moved_at ?? new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
