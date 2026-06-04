/**
 * GET  /api/db/messages  — list messages (inbound by default)
 * Query params: channel, direction, replied, customer_id, limit
 */
import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const channel    = searchParams.get("channel")
    const direction  = searchParams.get("direction") ?? "INBOUND"
    const replied    = searchParams.get("replied")
    const customerId = searchParams.get("customer_id")
    const limit      = parseInt(searchParams.get("limit") ?? "50")

    const supabase = createServerClient()
    let query = supabase
      .from("mms_messages")
      .select("*")
      .eq("direction", direction.toUpperCase())
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 200))

    if (channel)    query = query.eq("channel", channel.toUpperCase())
    if (replied !== null && replied !== "") query = query.eq("replied", replied === "true")
    if (customerId) query = query.eq("customer_id", customerId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
