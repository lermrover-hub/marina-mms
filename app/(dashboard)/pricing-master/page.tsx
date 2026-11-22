"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Check, ChevronRight, Download, Edit2, Loader2, Plus, Power, Search, X } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { V38_SOURCE_VERSION } from "@/lib/pricing-v38"
import {
  RATE_SERVICE_GROUPS, getRateServiceGroup, getRateVesselGroup, groupRateCatalog,
  rateDurationLabel, rateTierLabel, rateVesselLabel,
} from "@/lib/rate-catalog-order"

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
  priceStatus: string
  quoteAllowed: string
  sourceVersion: string | null
  serviceGroup: string | null
  subgroup: string | null
  vesselCategory: string | null
  vesselTier: string | null
  loaMinFt: number | null
  loaMaxFt: number | null
  durationCode: string | null
  durationDays: number | null
  displayOrder: number | null
  rateBasis: string | null
  capThb: number | null
  capacityNote: string | null
  pricingRule?: {
    quoteAllowed?: string | null
  } | null
  pilotRateThb: number | null
  pilotNotes: string | null
  isActive: boolean
}

type RatePatch = Partial<Pick<PricingItem, "pilotRateThb" | "pilotNotes" | "isActive" | "priceStatus">>

const filtersClass = "max-w-full rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-sm text-[#1f2933]"
const buttonClass = "inline-flex items-center justify-center gap-1.5 rounded-md border border-[#e5dfd2] bg-white px-3 py-2 text-xs font-medium text-[#1f2933] hover:bg-[#f9f8f5] disabled:opacity-50"

// ── inline-edit cell ────────────────────────────────────────────────────────
function EditableCell({
  label,
  value,
  onSave,
  disabled,
  placeholder = "–",
  type = "number",
  className = "",
}: {
  label: string
  value: number | string | null
  onSave: (val: number | string | null) => Promise<void>
  disabled: boolean
  placeholder?: string
  type?: "number" | "text"
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]   = useState(value != null ? String(value) : "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commit = async () => {
    if (saving || disabled) return
    const parsed = draft.trim() === "" ? null : type === "number" ? Number(draft) : draft.trim()
    if (typeof parsed === "number" && (!Number.isFinite(parsed) || parsed < 0)) {
      setError("Enter a non-negative amount.")
      return
    }
    setError("")
    setSaving(true)
    try {
      await onSave(parsed)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save pilot change.")
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    setError("")
    setDraft(value != null ? String(value) : "")
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        title={label}
        onClick={() => { setDraft(value != null ? String(value) : ""); setEditing(true) }}
        className={`group flex items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-amber-50 hover:ring-1 hover:ring-amber-300 disabled:opacity-50 ${className}`}
      >
        <span className={value == null ? "text-[#b0b8bc] italic text-xs" : ""}>
          {value != null ? (type === "number" ? `฿${Number(value).toLocaleString()}` : value) : placeholder}
        </span>
        <Edit2 className="h-3 w-3 shrink-0 text-[#647076]" />
      </button>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        aria-label={label}
        disabled={saving}
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
          <button type="button" disabled={disabled} onClick={commit} aria-label="Save pilot change" title="Save pilot change" className="rounded p-1 hover:bg-green-100 disabled:opacity-50"><Check className="h-4 w-4 text-green-700" /></button>
          <button type="button" onClick={cancel} aria-label="Cancel pilot change" title="Cancel pilot change" className="rounded p-1 hover:bg-red-50"><X className="h-4 w-4 text-red-700" /></button>
        </>
      )}
      </div>
      {error && <p role="alert" className="mt-1 w-40 whitespace-normal text-left text-xs text-red-700">{error}</p>}
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

function formatRuleLabel(value: string | null) {
  return value ? value.replaceAll("_", " ") : "—"
}

function requiresManagerReview(row: PricingItem) {
  return row.priceStatus === "MANAGER_REVIEW" ||
    row.rateBasis === "MANAGER_REVIEW" ||
    row.quoteAllowed === "MANAGER_REVIEW" ||
    row.pricingRule?.quoteAllowed === "MANAGER_REVIEW"
}

function quoteLabel(row: PricingItem) {
  if (requiresManagerReview(row)) return "Manager review"
  if (row.priceStatus === "PENDING_PAINT_TEAM") return "Pending paint team"
  if (row.priceStatus === "PENDING") return "Pending"
  if (row.priceStatus === "CONTACT_ONLY" || row.quoteAllowed === "CONTACT") return "Contact only"
  if (row.priceStatus === "MANUAL_QUOTE" || row.quoteAllowed === "MANUAL") return "Manual quote"
  return row.isActive && row.priceStatus === "ACTIVE" && row.quoteAllowed === "YES" ? "Auto quote" : "Not auto-quoted"
}

function csvCell(value: string | number | boolean) {
  if (typeof value !== "string") return value
  const text = /^[\s\uFEFF]*[=+\-@]|^[\t\r\n]/.test(value) ? `'${value}` : value
  return `"${text.replaceAll('"', '""')}"`
}

// ── main page ────────────────────────────────────────────────────────────────
export default function PricingMasterPage() {
  const [list, setList] = useState<PricingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [search, setSearch] = useState("")
  const [serviceGroup, setServiceGroup] = useState("all")
  const [status, setStatus] = useState("active")
  const [version, setVersion] = useState("all")
  const [pilotFilter, setPilotFilter] = useState<"all" | "set" | "unset">("all")
  const [saving, setSaving] = useState<string | null>(null)
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null)
  const [bulkError, setBulkError] = useState("")
  const [bulkPct, setBulkPct] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const res = await fetch("/api/pricing-master", { signal: controller.signal, cache: "no-store" })
        const json = await res.json().catch(() => null)
        if (!res.ok || !Array.isArray(json?.data)) {
          throw new Error(json?.error || `Could not load rates (HTTP ${res.status}).`)
        }
        if (!controller.signal.aborted) setList(json.data)
      } catch (err) {
        if (!controller.signal.aborted) setLoadError(err instanceof Error ? err.message : "Could not load rates.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [loadAttempt])

  const catalog = useMemo(() => {
    const term = search.trim().toLowerCase()
    return groupRateCatalog(list.filter(row =>
      (status === "all" || row.isActive === (status === "active")) &&
      (version === "all" || (row.sourceVersion === V38_SOURCE_VERSION) === (version === "current")) &&
      (serviceGroup === "all" || getRateServiceGroup(row) === serviceGroup) &&
      (pilotFilter === "all" || (row.pilotRateThb != null) === (pilotFilter === "set")) &&
      (!term || [
        row.code, row.serviceNameEn, row.serviceNameTh, row.category, row.subgroup, row.sourceVersion,
        row.vesselCategory, rateVesselLabel(getRateVesselGroup(row)), row.vesselTier, rateTierLabel(row.vesselTier),
        rateDurationLabel(row),
      ].some(value => value?.toLowerCase().includes(term)))
    ))
  }, [list, search, serviceGroup, status, version, pilotFilter])
  const filtered = catalog.flatMap(group => group.sections.flatMap(section => section.rows))
  const activeCount = list.filter(row => row.isActive).length
  const currentCount = list.filter(row => row.isActive && row.sourceVersion === V38_SOURCE_VERSION).length
  const bulkEligible = filtered.filter(row => row.isActive && !requiresManagerReview(row))
  const pilotSet = bulkEligible.filter(row => row.pilotRateThb != null)

  const patchRow = async (id: string, patch: RatePatch) => {
    const res = await fetch(`/api/pricing-master/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || json?.data?.id !== id) {
      throw new Error(json?.error || `Could not save rate (HTTP ${res.status}).`)
    }
    setList(prev => prev.map(p => p.id === id ? json.data : p))
  }

  const savePilot = async (id: string, patch: RatePatch) => {
    setSaving(id)
    try {
      await patchRow(id, patch)
    } finally {
      setSaving(null)
    }
  }

  const toggleActive = async (row: PricingItem) => {
    if (saving) return
    const action = row.isActive ? "Deactivate" : "Reactivate"
    if (!confirm(`${action} ${row.code}?`)) return
    setRowError(null)
    setSaving(row.id)
    try {
      // Keep quote eligibility rules intact; older soft deletes also set priceStatus.
      await patchRow(row.id, !row.isActive && row.priceStatus === "INACTIVE"
        ? { isActive: true, priceStatus: "ACTIVE" }
        : { isActive: !row.isActive })
    } catch (err) {
      setRowError({ id: row.id, message: `${action} failed: ${err instanceof Error ? err.message : "Request failed."}` })
    } finally {
      setSaving(null)
    }
  }

  const updatePilotRates = async (clear: boolean) => {
    if (saving) return
    const rows = clear ? pilotSet : bulkEligible
    if (!rows.length) return
    setBulkError("")
    const pct = Number(bulkPct)
    if (!clear && (!Number.isFinite(pct) || pct < 1 || pct > 99)) {
      setBulkError("Enter a pilot reduction from 1% to 99%.")
      return
    }
    if (!confirm(clear ? `Clear pilot rates for ${rows.length} rates?` : `Apply a ${pct}% pilot reduction to ${rows.length} rates?`)) return
    setSaving("bulk")
    let saved = 0
    try {
      for (const row of rows) {
        await patchRow(row.id, clear
          ? { pilotRateThb: null, pilotNotes: null }
          : { pilotRateThb: Math.round(row.rateThb * (1 - pct / 100)) })
        saved += 1
      }
      if (!clear) setBulkPct("")
    } catch (err) {
      setBulkError(`Saved ${saved} of ${rows.length} rates. Stopped at ${rows[saved]?.code}: ${err instanceof Error ? err.message : "Request failed."}`)
    } finally {
      setSaving(null)
    }
  }

  // ── export CSV ───────────────────────────────────────────────────────────
  const exportCsv = () => {
    const BOM = "\uFEFF"
    const headers = ["code","category","serviceNameEn","unit","full_rate_thb","current_rate_thb","default_discount_pct","source_discount_pct","direct_cost_thb","gross_profit_thb","gross_margin_pct","revenue_gl_code","cost_gl_code","pnl_category","price_status","source_version","pilot_rate_thb","pct_of_current","pilot_notes","is_active"]
    const rows = filtered.map(p => {
      const pct = p.pilotRateThb != null && p.rateThb > 0
        ? Math.round((p.pilotRateThb / p.rateThb) * 100)
        : ""
      return [
        p.code, p.category, p.serviceNameEn,
        p.unit, p.fullRateThb, p.rateThb, p.discountPct, p.sourceDiscountPct,
        p.directCostThb ?? "", p.grossProfitThb ?? "", p.grossMarginPct ?? "",
        p.revenueGlCode ?? "", p.costGlCode ?? "", p.pnlCategory ?? "", p.priceStatus, p.sourceVersion ?? "",
        p.pilotRateThb ?? "", pct,
        p.pilotNotes ?? "",
        p.isActive,
      ].map(csvCell).join(",")
    })
    const csv = BOM + [headers.join(","), ...rows].join("\r\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a"); a.href = url; a.download = "rate-card-pilot.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader title="Rate Management">
        <Link href="/pricing-master/new"
          className="ml-3 inline-flex shrink-0 items-center gap-1.5 rounded-md bg-ocean-turquoise px-3 py-2 text-sm font-semibold text-white hover:bg-[#0d8b81]">
          <Plus className="h-4 w-4" /> Add rate
        </Link>
      </PageHeader>

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-[#647076]">
        <span className="font-semibold text-[#126c66]">Current rate card: {V38_SOURCE_VERSION}</span>
        {!loading && !loadError && (
          <>
            <span>{currentCount ? `${currentCount} active v3.8 rates` : "No active v3.8 rates returned"}</span>
            <span>{activeCount} active / {list.length - activeCount} inactive</span>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#647076]" />
          <input type="search" aria-label="Search rates" placeholder="Search rates"
            value={search} onChange={e => setSearch(e.target.value)}
            className={`${filtersClass} w-full pl-9`} />
        </div>
        <select aria-label="Service group" value={serviceGroup} onChange={e => setServiceGroup(e.target.value)} className={filtersClass}>
          <option value="all">All service groups</option>
          {RATE_SERVICE_GROUPS.map(group => <option key={group.key} value={group.key}>{group.label}</option>)}
        </select>
        <select aria-label="Rate status" value={status} onChange={e => setStatus(e.target.value)} className={filtersClass}>
          <option value="active">Active rates</option>
          <option value="inactive">Inactive rates</option>
          <option value="all">All statuses</option>
        </select>
        <select aria-label="Rate card version" value={version} onChange={e => setVersion(e.target.value)} className={filtersClass}>
          <option value="all">All versions</option>
          <option value="current">Current v3.8</option>
          <option value="other">Other versions</option>
        </select>
        <select aria-label="Pilot rate" value={pilotFilter} onChange={e => setPilotFilter(e.target.value as typeof pilotFilter)} className={filtersClass}>
          <option value="all">Any pilot status</option>
          <option value="set">Pilot rate set</option>
          <option value="unset">No pilot rate</option>
        </select>
        <button type="button" onClick={exportCsv} disabled={!filtered.length || !!saving} className={buttonClass}>
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-y border-[#e5dfd2] py-2">
        <label className="flex items-center gap-2 text-sm text-[#647076]">
          Pilot reduction %
          <input type="number" min="1" max="99" value={bulkPct} onChange={e => setBulkPct(e.target.value)}
            disabled={!!saving} className={`${filtersClass} w-20`} />
        </label>
        <button type="button" onClick={() => void updatePilotRates(false)} disabled={!!saving || !bulkEligible.length} className={buttonClass}>
          Apply to {bulkEligible.length} rates
        </button>
        <button type="button" onClick={() => void updatePilotRates(true)} disabled={!!saving || !pilotSet.length} className={buttonClass}>
          Clear {pilotSet.length} pilot rates
        </button>
        {saving === "bulk" && <span role="status" className="text-sm text-[#647076]">Saving pilot rates...</span>}
      </div>
      {bulkError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{bulkError}</p>}

      {loading ? (
        <div role="status" className="flex h-32 items-center justify-center gap-2 text-[#647076]">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading rates...
        </div>
      ) : loadError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p>Could not load the rate catalog: {loadError}</p>
          <button type="button" className={buttonClass} onClick={() => {
            setLoadError("")
            setLoading(true)
            setLoadAttempt(attempt => attempt + 1)
          }}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <p role="status" className="py-10 text-center text-sm text-[#647076]">
          {list.length ? "No rates match the current filters." : "No rate records were returned."}
        </p>
      ) : (
        <p role="status" className="text-xs text-[#647076]">Showing {filtered.length} of {list.length} rates</p>
      )}

      {!loading && !loadError && catalog.map(group => (
        <details key={group.key} open className="group min-w-0 border-b border-[#e5dfd2]">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-3 text-sm font-semibold text-[#1f2933] [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" />
            {group.label}
            <span className="ml-auto shrink-0 font-normal text-[#647076]">{group.sections.reduce((count, section) => count + section.rows.length, 0)} rates</span>
          </summary>
          <div role="region" aria-label={`${group.label} rates`} tabIndex={0} className="max-w-full overflow-x-auto rounded-md border border-[#e5dfd2] bg-white">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="border-b border-[#e5dfd2] bg-[#f9f8f5]">
              <tr>
                <th scope="col" className="sticky left-0 z-10 border-r border-[#e5dfd2] bg-[#f9f8f5] px-3 py-3 text-left">Code</th>
                <th scope="col" className="px-3 py-3 text-left">Service</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1f2933]">Source</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1f2933]">Category</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1f2933]">Vessel / Tier</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1f2933]">Duration</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1f2933]">Basis / Cap</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1f2933]">Review</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1f2933]">Unit</th>
                <th className="px-4 py-3 text-right font-semibold text-[#1f2933]">Full Rate</th>
                <th className="px-4 py-3 text-right font-semibold text-[#1f2933]">Current Rate</th>
                <th className="px-4 py-3 text-right font-semibold text-[#1f2933]">Default Disc.</th>
                <th className="px-4 py-3 text-right font-semibold text-[#1f2933]">Direct Cost</th>
                <th className="px-4 py-3 text-right font-semibold text-[#1f2933]">GP / GM</th>
                <th className="px-4 py-3 text-right font-semibold text-amber-700">Pilot Rate</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1f2933]">Pilot Notes</th>
              </tr>
            </thead>
            {group.sections.map(section => (
            <tbody key={section.key}>
              <tr>
                <th scope="rowgroup" colSpan={16} className="border-y border-[#d7efed] bg-[#f3fbfa] py-2 text-left text-xs font-semibold text-[#126c66]">
                  <span className="sticky left-0 inline-block px-3">{section.label}</span>
                </th>
              </tr>
              {section.rows.map(row => {
                const quote = quoteLabel(row)
                const review = requiresManagerReview(row)
                const readOnlyPilot = !row.isActive || review
                const vessel = getRateVesselGroup(row)
                const action = row.isActive ? "Deactivate" : "Reactivate"
                return (
                <tr key={row.id}
                  className={`transition-colors ${saving === row.id ? "bg-amber-50" : row.pilotRateThb != null ? "bg-amber-50/30 hover:bg-amber-50/60" : "hover:bg-[#f9f8f5]"}`}>
                  <th scope="row" className="sticky left-0 z-10 w-24 max-w-24 border-b border-r border-[#e5dfd2] bg-white px-3 py-2.5 text-left align-top font-mono text-xs font-semibold text-[#126c66] [overflow-wrap:anywhere] sm:w-32 sm:max-w-32">{row.code}</th>
                  <td className="min-w-[180px] max-w-[18rem] border-b border-[#e5dfd2] px-3 py-2.5 align-top text-[#1f2933] [overflow-wrap:anywhere]">
                    <div>{row.serviceNameEn}</div>
                    {row.serviceNameTh && <div className="text-xs text-[#647076]">{row.serviceNameTh}</div>}
                    {(row.revenueGlCode || row.costGlCode || row.pnlCategory) && (
                      <div className="mt-1 text-[11px] text-[#647076]">
                        GL {row.revenueGlCode ?? "—"} / Cost {row.costGlCode ?? "—"} · {row.pnlCategory ?? "Unmapped P&L"}
                      </div>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className={`text-xs font-medium ${row.isActive ? "text-green-700" : "text-[#647076]"}`}>
                        {row.isActive ? "Active" : "Inactive"}
                      </span>
                      <Link href={`/pricing-master/${row.id}`} prefetch={false} aria-label={`Edit ${row.code}`}
                        className="inline-flex items-center gap-1 py-1 text-xs font-medium text-[#126c66] hover:underline">
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </Link>
                      <button type="button" disabled={!!saving} onClick={() => void toggleActive(row)}
                        aria-label={`${action} ${row.code}`}
                        className={`inline-flex items-center gap-1 py-1 text-xs font-medium hover:underline disabled:opacity-50 ${row.isActive ? "text-[#647076]" : "text-[#126c66]"}`}>
                        {saving === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                        {action}
                      </button>
                    </div>
                    {rowError?.id === row.id && <p role="alert" className="mt-1 max-w-40 text-xs text-red-700">{rowError.message}</p>}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${row.sourceVersion === V38_SOURCE_VERSION ? "bg-sky-100 text-sky-800" : "bg-gray-100 text-gray-700"}`}>
                      {row.sourceVersion ?? "Unversioned"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-block rounded-full bg-[#e8fbf9] px-2 py-0.5 text-xs font-medium text-[#126c66]">{row.category}</span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                    <div className="font-semibold text-[#1f2933]">{rateVesselLabel(row.vesselCategory || (vessel !== "OTHER" ? vessel : null)) || "—"}</div>
                    {row.vesselTier && <div className="text-[#647076]">{rateTierLabel(row.vesselTier)}</div>}
                    {row.loaMinFt != null || row.loaMaxFt != null ? (
                      <div className="text-[#647076]">
                        {row.loaMinFt == null ? `Up to ${row.loaMaxFt} ft` : row.loaMaxFt == null ? `From ${row.loaMinFt} ft` : `${row.loaMinFt}-${row.loaMaxFt} ft`}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                    <div className="font-semibold text-[#1f2933]">{rateDurationLabel(row) || "—"}</div>
                    {row.durationDays != null && <div className="text-[#8b969a]">{row.durationDays} day{row.durationDays === 1 ? "" : "s"}</div>}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                    <div className="font-semibold text-[#1f2933]">{formatRuleLabel(row.rateBasis)}</div>
                    <div className="text-[#8b969a]">{row.capThb != null ? `Cap ฿${row.capThb.toLocaleString()}` : "No cap"}</div>
                  </td>
                  <td className="px-4 py-2.5 min-w-[150px] text-xs">
                    <span className={`inline-block rounded px-2 py-0.5 font-semibold ${quote === "Auto quote" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{quote}</span>
                    {row.capacityNote && <div className="mt-1 text-[#647076]">{row.capacityNote}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-[#647076] text-xs whitespace-nowrap">{row.unit}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[#1f2933] whitespace-nowrap">
                    {review && row.fullRateThb === 0 ? "—" : `฿${row.fullRateThb.toLocaleString("en-TH", { maximumFractionDigits: 4 })}`}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[#1f2933] whitespace-nowrap">
                    {review && row.rateThb === 0 ? "—" : `฿${row.rateThb.toLocaleString("en-TH", { maximumFractionDigits: 4 })}`}
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
                    {readOnlyPilot ? (row.pilotRateThb == null ? "—" : `฿${row.pilotRateThb.toLocaleString()}`) : (
                    <div className="flex items-center justify-end gap-1">
                      <EditableCell
                        label={`Edit pilot rate for ${row.code}`}
                        disabled={!!saving}
                        value={row.pilotRateThb}
                        placeholder="set pilot…"
                        type="number"
                        onSave={val => savePilot(row.id, { pilotRateThb: val as number | null })}
                        className="font-semibold text-amber-700"
                      />
                      <PilotBadge pilot={row.pilotRateThb} standard={row.rateThb} />
                    </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 min-w-[140px]">
                    {readOnlyPilot ? row.pilotNotes ?? "—" : <EditableCell
                      label={`Edit pilot notes for ${row.code}`}
                      disabled={!!saving}
                      value={row.pilotNotes}
                      placeholder="add note…"
                      type="text"
                      onSave={val => savePilot(row.id, { pilotNotes: val as string | null })}
                      className="text-xs text-[#647076]"
                    />}
                  </td>
                </tr>
                )
              })}
            </tbody>
            ))}
          </table>
          </div>
        </details>
      ))}
    </div>
  )
}
