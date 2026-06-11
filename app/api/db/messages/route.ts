/**
 * GET  /api/db/messages  — list messages (inbound by default)
 * POST /api/db/messages  — create outbound message draft (agent-generated, PENDING_APPROVAL)
 * Query params: channel, direction, replied, customer_id, limit
 */
import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body.channel || !body.content) {
      return NextResponse.json({ error: "channel and content required" }, { status: 400 })
    }
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("mms_messages")
      .insert({
        channel:          body.channel?.toUpperCase() ?? "UNKNOWN",
        direction:        body.direction?.toUpperCase() ?? "OUTBOUND",
        sender_id:        body.sender_id ?? "ai-agent",
        customer_id:      body.customer_id ?? null,
        message_type:     body.message_type ?? "text",
        content:          body.content,
        approval_status:  body.approval_status ?? "PENDING_APPROVAL",
        agent_generated:  body.agent_generated ?? true,
        replied:          false,
        created_at:       body.created_at ?? new Date().toISOString(),
      })
      .select("id, channel, direction, approval_status, created_at")
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}

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
