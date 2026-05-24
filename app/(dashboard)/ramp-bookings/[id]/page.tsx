"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  Anchor, Ship, User, AlertTriangle, CheckCircle2,
  Clock, Printer, Loader2, Waves, ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, formatDateLong } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { RampBooking } from "@/lib/supabase"

const OP_LABELS: Record<string, string> = {
  LAUNCH:"Launch", RETRIEVAL:"Retrieval", MOVE_BOAT:"Move Boat",
  WASH:"Wash", FUEL:"Fuel", INSPECTION:"Inspection",
}

const STATUS_TRANSITIONS: Record<string, { next: string; label: string; color: string }[]> = {
  REQUESTED:   [{ next:"CONFIRMED",   label:"Confirm Booking",  color:"teal" }],
  CONFIRMED:   [{ next:"IN_PROGRESS", label:"Start Operation",  color:"teal" }],
  IN_PROGRESS: [{ next:"COMPLETED",   label:"Mark Completed",   color:"teal" }],
}

// Tide safety display — simple table
function TideSafetyCard({ booking }: { booking: RampBooking }) {
  const draft   = booking.boat_draft_ft ?? 0
  const trailer = booking.trailer_height_ft ?? 0
  const safety  = booking.safety_clearance_ft ?? 1
  const rampOffset = -1.0 // metres default

  // Convert ft to metres
  const ftToM = (ft: number) => ft * 0.3048
  const minActualDepthM = ftToM(draft + trailer + safety)
  const requiredTideM   = minActualDepthM + rampOffset

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Waves className="h-4 w-4 text-blue-500" />Tide Safety Calculation</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3 text-sm">
          {[
            { label: "Boat Draft",        value: `${draft} ft (${ftToM(draft).toFixed(2)} m)` },
            { label: "Trailer Height",    value: `${trailer} ft (${ftToM(trailer).toFixed(2)} m)` },
            { label: "Safety Clearance",  value: `${safety} ft (${ftToM(safety).toFixed(2)} m)` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-gray-50 p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <div className="font-semibold text-gray-800 text-xs">{value}</div>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-700">Min. Required Depth</span>
            <span className="font-bold text-blue-900">{minActualDepthM.toFixed(2)} m</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-700">Required Tide Height</span>
            <span className="font-bold text-blue-900">{requiredTideM.toFixed(2)} m</span>
          </div>
          <p className="text-xs text-blue-600 pt-1">
            Formula: (Draft + Trailer + Safety) + Ramp Offset ({rampOffset} m)
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          Tide predictions may differ from actual sea level due to weather, wind, and pressure. Final confirmation required on the day of operation.
        </div>
      </CardContent>
    </Card>
  )
}

export default function RampBookingDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""

  const [booking,  setBooking]  = useState<RampBooking | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  async function loadBooking() {
    if (!id) return
    setLoading(true)
    fetch(`/api/db/ramp-bookings/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d?.error) setError("Booking not found")
        else setBooking(d as RampBooking)
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadBooking() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStatusChange(newStatus: string) {
    if (!booking) return
    setUpdating(true)
    try {
      const body: Record<string, string> = { status: newStatus }
      if (newStatus === "CONFIRMED") body.confirmed_time = booking.requested_time ?? new Date().toTimeString().slice(0,5)
      const res = await fetch(`/api/db/ramp-bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Update failed")
      setBooking(data)
    } catch (e) {
      alert("Failed: " + String(e))
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-gray-400">
      <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
    </div>
  )

  if (error || !booking) return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <Anchor className="h-10 w-10 text-gray-300 mb-3" />
      <p className="text-gray-500">{error ?? "Booking not found"}</p>
      <Link href="/ramp-bookings" className="text-sm text-teal-600 hover:underline mt-2">← Back to bookings</Link>
    </div>
  )

  const transitions = STATUS_TRANSITIONS[booking.status] ?? []
  const opLabel     = OP_LABELS[booking.operation_type] ?? booking.operation_type

  return (
    <div className="space-y-6">
      <PageHeader
        title={booking.reference}
        description={`${opLabel} · ${booking.boat_name ?? "—"}`}
        breadcrumb={[{ label: "Ramp Bookings", href: "/ramp-bookings" }, { label: booking.reference }]}
        actions={
          <div className="flex gap-2 flex-wrap">
            {transitions.map(({ next, label }) => (
              <Button
                key={next}
                size="sm" variant="teal" className="gap-2"
                disabled={updating}
                onClick={() => handleStatusChange(next)}
              >
                {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {label}
              </Button>
            ))}
            {!["CANCELLED","COMPLETED"].includes(booking.status) && (
              <Button
                size="sm" variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                disabled={updating}
                onClick={() => { if (confirm("Cancel this booking?")) handleStatusChange("CANCELLED") }}
              >
                Cancel
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-2" onClick={() => window.open(`/print/ramp-bookings/${id}`, "_blank")}>
              <Printer className="h-4 w-4" /> Confirmation PDF
            </Button>
          </div>
        }
      />

      {/* Status bar */}
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
        <StatusBadge type="ramp" status={booking.status} />
        <span className="text-sm font-semibold text-gray-700">{opLabel}</span>
        {booking.assigned_staff && (
          <span className="text-sm text-gray-500">· Staff: {booking.assigned_staff}</span>
        )}
        <span className="ml-auto text-xs text-gray-400">
          {formatDateLong(booking.requested_date)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: details */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Booking Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                { label: "Reference",       value: booking.reference },
                { label: "Operation",       value: opLabel },
                { label: "Requested Date",  value: formatDate(booking.requested_date) },
                { label: "Requested Time",  value: booking.requested_time ?? "—" },
                { label: "Confirmed Time",  value: booking.confirmed_time ?? "Not yet confirmed" },
                { label: "Assigned Staff",  value: booking.assigned_staff ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center border-b last:border-0 pb-2 last:pb-0">
                  <span className="text-gray-500">{label}</span>
                  <span className={cn("font-medium text-right", label === "Confirmed Time" && booking.confirmed_time ? "text-teal-700" : "text-gray-900")}>
                    {value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-4 w-4 text-gray-400" />Customer</CardTitle></CardHeader>
            <CardContent>
              {booking.customer_id ? (
                <Link href={`/customers/${booking.customer_id}`} className="flex items-center gap-2 text-teal-600 hover:underline text-sm font-medium">
                  {booking.customer_name}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <p className="text-sm text-gray-500">{booking.customer_name ?? "—"}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Ship className="h-4 w-4 text-gray-400" />Vessel</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {booking.boat_id ? (
                <Link href={`/boats/${booking.boat_id}`} className="flex items-center gap-2 text-teal-600 hover:underline text-sm font-medium">
                  {booking.boat_name}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <p className="text-sm font-medium text-gray-900">{booking.boat_name ?? "—"}</p>
              )}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded bg-gray-50 p-2 text-center">
                  <div className="text-gray-400 mb-0.5">Draft</div>
                  <div className="font-semibold">{booking.boat_draft_ft ? `${booking.boat_draft_ft} ft` : "—"}</div>
                </div>
                <div className="rounded bg-gray-50 p-2 text-center">
                  <div className="text-gray-400 mb-0.5">Trailer Ht.</div>
                  <div className="font-semibold">{booking.trailer_height_ft ? `${booking.trailer_height_ft} ft` : "—"}</div>
                </div>
                <div className="rounded bg-gray-50 p-2 text-center">
                  <div className="text-gray-400 mb-0.5">Safety</div>
                  <div className="font-semibold">{booking.safety_clearance_ft ? `${booking.safety_clearance_ft} ft` : "1 ft"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: tide calculation + notes */}
        <div className="lg:col-span-2 space-y-4">
          <TideSafetyCard booking={booking} />

          {/* Required tide & timing */}
          {booking.required_tide_m && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4 text-teal-500" />Required Tide & Schedule</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-teal-50 border border-teal-200 px-6 py-4 text-center">
                    <div className="text-xs text-teal-600 mb-1 font-semibold uppercase tracking-wide">Required Tide</div>
                    <div className="text-3xl font-bold text-teal-700">{booking.required_tide_m.toFixed(2)} m</div>
                  </div>
                  {booking.confirmed_time && (
                    <div className="rounded-xl bg-green-50 border border-green-200 px-6 py-4 text-center">
                      <div className="text-xs text-green-600 mb-1 font-semibold uppercase tracking-wide">Confirmed Time</div>
                      <div className="text-3xl font-bold text-green-700">{booking.confirmed_time}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {booking.notes && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-line">{booking.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Checklist preview */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-gray-400" />Operation Checklist</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1.5 text-sm text-gray-600">
                {(booking.operation_type === "LAUNCH" || booking.operation_type === "RETRIEVAL"
                  ? [
                    "Confirm boat details and dimensions match booking",
                    "Verify tide height meets minimum requirement",
                    "Check trailer / support frame condition",
                    "Brief operational staff",
                    "Confirm safe access route to ramp",
                    "Take before photos",
                    "Execute operation",
                    "Take after photos",
                    "Confirm boat location updated in system",
                  ]
                  : [
                    "Confirm booking details with customer",
                    "Assign staff for the operation",
                    "Prepare equipment and area",
                    "Execute operation",
                    "Record completion",
                  ]
                ).map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="h-4 w-4 rounded border border-gray-300 bg-white shrink-0 mt-0.5 flex items-center justify-center text-xs text-gray-400">{i+1}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
