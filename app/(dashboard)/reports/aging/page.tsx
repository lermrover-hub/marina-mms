"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw, AlertCircle } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatTHB } from "@/lib/utils"

interface InvoiceAging { invoice_number: string; due_date: string | null; outstanding: number; days_overdue: number }
interface CustomerRow {
  customer_id: string | null; customer_name: string; invoices: InvoiceAging[]
  total_outstanding: number; max_days_overdue: number
}
interface AgingData { rows: CustomerRow[]; grand_total: number }

function bucket(days: number) {
  if (days <= 0)  return { label: "Current",    style: "bg-green-100 text-green-700"  }
  if (days <= 30) return { label: "1-30 days",  style: "bg-yellow-100 text-yellow-700" }
  if (days <= 60) return { label: "31-60 days", style: "bg-orange-100 text-orange-700" }
  if (days <= 90) return { label: "61-90 days", style: "bg-red-100 text-red-700"       }
  return           { label: "90+ days",         style: "bg-red-200 text-red-900"       }
}

export default function AgingReportPage() {
  const [data,    setData]    = useState<AgingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [open,    setOpen]    = useState<Set<string>>(new Set())

  function load() {
    setLoading(true)
    fetch("/api/db/reports/aging")
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function toggle(name: string) {
    setOpen(s => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Aging Report"
        description="Outstanding invoices grouped by days overdue"
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild><Link href="/reports"><ArrowLeft className="h-4 w-4 mr-1" />Reports</Link></Button>
            <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        }
      />

      {loading ? <div className="p-12 text-center text-sm text-gray-400">Loading…</div> : data && (
        <>
          <Card><CardContent className="p-4 flex items-center gap-4">
            <AlertCircle className="h-8 w-8 text-orange-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700">Total Outstanding Balance</p>
              <p className="text-2xl font-bold text-red-600">{formatTHB(data.grand_total)}</p>
            </div>
            <p className="ml-auto text-sm text-gray-500">{data.rows.length} customers with unpaid invoices</p>
          </CardContent></Card>

          <Card><div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Invoices</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Outstanding</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Overdue Status</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map(row => {
                  const b = bucket(row.max_days_overdue)
                  return (
                    <React.Fragment key={row.customer_name}>
                      <tr className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => toggle(row.customer_name)}>
                        <td className="px-5 py-3 font-medium">
                          {row.customer_id ? (
                            <Link href={`/customers/${row.customer_id}`} className="text-teal-700 hover:underline" onClick={e => e.stopPropagation()}>
                              {row.customer_name}
                            </Link>
                          ) : row.customer_name}
                        </td>
                        <td className="px-5 py-3 text-center text-gray-500">{row.invoices.length}</td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-red-600">{formatTHB(row.total_outstanding)}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${b.style}`}>{b.label}</span>
                        </td>
                      </tr>
                      {open.has(row.customer_name) && row.invoices.map(inv => (
                        <tr key={inv.invoice_number} className="bg-gray-50 border-b">
                          <td className="px-10 py-2 text-xs font-mono text-teal-700">
                            <Link href={`/invoices?q=${inv.invoice_number}`}>{inv.invoice_number}</Link>
                          </td>
                          <td className="px-5 py-2 text-xs text-gray-500 text-center">
                            {inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-GB") : "—"}
                          </td>
                          <td className="px-5 py-2 text-right text-xs font-mono">{formatTHB(inv.outstanding)}</td>
                          <td className="px-5 py-2 text-xs text-gray-500">
                            {inv.days_overdue > 0 ? `${inv.days_overdue} days overdue` : "Not yet due"}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-gray-50">
                  <td colSpan={2} className="px-5 py-3 font-bold">Total</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-red-600">{formatTHB(data.grand_total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div></Card>
        </>
      )}
    </div>
  )
}
