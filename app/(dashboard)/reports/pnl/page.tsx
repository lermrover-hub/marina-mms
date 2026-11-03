"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatTHB } from "@/lib/utils"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
type Row = { month: number; revenue: number; collected: number; directCost: number; grossProfit: number; margin: number; invoiceCount: number; workOrderCount: number }
type Pnl = { year: number; basis: { limitation: string }; monthly: Row[]; summary: Omit<Row, "month"> & { margin: number } }

export default function PnlReportPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<Pnl | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load(selectedYear: number) {
    setLoading(true)
    setError(null)
    fetch(`/api/db/reports/pnl?year=${selectedYear}`)
      .then(async response => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error ?? "Unable to load P&L")
        return body as Pnl
      })
      .then(setData)
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(year) }, [year])
  const maxRevenue = Math.max(...(data?.monthly ?? []).map(row => row.revenue), 1)

  return <div className="space-y-6">
    <PageHeader title="Monthly P&L Preview" description="Management view from posted invoices and completed work orders" actions={<div className="flex gap-2"><Button variant="ghost" size="sm" asChild><Link href="/reports"><ArrowLeft className="mr-1 h-4 w-4" />Reports</Link></Button><select className="rounded-md border px-3 py-1.5 text-sm" value={year} onChange={event => setYear(Number(event.target.value))}>{[2024, 2025, 2026, 2027].map(item => <option key={item} value={item}>{item}</option>)}</select><Button size="sm" variant="outline" onClick={() => load(year)}><RefreshCw className="h-4 w-4" /></Button></div>} />
    {loading && <div className="p-12 text-center text-sm text-gray-400">Loading…</div>}
    {error && <Card><CardContent className="p-6 text-sm text-red-700">{error}</CardContent></Card>}
    {data && !loading && <>
      <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4 text-sm text-amber-900">{data.basis.limitation}</CardContent></Card>
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-gray-400">Net Revenue</p><p className="mt-1 text-2xl font-bold">{formatTHB(data.summary.revenue)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-gray-400">Direct Cost</p><p className="mt-1 text-2xl font-bold text-red-700">{formatTHB(data.summary.directCost)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-gray-400">Gross Profit</p><p className="mt-1 text-2xl font-bold text-teal-700">{formatTHB(data.summary.grossProfit)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-gray-400">Gross Margin</p><p className="mt-1 text-2xl font-bold">{data.summary.margin}%</p></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="text-sm">Monthly P&L — {data.year}</CardTitle></CardHeader><CardContent><div className="flex h-52 items-end gap-2">{data.monthly.map(row => <div key={row.month} className="flex flex-1 flex-col items-center gap-1"><div className="flex h-44 w-full items-end"><div className="relative w-full rounded-t-sm bg-blue-100" style={{ height: `${Math.max((row.revenue / maxRevenue) * 100, row.revenue ? 2 : 0)}%` }}><div className="absolute inset-x-0 bottom-0 rounded-t-sm bg-teal-500" style={{ height: `${row.revenue ? Math.min(100, Math.max(0, (row.grossProfit / row.revenue) * 100)) : 0}%` }} /></div></div><span className="text-xs text-gray-500">{MONTHS[row.month - 1]}</span></div>)}</div><div className="mt-3 flex gap-4 text-xs text-gray-500"><span><i className="mr-1 inline-block h-2 w-3 rounded-sm bg-blue-100" />Revenue</span><span><i className="mr-1 inline-block h-2 w-3 rounded-sm bg-teal-500" />Gross profit</span></div></CardContent></Card>
      <Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-gray-50"><th className="px-4 py-3 text-left">Month</th><th className="px-4 py-3 text-right">Revenue</th><th className="px-4 py-3 text-right">Direct cost</th><th className="px-4 py-3 text-right">Gross profit</th><th className="px-4 py-3 text-right">Margin</th><th className="px-4 py-3 text-center">Invoices / WOs</th></tr></thead><tbody className="divide-y">{data.monthly.map(row => <tr key={row.month}><td className="px-4 py-3 font-medium">{MONTHS[row.month - 1]}</td><td className="px-4 py-3 text-right font-mono">{row.revenue ? formatTHB(row.revenue) : "—"}</td><td className="px-4 py-3 text-right font-mono text-red-700">{row.directCost ? formatTHB(row.directCost) : "—"}</td><td className="px-4 py-3 text-right font-mono text-teal-700">{row.grossProfit ? formatTHB(row.grossProfit) : "—"}</td><td className="px-4 py-3 text-right">{row.revenue ? `${row.margin}%` : "—"}</td><td className="px-4 py-3 text-center text-gray-500">{row.invoiceCount} / {row.workOrderCount}</td></tr>)}</tbody></table></div></Card>
    </>}
  </div>
}
