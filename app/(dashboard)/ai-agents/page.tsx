"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Bot, CheckCircle2, Loader2, Play, RefreshCw, Save, ShieldCheck } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AGENT_CONFIG_DEFINITIONS, type AgentId } from "@/lib/agent-config-schema"
import { cn } from "@/lib/utils"

type ConfigRow = {
  agent_id: AgentId
  label: string
  config: Record<string, string | number | boolean>
  updated_at: string | null
}

type ControlStatus = {
  safety: {
    dry_run: boolean
    agent_writes: boolean
    customer_messages: boolean
    production_bookings: boolean
    web_runs: string
    ai_model_available: boolean
  }
}

const FIELD_LABELS: Record<string, string> = {
  vat_pct: "VAT (%)",
  deposit_pct: "Deposit (%)",
  valid_days: "Quotation validity (days)",
  max_discount_pct: "Maximum discount without escalation (%)",
  contract_expiry_warn_days: "Contract warning window (days)",
  insurance_expiry_warn_days: "Insurance warning window (days)",
  work_order_overdue_days: "Work order overdue after (days)",
  overdue_warn_days: "Invoice overdue after (days)",
  upcoming_due_days: "Upcoming invoice window (days)",
  escalation_amount_thb: "Escalation amount (THB)",
  max_words: "Maximum reply length (words)",
  language: "Reply language",
  phone: "Contact phone",
  tone: "Reply tone",
  default_language: "Document language",
  max_kpis: "Maximum KPI count",
  onboarding_days: "Onboarding period (days)",
  ramp_offset_m: "Ramp depth offset (m)",
  trailer_height_m: "Default trailer height (m)",
  safety_clearance_m: "Safety clearance (m)",
  extra_instructions: "Additional operating instructions",
}

export default function AiAgentsPage() {
  const [configs, setConfigs] = useState<ConfigRow[]>([])
  const [drafts, setDrafts] = useState<Record<string, Record<string, string | number | boolean>>>({})
  const [status, setStatus] = useState<ControlStatus | null>(null)
  const [selected, setSelected] = useState<AgentId>("quotation")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [hrTask, setHrTask] = useState("kpi")
  const [hrRole, setHrRole] = useState("Marina team member")
  const [boatDraft, setBoatDraft] = useState("0.5")

  async function load() {
    setLoading(true)
    setMessage(null)
    try {
      const [configRes, statusRes] = await Promise.all([
        fetch("/api/db/agent-config", { cache: "no-store" }),
        fetch("/api/ai/control", { cache: "no-store" }),
      ])
      const configData = await configRes.json()
      const statusData = await statusRes.json()
      if (!configRes.ok) throw new Error(configData.error ?? "Unable to load agent configuration")
      if (!statusRes.ok) throw new Error(statusData.error ?? "Unable to load agent status")
      setConfigs(configData)
      setDrafts(Object.fromEntries(configData.map((row: ConfigRow) => [row.agent_id, { ...row.config }])))
      setStatus(statusData)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load AI agents")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const definition = useMemo(() => AGENT_CONFIG_DEFINITIONS.find((agent) => agent.id === selected)!, [selected])
  const currentConfig = drafts[selected] ?? definition.defaults
  const currentRow = configs.find((row) => row.agent_id === selected)

  function updateField(key: string, value: string, expected: string) {
    setDrafts((previous) => ({
      ...previous,
      [selected]: { ...previous[selected], [key]: expected === "number" ? Number(value) : value },
    }))
  }

  async function saveConfig() {
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch("/api/db/agent-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: selected, config: currentConfig }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Save failed")
      setMessage(`${definition.label} configuration saved.`)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function runPreview(generateAi = false) {
    setRunning(true)
    setMessage(null)
    setResult(null)
    try {
      const inputs: Record<string, unknown> = {}
      if (selected === "hr") Object.assign(inputs, { task: hrTask, role: hrRole })
      if (selected === "tide") Object.assign(inputs, {
        boat_draft_m: Number(boatDraft),
        tide_data: [
          { hour: 6, height: 1.8 }, { hour: 7, height: 2.2 },
          { hour: 8, height: 2.8 }, { hour: 9, height: 3.1 },
        ],
      })
      const response = await fetch("/api/ai/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: selected, mode: "preview", inputs, generate_ai: generateAi }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Preview failed")
      setResult(data)
      setMessage(`${definition.label} ${generateAi ? "AI analysis" : "preview"} completed without writes.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Preview failed")
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Agent Control Center"
        description="Configure real operating rules and safely preview each agent before production approval."
        actions={<Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className="h-4 w-4" /> Refresh</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatusTile label="Web execution" value="Preview only" safe />
        <StatusTile label="AI model" value={status?.safety.ai_model_available ? "Ready" : "Not configured"} safe={Boolean(status?.safety.ai_model_available)} />
        <StatusTile label="Database writes" value={status?.safety.agent_writes ? "Enabled" : "Blocked"} safe={!status?.safety.agent_writes} />
        <StatusTile label="Customer messages" value={status?.safety.customer_messages ? "Enabled" : "Blocked"} safe={!status?.safety.customer_messages} />
        <StatusTile label="Production bookings" value={status?.safety.production_bookings ? "Enabled" : "Blocked"} safe={!status?.safety.production_bookings} />
      </div>

      {message && <div className="rounded-md border border-[#bde7e2] bg-[#effbf9] px-4 py-3 text-sm text-[#145e59]">{message}</div>}

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className="space-y-2">
          {AGENT_CONFIG_DEFINITIONS.map((agent) => (
            <button key={agent.id} onClick={() => { setSelected(agent.id); setResult(null); setMessage(null) }} className={cn("w-full border px-3 py-3 text-left transition-colors", selected === agent.id ? "border-[#25bdb3] bg-[#e8fbf9]" : "border-gray-200 bg-white hover:bg-gray-50")}>
              <div className="flex items-center gap-2"><Bot className="h-4 w-4 text-[#13988f]" /><span className="text-sm font-semibold text-gray-900">{agent.label}</span></div>
              <p className="mt-1 text-xs leading-5 text-gray-500">{agent.description}</p>
            </button>
          ))}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-5 w-5 text-[#13988f]" /> {definition.label} rules</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {loading ? <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading configuration</div> : (
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(definition.defaults).map(([key, defaultValue]) => {
                    const value = currentConfig[key] ?? defaultValue
                    const isLong = key === "extra_instructions"
                    return <div key={key} className={cn("space-y-1.5", isLong && "md:col-span-2")}>
                      <Label htmlFor={`${selected}-${key}`}>{FIELD_LABELS[key] ?? key}</Label>
                      {isLong ? (
                        <Textarea id={`${selected}-${key}`} value={String(value)} onChange={(event) => updateField(key, event.target.value, "string")} rows={4} />
                      ) : (
                        <Input id={`${selected}-${key}`} type={typeof defaultValue === "number" ? "number" : "text"} step={key.endsWith("_m") ? "0.1" : "1"} value={String(value)} onChange={(event) => updateField(key, event.target.value, typeof defaultValue)} />
                      )}
                    </div>
                  })}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <p className="text-xs text-gray-500">Last saved: {currentRow?.updated_at ? new Date(currentRow.updated_at).toLocaleString() : "Using defaults"}</p>
                <Button onClick={() => void saveConfig()} disabled={saving || loading}><Save className="h-4 w-4" /> {saving ? "Saving" : "Save rules"}</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Play className="h-5 w-5 text-[#13988f]" /> Safe preview run</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="h-5 w-5 shrink-0" /><p>This reads production data using the saved rules. It does not create records, send messages, modify bookings, or execute approvals.</p></div>
              {selected === "hr" && <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label>Task</Label><select className="h-10 w-full border border-gray-200 bg-white px-3 text-sm" value={hrTask} onChange={(event) => setHrTask(event.target.value)}><option value="kpi">KPI framework</option><option value="jd">Job description</option><option value="sop">SOP</option><option value="onboard">Onboarding plan</option></select></div><div className="space-y-1.5"><Label>Role or topic</Label><Input value={hrRole} onChange={(event) => setHrRole(event.target.value)} /></div></div>}
              {selected === "tide" && <div className="max-w-xs space-y-1.5"><Label>Boat draft (m)</Label><Input type="number" step="0.1" value={boatDraft} onChange={(event) => setBoatDraft(event.target.value)} /></div>}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void runPreview(false)} disabled={running || loading} className="gap-2"><Play className="h-4 w-4" /> {running ? "Running preview" : `Run ${definition.label}`}</Button>
                <Button variant="outline" onClick={() => void runPreview(true)} disabled={running || loading || !status?.safety.ai_model_available} className="gap-2"><Bot className="h-4 w-4" /> Generate AI analysis</Button>
              </div>
              {!status?.safety.ai_model_available && <p className="text-xs text-amber-700">AI generation will become available after ANTHROPIC_API_KEY is configured in the web application environment. Rule-based previews work now.</p>}
              {result && <div className="border border-gray-200 bg-[#fbfcfc] p-4"><div className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-700"><CheckCircle2 className="h-4 w-4" /> Completed in {String(result.duration_ms)} ms</div><pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-gray-700">{JSON.stringify(result.result, null, 2)}</pre>{typeof result.ai_output === "string" && result.ai_output && <div className="mt-4 border-t pt-4"><p className="mb-2 text-xs font-semibold uppercase text-gray-500">AI analysis</p><p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">{result.ai_output}</p></div>}</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatusTile({ label, value, safe }: { label: string; value: string; safe: boolean }) {
  return <div className="border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">{label}</p><div className="mt-2 flex items-center gap-2">{safe ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}<span className="text-sm font-semibold text-gray-900">{value}</span></div></div>
}
