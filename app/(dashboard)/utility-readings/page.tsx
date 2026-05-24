"use client"
import React, { useState, useEffect, useMemo } from "react"
import { Zap, Droplets, Plus, Search, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate, formatTHB } from "@/lib/utils"
import { useApiList } from "@/hooks/useApiList"

// ─── types ────────────────────────────────────────────────────────────────────

type Reading = {
  id: string
  berth_code: string | null
  boat_name: string | null
  customer_name: string | null
  reading_date: string
  utility_type: string
  meter_id: string | null
  previous_reading: number
  current_reading: number
  units_used: number
  unit_price: number
  amount: number
  currency: string
  billed: boolean
  notes: string | null
}

type Berth = { id: string; code: string; berth_type?: string }
type Boat  = { id: string; name: string; customer_id?: string | null; customer_name?: string | null }

const DEFAULT_PRICES: Record<string, number> = { ELECTRICITY: 8, WATER: 35 }

// New reading form

function NewReadingModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [berths, setBerths] = useState<Berth[]>([])
  const [boats,  setBoats]  = useState<Boat[]>([])
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState<string | null>(null)

  const [form, setForm] = useState({
    berth_id: "", berth_code: "",
    boat_id: "", boat_name: "", customer_id: "", customer_name: "",
    reading_date: new Date().toISOString().slice(0, 10),
    utility_type: "ELECTRICITY",
    meter_id: "",
    previous_reading: "0",
    current_reading: "",
    unit_price: String(DEFAULT_PRICES["ELECTRICITY"]),
    notes: "",
  })

  useEffect(() => {
    fetch("/api/db/berths?limit=200").then(r => r.json()).then(d => Array.isArray(d) && setBerths(d)).catch(() => {})
    fetch("/api/db/boats?limit=200").then(r => r.json()).then(d => Array.isArray(d) && setBoats(d)).catch(() => {})
  }, [])

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function handleBerthChange(berthId: string) {
    const b = berths.find(b => b.id === berthId)
    set("berth_id", berthId)
    set("berth_code", b?.code ?? "")
  }

  function handleBoatChange(boatId: string) {
    const b = boats.find(b => b.id === boatId)
    setForm(f => ({
      ...f,
      boat_id: boatId,
      boat_name: b?.name ?? "",
      customer_name: b?.customer_name ?? "",
    }))
  }

  function handleTypeChange(t: string) {
    setForm(f => ({ ...f, utility_type: t, unit_price: String(DEFAULT_PRICES[t] ?? 0) }))
  }

  const unitsUsed = Math.max(0, Number(form.current_reading || 0) - Number(form.previous_reading || 0))
  const amount    = unitsUsed * Number(form.unit_price || 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setErr(null)
    try {
      const res = await fetch("/api/db/utility-readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          previous_reading: Number(form.previous_reading),
          current_reading:  Number(form.current_reading),
          unit_price:       Number(form.unit_price),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Failed")
      onSaved()
    } catch (e) { setErr(String(e)) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold text-gray-900">New Utility Reading</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Utility type */}
          <div className="flex gap-3">
            {["ELECTRICITY","WATER"].map(t => (
              <button type="button" key={t} onClick={() => handleTypeChange(t)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  form.utility_type === t
                    ? t === "ELECTRICITY" ? "bg-yellow-50 border-yellow-300 text-yellow-700" : "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}>
                {t === "ELECTRICITY" ? <Zap className="h-4 w-4" /> : <Droplets className="h-4 w-4" />}
                {t === "ELECTRICITY" ? "Electricity" : "Water"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Reading Date *</label>
              <Input type="date" value={form.reading_date} onChange={e => set("reading_date", e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Meter ID</label>
              <Input placeholder="e.g. E-001" value={form.meter_id} onChange={e => set("meter_id", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Berth / Slot</label>
              <select value={form.berth_id} onChange={e => handleBerthChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">- Select berth -</option>
                {berths.map(b => <option key={b.id} value={b.id}>{b.code}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Vessel</label>
              <select value={form.boat_id} onChange={e => handleBoatChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">- Select vessel -</option>
                {boats.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          {form.customer_name && (
            <p className="text-xs text-gray-500">Customer: <span className="font-medium text-gray-700">{form.customer_name}</span></p>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Previous Reading *</label>
              <Input type="number" step="0.01" min="0" value={form.previous_reading}
                onChange={e => set("previous_reading", e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Current Reading *</label>
              <Input type="number" step="0.01" min="0" value={form.current_reading}
                onChange={e => set("current_reading", e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Unit Price (THB)</label>
              <Input type="number" step="0.01" min="0" value={form.unit_price}
                onChange={e => set("unit_price", e.target.value)} required />
            </div>
          </div>

          {/* Calculated summary */}
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-gray-500 text-xs">Units Used</div>
              <div className="font-bold text-gray-800">{unitsUsed.toFixed(2)}</div>
              <div className="text-gray-400 text-xs">{form.utility_type === "ELECTRICITY" ? "kWh" : "m3"}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Rate</div>
              <div className="font-bold text-gray-800">THB {Number(form.unit_price).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Amount</div>
              <div className="font-bold text-teal-700">THB {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Notes</label>
            <Input placeholder="Optional notes" value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>

          {err && <p className="text-xs text-red-600">{err}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="teal" className="flex-1" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Save Reading
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Main page

export default function UtilityReadingsPage() {
  const { data: readings, loading, reload } = useApiList<Reading>("/api/db/utility-readings?limit=200")
  const [search,     setSearch]     = useState("")
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [billedFilter, setBilledFilter] = useState("ALL")
  const [showModal,  setShowModal]  = useState(false)

  const filtered = useMemo(() => readings.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      (r.berth_code ?? "").toLowerCase().includes(q) ||
      (r.boat_name  ?? "").toLowerCase().includes(q) ||
      (r.customer_name ?? "").toLowerCase().includes(q) ||
      (r.meter_id   ?? "").toLowerCase().includes(q)
    const matchType   = typeFilter   === "ALL" || r.utility_type === typeFilter
    const matchBilled = billedFilter === "ALL" ||
      (billedFilter === "UNBILLED" && !r.billed) ||
      (billedFilter === "BILLED"   &&  r.billed)
    return matchSearch && matchType && matchBilled
  }), [readings, search, typeFilter, billedFilter])

  const totalUnbilled = readings.filter(r => !r.billed).reduce((s, r) => s + (r.amount ?? 0), 0)
  const elecReadings  = readings.filter(r => r.utility_type === "ELECTRICITY").length
  const waterReadings = readings.filter(r => r.utility_type === "WATER").length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utility Meter Readings"
        description="Track electricity and water usage per berth / vessel"
        actions={
          <Button size="sm" variant="teal" className="gap-2" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> New Reading
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-gray-500 font-medium">Total Readings</div>
          <div className="text-2xl font-bold text-gray-800 mt-1">{readings.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1.5 text-xs text-yellow-600 font-medium"><Zap className="h-3.5 w-3.5" />Electricity</div>
          <div className="text-2xl font-bold text-gray-800 mt-1">{elecReadings}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium"><Droplets className="h-3.5 w-3.5" />Water</div>
          <div className="text-2xl font-bold text-gray-800 mt-1">{waterReadings}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-amber-600 font-medium">Unbilled Amount</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{formatTHB(totalUnbilled)}</div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card><CardContent className="p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search berth, vessel, customer..." value={search}
            onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {["ALL","ELECTRICITY","WATER"].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1 ${typeFilter === t ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {t === "ELECTRICITY" && <Zap className="h-3 w-3" />}
              {t === "WATER" && <Droplets className="h-3 w-3" />}
              {t === "ALL" ? "All Types" : t === "ELECTRICITY" ? "Electricity" : "Water"}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {["ALL","UNBILLED","BILLED"].map(s => (
            <button key={s} onClick={() => setBilledFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${billedFilter === s ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {s === "ALL" ? "All" : s === "UNBILLED" ? "Unbilled" : "Billed"}
            </button>
          ))}
        </div>
      </CardContent></Card>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading readings...</span>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  {["Date","Type","Berth","Vessel","Customer","Meter","Previous","Current","Used","Rate","Amount","Status"].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase ${["Previous","Current","Used","Rate","Amount"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={12} className="py-16 text-center text-gray-400 text-sm">
                    {readings.length === 0 ? "No readings recorded yet" : "No readings match your filters"}
                  </td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{formatDate(r.reading_date)}</td>
                    <td className="px-4 py-3">
                      {r.utility_type === "ELECTRICITY"
                        ? <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700"><Zap className="h-3 w-3" />Electric</span>
                        : <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700"><Droplets className="h-3 w-3" />Water</span>
                      }
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{r.berth_code ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-700">{r.boat_name ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{r.customer_name ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{r.meter_id ?? "-"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{r.previous_reading.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-800">{r.current_reading.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-teal-700 font-semibold">
                      {r.units_used?.toFixed(2) ?? (r.current_reading - r.previous_reading).toFixed(2)}
                      <span className="text-gray-400 text-xs ml-0.5">{r.utility_type === "ELECTRICITY" ? "kWh" : "m3"}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs text-gray-500">THB {r.unit_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatTHB(r.amount)}</td>
                    <td className="px-4 py-3">
                      {r.billed
                        ? <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3" />Billed</span>
                        : <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700"><AlertCircle className="h-3 w-3" />Unbilled</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-gray-500">Showing {filtered.length} of {readings.length} readings</p>
            <p className="text-xs font-semibold text-gray-700">
              Unbilled: <span className="text-amber-700">{formatTHB(totalUnbilled)}</span>
            </p>
          </div>
        </Card>
      )}

      {showModal && (
        <NewReadingModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); void reload() }}
        />
      )}
    </div>
  )
}
