"use client"
import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft, Anchor, Calendar, Clock, AlertTriangle,
  CheckCircle2, Loader2, Waves, Ship, Plus,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDate } from "@/lib/utils"
import type { Boat } from "@/lib/supabase"

type RampBooking = {
  id: string; reference: string; boat_name: string | null
  operation_type: string; requested_date: string; requested_time: string | null
  confirmed_time: string | null; status: string; required_tide_m: number | null
  notes: string | null
}

const OP_LABELS: Record<string, string> = {
  LAUNCH:"Launch", RETRIEVAL:"Retrieval", MOVE_BOAT:"Move Boat",
  WASH:"Wash", FUEL:"Fuel", INSPECTION:"Inspection",
}
const STATUS_COLORS: Record<string, string> = {
  REQUESTED:"bg-gray-100 text-gray-600", CONFIRMED:"bg-teal-100 text-teal-700",
  IN_PROGRESS:"bg-blue-100 text-blue-700", COMPLETED:"bg-green-100 text-green-700",
  CANCELLED:"bg-red-100 text-red-600",
}

const ftToM = (ft: number) => +(ft * 0.3048).toFixed(3)

export default function PortalRampBookingPage() {
  const [bookings,   setBookings]   = useState<RampBooking[]>([])
  const [boats,      setBoats]      = useState<Boat[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError,  setFormError]  = useState<string | null>(null)
  const [success,    setSuccess]    = useState<string | null>(null)

  const [opType,       setOpType]       = useState("LAUNCH")
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null)
  const [boatQuery,    setBoatQuery]    = useState("")
  const [showDrop,     setShowDrop]     = useState(false)
  const [reqDate,      setReqDate]      = useState("")
  const [reqTime,      setReqTime]      = useState("")
  const [draftFt,      setDraftFt]      = useState("")
  const [trailerFt,    setTrailerFt]    = useState("")
  const [safetyFt,     setSafetyFt]     = useState("1")
  const [notes,        setNotes]        = useState("")

  const loadData = useCallback(() => {
    Promise.all([
      fetch("/api/db/ramp-bookings").then(r => r.json()),
      fetch("/api/db/boats?limit=100").then(r => r.json()),
    ]).then(([b, bts]) => {
      if (Array.isArray(b))   setBookings(b)
      if (Array.isArray(bts)) setBoats(bts)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredBoats = boats.filter(b =>
    !boatQuery || (b.name ?? "").toLowerCase().includes(boatQuery.toLowerCase())
  ).slice(0, 6)

  function selectBoat(b: Boat) {
    setSelectedBoat(b); setBoatQuery(b.name ?? "")
    if (b.draft_ft) setDraftFt(String(b.draft_ft))
    setShowDrop(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reqDate) { setFormError("Date is required"); return }
    setSubmitting(true); setFormError(null)
    try {
      const draft   = parseFloat(draftFt)   || 0
      const trailer = parseFloat(trailerFt) || 0
      const safety  = parseFloat(safetyFt)  || 1
      const res = await fetch("/api/db/ramp-bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation_type: opType, requested_date: reqDate,
          requested_time: reqTime || null,
          boat_id: selectedBoat?.id ?? null,
          boat_name: selectedBoat?.name ?? (boatQuery || null),
          boat_draft_ft: draft || null, trailer_height_ft: trailer || null,
          safety_clearance_ft: safety,
          required_tide_m: parseFloat((ftToM(draft + trailer + safety) - 1.0).toFixed(3)),
          notes: notes || null, status: "REQUESTED",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Failed")
      setSuccess(`Booking ${data.reference} submitted! We will confirm your tide window shortly.`)
      setShowForm(false)
      setReqDate(""); setReqTime(""); setBoatQuery(""); setSelectedBoat(null)
      setDraftFt(""); setTrailerFt(""); setSafetyFt("1"); setNotes("")
      loadData()
    } catch (err) { setFormError(String(err)) }
    finally { setSubmitting(false) }
  }

  const draft   = parseFloat(draftFt)   || 0
  const trailer = parseFloat(trailerFt) || 0
  const safety  = parseFloat(safetyFt)  || 1
  const showTide = (opType === "LAUNCH" || opType === "RETRIEVAL") && (draft + trailer + safety) > 0

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ramp Booking</h1>
            <p className="text-sm text-gray-500">Request launch, retrieval or ramp services</p>
          </div>
          <Link href="/portal"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button></Link>
        </div>

        {success && (
          <div className="flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />{success}
          </div>
        )}

        {!showForm && (
          <Button className="gap-2 bg-teal-600 hover:bg-teal-700 text-white w-full"
            onClick={() => { setShowForm(true); setSuccess(null) }}>
            <Plus className="h-4 w-4" /> New Ramp Booking
          </Button>
        )}

        {showForm && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Anchor className="h-4 w-4 text-teal-500" />New Booking Request</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Operation</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(OP_LABELS).map(([val, lbl]) => (
                      <button key={val} type="button" onClick={() => setOpType(val)}
                        className={`rounded-lg border-2 py-2 px-2 text-xs font-medium transition-colors ${
                          opType === val ? "border-teal-500 bg-teal-50 text-teal-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}>{lbl}</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 relative">
                  <label className="text-sm font-medium text-gray-700">Vessel</label>
                  <div className="relative">
                    <Ship className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input className="pl-9" placeholder="Search your boats…" value={boatQuery}
                      onChange={e => { setBoatQuery(e.target.value); setSelectedBoat(null); setShowDrop(true) }}
                      onFocus={() => setShowDrop(true)} onBlur={() => setTimeout(() => setShowDrop(false), 200)} />
                  </div>
                  {showDrop && filteredBoats.length > 0 && (
                    <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {filteredBoats.map(b => (
                        <button key={b.id} type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-0"
                          onClick={() => selectBoat(b)}>
                          {b.name}{b.draft_ft && <span className="text-gray-400 text-xs ml-1"> Draft: {b.draft_ft}ft</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Date *</label>
                    <Input type="date" value={reqDate} onChange={e => setReqDate(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Preferred Time</label>
                    <Input type="time" value={reqTime} onChange={e => setReqTime(e.target.value)} />
                  </div>
                </div>

                {(opType === "LAUNCH" || opType === "RETRIEVAL") && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5"><Waves className="h-3.5 w-3.5 text-blue-500" />Dimensions (for tide check)</label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input type="number" step="0.1" placeholder="Draft (ft)" value={draftFt} onChange={e => setDraftFt(e.target.value)} />
                      <Input type="number" step="0.1" placeholder="Trailer ht (ft)" value={trailerFt} onChange={e => setTrailerFt(e.target.value)} />
                      <Input type="number" step="0.1" placeholder="Safety (ft)" value={safetyFt} onChange={e => setSafetyFt(e.target.value)} />
                    </div>
                    {showTide && (
                      <div className="flex justify-between rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
                        <span>Required tide height</span>
                        <span className="font-bold text-blue-900">{(ftToM(draft + trailer + safety) - 1.0).toFixed(2)} m</span>
                      </div>
                    )}
                    <p className="flex items-center gap-1 text-xs text-amber-600">
                      <AlertTriangle className="h-3 w-3" />Final tide confirmation on operation day.
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Notes / Special Requests</label>
                  <textarea rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Any special instructions…" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>

                {formError && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{formError}</div>}

                <div className="flex gap-3">
                  <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white gap-2" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Anchor className="h-4 w-4" />}
                    {submitting ? "Submitting…" : "Submit Request"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); setFormError(null) }} disabled={submitting}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3">My Bookings</h2>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…</div>
          ) : bookings.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center py-12 text-gray-400"><Anchor className="h-8 w-8 mb-2 text-gray-300" /><p className="text-sm">No ramp bookings yet</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {bookings.map(b => (
                <Card key={b.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {b.status.replace(/_/g," ")}
                      </span>
                      <span className="text-xs font-mono text-gray-400">{b.reference}</span>
                    </div>
                    <p className="font-semibold text-gray-900 mt-1">
                      {OP_LABELS[b.operation_type] ?? b.operation_type} — {b.boat_name ?? "—"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(b.requested_date)}
                      {b.confirmed_time
                        ? <span className="ml-2 text-teal-600 font-medium"> ✓ Confirmed: {b.confirmed_time}</span>
                        : b.requested_time ? ` · Requested: ${b.requested_time}` : ""}
                    </p>
                    {b.required_tide_m != null && <p className="text-xs text-blue-600 mt-0.5">Required tide: {b.required_tide_m.toFixed(2)} m</p>}
                    {b.notes && <p className="text-xs text-gray-400 mt-1 italic">&ldquo;{b.notes}&rdquo;</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
