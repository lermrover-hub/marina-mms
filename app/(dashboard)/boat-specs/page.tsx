"use client"
import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle2, Database, ExternalLink, Loader2, Plus, Search, Ship } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { formatKg, formatM, ftToM, mToFt } from "@/lib/utils"

// Tide safety defaults — must match ramp-booking calculation
const DEFAULT_TRAILER_M = 0.3  // trailer / support frame height
const DEFAULT_SAFETY_M  = 0.8  // minimum safety clearance
const RAMP_DEPTH_OFFSET = 1.0  // subtracted to get tide-table height

/** Compute on-the-fly to avoid relying on potentially corrupted DB columns. */
function computeDepths(spec: BoatSpec): { actualDepth: string; tideTable: string } {
  const draft_m = (spec.draft_ft ?? 0) * 0.3048
  if (draft_m === 0) return { actualDepth: "-", tideTable: "-" }
  const actualDepth = draft_m + DEFAULT_TRAILER_M + DEFAULT_SAFETY_M
  const tideTable   = actualDepth - RAMP_DEPTH_OFFSET
  return {
    actualDepth: actualDepth.toFixed(2),
    tideTable:   tideTable.toFixed(2),
  }
}

type BoatSpec = {
  id: string
  brand: string
  model: string
  boat_type?: string | null
  boat_category?: string | null
  propulsion_type?: string | null
  loa_ft?: number | null
  beam_ft?: number | null
  draft_ft?: number | null
  draft_max_m?: number | null
  weight_t?: number | null
  weight_kg?: number | null
  ramp_trailer_relevance?: string | null
  beam_risk_flag?: string | null
  draft_risk_flag?: string | null
  weight_risk_flag?: string | null
  required_actual_depth_m?: number | null
  required_tide_table_height_m?: number | null
  source_url?: string | null
  data_status?: string | null
  notes?: string | null
}

const EMPTY_SPEC = {
  brand: "",
  model: "",
  boat_type: "OTHER",
  boat_category: "",
  propulsion_type: "",
  loa_ft: "",
  beam_m: "",
  draft_m: "",
  weight_kg: "",
  ramp_trailer_relevance: "",
  source_url: "",
  notes: "",
}

function riskClass(value?: string | null) {
  const v = (value ?? "").toUpperCase()
  if (!v) return "bg-gray-100 text-gray-600"
  if (v.includes("OK") || v.includes("HIGH")) return "bg-teal-50 text-teal-700 border-teal-200"
  if (v.includes("CAUTION") || v.includes("MEDIUM")) return "bg-amber-50 text-amber-700 border-amber-200"
  return "bg-red-50 text-red-700 border-red-200"
}

export default function BoatSpecCatalogPage() {
  const [specs, setSpecs] = useState<BoatSpec[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_SPEC)
  const [bulkJson, setBulkJson] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/db/boat-specs?limit=1000")
    const data = await res.json()
    if (Array.isArray(data)) setSpecs(data)
    else setError(data?.error ?? "Failed to load boat specs")
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const boatTypes = useMemo(() => ["ALL", ...Array.from(new Set(specs.map((s) => s.boat_type).filter(Boolean)))], [specs])
  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return specs.filter((spec) => {
      const matchQuery = !q || [spec.brand, spec.model, spec.boat_category, spec.notes]
        .some((value) => value?.toLowerCase().includes(q))
      const matchType = typeFilter === "ALL" || spec.boat_type === typeFilter
      return matchQuery && matchType
    })
  }, [specs, query, typeFilter])

  const rampReady = specs.filter((s) => s.ramp_trailer_relevance === "High").length

  function setField(key: keyof typeof EMPTY_SPEC, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function saveManual(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null); setMessage(null)
    try {
      const body = {
        ...form,
        loa_ft: form.loa_ft ? Number(form.loa_ft) : null,
        beam_ft: form.beam_m ? mToFt(Number(form.beam_m)) : null,
        draft_ft: form.draft_m ? mToFt(Number(form.draft_m)) : null,
        weight_t: form.weight_kg ? Number(form.weight_kg) / 1000 : null,
      }
      const res = await fetch("/api/db/boat-specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Save failed")
      setMessage(`Saved ${data.imported} spec. Catalog now has ${data.total} records.`)
      setForm(EMPTY_SPEC)
      setShowAdd(false)
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  async function importJson() {
    setSaving(true); setError(null); setMessage(null)
    try {
      const parsed = JSON.parse(bulkJson)
      const res = await fetch("/api/db/boat-specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Array.isArray(parsed) ? { items: parsed } : parsed),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Import failed")
      setMessage(`Imported ${data.imported} spec(s). Catalog now has ${data.total} records.`)
      setBulkJson("")
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Boat Spec Database"
        description="Reusable model specifications for ramp, trailer, berth, and registration planning"
        actions={
          <Button size="sm" variant="teal" className="gap-2" onClick={() => setShowAdd((v) => !v)}>
            <Plus className="h-4 w-4" /> Add Spec
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Catalog Records</p><p className="mt-1 text-2xl font-bold text-gray-900">{specs.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Ramp Friendly</p><p className="mt-1 text-2xl font-bold text-teal-700">{rampReady}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Type Groups</p><p className="mt-1 text-2xl font-bold text-gray-900">{Math.max(boatTypes.length - 1, 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Register Form</p><Link className="mt-2 inline-flex text-sm font-medium text-teal-700 hover:underline" href="/boats/new">Use template</Link></CardContent></Card>
      </div>

      {(message || error) && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-teal-200 bg-teal-50 text-teal-700"}`}>
          {error ?? message}
        </div>
      )}

      {showAdd && (
        <Card>
          <CardHeader><CardTitle>Add New Boat Spec</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={saveManual} className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div><Label>Brand *</Label><Input value={form.brand} onChange={(e) => setField("brand", e.target.value)} required /></div>
              <div><Label>Model *</Label><Input value={form.model} onChange={(e) => setField("model", e.target.value)} required /></div>
              <div><Label>Boat Type</Label><Input value={form.boat_type} onChange={(e) => setField("boat_type", e.target.value)} placeholder="MOTOR_YACHT" /></div>
              <div><Label>Category</Label><Input value={form.boat_category} onChange={(e) => setField("boat_category", e.target.value)} /></div>
              <div><Label>LOA ft</Label><Input type="number" step="0.01" value={form.loa_ft} onChange={(e) => setField("loa_ft", e.target.value)} /></div>
              <div><Label>Beam m</Label><Input type="number" step="0.01" value={form.beam_m} onChange={(e) => setField("beam_m", e.target.value)} /></div>
              <div><Label>Draft m</Label><Input type="number" step="0.01" value={form.draft_m} onChange={(e) => setField("draft_m", e.target.value)} /></div>
              <div><Label>Weight kg</Label><Input type="number" step="1" value={form.weight_kg} onChange={(e) => setField("weight_kg", e.target.value)} /></div>
              <div><Label>Propulsion</Label><Input value={form.propulsion_type} onChange={(e) => setField("propulsion_type", e.target.value)} /></div>
              <div><Label>Ramp Relevance</Label><Input value={form.ramp_trailer_relevance} onChange={(e) => setField("ramp_trailer_relevance", e.target.value)} placeholder="High / Medium / Low" /></div>
              <div className="md:col-span-2"><Label>Source URL</Label><Input value={form.source_url} onChange={(e) => setField("source_url", e.target.value)} /></div>
              <div className="md:col-span-4"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setField("notes", e.target.value)} /></div>
              <div className="md:col-span-4 flex justify-end">
                <Button type="submit" variant="teal" disabled={saving}>{saving ? "Saving..." : "Save Spec"}</Button>
              </div>
            </form>

            <div className="border-t pt-4">
              <Label>Bulk Import JSON</Label>
              <textarea
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
                rows={5}
                placeholder='Paste a JSON object or array. Required fields: brand, model.'
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <div className="mt-2 flex justify-end">
                <Button type="button" variant="outline" disabled={saving || !bulkJson.trim()} onClick={importJson}>Import JSON</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search brand, model, category..." className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {boatTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type ?? "ALL")}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${typeFilter === type ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  {type === "ALL" ? "All Types" : String(type).replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading boat specs...
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  {["Model", "Type", "Dimensions", "Ramp / Trailer", "Depth", "Status", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((spec) => (
                  <tr key={spec.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50"><Ship className="h-4 w-4 text-teal-700" /></div>
                        <div>
                          <p className="font-semibold text-gray-900">{spec.brand} {spec.model}</p>
                          <p className="text-xs text-gray-500">{spec.id} {spec.boat_category ? `- ${spec.boat_category}` : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3"><Badge>{(spec.boat_type ?? "OTHER").replace(/_/g, " ")}</Badge><p className="mt-1 text-xs text-gray-500">{spec.propulsion_type ?? "-"}</p></td>
                    <td className="px-5 py-3 text-xs text-gray-600">
                      <div>LOA: <span className="font-medium">{spec.loa_ft ?? "-"} ft</span></div>
                      <div>Beam: <span className="font-medium">{spec.beam_ft != null ? formatM(ftToM(spec.beam_ft)) : "-"}</span></div>
                      <div>Draft: <span className="font-medium">{spec.draft_ft != null ? formatM(ftToM(spec.draft_ft)) : "-"}</span></div>
                      <div>Weight: <span className="font-medium">{spec.weight_kg != null ? formatKg(spec.weight_kg) : spec.weight_t != null ? formatKg(spec.weight_t * 1000) : "-"}</span></div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${riskClass(spec.ramp_trailer_relevance)}`}>{spec.ramp_trailer_relevance ?? "No ramp flag"}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${riskClass(spec.beam_risk_flag)}`}>Beam {spec.beam_risk_flag ?? "-"}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${riskClass(spec.weight_risk_flag)}`}>Weight {spec.weight_risk_flag ?? "-"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600">
                      {(() => {
                        const { actualDepth, tideTable } = computeDepths(spec)
                        return (
                          <>
                            <div>Actual: {actualDepth} m</div>
                            <div>Tide table: {tideTable} m</div>
                          </>
                        )
                      })()}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        {spec.data_status === "Verified" ? <CheckCircle2 className="h-3 w-3 text-teal-600" /> : <AlertCircle className="h-3 w-3 text-amber-600" />}
                        {spec.data_status ?? "Manual"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {spec.source_url && (
                        <a href={spec.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-teal-700 hover:underline">
                          Source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-16 text-center text-sm text-gray-500"><Database className="mx-auto mb-2 h-8 w-8 text-gray-300" />No matching boat specs</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t px-5 py-3 text-xs text-gray-500">Showing {filtered.length} of {specs.length} specs</div>
        </Card>
      )}
    </div>
  )
}
