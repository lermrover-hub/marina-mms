"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw, TrendingUp } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatTHB } from "@/lib/utils"

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

interface MonthRow { month: number; total: number; paid: number; count: number }
interface RevenueData { year: number; monthly: MonthRow[]; ytdTotal: number; ytdPaid: number; collectionRate: number }

export default function RevenueReportPage() {
  const [data,    setData]    = useState<RevenueData | null>(null)
  const [year,    setYear]    = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

  function load(y: number) {
    setLoading(true)
    fetch(`/api/db/reports/revenue?year=${y}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load(year) }, [year])

  const maxTotal = data ? Math.max(...data.monthly.map(m => m.total), 1) : 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Report"
        description="Monthly invoiced and collected revenue"
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild><Link href="/reports"><ArrowLeft className="h-4 w-4 mr-1" />Reports</Link></Button>
            <select className="border rounded-md px-3 py-1.5 text-sm" value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={() => load(year)}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        }
      />

      {loading ? <div className="p-12 text-center text-sm text-gray-400">Loading…</div> : data && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">YTD Invoiced</p>
              <p className="text-2xl font-bold mt-1">{formatTHB(data.ytdTotal)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">YTD Collected</p>
              <p className="text-2xl font-bold mt-1 text-teal-700">{formatTHB(data.ytdPaid)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Collection Rate</p>
              <p className="text-2xl font-bold mt-1">{data.collectionRate}%</p>
            </CardContent></Card>
          </div>

          {/* Bar chart */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Monthly Revenue — {year}</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-48">
                {data.monthly.map(m => {
                  const barH = maxTotal > 0 ? Math.round((m.total / maxTotal) * 100) : 0
                  const paidH = m.total > 0 ? Math.round((m.paid / m.total) * barH) : 0
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col justify-end" style={{ height: "160px" }}>
                        <div className="w-full relative rounded-t-sm overflow-hidden" style={{ height: `${Math.max(barH, 2)}%`, minHeight: "2px" }}>
                          <div className="absolute bottom-0 left-0 right-0 bg-teal-200 rounded-t-sm" style={{ height: "100%" }} />
                          <div className="absolute bottom-0 left-0 right-0 bg-teal-500 rounded-t-sm" style={{ height: `${paidH}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{MONTHS[m.month - 1]}</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 bg-teal-500 rounded-sm" />Collected</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 bg-teal-200 rounded-sm" />Invoiced</span>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card><div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Month</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Invoices</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Invoiced</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Collected</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.monthly.map(m => (
                  <tr key={m.month} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium">{MONTHS[m.month - 1]}</td>
                    <td className="px-5 py-3 text-center text-gray-500">{m.count}</td>
                    <td className="px-5 py-3 text-right font-mono">{m.total ? formatTHB(m.total) : "—"}</td>
                    <td className="px-5 py-3 text-right font-mono text-teal-700">{m.paid ? formatTHB(m.paid) : "—"}</td>
                    <td className="px-5 py-3 text-right text-gray-600">
                      {m.total > 0 ? `${Math.round((m.paid / m.total) * 100)}%` : "—"}
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
