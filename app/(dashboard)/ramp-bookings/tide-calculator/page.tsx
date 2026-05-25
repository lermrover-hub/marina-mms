"use client"
import React, { useState } from "react"
import Link from "next/link"
import { Waves, ChevronLeft, RotateCcw, Calculator, AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/PageHeader"

// Ko Samui sample tide heights (24 hours)
const KO_SAMUI_SAMPLE = [
  1.2, 0.9, 0.7, 0.6, 0.8, 1.1,
  1.5, 1.9, 2.2, 2.4, 2.3, 2.0,
  1.7, 1.4, 1.2, 1.0, 0.9, 1.0,
  1.3, 1.6, 1.8, 1.9, 1.7, 1.4,
]

interface TideSlot {
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
  slots: TideSlot[]
  earliestSafeHour: number | null
  safeWindows: SafeWindow[]
}

function defaultTideHeights(): number[] {
  return Array.from({ length: 24 }, () => 0)
}

export default function TideCalculatorPage() {
  const [boatDraft, setBoatDraft] = useState("0.8")
  const [trailerHeight, setTrailerHeight] = useState("0.3")
  const [safetyClearance, setSafetyClearance] = useState("0.5")
  const [rampDepthOffset, setRampDepthOffset] = useState("-1.0")
  const [tideHeights, setTideHeights] = useState<number[]>(defaultTideHeights)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CalcResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function loadSampleData() {
    setTideHeights([...KO_SAMUI_SAMPLE])
    setResult(null)
    setError(null)
  }

  function resetAll() {
    setBoatDraft("0.8")
    setTrailerHeight("0.3")
    setSafetyClearance("0.5")
    setRampDepthOffset("-1.0")
    setTideHeights(defaultTideHeights())
    setResult(null)
    setError(null)
  }

  function updateHeight(hour: number, value: string) {
    const n = parseFloat(value)
    setTideHeights((prev) => {
      const next = [...prev]
      next[hour] = isNaN(n) ? 0 : n
      return next
    })
  }

  async function calculate() {
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const tideData = tideHeights.map((height, hour) => ({ hour, height }))
      const res = await fetch("/api/tide/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boatDraft: parseFloat(boatDraft) || 0,
          trailerHeight: parseFloat(trailerHeight) || 0,
          safetyClearance: parseFloat(safetyClearance) || 0,
          rampDepthOffset: parseFloat(rampDepthOffset) ?? -1.0,
          tideData,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? "Calculation failed.")
      } else {
        setResult(data as CalcResult)
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const safeCount = result ? result.slots.filter((s) => s.safe).length : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tide Safety Calculator"
        description="Calculate safe launch and retrieval windows based on tide prediction data"
        actions={
          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <Link href="/ramp-bookings">
              <ChevronLeft className="h-4 w-4" /> Back to Ramp Bookings
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Inputs */}
        <div className="lg:col-span-1 space-y-4">
          {/* Boat & Ramp Parameters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Waves className="h-4 w-4 text-teal-600" /> Boat &amp; Ramp Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Boat Draft (m)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={boatDraft}
                  onChange={(e) => setBoatDraft(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Trailer / Support Height (m)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={trailerHeight}
                  onChange={(e) => setTrailerHeight(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Safety Clearance (m)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={safetyClearance}
                  onChange={(e) => setSafetyClearance(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Ramp Depth Offset (m)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={rampDepthOffset}
                  onChange={(e) => setRampDepthOffset(e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Default: −1.00 m</p>
              </div>
            </CardContent>
          </Card>

          {/* Formula reference */}
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="pt-4 pb-3 space-y-1.5">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Formula</p>
              <p className="text-xs text-slate-500 font-mono leading-relaxed">
                Min. Actual Depth =<br />
                &nbsp;&nbsp;Draft + Trailer + Clearance
              </p>
              <p className="text-xs text-slate-500 font-mono leading-relaxed">
                Min. Tide Height =<br />
                &nbsp;&nbsp;Min. Actual Depth − Offset
              </p>
              <p className="text-xs text-teal-600 mt-2 font-medium">
                SAFE when: Tide ≥ Min. Tide Height
              </p>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={calculate}
              disabled={loading}
              variant="teal"
              className="w-full gap-2"
            >
              <Calculator className="h-4 w-4" />
              {loading ? "Calculating…" : "Calculate Safe Windows"}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={loadSampleData} className="gap-1.5">
                <Waves className="h-3.5 w-3.5" /> Load Sample
              </Button>
              <Button variant="ghost" size="sm" onClick={resetAll} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Tide data + Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tide Data Entry */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700">
                  24-Hour Tide Data (meters)
                </CardTitle>
                <button
                  onClick={loadSampleData}
                  className="text-xs text-teal-600 hover:text-teal-800 underline"
                >
                  Load Ko Samui Sample
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {tideHeights.map((h, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-400 font-mono">{String(i).padStart(2, "0")}:00</span>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={h === 0 && !String(h).includes(".") ? "" : h}
                      placeholder="0.0"
                      onChange={(e) => updateHeight(i, e.target.value)}
                      className={`text-center text-sm px-1 h-8 ${
                        result
                          ? result.slots[i]?.safe
                            ? "border-green-400 bg-green-50"
                            : "border-red-300 bg-red-50"
                          : ""
                      }`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-teal-200 bg-teal-50">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs font-medium text-teal-600 uppercase tracking-wide">Required Actual Depth</p>
                    <p className="text-3xl font-bold text-teal-800 mt-1">
                      {result.requiredActualDepth.toFixed(2)}<span className="text-lg font-normal ml-1">m</span>
                    </p>
                    <p className="text-xs text-teal-600 mt-1">Draft + Trailer + Clearance</p>
                  </CardContent>
                </Card>
                <Card className="border-indigo-200 bg-indigo-50">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Required Tide Height</p>
                    <p className="text-3xl font-bold text-indigo-800 mt-1">
                      {result.requiredTideHeight.toFixed(2)}<span className="text-lg font-normal ml-1">m</span>
                    </p>
                    <p className="text-xs text-indigo-600 mt-1">Depth − Ramp Offset</p>
                  </CardContent>
                </Card>
              </div>

              {/* Earliest safe + windows */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.earliestSafeHour !== null ? (
                  <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-green-700">Earliest Safe Window</p>
                      <p className="text-xl font-bold text-green-800">
                        {String(result.earliestSafeHour).padStart(2, "0")}:00
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-red-700">No Safe Window Found</p>
                      <p className="text-xs text-red-600">Tide heights too low for this draft</p>
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">Safe Hours</p>
                  <p className="text-xl font-bold text-gray-800">
                    {safeCount}<span className="text-sm font-normal text-gray-500 ml-1">/ 24 hours</span>
                  </p>
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

              {/* Hour-by-hour table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">Hourly Tide Safety Analysis</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
                          <th className="px-4 py-2.5 text-left">Hour</th>
                          <th className="px-4 py-2.5 text-left">Time</th>
                          <th className="px-4 py-2.5 text-right">Predicted Height (m)</th>
                          <th className="px-4 py-2.5 text-right">Required (m)</th>
                          <th className="px-4 py-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {result.slots.map((slot) => (
                          <tr
                            key={slot.hour}
                            className={slot.safe ? "bg-green-50 hover:bg-green-100" : "bg-red-50 hover:bg-red-100"}
                          >
                            <td className="px-4 py-2 font-mono text-xs text-gray-500">{slot.hour}</td>
                            <td className="px-4 py-2 font-medium text-gray-800">{slot.time}</td>
                            <td className="px-4 py-2 text-right font-mono font-semibold">
                              {slot.height.toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-gray-500 text-xs">
                              ≥ {result.requiredTideHeight.toFixed(2)}
                            </td>
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

              {/* Operational warning */}
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

          {/* Initial prompt when no results yet */}
          {!result && !error && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-14 text-gray-400">
                <Waves className="h-10 w-10 mb-3 text-gray-300" />
                <p className="text-sm font-medium">Enter parameters and tide data</p>
                <p className="text-xs mt-1">Click &quot;Load Ko Samui Sample&quot; to get started quickly</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
