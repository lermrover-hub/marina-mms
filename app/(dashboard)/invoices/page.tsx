"use client"
import React, { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Plus, Search, Filter, Receipt, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Card, CardContent } from "@/components/ui/card"
import { formatTHB, formatDate } from "@/lib/utils"
import type { Invoice } from "@/lib/supabase"
import { exportRowsCsv } from "@/lib/client-export"

const STATUS_FILTERS = ["All", "DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE"]

export default function InvoicesPage() {
  const [invoices, setInvoices]     = useState<Invoice[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [search, setSearch]         = useState("")
  const [statusFilter, setStatus]   = useState("All")

  useEffect(() => {
    fetch("/api/db/invoices")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setInvoices(data)
        else setError(data.error ?? "Failed to load")
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch = !search ||
        inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        inv.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        inv.boat_name?.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === "All" || inv.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [invoices, search, statusFilter])

  const totalOutstanding = filtered.reduce((sum, i) => sum + (i.outstanding_balance ?? 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description={loading ? "Loading…" : `${invoices.length} invoices total`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                exportRowsCsv(
                  `invoices-${new Date().toISOString().slice(0, 10)}.csv`,
                  filtered.map((inv) => ({
                    invoice_number: inv.invoice_number,
                    customer_name: inv.customer_name,
                    boat_name: inv.boat_name,
                    status: inv.status,
                    total_amount: inv.total_amount,
                    outstanding_balance: inv.outstanding_balance,
                    due_date: inv.due_date,
                    created_at: inv.created_at,
                  })),
                )
              }
            >
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" className="gap-2" asChild>
              <Link href="/invoices/new"><Plus className="h-4 w-4" /> New Invoice</Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by invoice #, customer, boat…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-gray-400" />
              <div className="flex gap-1 flex-wrap">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      statusFilter === s ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {s === "All" ? "All Status" : s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading from database…</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Database error: {error}
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Boat</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Outstanding</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <EmptyState icon={Receipt} title="No invoices found" description="Try adjusting your search or filters." />
                    </td>
                  </tr>
                ) : (
                  filtered.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-3.5 font-medium">
                        <Link href={`/invoices/${inv.id}`} className="text-teal-700 hover:underline font-mono">
                          {inv.invoice_number}
                        </Link>
                        {inv.billing_period && (
                          <div className="text-xs text-gray-400 mt-0.5">{inv.billing_period}</div>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {inv.invoice_type === "RECURRING" ? (
                          <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700">Recurring</span>
                        ) : inv.invoice_type === "WORK_ORDER" ? (
                          <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">Work Order</span>
                        ) : (
                          <span className="text-xs text-gray-400">Manual</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-gray-700">
                        {inv.customer_id ? (
                          <Link href={`/customers/${inv.customer_id}`} className="hover:text-teal-700 transition-colors">
                            {inv.customer_name ?? "—"}
                          </Link>
                        ) : (
                          inv.customer_name ?? "—"
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-gray-500">{inv.boat_name ?? "—"}</td>
                      <td className="px-6 py-3.5 text-gray-500 text-xs">{formatDate(inv.invoice_date)}</td>
                      <td className="px-6 py-3.5 text-right font-semibold tabular-nums">{formatTHB(inv.total_amount)}</td>
                      <td className="px-6 py-3.5 text-right tabular-nums">
                        {inv.outstanding_balance > 0 ? (
                          <span className="font-semibold text-amber-700">{formatTHB(inv.outstanding_balance)}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={inv.status === "OVERDUE" ? "text-red-600 font-medium text-xs" : "text-gray-500 text-xs"}>
                          {inv.due_date ? formatDate(inv.due_date) : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusBadge type="invoice" status={inv.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <p className="text-xs text-gray-500">
              Showing {filtered.length} of {invoices.length} invoices
              <span className="ml-2 text-teal-600 font-medium">● Live database</span>
            </p>
            <p className="text-xs font-semibold text-gray-700">
              Outstanding: <span className="text-amber-700">{formatTHB(totalOutstanding)}</span>
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
