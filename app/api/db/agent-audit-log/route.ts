/**
 * POST /api/db/agent-audit-log — write one agent audit log entry
 * GET  /api/db/agent-audit-log — list recent entries (internal/admin use)
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.agent_name || !body.action) {
      return NextResponse.json({ error: "agent_name and action required" }, { status: 400 })
    }
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("mms_agent_audit_log")
      .insert({
        agent_name:  body.agent_name,
        action:      body.action,
        user_id:     body.user_id     ?? null,
        tool_call:   body.tool_call   ?? null,
        payload:     body.payload     ?? null,
        result:      body.result      ?? null,
        risk_level:  body.risk_level  ?? "LOW",
        error:       body.error       ?? null,
        duration_ms: body.duration_ms ?? null,
        created_at:  body.created_at  ?? new Date().toISOString(),
      })
      .select("id, created_at")
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const agentName = searchParams.get("agent_name")
    const riskLevel = searchParams.get("risk_level")
    const limit     = Math.min(Number(searchParams.get("limit") ?? 100), 500)

    const supabase = createServerClient()
    let query = supabase
      .from("mms_agent_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (agentName) query = query.eq("agent_name", agentName)
    if (riskLevel) query = query.eq("risk_level", riskLevel)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json({ error: "Query failed" }, { status: 500 })
  }
}
