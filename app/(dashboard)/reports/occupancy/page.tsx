"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw, Anchor } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface BerthGroup { type: string; total: number; occupied: number; available: number; pct: number }
interface OccupancyData { berths: BerthGroup[] }

const TYPE_LABELS: Record<string, string> = {
  WB: "Wet Berth", DS: "Dry Storage", W: "Workshop", RY: "Repair Yard",
  RAMP: "Ramp Area", TEMP: "Temporary", FUEL: "Fuel Area",
}

function PctBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-orange-500" : "bg-teal-500"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-gray-600 w-8 text-right">{pct}%</span>
    </div>
  )
}

export default function OccupancyReportPage() {
  const [data,    setData]    = useState<OccupancyData | null>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetch("/api/db/reports/occupancy")
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const berths = data?.berths ?? []
  const totalBerths   = berths.reduce((s, b) => s + b.total, 0)
  const totalOccupied = berths.reduce((s, b) => s + b.occupied, 0)
  const overallPct    = totalBerths > 0 ? Math.round((totalOccupied / totalBerths) * 100) : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Occupancy Report"
        description="Current berth and storage utilization"
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild><Link href="/reports"><ArrowLeft className="h-4 w-4 mr-1" />Reports</Link></Button>
            <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        }
      />

      {loading ? <div className="p-12 text-center text-sm text-gray-400">Loading…</div> : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total Slots</p>
              <p className="text-2xl font-bold mt-1">{totalBerths}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Occupied</p>
              <p className="text-2xl font-bold mt-1 text-teal-700">{totalOccupied}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Overall Occupancy</p>
              <p className="text-2xl font-bold mt-1">{overallPct}%</p>
            </CardContent></Card>
          </div>

          {berths.length === 0 ? (
            <Card><div className="p-12 text-center">
              <Anchor className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No berth data available</p>
              <p className="text-xs text-gray-400 mt-1">Add berths in Marina Operations first</p>
            </div></Card>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-sm">Occupancy by Berth Type</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {berths.map(b => (
                    <div key={b.type}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">{TYPE_LABELS[b.type] ?? b.type}</span>
                        <span className="text-xs text-gray-500">{b.occupied} / {b.total} slots</span>
                      </div>
                      <PctBar pct={b.pct} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card><div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Occupied</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Available</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Occupancy %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {berths.map(b => (
                  <tr key={b.type} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium">{TYPE_LABELS[b.type] ?? b.type}</td>
                    <td className="px-5 py-3 text-center">{b.total}</td>
                    <td className="px-5 py-3 text-center text-teal-700 font-medium">{b.occupied}</td>
                    <td className="px-5 py-3 text-center text-gray-500">{b.available}</td>
                    <td className="px-5 py-3 text-right font-mono">
                      <span className={b.pct >= 90 ? "text-red-600 font-bold" : b.pct >= 70 ? "text-orange-600" : "text-teal-600"}>
                        {b.pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></Card>
        </>
      )}
    </div>
  )
}
