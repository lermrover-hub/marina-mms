"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Loader2, Map as MapIcon, Pencil, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import type { Berth } from "@/lib/supabase"

type Assignment = {
  id: string
  berth_id: string
  boat_id: string | null
  boat_name: string | null
  customer_name: string | null
  start_date: string
  end_date: string | null
  status: "ACTIVE" | "RESERVED" | "COMPLETED" | "CANCELLED"
  notes: string | null
}

// ─── Edit Assignment Modal ─────────────────────────────────────────────────────
function EditAssignmentModal({
  assignment,
  berthCode,
  onClose,
  onSaved,
}: {
  assignment: Assignment
  berthCode: string
  onClose: () => void
  onSaved: () => void
}) {
  const [startDate, setStart]   = useState(assignment.start_date)
  const [endDate,   setEnd]     = useState(assignment.end_date ?? "")
  const [status,    setStatus]  = useState(assignment.status)
  const [notes,     setNotes]   = useState(assignment.notes ?? "")
  const [saving,    setSaving]  = useState(false)
  const [deleting,  setDeleting]= useState(false)
  const [error,     setError]   = useState<string | null>(null)
  const [confirmDel,setConfirm] = useState(false)

  async function patchJson(url: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j?.error ?? "Update failed")
    }
  }

  async function syncBerthAndBoat(nextStatus: Assignment["status"]) {
    if (nextStatus === "COMPLETED" || nextStatus === "CANCELLED") {
      await patchJson(`/api/db/berths/${assignment.berth_id}`, {
        status: "AVAILABLE",
        current_boat_id: null,
      })
      if (assignment.boat_id) {
        await patchJson(`/api/db/boats/${assignment.boat_id}`, {
          status: "ACTIVE",
          current_location_code: null,
        })
      }
      return
    }

    await patchJson(`/api/db/berths/${assignment.berth_id}`, {
      status: nextStatus === "RESERVED" ? "RESERVED" : "OCCUPIED",
      current_boat_id: assignment.boat_id,
    })
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/db/berth-assignments?id=${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: startDate,
          end_date:   endDate || startDate,
          status,
          notes: notes.trim() || null,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? "Failed to save")
      }
      await syncBerthAndBoat(status)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/db/berth-assignments?id=${assignment.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      await syncBerthAndBoat("CANCELLED")
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setDeleting(false)
    }
  }

  const STATUS_OPTIONS: Assignment["status"][] = ["ACTIVE", "RESERVED", "COMPLETED", "CANCELLED"]
  const STATUS_LABEL: Record<string, string> = {
    ACTIVE: "Occupied / Check-in", RESERVED: "Reserved",
    COMPLETED: "Completed / Check-out", CANCELLED: "Cancelled",
  }
  const STATUS_COLOR: Record<string, string> = {
    ACTIVE:    "border-blue-500 bg-blue-50 text-blue-700",
    RESERVED:  "border-amber-400 bg-amber-50 text-amber-700",
    COMPLETED: "border-gray-400 bg-gray-50 text-gray-600",
    CANCELLED: "border-red-400 bg-red-50 text-red-700",
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Pencil className="h-4 w-4 text-teal-600" />
              Edit Assignment — {berthCode}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {assignment.boat_name ?? "—"} · {assignment.customer_name ?? "—"}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`rounded-lg py-2 text-xs font-semibold border-2 transition-colors ${
                    status === s ? STATUS_COLOR[s] : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                  }`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. own trailer, company trailer, extended by customer..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none resize-none"
            />
          </div>

          {/* Confirm delete */}
          {confirmDel && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-medium mb-2">Remove this assignment?</p>
              <p className="text-xs mb-3">Berth will be set back to AVAILABLE.</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setConfirm(false)} disabled={deleting}>Cancel</Button>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes, Remove"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-5">
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
            onClick={() => setConfirm(true)}
            disabled={saving || confirmDel}
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !startDate}>
              {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const ZONE_ORDER = ["C", "W", "B"] as const
const DAY_WIDTH = 18
const LEFT_WIDTH = 150

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1)
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(dateKeyValue: string, count: number) {
  const date = new Date(`${dateKeyValue}T00:00:00`)
  date.setDate(date.getDate() + count)
  return dateKey(date)
}

function daySpan(startDate: string, endDate: string | null) {
  if (!endDate) return 0
  const start = new Date(`${startDate}T00:00:00`).getTime()
  const end = new Date(`${endDate}T00:00:00`).getTime()
  return Math.max(0, Math.round((end - start) / (24 * 60 * 60 * 1000)))
}

function eachDay(months: Date[]) {
  return months.flatMap((month) =>
    Array.from({ length: daysInMonth(month.getFullYear(), month.getMonth()) }, (_, index) => ({
      date: new Date(month.getFullYear(), month.getMonth(), index + 1),
      day: index + 1,
      key: toDateStr(month.getFullYear(), month.getMonth(), index + 1),
      month: month.getMonth(),
      year: month.getFullYear(),
    })),
  )
}

function barClass(status: string, notes?: string | null) {
  const note = (notes ?? "").toLowerCase()
  if (note.includes("company") || note.includes("trailer")) return "bg-red-200 border-red-600 text-red-900"
  if (note.includes("own")) return "bg-green-200 border-green-600 text-green-900"
  if (status === "RESERVED") return "bg-amber-200 border-amber-600 text-amber-900"
  if (status === "COMPLETED") return "bg-gray-200 border-gray-500 text-gray-700"
  return "bg-yellow-100 border-yellow-500 text-gray-900"
}

export default function BerthManagementPage() {
  const [berths, setBerths] = useState<Berth[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ assignment: Assignment; berthCode: string } | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [startMonth, setStartMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const months = useMemo(() => [startMonth, addMonths(startMonth, 1)], [startMonth])
  const days = useMemo(() => eachDay(months), [months])
  const rangeFrom = days[0]?.key
  const rangeTo = days[days.length - 1]?.key
  const today = dateKey(new Date())
  const todayIndex = days.findIndex((day) => day.key === today)
  const totalWidth = LEFT_WIDTH + days.length * DAY_WIDTH

  const fetchData = useCallback(() => {
    if (!rangeFrom || !rangeTo) return
    setLoading(true)
    setError(null)
    Promise.all([
      fetch("/api/db/berths").then((response) => response.json()),
      fetch(`/api/db/berth-assignments?from=${rangeFrom}&to=${rangeTo}`).then((response) => response.json()),
    ])
      .then(([berthData, assignmentData]) => {
        if (Array.isArray(berthData)) setBerths(berthData)
        else setError("Failed to load berths")
        if (Array.isArray(assignmentData)) setAssignments(assignmentData)
        else setError("Failed to load assignments")
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false))
  }, [rangeFrom, rangeTo])

  useEffect(() => { fetchData() }, [fetchData])

  const rows = useMemo(() => {
    const grouped: Record<string, Berth[]> = { C: [], W: [], B: [] }
    berths.forEach((berth) => {
      if (berth.zone && grouped[berth.zone]) grouped[berth.zone].push(berth)
    })
    ZONE_ORDER.forEach((zone) => {
      grouped[zone].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
    })
    return ZONE_ORDER.flatMap((zone) => grouped[zone])
  }, [berths])

  const byBerth = useMemo(() => {
    const map = new Map<string, Assignment[]>()
    assignments.forEach((assignment) => {
      const list = map.get(assignment.berth_id) ?? []
      list.push(assignment)
      map.set(assignment.berth_id, list)
    })
    return map
  }, [assignments])

  async function moveAssignment(assignment: Assignment, targetBerth: Berth, targetStartDate: string) {
    if (assignment.status !== "RESERVED") return
    const duration = daySpan(assignment.start_date, assignment.end_date)
    const nextEndDate = assignment.end_date ? addDays(targetStartDate, duration) : null

    setError(null)
    try {
      const res = await fetch(`/api/db/berth-assignments?id=${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          berth_id: targetBerth.id,
          start_date: targetStartDate,
          end_date: nextEndDate,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Move failed")

      if (assignment.berth_id !== targetBerth.id) {
        await Promise.all([
          fetch(`/api/db/berths/${assignment.berth_id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "AVAILABLE", current_boat_id: null }),
          }),
          fetch(`/api/db/berths/${targetBerth.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "RESERVED", current_boat_id: assignment.boat_id }),
          }),
        ])
      }
      fetchData()
    } catch (e) {
      setError(String(e))
    } finally {
      setDraggingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Berth Management"
        description="Gantt-style booking board for hardstand, workshop and beach slots"
        actions={
          <>
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link href="/berths"><MapIcon className="h-4 w-4" /> Berth Map</Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link href="/berths/calendar"><CalendarDays className="h-4 w-4" /> Calendar</Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-3">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setStartMonth((date) => addMonths(date, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[230px] text-center text-sm font-bold text-gray-800">
            {MONTH_NAMES[months[0].getMonth()]} {months[0].getFullYear()} - {MONTH_NAMES[months[1].getMonth()]} {months[1].getFullYear()}
          </div>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setStartMonth((date) => addMonths(date, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setStartMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
            Today
          </Button>

          <div className="ml-auto flex flex-wrap gap-3 text-[10px] font-medium text-gray-600">
            <span className="flex items-center gap-1"><span className="h-3 w-8 border border-yellow-500 bg-yellow-100" /> Boat stand</span>
            <span className="flex items-center gap-1"><span className="h-3 w-8 border border-red-600 bg-red-200" /> Company trailer</span>
            <span className="flex items-center gap-1"><span className="h-3 w-8 border border-green-600 bg-green-200" /> Own trailer</span>
            <span className="flex items-center gap-1"><span className="h-3 w-8 border border-gray-500 bg-gray-200" /> Completed</span>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading management board...
        </div>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {!loading && !error && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-auto bg-white">
              <div className="min-w-full" style={{ width: totalWidth }}>
                <div className="sticky top-0 z-20 bg-white">
                  <div className="flex border-b border-black">
                    <div className="h-7 border-r border-black" style={{ width: LEFT_WIDTH }} />
                    {months.map((month) => {
                      const count = daysInMonth(month.getFullYear(), month.getMonth())
                      return (
                        <div key={month.toISOString()} className="flex h-7 items-center justify-center border-r border-black text-lg font-medium text-black" style={{ width: count * DAY_WIDTH }}>
                          {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex border-b border-black">
                    <div className="h-8 border-r border-black" style={{ width: LEFT_WIDTH }} />
                    {days.map((day) => (
                      <div key={day.key} className="flex h-8 items-end justify-center border-r border-gray-300 pb-1 text-[9px] text-gray-700" style={{ width: DAY_WIDTH }}>
                        {day.day}
                      </div>
                    ))}
                  </div>
                </div>

                {rows.map((berth) => {
                  const rowAssignments = byBerth.get(berth.id) ?? []
                  return (
                    <div key={berth.id} className="relative flex h-8 border-b border-black">
                      <Link href={`/berths/${berth.id}`} className="flex items-center justify-between border-r border-black px-3 text-xs text-gray-900" style={{ width: LEFT_WIDTH }}>
                        <span className="truncate">{berth.current_boat_id ? "Assigned" : ""}</span>
                        <span className="font-mono font-semibold">{berth.code}</span>
                      </Link>
                      <div className="relative flex" style={{ width: days.length * DAY_WIDTH }}>
                        {days.map((day) => (
                          <div
                            key={day.key}
                            onDragOver={(event) => {
                              if (draggingId) event.preventDefault()
                            }}
                            onDrop={(event) => {
                              event.preventDefault()
                              const id = event.dataTransfer.getData("text/plain") || draggingId
                              const assignment = assignments.find((item) => item.id === id)
                              if (assignment) moveAssignment(assignment, berth, day.key)
                            }}
                            className={`h-8 border-r border-gray-300 ${day.key === today ? "bg-blue-50" : ""} ${draggingId ? "hover:bg-teal-50" : ""}`}
                            style={{ width: DAY_WIDTH }}
                          />
                        ))}
                        {todayIndex >= 0 && (
                          <div className="absolute top-[-68px] z-10 h-[600px] border-l-2 border-dashed border-red-500" style={{ left: todayIndex * DAY_WIDTH }} />
                        )}
                        {rowAssignments.map((assignment) => {
                          const start = Math.max(0, days.findIndex((day) => day.key >= assignment.start_date))
                          const endDate = assignment.end_date ?? rangeTo
                          const endIndex = days.findIndex((day) => day.key > endDate)
                          const end = endIndex === -1 ? days.length : endIndex
                          if (start < 0 || end <= start) return null
                          const width = (end - start) * DAY_WIDTH
                          const canDrag = assignment.status === "RESERVED"
                          return (
                            <div
                              key={assignment.id}
                              draggable={canDrag}
                              onDragStart={(event) => {
                                if (!canDrag) return
                                setDraggingId(assignment.id)
                                event.dataTransfer.setData("text/plain", assignment.id)
                                event.dataTransfer.effectAllowed = "move"
                              }}
                              onDragEnd={() => setDraggingId(null)}
                              onClick={() => setEditing({ assignment, berthCode: berth.code })}
                              className={`absolute top-1 flex h-6 items-center justify-center overflow-hidden border text-xs font-medium transition-opacity hover:opacity-80 hover:shadow-md ${canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${barClass(assignment.status, assignment.notes)}`}
                              style={{ left: start * DAY_WIDTH, width }}
                              title={`Click to edit · ${assignment.boat_name ?? "Booking"} · ${assignment.start_date} → ${assignment.end_date ?? "open"}`}
                            >
                              <span className="truncate px-2">{assignment.boat_name ?? assignment.customer_name ?? "Reserved"}</span>
                              <Pencil className="ml-1 h-2.5 w-2.5 shrink-0 opacity-60" />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-400">
        <ArrowLeft className="h-3 w-3" />
        <span>Use the board to scan conflicts across C, W and B slots · Click any bar to edit dates or status.</span>
      </div>

      {editing && (
        <EditAssignmentModal
          assignment={editing.assignment}
          berthCode={editing.berthCode}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchData() }}
        />
      )}
    </div>
  )
}
