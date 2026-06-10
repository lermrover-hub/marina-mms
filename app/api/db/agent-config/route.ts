/**
 * GET  /api/db/agent-config          — list all agent configs
 * PATCH /api/db/agent-config         — update one agent's config { agent_id, config }
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("mms_agent_config")
    .select("agent_id, label, config, updated_at, updated_by")
    .order("agent_id")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: NextRequest) {
  try {
    const { agent_id, config } = await req.json()
    if (!agent_id || typeof config !== "object" || config === null) {
      return NextResponse.json({ error: "agent_id and config object required" }, { status: 400 })
    }
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("mms_agent_config")
      .update({ config, updated_at: new Date().toISOString() })
      .eq("agent_id", agent_id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
