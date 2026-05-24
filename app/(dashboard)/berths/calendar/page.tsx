"use client"
import React, { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  ChevronLeft, ChevronRight, ArrowLeft, Loader2,
  Waves, Wrench, Sun, LayoutGrid, Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import type { Berth } from "@/lib/supabase"

// ─── Types ───────────────────────────────────────────────────────────────────
type Assignment = {
  id: string
  berth_id: string
  boat_name: string | null
  customer_name: string | null
  start_date: string
  end_date: string
  status: "ACTIVE" | "RESERVED" | "COMPLETED" | "CANCELLED"
  notes: string | null
}

// ─── Zone config ─────────────────────────────────────────────────────────────
const ZONE_ORDER = ["C", "W", "B", "WB"] as const

const ZONE_META: Record<string, {
  label: string
  icon: React.ElementType
  headerBg: string
  codeBg: string
  dot: string
}> = {
  C:  { label: "Hardstand / Cradle", icon: LayoutGrid, headerBg: "bg-slate-200",  codeBg: "bg-slate-50",  dot: "bg-slate-500" },
  W:  { label: "Workshop Bays",      icon: Wrench,     headerBg: "bg-orange-200", codeBg: "bg-orange-50", dot: "bg-orange-500" },
  B:  { label: "Beach Storage",      icon: Sun,        headerBg: "bg-yellow-200", codeBg: "bg-yellow-50", dot: "bg-yellow-600" },
  WB: { label: "Wet Berths",         icon: Waves,      headerBg: "bg-blue-200",   codeBg: "bg-blue-50",   dot: "bg-blue-500"  },
}

const ASGN_CELL: Record<string, string> = {
  ACTIVE:   "bg-blue-500",
  RESERVED: "bg-amber-400",
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function addMonths(date: Date, n: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth() + n, 1)
  return d
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]
const DOW_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"]

// ─── Tooltip component ────────────────────────────────────────────────────────
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <div className="relative group/tip">
      {children}
      {text && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 hidden group-hover/tip:block
          bg-gray-900 text-white text-[9px] rounded px-1.5 py-1 whitespace-nowrap shadow-lg pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BerthCalendarPage() {
  const [berths,      setBerths]      = useState<Berth[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)

  // Start month (left of the 2-month view)
  const [startMonth, setStartMonth] = useState<Date>(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const months = useMemo(() => [startMonth, addMonths(startMonth, 1)], [startMonth])

  const rangeFrom = useMemo(() =>
    toDateStr(months[0].getFullYear(), months[0].getMonth(), 1), [months])

  const rangeTo = useMemo(() => {
    const last = months[1]
    return toDateStr(last.getFullYear(), last.getMonth(), daysInMonth(last.getFullYear(), last.getMonth()))
  }, [months])

  const fetchData = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch("/api/db/berths").then(r => r.json()),
      fetch(`/api/db/berth-assignments?from=${rangeFrom}&to=${rangeTo}`).then(r => r.json()),
    ])
      .then(([b, a]) => {
        if (Array.isArray(b)) setBerths(b)
        if (Array.isArray(a)) setAssignments(a)
        else setError("Failed to load assignments")
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false))
  }, [rangeFrom, rangeTo])

  useEffect(() => { fetchData() }, [fetchData])

  // Group berths by zone, sorted numerically by code
  const berthsByZone = useMemo(() => {
    const map: Record<string, Berth[]> = { C: [], W: [], B: [], WB: [] }
    berths.forEach(b => { if (b.zone && map[b.zone]) map[b.zone].push(b) })
    Object.keys(map).forEach(z => {
      map[z].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
    })
    return map
  }, [berths])

  // Build date → assignment lookup per berth: Map<"berthId::dateStr", Assignment>
  const assignmentMap = useMemo(() => {
    const map = new Map<string, Assignment>()
    assignments.forEach(a => {
      const start = new Date(a.start_date + "T00:00:00")
      const end   = new Date(a.end_date   + "T00:00:00")
      const cur   = new Date(start)
      while (cur <= end) {
        const ds = cur.toISOString().slice(0, 10)
        map.set(`${a.berth_id}::${ds}`, a)
        cur.setDate(cur.getDate() + 1)
      }
    })
    return map
  }, [assignments])

  // Precompute month day arrays
  const monthDays = useMemo(() =>
    months.map(m => ({
      year:  m.getFullYear(),
      month: m.getMonth(),
      days:  daysInMonth(m.getFullYear(), m.getMonth()),
      label: `${MONTH_NAMES[m.getMonth()]} ${m.getFullYear()}`,
    })),
  [months])

  const todayStr = new Date().toISOString().slice(0, 10)
  const totalDays = monthDays.reduce((s, m) => s + m.days, 0)

  // Stats
  const stats = useMemo(() => {
    const total       = berths.length
    const available   = berths.filter(b => b.status === "AVAILABLE").length
    const occupied    = berths.filter(b => b.status === "OCCUPIED" || b.status === "RESERVED").length
    const maintenance = berths.filter(b => b.status === "MAINTENANCE").length
    return { total, available, occupied, maintenance }
  }, [berths])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Availability Calendar"
        description="Day-by-day slot occupancy — all zones"
        actions={
          <Link href="/berths">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Grid View
            </Button>
          </Link>
        }
      />

      {/* Controls row */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Month nav */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0"
                onClick={() => setStartMonth(d => addMonths(d, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-bold text-gray-700 min-w-[220px] text-center">
                {monthDays[0].label} &nbsp;–&nbsp; {monthDays[1].label}
              </span>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0"
                onClick={() => setStartMonth(d => addMonths(d, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-xs text-blue-600 px-2"
                onClick={() => setStartMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
                Today
              </Button>
            </div>

            {/* Stats pills */}
            <div className="flex gap-2 text-[10px] font-medium ml-2">
              <span className="rounded-full bg-gray-100 text-gray-600 px-2.5 py-1">{stats.total} slots</span>
              <span className="rounded-full bg-green-100 text-green-700 px-2.5 py-1">{stats.available} available</span>
              <span className="rounded-full bg-blue-100 text-blue-700 px-2.5 py-1">{stats.occupied} in use</span>
              {stats.maintenance > 0 && (
                <span className="rounded-full bg-red-100 text-red-600 px-2.5 py-1">{stats.maintenance} maintenance</span>
              )}
            </div>

            {/* Legend */}
            <div className="ml-auto flex items-center gap-3 text-[9px] font-medium text-gray-500">
              <span className="flex items-center gap-1"><span className="h-3 w-4 rounded bg-blue-500 inline-block"/>Occupied</span>
              <span className="flex items-center gap-1"><span className="h-3 w-4 rounded bg-amber-400 inline-block"/>Reserved</span>
              <span className="flex items-center gap-1"><span className="h-3 w-4 rounded bg-red-400 inline-block"/>Maintenance</span>
              <span className="flex items-center gap-1"><span className="h-3 w-4 rounded border border-gray-200 bg-white inline-block"/>Free</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading / error */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Building calendar…
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* ── Calendar grid ── */}
      {!loading && !error && (
        <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="border-collapse text-[10px]" style={{ minWidth: `${96 + totalDays * 24}px` }}>
              <thead>
                {/* Month-span headers */}
                <tr>
                  <th className="sticky left-0 z-30 bg-white border-b-2 border-r-2 border-gray-300
                    w-24 min-w-[6rem] px-2 py-1.5 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    Zone / Slot
                  </th>
                  {monthDays.map(({ days, label }) => (
                    <th key={label} colSpan={days}
                      className="border-b-2 border-r border-gray-300 text-center text-xs font-bold text-gray-700 bg-gray-100 py-1.5">
                      {label}
                    </th>
                  ))}
                </tr>

                {/* Day-number + weekday row */}
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-30 bg-gray-50 border-b border-r-2 border-gray-300" />
                  {monthDays.map(({ year, month, days }) =>
                    Array.from({ length: days }, (_, i) => i + 1).map(day => {
                      const ds  = toDateStr(year, month, day)
                      const dow = new Date(year, month, day).getDay()
                      const isWeekend = dow === 0 || dow === 6
                      const isToday   = ds === todayStr
                      return (
                        <th key={ds}
                          className={`border-b border-r border-gray-200 w-6 min-w-[1.5rem] px-0 pb-0.5 text-center align-bottom
                            ${isToday
                              ? "bg-blue-600 text-white"
                              : isWeekend
                                ? "bg-gray-200 text-gray-400"
                                : "text-gray-400"}`}>
                          <div className="font-bold leading-none">{day}</div>
                          <div className="text-[7px] opacity-60 leading-none">
                            {DOW_SHORT[dow]}
                          </div>
                        </th>
                      )
                    })
                  )}
                </tr>
              </thead>

              <tbody>
                {ZONE_ORDER.map(zoneKey => {
                  const zBerths = berthsByZone[zoneKey]
                  if (!zBerths || zBerths.length === 0) return null
                  const meta = ZONE_META[zoneKey]
                  const Icon = meta.icon

                  return (
                    <React.Fragment key={zoneKey}>
                      {/* Zone header */}
                      <tr>
                        <td colSpan={totalDays + 1}
                          className={`sticky left-0 border-b border-t border-gray-300
                            px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-gray-600 ${meta.headerBg}`}>
                          <div className="flex items-center gap-1.5">
                            <Icon className="h-3 w-3 opacity-70" />
                            {meta.label}
                            <span className="font-normal text-gray-500">· {zBerths.length} slots</span>
                          </div>
                        </td>
                      </tr>

                      {/* Berth rows */}
                      {zBerths.map(berth => {
                        const isMaint = berth.status === "MAINTENANCE"

                        return (
                          <tr key={berth.id} className="group/row hover:brightness-95 transition-all">
                            {/* Code cell */}
                            <td className={`sticky left-0 z-20 border-b border-r-2 border-gray-300
                              px-2 py-0 ${meta.codeBg} group-hover/row:brightness-95`}>
                              <div className="flex items-center gap-1 py-1">
                                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${meta.dot}`} />
                                <span className="font-mono font-bold text-[10px] text-gray-800">
                                  {berth.code}
                                </span>
                              </div>
                              {berth.max_loa_ft && (
                                <div className="text-[8px] text-gray-400 -mt-1 pb-0.5 pl-3">
                                  {berth.max_loa_ft}ft
                                </div>
                              )}
                            </td>

                            {/* Day cells */}
                            {monthDays.map(({ year, month, days }) =>
                              Array.from({ length: days }, (_, i) => i + 1).map(day => {
                                const ds    = toDateStr(year, month, day)
                                const mapKey = `${berth.id}::${ds}`
                                const asgn  = assignmentMap.get(mapKey)
                                const dow   = new Date(year, month, day).getDay()
                                const isWeekend = dow === 0 || dow === 6
                                const isToday   = ds === todayStr

                                // Determine cell style
                                let cellBg = isWeekend ? "bg-gray-50" : "bg-white"
                                let tipText = ""

                                if (isMaint) {
                                  cellBg = "bg-red-400"
                                  tipText = "Maintenance"
                                } else if (asgn) {
                                  cellBg = ASGN_CELL[asgn.status] ?? "bg-blue-500"
                                  tipText = `${asgn.boat_name ?? "Boat"}${asgn.customer_name ? " · " + asgn.customer_name : ""}`
                                }

                                return (
                                  <Tooltip key={ds} text={tipText}>
                                    <td
                                      className={`border-b border-r border-gray-100 w-6 h-8 min-w-[1.5rem] cursor-pointer
                                        ${cellBg}
                                        ${isToday ? "ring-1 ring-inset ring-blue-600" : ""}
                                        hover:opacity-70 transition-opacity`}
                                    />
                                  </Tooltip>
                                )
                              })
                            )}
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info note */}
      {!loading && !error && (
        <div className="flex items-start gap-2 text-[10px] text-gray-400 pb-2">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>
            Hover over colored cells to see boat and customer details. Click a cell to manage assignments.
            &nbsp;·&nbsp;
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-1 align-middle" />
            Live database · {berths.length} berths · {assignments.length} assignments loaded
          </span>
        </div>
      )}
    </div>
  )
}
