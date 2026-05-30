"use client"
import React, { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Plus, Search, Filter, FileText, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Card, CardContent } from "@/components/ui/card"
import { formatTHB, formatDate } from "@/lib/utils"
import type { Quotation } from "@/lib/supabase"
import { exportRowsCsv } from "@/lib/client-export"

const STATUS_FILTERS = ["All", "DRAFT", "PENDING_APPROVAL", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED", "CANCELLED"]

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [search, setSearch]         = useState("")
  const [statusFilter, setStatus]   = useState("All")

  useEffect(() => {
    fetch("/api/db/quotations")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setQuotations(data)
        else setError(data.error ?? "Failed to load")
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      const matchesSearch = !search ||
        q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
        q.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        q.boat_name?.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === "All" || q.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [quotations, search, statusFilter])

  const totalValue = filtered.reduce((sum, q) => sum + q.total_amount, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations"
        description={loading ? "Loading…" : `${quotations.length} quotations total`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                exportRowsCsv(
                  `quotations-${new Date().toISOString().slice(0, 10)}.csv`,
                  filtered.map((q) => ({
                    quote_number: q.quote_number,
                    customer_name: q.customer_name,
                    boat_name: q.boat_name,
                    status: q.status,
                    total_amount: q.total_amount,
                    valid_until: q.valid_until,
                    created_at: q.created_at,
                  })),
                )
              }
            >
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" className="gap-2" asChild>
              <Link href="/quotations/new"><Plus className="h-4 w-4" /> New Quotation</Link>
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
                placeholder="Search quotations…"
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
                      statusFilter === s ? "bg-navy-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Quote #</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Boat</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Subtotal</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Discount</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">VAT</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Valid Until</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10}>
                      <EmptyState icon={FileText} title="No quotations found" description="Try adjusting your search or filters." />
                    </td>
                  </tr>
                ) : (
                  filtered.map((q) => (
                    <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3.5 font-medium">
                        <Link href={`/quotations/${q.id}`} className="text-teal-700 hover:underline font-mono">
                          {q.quote_number}
                        </Link>
                      </td>
                      <td className="px-6 py-3.5 text-gray-700">
                        {q.customer_id ? (
                          <Link href={`/customers/${q.customer_id}`} className="hover:text-teal-700 transition-colors">
                            {q.customer_name ?? "—"}
                          </Link>
                        ) : (
                          q.customer_name ?? "—"
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-gray-500">{q.boat_name ?? "—"}</td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-gray-600">{formatTHB(q.subtotal)}</td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-gray-500">
                        {q.discount > 0 ? (
                          <span className="text-amber-700">-{formatTHB(q.discount)}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-gray-500">{formatTHB(q.vat_amount)}</td>
                      <td className="px-6 py-3.5 text-right font-semibold tabular-nums">{formatTHB(q.total_amount)}</td>
                      <td className="px-6 py-3.5 text-gray-500 text-xs">{q.valid_until ? formatDate(q.valid_until) : "—"}</td>
                      <td className="px-6 py-3.5 text-gray-500 text-xs">{formatDate(q.created_at)}</td>
                      <td className="px-6 py-3.5">
                        <StatusBadge type="quotation" status={q.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <p className="text-xs text-gray-500">
              Showing {filtered.length} of {quotations.length} quotations
              <span className="ml-2 text-teal-600 font-medium">● Live database</span>
            </p>
            <p className="text-xs font-semibold text-gray-700">
              Total value: {formatTHB(totalValue)}
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
