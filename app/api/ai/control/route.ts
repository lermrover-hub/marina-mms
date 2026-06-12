import { NextRequest, NextResponse } from "next/server"
import { AGENT_CONFIG_DEFINITIONS, getAgentDefinition, mergeAgentConfig } from "@/lib/agent-config-schema"
import { createServerClient } from "@/lib/supabase-server"
import { isAgentWritesEnabled, isDryRun, isProductionBookingsEnabled, isRealCustomerMessagesEnabled } from "@/lib/safe-mode"
import Anthropic from "@anthropic-ai/sdk"
import { canManageAgents } from "@/lib/agent-access"

export const dynamic = "force-dynamic"

type Row = Record<string, unknown>

function daysFromToday(value: unknown) {
  if (!value) return null
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return null
  return Math.ceil((date.getTime() - Date.now()) / 86400000)
}

async function getConfigs() {
  const supabase = createServerClient()
  const { data, error } = await supabase.from("mms_agent_config").select("agent_id, config")
  if (error) throw error
  return Object.fromEntries(AGENT_CONFIG_DEFINITIONS.map((definition) => {
    const row = data?.find((item) => item.agent_id === definition.id)
    return [definition.id, mergeAgentConfig(definition.id, row?.config)]
  }))
}

export async function GET() {
  if (!await canManageAgents()) return NextResponse.json({ error: "Agent management access required" }, { status: 403 })
  const configs = await getConfigs()
  return NextResponse.json({
    agents: AGENT_CONFIG_DEFINITIONS.map((agent) => ({
      id: agent.id,
      label: agent.label,
      description: agent.description,
      configured: Boolean(configs[agent.id]),
    })),
    safety: {
      dry_run: isDryRun(),
      agent_writes: isAgentWritesEnabled(),
      customer_messages: isRealCustomerMessagesEnabled(),
      production_bookings: isProductionBookingsEnabled(),
      web_runs: "preview_only",
      ai_model_available: Boolean(process.env.ANTHROPIC_API_KEY),
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    if (!await canManageAgents()) return NextResponse.json({ error: "Agent management access required" }, { status: 403 })
    const body = await req.json()
    const agentId = String(body.agent_id ?? "")
    const definition = getAgentDefinition(agentId)
    if (!definition) return NextResponse.json({ error: "Unknown agent" }, { status: 400 })
    if (body.mode && body.mode !== "preview") {
      return NextResponse.json({ error: "Web runs are preview-only. Production execution requires the approval workflow." }, { status: 403 })
    }

    const supabase = createServerClient()
    const configs = await getConfigs()
    const config = configs[agentId] ?? definition.defaults
    const started = Date.now()
    let result: Record<string, unknown>

    if (agentId === "quotation") {
      const [{ data: requests, error: requestError }, { data: quotations, error: quoteError }, { count: activeRates, error: rateError }] = await Promise.all([
        supabase.from("mms_service_requests").select("id, status, customer_id, boat_id, title, description"),
        supabase.from("mms_quotations").select("sr_id"),
        supabase.from("pricing_master").select("id", { count: "exact", head: true }).eq("is_active", true),
      ])
      if (requestError || quoteError || rateError) throw requestError ?? quoteError ?? rateError
      const quoted = new Set((quotations ?? []).map((row) => row.sr_id).filter(Boolean))
      const candidates = (requests ?? []).filter((row) => ["NEW", "NEW_REQUEST", "INSPECTION_REQUIRED"].includes(String(row.status).toUpperCase()) && !quoted.has(row.id))
      result = { candidates: candidates.slice(0, 20), candidate_count: candidates.length, active_rate_count: activeRates ?? 0 }
    } else if (agentId === "marina") {
      const [contractResult, boatResult, workOrderResult] = await Promise.all([
        supabase.from("mms_contracts").select("*"),
        supabase.from("mms_boats").select("id, name, owner_id, insurance_expiry"),
        supabase.from("mms_work_orders").select("id, title, status, created_at"),
      ])
      const previewError = contractResult.error ?? boatResult.error ?? workOrderResult.error
      if (previewError) throw previewError
      const contracts = contractResult.data
      const boats = boatResult.data
      const workOrders = workOrderResult.data
      const contractDays = Number(config.contract_expiry_warn_days)
      const insuranceDays = Number(config.insurance_expiry_warn_days)
      const overdueDays = Number(config.work_order_overdue_days)
      const contractAlerts = (contracts ?? []).filter((row) => { const days = daysFromToday(row.end_date ?? row.expires_at); return days !== null && days >= 0 && days <= contractDays })
      const insuranceAlerts = (boats ?? []).filter((row) => { const days = daysFromToday(row.insurance_expiry); return days !== null && days >= 0 && days <= insuranceDays })
      const workOrderAlerts = (workOrders ?? []).filter((row) => ["IN_PROGRESS", "WAITING_PARTS"].includes(String(row.status).toUpperCase()) && (daysFromToday(row.created_at) ?? 0) < -overdueDays)
      result = { contract_alerts: contractAlerts, insurance_alerts: insuranceAlerts, overdue_work_orders: workOrderAlerts }
    } else if (agentId === "finance") {
      const { data, error } = await supabase.from("mms_invoices").select("id, invoice_number, customer_id, status, due_date, total_amount, paid_amount, outstanding_balance")
      if (error) throw error
      const openInvoices = (data ?? []).filter((row) => !["PAID", "CANCELLED"].includes(String(row.status).toUpperCase()))
      const overdue = openInvoices.filter((row) => {
        return (daysFromToday(row.due_date) ?? 0) < -Number(config.overdue_warn_days)
      })
      const upcoming = openInvoices.filter((row) => {
        const days = daysFromToday(row.due_date)
        return days !== null && days >= 0 && days <= Number(config.upcoming_due_days)
      })
      const outstanding = (row: Row) => Number(row.outstanding_balance ?? Number(row.total_amount ?? 0) - Number(row.paid_amount ?? 0))
      const overdueTotal = overdue.reduce((sum, row) => sum + outstanding(row), 0)
      const upcomingTotal = upcoming.reduce((sum, row) => sum + outstanding(row), 0)
      result = {
        overdue_invoices: overdue,
        overdue_count: overdue.length,
        overdue_total: overdueTotal,
        upcoming_invoices: upcoming,
        upcoming_count: upcoming.length,
        upcoming_total: upcomingTotal,
        escalation_required: overdueTotal >= Number(config.escalation_amount_thb),
      }
    } else if (agentId === "comms") {
      const { data, error } = await supabase.from("mms_messages").select("*").order("created_at", { ascending: false }).limit(100)
      if (error) throw error
      const pending = (data ?? []).filter((row) => String(row.direction).toUpperCase() === "INBOUND" && row.replied !== true)
      result = { pending_messages: pending, pending_count: pending.length, reply_policy: { language: config.language, tone: config.tone, max_words: config.max_words } }
    } else if (agentId === "hr") {
      const task = String(body.inputs?.task ?? "kpi")
      const role = String(body.inputs?.role ?? "Marina team member")
      if (!["jd", "kpi", "sop", "onboard"].includes(task)) return NextResponse.json({ error: "HR task must be jd, kpi, sop, or onboard" }, { status: 400 })
      result = { task, role, draft_parameters: { language: config.default_language, max_kpis: config.max_kpis, onboarding_days: config.onboarding_days }, ready_for_ai_generation: Boolean(process.env.ANTHROPIC_API_KEY) }
    } else {
      const tideData = Array.isArray(body.inputs?.tide_data) ? body.inputs.tide_data as Row[] : []
      const boatDraft = Number(body.inputs?.boat_draft_m ?? 0)
      const requiredActualDepth = boatDraft + Number(config.trailer_height_m) + Number(config.safety_clearance_m)
      const requiredTideHeight = requiredActualDepth - Number(config.ramp_offset_m)
      const slots = tideData.map((slot) => ({ hour: Number(slot.hour), height: Number(slot.height), safe: Number(slot.height) >= requiredTideHeight }))
      result = { required_actual_depth_m: requiredActualDepth, required_tide_height_m: requiredTideHeight, slots, safe_hours: slots.filter((slot) => slot.safe).map((slot) => slot.hour) }
    }

    let aiOutput: string | null = null
    if (body.generate_ai === true) {
      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured for the web application" }, { status: 503 })
      }
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const message = await anthropic.messages.create({
        model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
        max_tokens: 1200,
        system: `You are the ${definition.label} for Ocean Rover Marina. Analyse the supplied preview only. Do not claim to write records, send messages, approve documents, or confirm bookings. Apply the configured operating rules exactly.`,
        messages: [{ role: "user", content: JSON.stringify({ config, inputs: body.inputs ?? {}, preview: result }) }],
      })
      aiOutput = message.content.find((block) => block.type === "text")?.text ?? null
    }

    return NextResponse.json({
      ok: true,
      mode: "preview",
      agent_id: agentId,
      config,
      result,
      ai_output: aiOutput,
      duration_ms: Date.now() - started,
      writes_performed: false,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Agent preview failed" }, { status: 500 })
  }
}
