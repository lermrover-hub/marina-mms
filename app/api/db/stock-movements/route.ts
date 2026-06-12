import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const itemId   = searchParams.get("item_id")
    const type     = searchParams.get("movement_type")
    const limit    = parseInt(searchParams.get("limit") ?? "200")
    const supabase = createServerClient()

    let q = supabase.from("mms_stock_movements").select("*").order("created_at", { ascending: false }).limit(limit)
    if (itemId) q = q.eq("item_id", itemId)
    if (type)   q = q.eq("movement_type", type)

    const { data, error } = await q
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body     = await req.json()
    const supabase = createServerClient()

    // Validate required fields
    if (!body.item_id || !body.movement_type || body.quantity == null) {
      return NextResponse.json({ error: "item_id, movement_type, and quantity are required" }, { status: 400 })
    }

    const qty = Number(body.quantity)

    // Insert movement record
    const { data: movement, error: mvErr } = await supabase
      .from("mms_stock_movements")
      .insert(body)
      .select()
      .single()
    if (mvErr) throw mvErr

    // Update inventory on_hand
    const { data: item, error: itemErr } = await supabase
      .from("mms_inventory_items")
      .select("on_hand")
      .eq("id", body.item_id)
      .maybeSingle()
    if (itemErr) throw itemErr

    if (item) {
      let newOnHand = Number(item.on_hand)
      if (body.movement_type === "stock_in")     newOnHand += qty
      else if (body.movement_type === "stock_out") newOnHand = Math.max(0, newOnHand - qty)
      else if (body.movement_type === "adjustment") newOnHand = qty

      await supabase.from("mms_inventory_items")
        .update({ on_hand: newOnHand, updated_at: new Date().toISOString() })
        .eq("id", body.item_id)
    }

    return NextResponse.json(movement, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
