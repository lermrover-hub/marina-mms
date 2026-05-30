"use client"
import React, { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Search, Filter, CreditCard, Loader2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Card, CardContent } from "@/components/ui/card"
import { formatTHB, formatDate } from "@/lib/utils"
import type { Payment } from "@/lib/supabase"
import { exportRowsCsv } from "@/lib/client-export"

// ─── Constants ───────────────────────────────────────────────────────────────

const METHOD_FILTERS = ["All", "Cash", "Bank Transfer", "Credit Card", "QR Payment", "Cheque"]
const STATUS_FILTERS = ["All", "confirmed", "pending", "rejected", "refunded"]

const METHOD_ICON: Record<string, string> = {
  Cash:            "💵",
  "Bank Transfer": "🏦",
  "Credit Card":   "💳",
  "QR Payment":    "📱",
  Cheque:          "📃",
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700",
  pending:   "bg-amber-100 text-amber-700",
  rejected:  "bg-red-100 text-red-600",
  refunded:  "bg-purple-100 text-purple-700",
}

// Normalise stored values to display label (handles UPPER_CASE legacy values)
function normaliseMethod(raw: string): string {
  const map: Record<string, string> = {
    CASH: "Cash",
    BANK_TRANSFER: "Bank Transfer",
    CREDIT_CARD: "Credit Card",
    QR_PAYMENT: "QR Payment",
    CHEQUE: "Cheque",
    // already-normalised pass-through
    Cash: "Cash",
    "Bank Transfer": "Bank Transfer",
    "Credit Card": "Credit Card",
    "QR Payment": "QR Payment",
    Cheque: "Cheque",
  }
  return map[raw] ?? raw
}

function normaliseStatus(raw: string): string {
  return raw.toLowerCase()
}

// ─── Summary stat card ────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [search, setSearch]     = useState("")
  const [methodFilter, setMethod] = useState("All")
  const [statusFilter, setStatus] = useState("All")

  useEffect(() => {
    fetch("/api/db/payments")
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok || data?.error) throw new Error(data?.error ?? "Failed to load payments")
        return data
      })
      .then((data) => setPayments(Array.isArray(data) ? data : []))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() =>
    payments.filter((p) => {
      const method = normaliseMethod(p.payment_method)
      const status = normaliseStatus(p.status)

      const matchSearch =
        !search ||
        (p.customer_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (p.reference_no ?? "").toLowerCase().includes(search.toLowerCase()) ||
        p.invoice_id.toLowerCase().includes(search.toLowerCase())

      const matchMethod = methodFilter === "All" || method === methodFilter
      const matchStatus = statusFilter === "All" || status === statusFilter

      return matchSearch && matchMethod && matchStatus
    }),
  [payments, search, methodFilter, statusFilter])

  // ── Summary stats ─────────────────────────────────────────────────────────

  const totalReceived = useMemo(
    () => payments.filter((p) => normaliseStatus(p.status) === "confirmed").reduce((s, p) => s + p.amount, 0),
    [payments],
  )

  const thisMonthReceived = useMemo(() => {
    const now = new Date()
    return payments
      .filter((p) => {
        if (normaliseStatus(p.status) !== "confirmed") return false
        const d = new Date(p.payment_date)
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      })
      .reduce((s, p) => s + p.amount, 0)
  }, [payments])

  const totalPending = useMemo(
    () => payments.filter((p) => normaliseStatus(p.status) === "pending").reduce((s, p) => s + p.amount, 0),
    [payments],
  )

  const filteredConfirmedTotal = filtered
    .filter((p) => normaliseStatus(p.status) === "confirmed")
    .reduce((s, p) => s + p.amount, 0)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Payments"
        description={loading ? "Loading…" : `${payments.length} payments total`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                exportRowsCsv(
                  `payments-${new Date().toISOString().slice(0, 10)}.csv`,
                  filtered.map((payment) => ({
                    customer_name: payment.customer_name,
                    invoice_id: payment.invoice_id,
                    amount: payment.amount,
                    payment_method: normaliseMethod(payment.payment_method),
                    status: normaliseStatus(payment.status),
                    payment_date: payment.payment_date,
                    reference_no: payment.reference_no,
                  })),
                )
              }
            >
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" className="gap-2" asChild>
              <Link href="/payments/new">
                <CreditCard className="h-4 w-4" /> Record Payment
              </Link>
            </Button>
          </>
        }
      />

      {/* Error */}
      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Database error: {error}
        </div>
      )}

      {/* Summary stat cards */}
      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Received"
            value={formatTHB(totalReceived)}
            sub="All confirmed payments"
          />
          <StatCard
            label="This Month"
            value={formatTHB(thisMonthReceived)}
            sub={new Date().toLocaleString("en-GB", { month: "long", year: "numeric" })}
          />
          <StatCard
            label="Pending"
            value={formatTHB(totalPending)}
            sub="Awaiting confirmation"
          />
        </div>
      )}

      {/* Search + Filter bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by customer name or reference no…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Method chips */}
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-500 font-medium">Method:</span>
            {METHOD_FILTERS.map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  methodFilter === m
                    ? "bg-teal-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {m === "All" ? "All Methods" : `${METHOD_ICON[m] ?? ""} ${m}`}
              </button>
            ))}
          </div>

          {/* Status chips */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="h-4 w-4 shrink-0" />
            <span className="text-xs text-gray-500 font-medium">Status:</span>
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-teal-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s === "All" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Loading spinner */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading from database…</span>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice #</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ref #</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        icon={CreditCard}
                        title="No payments found"
                        description="Try adjusting your search or filters."
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const method = normaliseMethod(p.payment_method)
                    const status = normaliseStatus(p.status)
                    const isConfirmed = status === "confirmed"

                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                        {/* Date */}
                        <td className="px-6 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(p.payment_date)}
                        </td>

                        {/* Customer */}
                        <td className="px-6 py-3.5 text-gray-700">
                          {p.customer_id ? (
                            <Link
                              href={`/customers/${p.customer_id}`}
                              className="hover:text-teal-700 transition-colors"
                            >
                              {p.customer_name ?? "—"}
                            </Link>
                          ) : (
                            p.customer_name ?? "—"
                          )}
                        </td>

                        {/* Invoice # */}
                        <td className="px-6 py-3.5">
                          {p.invoice_id ? (
                            <Link
                              href={`/invoices/${p.invoice_id}`}
                              className="font-mono text-xs text-teal-700 hover:underline"
                            >
                              {p.invoice_id}
                            </Link>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className={`px-6 py-3.5 text-right font-semibold tabular-nums ${isConfirmed ? "text-green-700" : "text-gray-900"}`}>
                          {formatTHB(p.amount)}
                        </td>

                        {/* Method */}
                        <td className="px-6 py-3.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                            <span>{METHOD_ICON[method] ?? "💰"}</span>
                            <span>{method}</span>
                          </span>
                        </td>

                        {/* Ref # */}
                        <td className="px-6 py-3.5 font-mono text-xs text-gray-500">
                          {p.reference_no ?? "—"}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                              STATUS_STYLE[status] ?? "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {status}
                          </span>
                        </td>

                        {/* View */}
                        <td className="px-6 py-3.5">
                          <Link
                            href={`/payments/${p.id}`}
                            className="text-xs text-teal-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <p className="text-xs text-gray-500">
              Showing {filtered.length} of {payments.length} payments
              <span className="ml-2 text-teal-600 font-medium">● Live database</span>
            </p>
            <p className="text-xs font-semibold text-gray-700">
              Total shown:{" "}
              <span className="text-green-700">{formatTHB(filteredConfirmedTotal)}</span>
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
