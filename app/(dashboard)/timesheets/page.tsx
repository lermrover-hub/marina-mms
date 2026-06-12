"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Clock, Search, Plus } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatTHB } from "@/lib/utils"

interface Timesheet {
  id: string; work_order_id?: string; staff_name?: string; date?: string
  start_time?: string; end_time?: string; hours_worked?: number
  hourly_rate?: number; total_cost?: number; notes?: string
  approved_by?: string; approved_at?: string
}

export default function TimesheetsPage() {
  const [sheets,  setSheets]  = useState<Timesheet[]>([])
  const [search,  setSearch]  = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/db/timesheets")
      .then(r => r.ok ? r.json() : [])
      .then(d => { setSheets(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setSheets([]); setLoading(false) })
  }, [])

  const visible = sheets.filter(s => {
    const q = search.toLowerCase()
    return !q || (s.staff_name ?? "").toLowerCase().includes(q) || (s.work_order_id ?? "").toLowerCase().includes(q)
  })

  const totalHours = visible.reduce((t, s) => t + (Number(s.hours_worked) || 0), 0)
  const totalCost  = visible.reduce((t, s) => t + (Number(s.total_cost)   || 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Technician Timesheets"
        description="Labor hours and cost tracking by work order"
        actions={
          <Button size="sm" variant="outline" className="gap-2" asChild>
            <Link href="/work-orders"><Clock className="h-4 w-4" />Work Orders</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Entries Shown</p>
          <p className="text-2xl font-bold mt-1">{visible.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total Hours</p>
          <p className="text-2xl font-bold mt-1">{totalHours.toFixed(1)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total Labor Cost</p>
          <p className="text-2xl font-bold mt-1">{formatTHB(totalCost)}</p>
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search by staff name or work order…"
            className="pl-9 pr-4 py-1.5 border rounded-md text-sm w-full"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </CardContent></Card>

      <Card>
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No timesheet entries</p>
            <p className="text-xs text-gray-400 mt-1">Entries are added from Work Order detail pages</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Staff</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Work Order</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Hours</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Rate</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Cost</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Approved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-600">
                      {s.date ? new Date(s.date).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td className="px-5 py-3 font-medium">{s.staff_name ?? "—"}</td>
                    <td className="px-5 py-3">
                      {s.work_order_id ? (
                        <Link href={`/work-orders/${s.work_order_id}`} className="font-mono text-xs text-teal-700 hover:underline">
                          {s.work_order_id.slice(0, 8)}…
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {s.start_time && s.end_time ? `${s.start_time} – ${s.end_time}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono">{s.hours_worked ?? "—"}</td>
                    <td className="px-5 py-3 text-right font-mono">{s.hourly_rate ? formatTHB(s.hourly_rate) : "—"}</td>
                    <td className="px-5 py-3 text-right font-mono font-medium text-orange-700">
                      {s.total_cost ? formatTHB(s.total_cost) : "—"}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {s.approved_by ? (
                        <span className="text-green-600">{s.approved_by}</span>
                      ) : (
                        <span className="text-gray-400">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
