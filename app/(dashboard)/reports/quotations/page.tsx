"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw, FileText } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatTHB } from "@/lib/utils"

const STATUS_STYLE: Record<string, string> = {
  DRAFT:    "bg-gray-100 text-gray-500",
  SENT:     "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED:  "bg-orange-100 text-orange-700",
  CONVERTED:"bg-teal-100 text-teal-700",
  CANCELLED:"bg-gray-100 text-gray-400",
}

interface QuotationStat {
  id: string; quote_number: string; customer_name?: string; boat_name?: string
  status: string; total_amount?: number; created_at: string; valid_until?: string
}

export default function QuotationConversionPage() {
  const [quotes,  setQuotes]  = useState<QuotationStat[]>([])
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetch("/api/db/quotations?limit=200")
      .then(r => r.ok ? r.json() : [])
      .then(d => { setQuotes(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setQuotes([]); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const total     = quotes.length
  const sent      = quotes.filter(q => q.status !== "DRAFT" && q.status !== "CANCELLED").length
  const accepted  = quotes.filter(q => q.status === "ACCEPTED" || q.status === "CONVERTED").length
  const rejected  = quotes.filter(q => q.status === "REJECTED").length
  const convRate  = sent > 0 ? Math.round((accepted / sent) * 100) : 0
  const totalValue = quotes.filter(q => q.status === "ACCEPTED" || q.status === "CONVERTED")
    .reduce((s, q) => s + (Number(q.total_amount) || 0), 0)

  const byStatus = Object.entries(
    quotes.reduce((acc, q) => { acc[q.status] = (acc[q.status] || 0) + 1; return acc }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotation Conversion Report"
        description="Quote-to-invoice conversion rates and pipeline"
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild><Link href="/reports"><ArrowLeft className="h-4 w-4 mr-1" />Reports</Link></Button>
            <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        }
      />

      {loading ? <div className="p-12 text-center text-sm text-gray-400">Loading…</div> : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card><CardContent className="p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total Quotes</p>
              <p className="text-2xl font-bold mt-1">{total}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Accepted</p>
              <p className="text-2xl font-bold mt-1 text-green-700">{accepted}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Conversion Rate</p>
              <p className="text-2xl font-bold mt-1">{convRate}%</p>
              <p className="text-xs text-gray-400 mt-0.5">of sent quotes</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Accepted Value</p>
              <p className="text-2xl font-bold mt-1 text-teal-700">{formatTHB(totalValue)}</p>
            </CardContent></Card>
          </div>

          {/* Status breakdown */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Pipeline by Status</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {byStatus.map(([status, count]) => (
                  <div key={status} className="flex items-center gap-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium w-24 justify-center ${STATUS_STYLE[status] ?? "bg-gray-100 text-gray-600"}`}>
                      {status}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${total > 0 ? (count/total)*100 : 0}%` }} />
                    </div>
                    <span className="text-sm font-mono text-gray-600 w-8 text-right">{count}</span>
                    <span className="text-xs text-gray-400 w-10 text-right">{total > 0 ? Math.round((count/total)*100) : 0}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Full table */}
          <Card><div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Quote #</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Boat</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Created</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {quotes.map(q => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link href={`/quotations/${q.id}`} className="font-mono text-xs text-teal-700 hover:underline">{q.quote_number}</Link>
                    </td>
                    <td className="px-5 py-3 font-medium">{q.customer_name ?? "—"}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{q.boat_name ?? "—"}</td>
                    <td className="px-5 py-3 text-right font-mono">{q.total_amount ? formatTHB(q.total_amount) : "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[q.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {new Date(q.created_at).toLocaleDateString("en-GB")}
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
