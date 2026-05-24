"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { TrendingUp, DollarSign, Wrench, Loader2, ArrowLeft } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTHB } from "@/lib/utils"

type Job = {
  id: string; reference: string; title: string; category: string
  customer_name: string; boat_name: string; revenue: number
  cost: number; profit: number; margin: number; status: string
}
type CatStat = { category: string; revenue: number; cost: number; profit: number; margin: number; count: number }
type Summary = { totalRevenue: number; totalCost: number; totalProfit: number; avgMargin: number; jobCount: number }

function marginColor(m: number) {
  if (m >= 40) return "text-green-600"
  if (m >= 20) return "text-teal-600"
  if (m >= 0)  return "text-amber-600"
  return "text-red-600"
}
function barColor(m: number) {
  if (m >= 40) return "#16a34a"
  if (m >= 20) return "#14b8a6"
  if (m >= 0)  return "#f59e0b"
  return "#ef4444"
}

export default function JobMarginPage() {
  const [jobs,       setJobs]       = useState<Job[]>([])
  const [byCategory, setByCategory] = useState<CatStat[]>([])
  const [summary,    setSummary]    = useState<Summary | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [sortBy,     setSortBy]     = useState<"margin"|"profit"|"revenue">("profit")

  useEffect(() => {
    fetch("/api/db/reports/job-margin")
      .then(r => r.json())
      .then(d => { setJobs(d.jobs ?? []); setByCategory(d.byCategory ?? []); setSummary(d.summary ?? null) })
      .finally(() => setLoading(false))
  }, [])

  const sorted = [...jobs].sort((a, b) => b[sortBy] - a[sortBy])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Margin Analytics"
        description="Profitability analysis for completed work orders"
        breadcrumb={[{ label: "Reports", href: "/reports" }, { label: "Job Margin" }]}
        actions={
          <Link href="/reports" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600">
            <ArrowLeft className="h-4 w-4" /> Back to Reports
          </Link>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          {summary && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { label: "Total Revenue", value: formatTHB(summary.totalRevenue), icon: DollarSign, color: "text-teal-600 bg-teal-50" },
                { label: "Total Cost",    value: formatTHB(summary.totalCost),    icon: Wrench,     color: "text-orange-600 bg-orange-50" },
                { label: "Gross Profit",  value: formatTHB(summary.totalProfit),  icon: TrendingUp, color: "text-green-600 bg-green-50" },
                { label: "Avg Margin",    value: `${summary.avgMargin}%`,         icon: TrendingUp, color: summary.avgMargin >= 30 ? "text-green-600 bg-green-50" : "text-amber-600 bg-amber-50" },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label}><CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${color}`}><Icon className="h-4 w-4" /></div>
                    <div><p className="text-xs text-gray-500">{label}</p><p className="text-lg font-bold text-gray-900">{value}</p></div>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}

          {/* By Category chart */}
          {byCategory.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Margin by Category</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byCategory} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip formatter={(v) => [`${v ?? 0}%`, "Margin"]} />
                      <Bar dataKey="margin" radius={[0, 4, 4, 0]}>
                        {byCategory.map((entry, i) => (
                          <Cell key={i} fill={barColor(entry.margin)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Category table */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-gray-50">
                      {["Category","Jobs","Revenue","Cost","Profit","Margin"].map(h => (
                        <th key={h} className={`px-3 py-2 text-xs font-semibold text-gray-500 uppercase ${["Revenue","Cost","Profit"].includes(h) ? "text-right" : h === "Margin" ? "text-center" : "text-left"}`}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y">
                      {byCategory.map(c => (
                        <tr key={c.category} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-800">{c.category}</td>
                          <td className="px-3 py-2 text-gray-500 text-center">{c.count}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatTHB(c.revenue)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-orange-600">{formatTHB(c.cost)}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatTHB(c.profit)}</td>
                          <td className={`px-3 py-2 text-center font-bold ${marginColor(c.margin)}`}>{c.margin}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Individual jobs table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base">Job Detail ({jobs.length} jobs)</CardTitle>
                <div className="flex gap-1.5">
                  {(["profit","margin","revenue"] as const).map(s => (
                    <button key={s} onClick={() => setSortBy(s)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${sortBy === s ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {sorted.length === 0 ? (
                <p className="text-center text-gray-400 py-12 text-sm">No completed jobs with cost data yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-gray-50">
                      {["Ref","Customer","Boat","Category","Revenue","Cost","Profit","Margin"].map(h => (
                        <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase ${["Revenue","Cost","Profit","Margin"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y">
                      {sorted.map(j => (
                        <tr key={j.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3"><Link href={`/work-orders/${j.id}`} className="text-teal-700 hover:underline font-medium text-xs">{j.reference}</Link></td>
                          <td className="px-4 py-3 text-gray-700 text-xs">{j.customer_name ?? "—"}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{j.boat_name ?? "—"}</td>
                          <td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{j.category ?? "—"}</span></td>
                          <td className="px-4 py-3 text-right tabular-nums text-xs">{formatTHB(j.revenue)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-xs text-orange-600">{formatTHB(j.cost)}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold text-xs">{formatTHB(j.profit)}</td>
                          <td className={`px-4 py-3 text-right font-bold text-sm ${marginColor(j.margin)}`}>{j.margin}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
