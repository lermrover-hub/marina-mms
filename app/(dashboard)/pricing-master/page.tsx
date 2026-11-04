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
  fullRateThb: number
  discountPct: number
  sourceDiscountPct: number
  directCostThb: number | null
  grossProfitThb: number | null
  grossMarginPct: number | null
  revenueGlCode: string | null
  costGlCode: string | null
  pnlCategory: string | null
  calcType: string
  serviceGroup: string | null
  subgroup: string | null
  providerType: string | null
  quoteAllowed: string
  priceStatus: string
  sourceVersion: string | null
  effectiveDate: string | null
  updatedAt: string
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
  const [serviceGroup, setServiceGroup] = useState("all")
  const [calcType, setCalcType] = useState("all")
  const [statusFilter, setStatusFilter] = useState<"active" | "retired" | "all">("active")
  const [pilotFilter, setPilotFilter] = useState<"all" | "set" | "unset">("all")
  const [saving, setSaving]   = useState<string | null>(null) // row id being saved

  // ── fetch ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/pricing-master")
      .then(r => r.json())
      .then(json => {
        const rows: PricingItem[] = json.data ?? []
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
    if (serviceGroup !== "all") f = f.filter(p => (p.serviceGroup ?? "Unclassified") === serviceGroup)
    if (calcType !== "all") f = f.filter(p => p.calcType === calcType)
    if (statusFilter === "active") f = f.filter(p => p.isActive)
    if (statusFilter === "retired") f = f.filter(p => !p.isActive)
    if (pilotFilter === "set")   f = f.filter(p => p.pilotRateThb != null)
    if (pilotFilter === "unset") f = f.filter(p => p.pilotRateThb == null)
    setFiltered([...f].sort((a, b) => (a.serviceGroup ?? "Unclassified").localeCompare(b.serviceGroup ?? "Unclassified") || a.code.localeCompare(b.code)))
  }, [search, category, serviceGroup, calcType, statusFilter, pilotFilter, list])

  const categories = Array.from(new Set(list.map(p => p.category)))
  const serviceGroups = Array.from(new Set(list.map(p => p.serviceGroup ?? "Unclassified"))).sort()
  const calcTypes = Array.from(new Set(list.map(p => p.calcType))).sort()

  // ── save helper ──────────────────────────────────────────────────────────
  const patchRow = useCallback(async (id: string, patch: Partial<Pick<PricingItem, "pilotRateThb" | "pilotNotes">>) => {
    const current = list.find((row) => row.id === id)
    if (Object.prototype.hasOwnProperty.call(patch, "pilotRateThb")) {
      const before = current?.pilotRateThb == null ? "not set" : `THB ${current.pilotRateThb.toLocaleString()}`
      const after = patch.pilotRateThb == null ? "not set (use approved current rate)" : `THB ${Number(patch.pilotRateThb).toLocaleString()}`
      if (!confirm(`Preview pricing change\n\n${current?.code ?? id}\nPilot rate: ${before} → ${after}\n\nSave this approved staging change?`)) return
    }
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
  }, [list])

  // ── export CSV ───────────────────────────────────────────────────────────
  const exportCsv = () => {
    const BOM = "﻿"
    const headers = ["code","category","service_group","subgroup","calculation_method","serviceNameEn","unit","full_rate_thb","soft_or_current_rate_thb","effective_rate_thb","default_discount_pct","source_discount_pct","direct_cost_thb","gross_profit_thb","gross_margin_pct","revenue_gl_code","cost_gl_code","pnl_category","quote_allowed","price_status","source_version","effective_date","active","pilot_rate_thb","pct_of_current","pilot_notes"]
    const rows = filtered.map(p => {
      const pct = p.pilotRateThb != null && p.rateThb > 0
        ? Math.round((p.pilotRateThb / p.rateThb) * 100)
        : ""
      return [
        p.code, p.category, p.serviceGroup ?? "", p.subgroup ?? "", p.calcType,
        `"${p.serviceNameEn.replace(/"/g,'""')}"`,
        p.unit, p.fullRateThb, p.rateThb, p.effectiveRate, p.discountPct, p.sourceDiscountPct,
        p.directCostThb ?? "", p.grossProfitThb ?? "", p.grossMarginPct ?? "",
        p.revenueGlCode ?? "", p.costGlCode ?? "", p.pnlCategory ?? "", p.quoteAllowed, p.priceStatus, p.sourceVersion ?? "", p.effectiveDate ?? "", p.isActive,
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
        description="Accounting-ready rate card. Default customer discount is 0%; pilot rates remain an explicit temporary override."
      />

      {/* ── Stats bar ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Active services", value: list.filter((row) => row.isActive).length },
          { label: "Pilot rate set", value: setPilotCount, highlight: setPilotCount > 0 },
          { label: "Retired / reference", value: list.filter((row) => !row.isActive).length },
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
          <select value={serviceGroup} onChange={e => setServiceGroup(e.target.value)} className="rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm text-[#1f2933] focus:outline-none">
            <option value="all">All Service Groups</option>{serviceGroups.map(group => <option key={group} value={group}>{group}</option>)}
          </select>
          <select value={calcType} onChange={e => setCalcType(e.target.value)} className="rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm text-[#1f2933] focus:outline-none">
            <option value="all">All Calculation Methods</option>{calcTypes.map(method => <option key={method} value={method}>{method}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "active" | "retired" | "all")} className="rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm text-[#1f2933] focus:outline-none">
            <option value="active">Active only</option><option value="retired">Retired / reference</option><option value="all">All statuses</option>
          </select>
          {/* pilot filter */}
          <select value={pilotFilter} onChange={e => setPilotFilter(e.target.value as "all"|"set"|"unset")}
            className="rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm text-[#1f2933] focus:outline-none">
            <option value="all">All rows</option>
            <option value="set">Pilot rate set</option>
            <option value="unset">No pilot rate yet</option>
          </select>
        </div>

        {/* export only; bulk discount changes are intentionally disabled */}
        <div className="flex items-center gap-2">
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
                <th className="px-4 py-3 text-left font-semibold text-[#1f2933]">Group / Method</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1f2933]">Unit</th>
                <th className="px-4 py-3 text-right font-semibold text-[#1f2933]">Full Rate</th>
                <th className="px-4 py-3 text-right font-semibold text-[#1f2933]">Current Rate</th>
                <th className="px-4 py-3 text-right font-semibold text-[#1f2933]">Default Disc.</th>
                <th className="px-4 py-3 text-right font-semibold text-[#1f2933]">Direct Cost</th>
                <th className="px-4 py-3 text-right font-semibold text-[#1f2933]">GP / GM</th>
                <th className="px-4 py-3 text-right font-semibold text-amber-700">
                  Pilot Rate
                  <span className="ml-1 text-xs font-normal text-[#8b969a]">(click to edit)</span>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[#1f2933]">Pilot Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5dfd2]">
              {filtered.map((row, index) => (
                <React.Fragment key={row.id}>
                {(index === 0 || filtered[index - 1].serviceGroup !== row.serviceGroup) && <tr className="bg-teal-50"><td colSpan={12} className="px-4 py-2 text-sm font-bold text-teal-900">{row.serviceGroup ?? "Unclassified services"}</td></tr>}
                <tr
                  className={`transition-colors ${saving === row.id ? "bg-amber-50" : row.pilotRateThb != null ? "bg-amber-50/30 hover:bg-amber-50/60" : "hover:bg-[#f9f8f5]"}`}>
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-ocean-turquoise whitespace-nowrap">{row.code}</td>
                  <td className="px-4 py-2.5 text-[#1f2933]">
                    <div>{row.serviceNameEn}</div>
                    {row.serviceNameTh && <div className="text-xs text-[#8b969a]">{row.serviceNameTh}</div>}
                    {(row.revenueGlCode || row.costGlCode || row.pnlCategory) && (
                      <div className="mt-1 text-[11px] text-[#8b969a]">
                        GL {row.revenueGlCode ?? "—"} / Cost {row.costGlCode ?? "—"} · {row.pnlCategory ?? "Unmapped P&L"}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-block rounded-full bg-[#e8fbf9] px-2 py-0.5 text-xs font-medium text-[#126c66]">{row.category}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#647076]"><div>{row.subgroup ?? "—"}</div><div className="font-mono">{row.calcType}</div><div>{row.quoteAllowed !== "YES" ? row.quoteAllowed : ""}</div></td>
                  <td className="px-4 py-2.5 text-[#647076] text-xs whitespace-nowrap">{row.unit}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[#1f2933] whitespace-nowrap">
                    ฿{row.fullRateThb.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[#1f2933] whitespace-nowrap">
                    ฿{row.rateThb.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <span className={row.discountPct === 0 ? "text-green-700" : "font-semibold text-amber-700"}>{row.discountPct.toLocaleString()}%</span>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap text-[#647076]">
                    {row.directCostThb == null ? "Unknown" : `฿${row.directCostThb.toLocaleString()}`}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {row.grossProfitThb == null ? "—" : (
                      <><div>฿{row.grossProfitThb.toLocaleString()}</div><div className="text-xs text-[#8b969a]">{row.grossMarginPct?.toFixed(1)}%</div></>
                    )}
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
                </tr></React.Fragment>
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
          <li>Default customer discount is <span className="font-semibold">0%</span>. Any quotation discount still requires the configured approval flow.</li>
          <li>Bulk discount editing is disabled. Every pilot-rate change shows an individual before/after preview and requires confirmation.</li>
          <li>Badge colour: <span className="text-green-700 font-semibold">green ≥90%</span> · <span className="text-amber-700 font-semibold">amber 70–89%</span> · <span className="text-red-700 font-semibold">red &lt;70%</span> of standard rate.</li>
          <li>Showing <span className="font-semibold">{filtered.length}</span> of <span className="font-semibold">{list.length}</span> active pricing records.</li>
        </ul>
      </div>
    </div>
  )
}
