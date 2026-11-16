"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, BookOpen, Loader2, Ship, TrendingDown, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/PageHeader"
import { formatDate, formatTHB } from "@/lib/utils"

type LedgerRow = {
  id: string
  reference: string
  operation_type: string
  customer_id: string | null
  customer_name: string | null
  boat_id: string | null
  boat_name: string | null
  requested_date: string
  status: string
  revenue_amount: number
  estimated_cost_amount: number
  margin_amount: number
  revenue_account_code: string | null
  cost_account_code: string | null
  financial_status: string
  invoice_id: string | null
  invoice_number: string | null
  invoice_status: string | null
}

type LedgerResponse = {
  rows: LedgerRow[]
  summary: { revenue: number; cost: number; margin: number; count: number }
}

const OPERATION_LABELS: Record<string, string> = { LAUNCH: "Launch", HAUL_OUT: "Haul-out" }

export default function RampLedgerPage() {
  const [data, setData] = useState<LedgerResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState("ALL")

  useEffect(() => {
    fetch("/api/db/reports/ramp-ledger")
      .then((response) => response.json())
      .then((value) => {
        if (value?.error) throw new Error(value.error)
        setData(value as LedgerResponse)
      })
      .catch((reason) => setError(String(reason)))
      .finally(() => setLoading(false))
  }, [])

  const rows = useMemo(() => {
    const source = data?.rows ?? []
    return filter === "ALL" ? source : source.filter((row) => row.operation_type === filter)
  }, [data, filter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ramp Revenue & Cost Ledger"
        description="Trace revenue and direct cost for each haul-out and launch operation"
        actions={<Button variant="outline" size="sm" asChild><Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Reports</Link></Button>}
      />

      {data && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Bookings", value: String(data.summary.count), icon: BookOpen, color: "text-blue-600" },
            { label: "Revenue", value: formatTHB(data.summary.revenue), icon: TrendingUp, color: "text-green-600" },
            { label: "Direct Cost", value: formatTHB(data.summary.cost), icon: TrendingDown, color: "text-orange-600" },
            { label: "Estimated Margin", value: formatTHB(data.summary.margin), icon: TrendingUp, color: data.summary.margin >= 0 ? "text-teal-600" : "text-red-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span><Icon className={`h-4 w-4 ${color}`} /></div><p className="mt-2 text-xl font-bold text-gray-900 tabular-nums">{value}</p></CardContent></Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Accounting Entries</CardTitle><div className="flex gap-1.5">{["ALL", "HAUL_OUT", "LAUNCH"].map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-3 py-1 text-xs font-medium ${filter === value ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{value === "ALL" ? "All" : OPERATION_LABELS[value]}</button>)}</div></div></CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="flex items-center justify-center gap-2 py-16 text-gray-400"><Loader2 className="h-5 w-5 animate-spin" />Loading ledger...</div> : error ? <div className="p-6 text-sm text-red-600">Database error: {error}</div> : rows.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No ramp accounting entries yet.</div> : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-y border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500"><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Operation</th><th className="px-5 py-3">Customer / Boat</th><th className="px-5 py-3">Date</th><th className="px-5 py-3 text-right">Revenue</th><th className="px-5 py-3 text-right">Cost</th><th className="px-5 py-3 text-right">Margin</th><th className="px-5 py-3">Invoice</th></tr></thead><tbody className="divide-y divide-gray-100">{rows.map((row) => <tr key={row.id} className="hover:bg-gray-50"><td className="px-5 py-3"><Link href={`/ramp-bookings/${row.id}`} className="font-semibold text-teal-700 hover:underline">{row.reference}</Link></td><td className="px-5 py-3"><span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">{OPERATION_LABELS[row.operation_type] ?? row.operation_type}</span></td><td className="px-5 py-3"><div className="font-medium text-gray-900">{row.customer_name ?? "—"}</div><div className="flex items-center gap-1 text-xs text-gray-500"><Ship className="h-3 w-3" />{row.boat_name ?? "—"}</div></td><td className="px-5 py-3 text-xs text-gray-500">{formatDate(row.requested_date)}</td><td className="px-5 py-3 text-right font-semibold tabular-nums text-green-700">{formatTHB(row.revenue_amount)}</td><td className="px-5 py-3 text-right tabular-nums text-orange-700">{formatTHB(row.estimated_cost_amount)}</td><td className={`px-5 py-3 text-right font-semibold tabular-nums ${row.margin_amount >= 0 ? "text-teal-700" : "text-red-600"}`}>{formatTHB(row.margin_amount)}</td><td className="px-5 py-3 text-xs">{row.invoice_number && row.invoice_id ? <Link href={`/invoices/${row.invoice_id}`} className="text-teal-700 hover:underline">{row.invoice_number}</Link> : <span className="text-gray-400">Not linked</span>}</td></tr>)}</tbody></table></div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
