"use client"
import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  Anchor, ArrowLeft, LogIn, LogOut, History,
  AlertTriangle, CheckCircle, Clock, Ship,
  Loader2, Waves, MapPin, CalendarDays, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Berth, Boat, Customer } from "@/lib/supabase"

// ─── Types ────────────────────────────────────────────────────────────────────
type Assignment = {
  id: string
  berth_id: string
  boat_id: string | null
  customer_id: string | null
  boat_name: string | null
  customer_name: string | null
  start_date: string
  end_date: string
  status: string
  notes: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ZONE_LABEL: Record<string, string> = {
  WB: "Wet Berths",
  W:  "Workshop Bays",
  C:  "Concrete Hardstand",
  B:  "Beach Storage",
}

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  AVAILABLE:   { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-300",  icon: <CheckCircle className="h-5 w-5 text-green-500" /> },
  OCCUPIED:    { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-300",   icon: <Anchor className="h-5 w-5 text-blue-500" /> },
  RESERVED:    { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-300",  icon: <Clock className="h-5 w-5 text-amber-500" /> },
  MAINTENANCE: { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-300",    icon: <AlertTriangle className="h-5 w-5 text-red-500" /> },
}

const ASGN_BADGE: Record<string, string> = {
  ACTIVE:    "bg-blue-100 text-blue-700",
  RESERVED:  "bg-amber-100 text-amber-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-gray-100 text-gray-400 line-through",
}

function daysInYard(startDate: string): number {
  return Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000)
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────
function AssignModal({
  berth, onClose, onSaved,
}: {
  berth: Berth
  onClose: () => void
  onSaved: () => void
}) {
  const [customers,   setCustomers]   = useState<Customer[]>([])
  const [boats,       setBoats]       = useState<Boat[]>([])
  const [customerId,  setCustomerId]  = useState("")
  const [boatId,      setBoatId]      = useState("")
  const [loadingRefs, setLoadingRefs] = useState(true)
  const [startDate,   setStart]       = useState(new Date().toISOString().slice(0, 10))
  const [endDate,     setEnd]         = useState("")
  const [asgnStatus,  setAsgnStatus]  = useState<"ACTIVE" | "RESERVED">("ACTIVE")
  const [notes,       setNotes]       = useState("")
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  useEffect(() => {
    setLoadingRefs(true)
    Promise.all([
      fetch("/api/db/customers").then((r) => r.json()),
      fetch("/api/db/boats").then((r) => r.json()),
    ])
      .then(([customerData, boatData]) => {
        if (!Array.isArray(customerData)) throw new Error(customerData?.error ?? "Failed to load customers")
        if (!Array.isArray(boatData)) throw new Error(boatData?.error ?? "Failed to load boats")
        setCustomers(customerData)
        setBoats(boatData)
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoadingRefs(false))
  }, [])

  const customerBoats = customerId ? boats.filter((boat) => boat.owner_id === customerId) : boats
  const selectedCustomer = customers.find((item) => item.id === customerId)
  const selectedBoat = boats.find((item) => item.id === boatId)
  const selectedCustomerPersonName = selectedCustomer
    ? [selectedCustomer.first_name, selectedCustomer.last_name].filter(Boolean).join(" ")
    : ""
  const customerName = selectedCustomer
    ? selectedCustomer.company_name ?? (selectedCustomerPersonName || selectedCustomer.id)
    : ""

  async function handleSave() {
    if (!boatId || !customerId || !startDate || !selectedBoat || !selectedCustomer) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        berth_id:      berth.id,
        boat_id:       selectedBoat.id,
        customer_id:   selectedCustomer.id,
        boat_name:     selectedBoat.name,
        customer_name: customerName,
        start_date:    startDate,
        end_date:      endDate || startDate,
        status:        asgnStatus,
        notes:         notes.trim() || null,
      }
      const res = await fetch("/api/db/berth-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to save")
      // Update berth status to OCCUPIED
      await fetch(`/api/db/berths/${berth.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: asgnStatus === "RESERVED" ? "RESERVED" : "OCCUPIED",
          current_boat_id: selectedBoat.id,
        }),
      })
      await fetch(`/api/db/boats/${selectedBoat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_location_code: berth.code,
          status: asgnStatus === "RESERVED" ? selectedBoat.status : "IN_STORAGE",
        }),
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save assignment. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Assign Boat to {berth.code}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {ZONE_LABEL[berth.zone ?? ""] ?? berth.zone} · max {berth.max_loa_ft ?? "—"} ft
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Status toggle */}
          <div className="flex gap-2">
            {(["ACTIVE", "RESERVED"] as const).map(s => (
              <button key={s} onClick={() => setAsgnStatus(s)}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold border-2 transition-colors
                  ${asgnStatus === s
                    ? s === "ACTIVE" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-amber-400 bg-amber-50 text-amber-700"
                    : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"}`}>
                {s === "ACTIVE" ? "Occupied / Check-in" : "Reserve"}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Customer / Owner *</label>
            <select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value)
                setBoatId("")
              }}
              disabled={loadingRefs}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">{loadingRefs ? "Loading customers..." : "- Select customer -"}</option>
              {customers.map((item) => {
                const personName = [item.first_name, item.last_name].filter(Boolean).join(" ")
                const label = item.company_name ?? (personName || item.id)
                return <option key={item.id} value={item.id}>{label}</option>
              })}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Boat *</label>
            <select
              value={boatId}
              onChange={(e) => setBoatId(e.target.value)}
              disabled={loadingRefs || !customerId}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">{customerId ? "- Select boat -" : "Select customer first"}</option>
              {customerBoats.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}{item.loa_ft ? ` - ${item.loa_ft} ft` : ""}{item.status ? ` (${item.status})` : ""}
                </option>
              ))}
            </select>
            {customerId && customerBoats.length === 0 && (
              <p className="text-xs text-amber-600">No boats registered for this customer. Register the boat first.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Start Date *</label>
              <input type="date" value={startDate} onChange={e => setStart(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">End Date</label>
              <input type="date" value={endDate} onChange={e => setEnd(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Special instructions, work required…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>}
        </div>

        <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || loadingRefs || !boatId || !customerId}
            className="bg-teal-600 hover:bg-teal-700 text-white">
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5"/>Saving…</> : "Assign Boat"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BerthDetailPage() {
  const params  = useParams<{ id: string }>()
  const id      = params?.id ?? ""
  const router  = useRouter()

  const [berth,       setBerth]       = useState<Berth | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [showAssign,  setShowAssign]  = useState(false)

  const todayStr = new Date().toISOString().slice(0, 10)

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      fetch(`/api/db/berths/${id}`).then(r => r.json()),
      fetch(`/api/db/berth-assignments?berth_id=${id}`).then(r => r.json()),
    ])
      .then(([b, a]) => {
        if (b?.error) setError("Berth not found")
        else setBerth(b)
        if (Array.isArray(a)) setAssignments(a)
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading berth…
      </div>
    )
  }

  if (error || !berth) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Anchor className="h-10 w-10 text-gray-200 mb-3" />
        <p className="text-gray-500">{error ?? "Berth not found"}</p>
        <Link href="/berths" className="text-sm text-teal-600 hover:underline mt-2">← Back to Berths</Link>
      </div>
    )
  }

  const style = STATUS_STYLE[berth.status] ?? STATUS_STYLE.AVAILABLE

  // Current active assignment: status ACTIVE or RESERVED, end_date >= today
  const current = assignments.find(a =>
    (a.status === "ACTIVE" || a.status === "RESERVED") && a.end_date >= todayStr
  )

  // History = everything else, sorted newest first
  const history = assignments
    .filter(a => a !== current)
    .sort((a, b) => b.start_date.localeCompare(a.start_date))

  return (
    <div className="space-y-6">
      {showAssign && (
        <AssignModal berth={berth} onClose={() => setShowAssign(false)} onSaved={load} />
      )}

      <PageHeader
        title={`Slot ${berth.code}`}
        description={`${ZONE_LABEL[berth.zone ?? ""] ?? berth.zone ?? "—"} · ${berth.berth_type?.replace("_", " ")}`}
        breadcrumb={[
          { label: "Berths", href: "/berths" },
          { label: `Slot ${berth.code}` },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => router.push("/berths")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Link href="/berths/calendar">
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarDays className="h-4 w-4" /> Calendar
              </Button>
            </Link>
            {berth.status === "AVAILABLE" ? (
              <Button size="sm" className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
                onClick={() => setShowAssign(true)}>
                <LogIn className="h-4 w-4" /> Assign Boat
              </Button>
            ) : (
              <Button size="sm" variant="outline"
                className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
                <LogOut className="h-4 w-4" /> Check Out
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Left: status + occupant + history ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Status card */}
          <Card className={`border-2 ${style.border}`}>
            <CardContent className={`p-5 ${style.bg}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {style.icon}
                  <div>
                    <p className={`font-bold text-lg ${style.text}`}>
                      {berth.status.replace(/_/g, " ")}
                    </p>
                    <p className="text-sm text-gray-500">
                      {ZONE_LABEL[berth.zone ?? ""] ?? berth.zone} · Max {berth.max_loa_ft ?? "—"} ft LOA
                      {berth.depth_m && ` · ${berth.depth_m} m depth`}
                    </p>
                  </div>
                </div>
                {berth.short_period_only && (
                  <span className="text-xs font-semibold bg-purple-100 text-purple-700 rounded-full px-3 py-1">
                    Short period only
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current occupant */}
          {current ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ship className="h-4 w-4 text-blue-500" /> Current Occupant
                  <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${ASGN_BADGE[current.status]}`}>
                    {current.status}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {[
                    { label: "Boat Name",     value: current.boat_name ?? "—" },
                    { label: "Customer",      value: current.customer_name ?? "—" },
                    { label: "Start Date",    value: current.start_date },
                    { label: "End Date",      value: current.end_date || "Open-ended" },
                    { label: "Days in Yard",  value: `${daysInYard(current.start_date)} days` },
                    { label: "Notes",         value: current.notes ?? "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="space-y-0.5">
                      <p className="text-xs text-gray-400 font-medium">{label}</p>
                      <p className="text-sm font-semibold text-gray-800">{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <Anchor className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500 font-medium">This slot is currently available</p>
                <Button size="sm" className="mt-4 gap-2 bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={() => setShowAssign(true)}>
                  <LogIn className="h-4 w-4" /> Assign a Boat
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Occupancy history */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-gray-500" /> Occupancy History
                <span className="ml-auto text-xs text-gray-400 font-normal">{history.length} records</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No previous occupancy recorded.</p>
              ) : (
                <div className="space-y-3">
                  {history.map((h, i) => (
                    <div key={h.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`h-3 w-3 rounded-full mt-1 shrink-0
                          ${h.status === "COMPLETED" ? "bg-green-400" : "bg-gray-300"}`} />
                        {i < history.length - 1 && (
                          <div className="w-0.5 bg-gray-200 flex-1 mt-1" />
                        )}
                      </div>
                      <div className="pb-4">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800">{h.boat_name ?? "Unknown Boat"}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${ASGN_BADGE[h.status]}`}>
                            {h.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{h.customer_name ?? "—"}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {h.start_date} – {h.end_date}
                        </p>
                        {h.notes && (
                          <p className="text-xs text-gray-400 mt-0.5 italic">{h.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right sidebar: spec ── */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Slot Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Code",          value: berth.code },
                { label: "Zone",          value: ZONE_LABEL[berth.zone ?? ""] ?? berth.zone ?? "—" },
                { label: "Type",          value: berth.berth_type?.replace(/_/g, " ") ?? "—" },
                { label: "Section",       value: berth.location_section ?? "—" },
                { label: "Max LOA",       value: berth.max_loa_ft ? `${berth.max_loa_ft} ft ${berth.max_loa_m ? `(${berth.max_loa_m} m)` : ""}` : "—" },
                { label: "Max Beam",      value: berth.max_beam_ft ? `${berth.max_beam_ft} ft` : "—" },
                { label: "Water Depth",   value: berth.depth_m ? `${berth.depth_m} m LLW` : "—" },
                { label: "Period",        value: berth.short_period_only ? "Short period only (≤7 days)" : "Short or long-term" },
                { label: "Monthly Rate",  value: berth.monthly_rate ? `฿${berth.monthly_rate.toLocaleString()}/mo` : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-xs font-semibold text-gray-800 text-right">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Zone info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {berth.zone === "WB" && <Waves className="h-4 w-4 text-blue-500" />}
                {berth.zone === "C"  && <MapPin className="h-4 w-4 text-slate-500" />}
                {(berth.zone === "W" || berth.zone === "B") && <MapPin className="h-4 w-4 text-orange-500" />}
                <span className="text-xs font-semibold text-gray-700">Zone {berth.zone}</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                {berth.notes ?? "No additional notes for this slot."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Live indicator */}
      <p className="text-xs text-gray-400 text-center pb-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 align-middle" />
        Live database · {assignments.length} assignments loaded
      </p>
    </div>
  )
}
