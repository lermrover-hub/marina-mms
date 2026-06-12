/**
 * GET  /api/db/agent-config          — list all agent configs
 * PATCH /api/db/agent-config         — update one agent's config { agent_id, config }
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { AGENT_CONFIG_DEFINITIONS, getAgentDefinition, mergeAgentConfig, validateAgentConfig } from "@/lib/agent-config-schema"
import { canManageAgents, hasValidAgentKey } from "@/lib/agent-access"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  if (!hasValidAgentKey(req) && !await canManageAgents()) {
    return NextResponse.json({ error: "Agent management access required" }, { status: 403 })
  }
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("mms_agent_config")
    .select("agent_id, label, config, updated_at, updated_by")
    .order("agent_id")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = data ?? []
  return NextResponse.json(AGENT_CONFIG_DEFINITIONS.map((definition) => {
    const row = rows.find((item) => item.agent_id === definition.id)
    return {
      agent_id: definition.id,
      label: row?.label ?? definition.label,
      config: mergeAgentConfig(definition.id, row?.config),
      updated_at: row?.updated_at ?? null,
      updated_by: row?.updated_by ?? null,
    }
  }))
}

export async function PATCH(req: NextRequest) {
  try {
    if (!await canManageAgents()) {
      return NextResponse.json({ error: "Agent management access required" }, { status: 403 })
    }
    const { agent_id, config } = await req.json()
    if (!agent_id || typeof config !== "object" || config === null) {
      return NextResponse.json({ error: "agent_id and config object required" }, { status: 400 })
    }
    const definition = getAgentDefinition(agent_id)
    if (!definition) return NextResponse.json({ error: "Unknown agent" }, { status: 400 })
    const errors = validateAgentConfig(agent_id, config)
    if (errors.length > 0) return NextResponse.json({ error: errors.join("; "), errors }, { status: 400 })

    const mergedConfig = mergeAgentConfig(agent_id, config)
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("mms_agent_config")
      .upsert({
        agent_id,
        label: definition.label,
        config: mergedConfig,
        updated_at: new Date().toISOString(),
      }, { onConflict: "agent_id" })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
