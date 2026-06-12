"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Waves, ChevronLeft, Calculator, AlertTriangle,
  CheckCircle2, XCircle, Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/PageHeader"

interface TideResultSlot {
  hour: number
  time: string
  height: number
  safe: boolean
}

interface SafeWindow {
  start: number
  end: number
  startTime: string
  endTime: string
}

interface CalcResult {
  requiredActualDepth: number
  requiredTideHeight: number
  slots: TideResultSlot[]
  earliestSafeHour: number | null
  safeWindows: SafeWindow[]
}

const todayISO = new Date().toISOString().slice(0, 10)

export default function TideCalculatorPage() {
  const [date,            setDate]            = useState(todayISO)
  const [boatDraft,       setBoatDraft]       = useState("0.8")
  const [trailerHeight,   setTrailerHeight]   = useState("0.3")
  const [safetyClearance, setSafetyClearance] = useState("0.5")
  const [rampDepthOffset, setRampDepthOffset] = useState("-1.0")

  const [tideLoading, setTideLoading] = useState(false)
  const [tideError,   setTideError]   = useState<string | null>(null)
  const [tideData,    setTideData]    = useState<{ hour: number; height: number }[]>([])

  const [calcLoading, setCalcLoading] = useState(false)
  const [calcError,   setCalcError]   = useState<string | null>(null)
  const [result,      setResult]      = useState<CalcResult | null>(null)

  const loadTide = useCallback(async (d: string) => {
    if (!d) return
    setTideLoading(true)
    setTideError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/tide/calculate?date=${d}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "No tide data")
      setTideData(data.records.map((r: { hour: number; tide_m: string | number }) => ({
        hour: r.hour,
        height: Number(r.tide_m),
      })))
    } catch (e) {
      setTideError(String(e))
      setTideData([])
    } finally {
      setTideLoading(false)
    }
  }, [])

  useEffect(() => { void loadTide(date) }, [date, loadTide])

  async function calculate() {
    if (tideData.length === 0) return
    setCalcError(null)
    setResult(null)
    setCalcLoading(true)
    try {
      const res = await fetch("/api/tide/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boatDraft:       parseFloat(boatDraft) || 0,
          trailerHeight:   parseFloat(trailerHeight) || 0,
          safetyClearance: parseFloat(safetyClearance) || 0,
          rampDepthOffset: parseFloat(rampDepthOffset) ?? -1.0,
          tideData,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Calculation failed")
      setResult(data as CalcResult)
    } catch (e) {
      setCalcError(String(e))
    } finally {
      setCalcLoading(false)
    }
  }

  const safeCount = result?.slots.filter((s) => s.safe).length ?? 0
  const tideRange = tideData.length > 0
    ? `${Math.min(...tideData.map(t => t.height)).toFixed(2)}–${Math.max(...tideData.map(t => t.height)).toFixed(2)} m`
    : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tide Safety Calculator"
        description="Calculate safe launch and retrieval windows from Ko Samui 2026 tide database"
        actions={
          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <Link href="/ramp-bookings">
              <ChevronLeft className="h-4 w-4" /> Back to Ramp Bookings
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: inputs ── */}
        <div className="lg:col-span-1 space-y-4">

          <Card className="border-teal-200 bg-teal-50/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-teal-700 flex items-center gap-2">
                <Waves className="h-4 w-4" /> Date
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="date"
                value={date}
                min="2026-01-01"
                max="2026-12-31"
                onChange={(e) => setDate(e.target.value)}
              />
              {tideLoading && (
                <div className="flex items-center gap-2 text-sm text-teal-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading tide data…
                </div>
              )}
              {tideError && <p className="text-xs text-red-600">{tideError}</p>}
              {tideRange && !tideLoading && (
                <p className="text-xs text-teal-600">
                  Tide range: <span className="font-semibold">{tideRange}</span> · {tideData.length} hourly records
                </p>
              )}
              <p className="text-xs text-gray-400">Ko Samui tide data loaded from database. 2026 only.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Waves className="h-4 w-4 text-teal-600" /> Boat &amp; Ramp Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Boat Draft (m)",             value: boatDraft,       set: setBoatDraft       },
                { label: "Trailer / Support Ht. (m)",  value: trailerHeight,   set: setTrailerHeight   },
                { label: "Safety Clearance (m)",       value: safetyClearance, set: setSafetyClearance },
                { label: "Ramp Depth Offset (m)",      value: rampDepthOffset, set: setRampDepthOffset, hint: "Default: −1.00 m" },
              ].map(({ label, value, set, hint }) => (
                <div key={label}>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
                  <Input type="number" step="0.01" value={value} onChange={(e) => set(e.target.value)} className="text-sm" />
                  {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="pt-4 pb-3 space-y-1.5">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Formula</p>
              <p className="text-xs text-slate-500 font-mono leading-relaxed">Min. Depth = Draft + Trailer + Clearance</p>
              <p className="text-xs text-slate-500 font-mono leading-relaxed">Min. Tide = Min. Depth − Ramp Offset</p>
              <p className="text-xs text-teal-600 mt-2 font-medium">SAFE when: Tide ≥ Min. Tide Height</p>
            </CardContent>
          </Card>

          <Button
            onClick={() => void calculate()}
            disabled={calcLoading || tideLoading || tideData.length === 0}
            className="w-full gap-2 bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Calculator className="h-4 w-4" />
            {calcLoading ? "Calculating…" : "Calculate Safe Windows"}
          </Button>
        </div>

        {/* ── Right: tide chart + results ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* 24-hour tide bar chart */}
          {tideData.length > 0 && !tideLoading && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700">
                  Hourly Tide Heights — {date}
                  {result && <span className="ml-2 text-xs font-normal text-gray-400">· colour = safe/unsafe for entered parameters</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-0.5 h-24">
                  {tideData.map((slot) => {
                    const maxH = Math.max(...tideData.map(t => t.height))
                    const pct  = Math.round((slot.height / maxH) * 100)
                    const slotResult = result?.slots[slot.hour]
                    const color = slotResult
                      ? slotResult.safe ? "bg-green-400" : "bg-red-300"
                      : "bg-teal-400"
                    return (
                      <div key={slot.hour} className="flex-1 flex flex-col items-center gap-0.5" title={`${String(slot.hour).padStart(2,"0")}:00 → ${slot.height}m`}>
                        <div className={`w-full rounded-t ${color}`} style={{ height: `${pct}%` }} />
                        {slot.hour % 6 === 0 && (
                          <span className="text-[9px] text-gray-400 font-mono">{String(slot.hour).padStart(2,"0")}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {tideLoading && (
            <Card className="border-dashed">
              <CardContent className="flex items-center justify-center py-16 gap-3 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading tide data from database…</span>
              </CardContent>
            </Card>
          )}

          {calcError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{calcError}</div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-teal-200 bg-teal-50">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs font-medium text-teal-600 uppercase tracking-wide">Required Actual Depth</p>
                    <p className="text-3xl font-bold text-teal-800 mt-1">{result.requiredActualDepth.toFixed(2)}<span className="text-lg font-normal ml-1">m</span></p>
                  </CardContent>
                </Card>
                <Card className="border-indigo-200 bg-indigo-50">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Required Tide Height</p>
                    <p className="text-3xl font-bold text-indigo-800 mt-1">{result.requiredTideHeight.toFixed(2)}<span className="text-lg font-normal ml-1">m</span></p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.earliestSafeHour !== null ? (
                  <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-green-700">Earliest Safe Window</p>
                      <p className="text-xl font-bold text-green-800">{String(result.earliestSafeHour).padStart(2,"0")}:00</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-red-700">No Safe Window Today</p>
                      <p className="text-xs text-red-600">Tide too low for this draft</p>
                    </div>
                  </div>
                )}
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">Safe Hours</p>
                  <p className="text-xl font-bold text-gray-800">{safeCount}<span className="text-sm font-normal text-gray-500 ml-1">/ 24</span></p>
                  {result.safeWindows.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {result.safeWindows.map((w, i) => (
                        <span key={i} className="text-xs rounded-full bg-green-100 text-green-700 px-2 py-0.5">
                          {w.startTime}–{w.endTime}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">Hourly Analysis — {date}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
                          <th className="px-4 py-2.5 text-left">Time</th>
                          <th className="px-4 py-2.5 text-right">Predicted (m)</th>
                          <th className="px-4 py-2.5 text-right">Required ≥ (m)</th>
                          <th className="px-4 py-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {result.slots.map((slot) => (
                          <tr key={slot.hour} className={slot.safe ? "bg-green-50 hover:bg-green-100" : "bg-red-50 hover:bg-red-100"}>
                            <td className="px-4 py-2 font-medium text-gray-800">{slot.time}</td>
                            <td className="px-4 py-2 text-right font-mono font-semibold">{slot.height.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right font-mono text-gray-500 text-xs">{result.requiredTideHeight.toFixed(2)}</td>
                            <td className="px-4 py-2 text-center">
                              {slot.safe ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-semibold">
                                  <CheckCircle2 className="h-3 w-3" /> SAFE
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-600 px-2 py-0.5 text-xs font-semibold">
                                  <XCircle className="h-3 w-3" /> NOT SAFE
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 mb-0.5">Operational Warning</p>
                  <p className="text-sm text-amber-700">
                    Actual sea level may differ from tide prediction due to weather, wind direction, barometric pressure,
                    and sea conditions. Always verify on the day of operation with on-site staff before proceeding.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!result && !calcError && !tideLoading && tideData.length > 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-14 text-gray-400">
                <Calculator className="h-10 w-10 mb-3 text-gray-300" />
                <p className="text-sm font-medium">Tide data loaded — enter boat parameters and calculate</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
