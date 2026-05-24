"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Loader2, Map as MapIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import type { Berth } from "@/lib/supabase"

type Assignment = {
  id: string
  berth_id: string
  boat_name: string | null
  customer_name: string | null
  start_date: string
  end_date: string | null
  status: "ACTIVE" | "RESERVED" | "COMPLETED" | "CANCELLED"
  notes: string | null
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
                            className={`h-8 border-r border-gray-300 ${day.key === today ? "bg-blue-50" : ""}`}
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
                          return (
                            <div
                              key={assignment.id}
                              className={`absolute top-1 flex h-6 items-center justify-center overflow-hidden border text-xs font-medium ${barClass(assignment.status, assignment.notes)}`}
                              style={{ left: start * DAY_WIDTH, width }}
                              title={`${assignment.boat_name ?? "Booking"} - ${assignment.customer_name ?? ""}`}
                            >
                              <span className="truncate px-2">{assignment.boat_name ?? assignment.customer_name ?? "Reserved"}</span>
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
        <span>Use the board to scan conflicts across C, W and B slots before assigning a boat.</span>
      </div>
    </div>
  )
}
