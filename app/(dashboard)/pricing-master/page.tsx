"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { Check, Download, Edit2, Loader2, Search, X } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"

interface PricingItem {
  id: string
  code: string
  serviceNameEn: string
  serviceNameTh: string | null
  category: string
  unit: string
  rateThb: number
  pilotRateThb: number | null
  pilotNotes: string | null
  effectiveRate: number
  isActive: boolean
}

// ── inline-edit cell ────────────────────────────────────────────────────────
function EditableCell({
  value,
  onSave,
  placeholder = "–",
  type = "number",
  className = "",
}: {
  value: number | string | null
  onSave: (val: number | string | null) => Promise<void>
  placeholder?: string
  type?: "number" | "text"
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]   = useState(value != null ? String(value) : "")
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commit = async () => {
    setSaving(true)
    try {
      const parsed = type === "number"
        ? (draft.trim() === "" ? null : Number(draft))
        : (draft.trim() === "" ? null : draft.trim())
      await onSave(parsed)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    setDraft(value != null ? String(value) : "")
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(value != null ? String(value) : ""); setEditing(true) }}
        className={`group flex items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-amber-50 hover:ring-1 hover:ring-amber-300 transition-all ${className}`}
      >
        <span className={value == null ? "text-[#b0b8bc] italic text-xs" : ""}>
          {value != null ? (type === "number" ? `฿${Number(value).toLocaleString()}` : value) : placeholder}
        </span>
        <Edit2 className="h-3 w-3 text-[#b0b8bc] opacity-0 group-hover:opacity-100 flex-shrink-0" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        type={type === "number" ? "number" : "text"}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel() }}
        className="w-28 rounded border border-amber-400 bg-amber-50 px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
      />
      {saving ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#8b969a]" />
      ) : (
        <>
          <button onClick={commit} className="rounded p-0.5 hover:bg-green-100"><Check className="h-4 w-4 text-green-600" /></button>
          <button onClick={cancel} className="rounded p-0.5 hover:bg-red-50"><X className="h-4 w-4 text-red-400" /></button>
        </>
      )}
    </div>
  )
}

// ── pilot % badge ────────────────────────────────────────────────────────────
function PilotBadge({ pilot, standard }: { pilot: number | null; standard: number }) {
  if (pilot == null) return <span className="text-xs text-[#b0b8bc]">—</span>
  if (standard === 0) return null
  const pct = Math.round((pilot / standard) * 100)
  const color = pct < 70 ? "bg-red-100 text-red-700" : pct < 90 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
  return <span className={`ml-1 inline-block rounded-full px-1.5 py-0.5 text-xs font-semibold ${color}`}>{pct}%</span>
}

// ── main page ────────────────────────────────────────────────────────────────
export default function PricingMasterPage() {
  const [list, setList]       = useState<PricingItem[]>([])
  const [filtered, setFiltered] = useState<PricingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState("")
  const [category, setCategory] = useState("all")
  const [pilotFilter, setPilotFilter] = useState<"all" | "set" | "unset">("all")
  const [saving, setSaving]   = useState<string | null>(null) // row id being saved

  // ── fetch ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/pricing-master")
      .then(r => r.json())
      .then(json => {
        const rows: PricingItem[] = (json.data ?? []).filter((p: PricingItem) => p.isActive)
        setList(rows)
        setFiltered(rows)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // ── filter ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let f = list
    if (search) f = f.filter(p =>
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.serviceNameEn.toLowerCase().includes(search.toLowerCase()) ||
      (p.serviceNameTh ?? "").toLowerCase().includes(search.toLowerCase())
    )
    if (category !== "all") f = f.filter(p => p.category === category)
    if (pilotFilter === "set")   f = f.filter(p => p.pilotRateThb != null)
    if (pilotFilter === "unset") f = f.filter(p => p.pilotRateThb == null)
    setFiltered(f)
  }, [search, category, pilotFilter, list])

  const categories = Array.from(new Set(list.map(p => p.category)))

  // ── save helper ──────────────────────────────────────────────────────────
  const patchRow = useCallback(async (id: string, patch: Partial<Pick<PricingItem, "pilotRateThb" | "pilotNotes">>) => {
    setSaving(id)
    try {
      const res = await fetch(`/api/pricing-master/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error("Save failed")
      const json = await res.json()
      const updated: PricingItem = json.data
      setList(prev => prev.map(p => p.id === id ? updated : p))
    } catch (e) {
      alert("Failed to save: " + e)
    } finally {
      setSaving(null)
    }
  }, [])

  // ── bulk: apply % discount to filtered rows ──────────────────────────────
  const [bulkPct, setBulkPct] = useState("")
  const applyBulkDiscount = async () => {
    const pct = Number(bulkPct)
    if (isNaN(pct) || pct <= 0 || pct >= 100) { alert("Enter 1–99 %"); return }
    if (!confirm(`Set pilot rate = standard × ${(100 - pct).toFixed(0)}% for ${filtered.length} visible rows?`)) return
    for (const row of filtered) {
      const newRate = Math.round(row.rateThb * (1 - pct / 100))
      await patchRow(row.id, { pilotRateThb: newRate })
    }
    setBulkPct("")
  }

  // ── clear pilot rates for filtered rows ──────────────────────────────────
  const clearPilotRates = async () => {
    const setPilot = filtered.filter(p => p.pilotRateThb != null)
    if (setPilot.length === 0) { alert("No pilot rates set in current filter"); return }
    if (!confirm(`Clear pilot rates for ${setPilot.length} rows? They will revert to standard rate.`)) return
    for (const row of setPilot) {
      await patchRow(row.id, { pilotRateThb: null, pilotNotes: null })
    }
  }

  // ── export CSV ───────────────────────────────────────────────────────────
  const exportCsv = () => {
    const BOM = "﻿"
    const headers = ["code","category","serviceNameEn","unit","rate_thb","pilot_rate_thb","pct_of_standard","pilot_notes"]
    const rows = filtered.map(p => {
      const pct = p.pilotRateThb != null && p.rateThb > 0
        ? Math.round((p.pilotRateThb / p.rateThb) * 100)
        : ""
      return [
        p.code, p.category,
        `"${p.serviceNameEn.replace(/"/g,'""')}"`,
        p.unit, p.rateThb,
        p.pilotRateThb ?? "", pct,
        `"${(p.pilotNotes ?? "").replace(/"/g,'""')}"`,
      ].join(",")
    })
    const csv = BOM + [headers.join(","), ...rows].join("\r\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a"); a.href = url; a.download = "rate-card-pilot.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  // ── stats ────────────────────────────────────────────────────────────────
  const setPilotCount = list.filter(p => p.pilotRateThb != null).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing Master"
        description="Standard rate card with pilot / trial pricing overlay. Pilot rates are used by the AI quotation agent."
      />

      {/* ── Stats bar ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total services", value: list.length },
          { label: "Pilot rate set", value: setPilotCount, highlight: setPilotCount > 0 },
          { label: "Using standard rate", value: list.length - setPilotCount },
          { label: "Categories", value: categories.length },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-[#e5dfd2] bg-white p-3 shadow-sm">
            <p className="text-xs text-[#8b969a]">{s.label}</p>
            <p className={`text-xl font-bold ${s.highlight ? "text-amber-600" : "text-[#1f2933]"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters + Bulk Tools ───────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          {/* search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b969a]" />
            <input
              type="text"
              placeholder="Search code or name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-md border border-[#e5dfd2] bg-white py-2 pl-10 pr-3 text-sm focus:border-ocean-turquoise focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/20"
            />
          </div>
          {/* category */}
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm text-[#1f2933] focus:outline-none">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {/* pilot filter */}
          <select value={pilotFilter} onChange={e => setPilotFilter(e.target.value as "all"|"set"|"unset")}
            className="rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm text-[#1f2933] focus:outline-none">
            <option value="all">All rows</option>
            <option value="set">Pilot rate set</option>
            <option value="unset">No pilot rate yet</option>
          </select>
        </div>

        {/* bulk tools */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1">
            <span className="text-xs text-amber-700 whitespace-nowrap">Discount %</span>
            <input
              type="number" min="1" max="99" placeholder="e.g. 30"
              value={bulkPct} onChange={e => setBulkPct(e.target.value)}
              className="w-16 rounded border-0 bg-transparent text-sm text-amber-900 focus:outline-none"
            />
            <button onClick={applyBulkDiscount}
              className="rounded bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors">
              Apply to {filtered.length} rows
            </button>
          </div>
          <button onClick={clearPilotRates}
            className="rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-xs text-[#647076] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
            Clear pilot rates
          </button>
          <button onClick={exportCsv}
            className="flex items-center gap-1 rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-xs text-[#647076] hover:bg-[#f9f8f5] transition-colors">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-lg border border-[#e5dfd2] bg-white shadow-sm">
        {loading ? (
          <div className="flex h-32 items-center justify-center gap-2 text-[#8b969a]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-[#8b969a]">No records match</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[#e5dfd2] bg-[#f9f8f5]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-[#1f2933]">Code</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1f2933]">Service</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1f2933]">Category</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1f2933]">Unit</th>
                <th className="px-4 py-3 text-right font-semibold text-[#1f2933]">Standard Rate</th>
                <th className="px-4 py-3 text-right font-semibold text-amber-700">
                  Pilot Rate
                  <span className="ml-1 text-xs font-normal text-[#8b969a]">(click to edit)</span>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[#1f2933]">Pilot Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5dfd2]">
              {filtered.map(row => (
                <tr key={row.id}
                  className={`transition-colors ${saving === row.id ? "bg-amber-50" : row.pilotRateThb != null ? "bg-amber-50/30 hover:bg-amber-50/60" : "hover:bg-[#f9f8f5]"}`}>
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-ocean-turquoise whitespace-nowrap">{row.code}</td>
                  <td className="px-4 py-2.5 text-[#1f2933]">
                    <div>{row.serviceNameEn}</div>
                    {row.serviceNameTh && <div className="text-xs text-[#8b969a]">{row.serviceNameTh}</div>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-block rounded-full bg-[#e8fbf9] px-2 py-0.5 text-xs font-medium text-[#126c66]">{row.category}</span>
                  </td>
                  <td className="px-4 py-2.5 text-[#647076] text-xs whitespace-nowrap">{row.unit}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[#1f2933] whitespace-nowrap">
                    ฿{row.rateThb.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <EditableCell
                        value={row.pilotRateThb}
                        placeholder="set pilot…"
                        type="number"
                        onSave={val => patchRow(row.id, { pilotRateThb: val as number | null })}
                        className="font-semibold text-amber-700"
                      />
                      <PilotBadge pilot={row.pilotRateThb} standard={row.rateThb} />
                    </div>
                  </td>
                  <td className="px-4 py-2.5 min-w-[140px]">
                    <EditableCell
                      value={row.pilotNotes}
                      placeholder="add note…"
                      type="text"
                      onSave={val => patchRow(row.id, { pilotNotes: val as string | null })}
                      className="text-xs text-[#647076]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Legend ────────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-[#d7efed] bg-[#f3fbfa] p-4 text-sm text-[#126c66] space-y-1">
        <p className="font-semibold">How pilot rates work</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs text-[#647076]">
          <li>Click any cell in the <span className="font-semibold text-amber-700">Pilot Rate</span> column to set an effective rate for trial operations.</li>
          <li>The AI quotation agent will use the pilot rate automatically when set; otherwise it falls back to the standard rate.</li>
          <li>Use <span className="font-semibold">Discount %</span> to apply a bulk reduction (e.g. 30% off) to all currently filtered rows at once.</li>
          <li>Badge colour: <span className="text-green-700 font-semibold">green ≥90%</span> · <span className="text-amber-700 font-semibold">amber 70–89%</span> · <span className="text-red-700 font-semibold">red &lt;70%</span> of standard rate.</li>
          <li>Showing <span className="font-semibold">{filtered.length}</span> of <span className="font-semibold">{list.length}</span> active pricing records.</li>
        </ul>
      </div>
    </div>
  )
}
