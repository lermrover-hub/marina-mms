"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Anchor, Search, Plus, Loader2, Calendar, Ship } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { formatDate } from "@/lib/utils"
import type { RampBooking } from "@/lib/supabase"

const OP_LABELS: Record<string, { label: string; color: string }> = {
  LAUNCH:     { label: "Launch",     color: "bg-teal-100 text-teal-700" },
  RETRIEVAL:  { label: "Retrieval",  color: "bg-blue-100 text-blue-700" },
  MOVE_BOAT:  { label: "Move Boat",  color: "bg-indigo-100 text-indigo-700" },
  WASH:       { label: "Wash",       color: "bg-sky-100 text-sky-700" },
  FUEL:       { label: "Fuel",       color: "bg-orange-100 text-orange-700" },
  INSPECTION: { label: "Inspection", color: "bg-amber-100 text-amber-700" },
}

const STATUS_FILTERS = ["ALL","REQUESTED","CONFIRMED","IN_PROGRESS","COMPLETED","CANCELLED"]

export default function RampBookingsPage() {
  const [bookings,     setBookings]     = useState<RampBooking[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetchError,   setFetchError]   = useState<string | null>(null)
  const [search,       setSearch]       = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  useEffect(() => {
    fetch("/api/db/ramp-bookings")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setBookings(d)
        else setFetchError(d?.error ?? "Failed to load")
      })
      .catch(e => setFetchError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const filtered = bookings.filter(b => {
    if (statusFilter !== "ALL" && b.status !== statusFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (b.reference ?? "").toLowerCase().includes(q) ||
      (b.customer_name ?? "").toLowerCase().includes(q) ||
      (b.boat_name ?? "").toLowerCase().includes(q) ||
      b.operation_type.toLowerCase().includes(q)
    )
  })

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayBookings = bookings.filter(b =>
    b.requested_date === todayStr && !["CANCELLED","COMPLETED"].includes(b.status)
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ramp Bookings"
        description="Launch, retrieval, and ramp operations management"
        actions={
          <Button size="sm" variant="teal" className="gap-2" asChild>
            <Link href="/ramp-bookings/new"><Plus className="h-4 w-4" /> New Booking</Link>
          </Button>
        }
      />

      {/* Today summary */}
      {todayBookings.length > 0 && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3">
          <div className="flex items-center gap-2 text-teal-700 text-sm font-semibold mb-2">
            <Calendar className="h-4 w-4" /> Today&apos;s Operations ({todayBookings.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {todayBookings.map(b => {
              const op = OP_LABELS[b.operation_type] ?? { label: b.operation_type, color: "" }
              return (
                <Link key={b.id} href={`/ramp-bookings/${b.id}`}
                  className="flex items-center gap-1.5 rounded-full border border-teal-300 bg-white px-3 py-1 text-xs font-medium text-teal-800 hover:bg-teal-100 transition-colors">
                  <Ship className="h-3 w-3" />
                  {b.boat_name ?? b.reference} — {op.label}
                  {b.confirmed_time && ` @ ${b.confirmed_time}`}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by reference, customer, or boat…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === s ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s === "ALL" ? "All" : s.replace(/_/g," ")}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading bookings…</span>
          </div>
        ) : fetchError ? (
          <div className="flex items-center justify-center py-12 text-red-500 text-sm">{fetchError}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Anchor className="h-10 w-10 mb-3 text-gray-300" />
            <p className="text-sm font-medium">No bookings found</p>
            <p className="text-xs mt-1">Adjust search or filters, or create a new booking</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="px-5 py-3 text-left">Reference</th>
                  <th className="px-5 py-3 text-left">Customer / Boat</th>
                  <th className="px-5 py-3 text-left">Operation</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Time</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(b => {
                  const op = OP_LABELS[b.operation_type] ?? { label: b.operation_type, color: "bg-gray-100 text-gray-600" }
                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/ramp-bookings/${b.id}`} className="font-semibold text-teal-700 hover:underline">
                          {b.reference}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">{b.customer_name ?? "—"}</div>
                        {b.boat_name && (
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Ship className="h-3 w-3" />{b.boat_name}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${op.color}`}>
                          {op.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-700">{formatDate(b.requested_date)}</td>
                      <td className="px-5 py-3 text-xs">
                        {b.confirmed_time
                          ? <span className="font-medium text-teal-600">{b.confirmed_time}</span>
                          : b.requested_time
                          ? <span className="text-gray-400">Req: {b.requested_time}</span>
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <StatusBadge type="ramp" status={b.status} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="ghost" size="sm" className="text-xs" asChild>
                          <Link href={`/ramp-bookings/${b.id}`}>View →</Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t text-xs text-gray-400">
              Showing {filtered.length} of {bookings.length} bookings
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
