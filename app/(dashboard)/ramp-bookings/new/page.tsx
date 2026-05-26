"use client"
import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Anchor, Ship, User, Calendar, Clock, Waves, AlertTriangle,
  Loader2, ChevronLeft, CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Boat } from "@/lib/supabase"

// ─── helpers ─────────────────────────────────────────────────────────────────

const OPERATION_TYPES = [
  { value: "LAUNCH",    label: "Launch",    icon: "🚀", desc: "Launch vessel into water" },
  { value: "RETRIEVAL", label: "Retrieval", icon: "⬆️", desc: "Retrieve vessel from water" },
  { value: "MOVE_BOAT", label: "Move Boat", icon: "🔄", desc: "Move boat between locations" },
  { value: "WASH",      label: "Wash",      icon: "🧽", desc: "Wash & clean vessel" },
  { value: "FUEL",      label: "Fuel",      icon: "⛽", desc: "Refuel vessel" },
  { value: "INSPECTION",label: "Inspection",icon: "🔍", desc: "Safety / survey inspection" },
]

const ftToM = (ft: number) => ft * 0.3048

function TideCalcPreview({ draft, trailer, safety }: { draft: number; trailer: number; safety: number }) {
  const rampOffset = -1.0
  const minDepthM  = ftToM(draft + trailer + safety)
  const reqTideM   = minDepthM + rampOffset

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-1.5 text-sm">
      <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Tide Safety Preview</div>
      <div className="flex justify-between">
        <span className="text-blue-700">Min. required depth</span>
        <span className="font-bold text-blue-900">{minDepthM.toFixed(2)} m</span>
      </div>
      <div className="flex justify-between">
        <span className="text-blue-700">Required tide height</span>
        <span className="font-bold text-blue-900">{reqTideM.toFixed(2)} m</span>
      </div>
      <p className="text-xs text-blue-600 pt-1">
        Formula: (Draft + Trailer + Safety) × 0.3048 + Ramp Offset ({rampOffset} m)
      </p>
      <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-700 flex items-start gap-1.5 mt-1">
        <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
        Tide predictions may differ from actual sea level. Final check required on operation day.
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function NewRampBookingPage() {
  const router = useRouter()

  // form fields
  const [opType,         setOpType]         = useState("LAUNCH")
  const [requestedDate,  setRequestedDate]  = useState("")
  const [requestedTime,  setRequestedTime]  = useState("")
  const [boatQuery,      setBoatQuery]      = useState("")
  const [selectedBoat,   setSelectedBoat]   = useState<Boat | null>(null)
  const [customerName,   setCustomerName]   = useState("")
  const [draftFt,        setDraftFt]        = useState<string>("")
  const [trailerFt,      setTrailerFt]      = useState<string>("")
  const [safetyFt,       setSafetyFt]       = useState<string>("1")
  const [assignedStaff,  setAssignedStaff]  = useState("")
  const [notes,          setNotes]          = useState("")

  // boats search
  const [boats,          setBoats]          = useState<Boat[]>([])
  const [boatsLoading,   setBoatsLoading]   = useState(false)
  const [showDropdown,   setShowDropdown]   = useState(false)

  // submit
  const [submitting, setSubmitting] = useState(false)
  const [formError,  setFormError]  = useState<string | null>(null)

  // load boats
  const searchBoats = useCallback(() => {
    setBoatsLoading(true)
    fetch(`/api/db/boats?limit=200`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setBoats(d)
        } else if (d?.error) {
          setFormError(`Failed to load boats: ${d.error}`)
          console.error("Boats load error:", d.error)
        }
      })
      .catch((e) => {
        console.error("Boats fetch failed:", e)
      })
      .finally(() => setBoatsLoading(false))
  }, [])

  useEffect(() => {
    searchBoats()
  }, [searchBoats])

  const filteredBoats = boats.filter(b => {
    if (!boatQuery) return true
    const q = boatQuery.toLowerCase()
    return (
      (b.name ?? "").toLowerCase().includes(q) ||
      (b.registration_number ?? "").toLowerCase().includes(q) ||
      (b.owner_name ?? "").toLowerCase().includes(q)
    )
  }).slice(0, 10)

  function selectBoat(boat: Boat) {
    setSelectedBoat(boat)
    setBoatQuery(boat.name ?? "")
    setCustomerName(boat.owner_name ?? "")
    if (boat.draft_ft) setDraftFt(String(boat.draft_ft))
    setShowDropdown(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!requestedDate) { setFormError("Requested date is required"); return }
    if (!selectedBoat && !boatQuery) { setFormError("Please select or enter a boat"); return }

    setSubmitting(true)
    setFormError(null)

    try {
      const body: Record<string, unknown> = {
        operation_type: opType,
        requested_date: requestedDate,
        requested_time: requestedTime || null,
        customer_id:    selectedBoat?.owner_id    ?? null,
        customer_name:  customerName  || selectedBoat?.owner_name || null,
        boat_id:        selectedBoat?.id          ?? null,
        boat_name:      (selectedBoat?.name ?? boatQuery) || null,
        boat_draft_ft:  draftFt   ? parseFloat(draftFt)   : null,
        trailer_height_ft: trailerFt ? parseFloat(trailerFt) : null,
        safety_clearance_ft: safetyFt ? parseFloat(safetyFt) : 1,
        assigned_staff: assignedStaff || null,
        notes:          notes || null,
        status: "REQUESTED",
      }

      // pre-calculate required tide
      const draft   = parseFloat(draftFt)   || 0
      const trailer = parseFloat(trailerFt) || 0
      const safety  = parseFloat(safetyFt)  || 1
      const reqTide = ftToM(draft + trailer + safety) + (-1.0)
      body.required_tide_m = parseFloat(reqTide.toFixed(3))

      const res = await fetch("/api/db/ramp-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Create failed")
      router.push(`/ramp-bookings/${data.id}`)
    } catch (e) {
      setFormError(String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const draft   = parseFloat(draftFt)   || 0
  const trailer = parseFloat(trailerFt) || 0
  const safety  = parseFloat(safetyFt)  || 1
  const showTide = (opType === "LAUNCH" || opType === "RETRIEVAL") && (draft + trailer + safety) > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Ramp Booking"
        description="Create a launch, retrieval, or ramp operation booking"
        breadcrumb={[
          { label: "Ramp Bookings", href: "/ramp-bookings" },
          { label: "New Booking" },
        ]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/ramp-bookings"><ChevronLeft className="h-4 w-4 mr-1" />Back</Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ── Left column: main form ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Operation Type */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Anchor className="h-4 w-4 text-teal-500" />Operation Type</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {OPERATION_TYPES.map(op => (
                    <button
                      key={op.value}
                      type="button"
                      onClick={() => setOpType(op.value)}
                      className={`rounded-lg border-2 p-3 text-left transition-colors ${
                        opType === op.value
                          ? "border-teal-500 bg-teal-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="text-lg mb-1">{op.icon}</div>
                      <div className={`text-sm font-semibold ${opType === op.value ? "text-teal-700" : "text-gray-800"}`}>{op.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{op.desc}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" />Schedule</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Requested Date <span className="text-red-500">*</span></label>
                  <Input
                    type="date"
                    value={requestedDate}
                    onChange={e => setRequestedDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Requested Time
                  </label>
                  <Input
                    type="time"
                    value={requestedTime}
                    onChange={e => setRequestedTime(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Customer & Vessel */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Ship className="h-4 w-4 text-gray-400" />Customer &amp; Vessel</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {/* Boat search */}
                <div className="space-y-1.5 relative">
                  <label className="text-sm font-medium text-gray-700">Vessel <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Ship className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      className="pl-9"
                      placeholder="Search by boat name or registration…"
                      value={boatQuery}
                      onChange={e => { setBoatQuery(e.target.value); setSelectedBoat(null); setShowDropdown(true) }}
                      onFocus={() => setShowDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    />
                    {boatsLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
                  </div>
                  {showDropdown && filteredBoats.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredBoats.map(b => (
                        <button
                          key={b.id}
                          type="button"
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors border-b last:border-0"
                          onClick={() => selectBoat(b)}
                        >
                          <div className="text-sm font-medium text-gray-900">{b.name}</div>
                          <div className="text-xs text-gray-500">
                            {b.registration_number && <span>{b.registration_number} · </span>}
                            {b.owner_name && <span className="text-blue-600">{b.owner_name}</span>}
                            {b.draft_ft && <span className="ml-2 text-gray-400">Draft: {b.draft_ft} ft</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedBoat && (
                    <div className="flex items-center gap-1.5 text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded px-2 py-1">
                      <CheckCircle2 className="h-3 w-3" /> Linked to boat record
                    </div>
                  )}
                </div>

                {/* Customer name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Customer Name
                  </label>
                  <Input
                    placeholder="Customer / boat owner name"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Vessel Dimensions */}
            {(opType === "LAUNCH" || opType === "RETRIEVAL") && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Waves className="h-4 w-4 text-blue-500" />
                    Vessel Dimensions &amp; Tide Safety
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Boat Draft (ft)</label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="e.g. 3.5"
                        value={draftFt}
                        onChange={e => setDraftFt(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Trailer Ht. (ft)</label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="e.g. 1.5"
                        value={trailerFt}
                        onChange={e => setTrailerFt(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Safety (ft)</label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="default 1"
                        value={safetyFt}
                        onChange={e => setSafetyFt(e.target.value)}
                      />
                    </div>
                  </div>

                  {showTide && (
                    <TideCalcPreview draft={draft} trailer={trailer} safety={safety} />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Staff & Notes */}
            <Card>
              <CardHeader><CardTitle>Additional Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Assigned Staff</label>
                  <Input
                    placeholder="Staff name or team"
                    value={assignedStaff}
                    onChange={e => setAssignedStaff(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Special instructions, requirements, or notes…"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Right column: sidebar ── */}
          <div className="space-y-4">
            {/* Submit */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                {formError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                    {formError}
                  </div>
                )}
                <Button type="submit" variant="teal" className="w-full gap-2" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Anchor className="h-4 w-4" />}
                  {submitting ? "Creating…" : "Create Booking"}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => router.back()} disabled={submitting}>
                  Cancel
                </Button>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Booking Summary</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Operation</span>
                  <span className="font-medium text-gray-900">
                    {OPERATION_TYPES.find(o => o.value === opType)?.label ?? opType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="font-medium text-gray-900">{requestedDate || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Time</span>
                  <span className="font-medium text-gray-900">{requestedTime || "TBC"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Vessel</span>
                  <span className="font-medium text-gray-900 text-right max-w-[140px] truncate">{(selectedBoat?.name ?? boatQuery) || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer</span>
                  <span className="font-medium text-gray-900 text-right max-w-[140px] truncate">{customerName || "—"}</span>
                </div>
                {showTide && (
                  <div className="flex justify-between pt-1 border-t">
                    <span className="text-gray-500">Required Tide</span>
                    <span className="font-semibold text-blue-700">
                      {(ftToM(draft + trailer + safety) - 1.0).toFixed(2)} m
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Guidelines */}
            <Card>
              <CardHeader><CardTitle className="text-sm text-amber-700 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Booking Guidelines</CardTitle></CardHeader>
              <CardContent className="text-xs text-gray-600 space-y-2">
                <p>• Bookings are subject to tide window and ramp availability.</p>
                <p>• Launch / Retrieval requires tide safety verification before confirmation.</p>
                <p>• Provide accurate boat draft and trailer dimensions for safe operation.</p>
                <p>• Final time confirmation will be made after tide check on operation day.</p>
                <p>• Cancellations must be made at least 24 hours in advance.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
