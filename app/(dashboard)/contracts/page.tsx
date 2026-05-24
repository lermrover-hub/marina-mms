"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { FileText, Search, Plus, Loader2, CalendarDays, AlertCircle, Ship } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import type { Contract } from "@/lib/supabase"

// ─── helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  WET_BERTH:         { label: "Wet Berth",        color: "bg-blue-100 text-blue-700" },
  DRY_STORAGE:       { label: "Dry Storage",       color: "bg-indigo-100 text-indigo-700" },
  RAMP_SERVICE:      { label: "Ramp Service",      color: "bg-teal-100 text-teal-700" },
  SERVICE_AGREEMENT: { label: "Service Agreement", color: "bg-purple-100 text-purple-700" },
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:      "bg-gray-100 text-gray-600 border-gray-200",
  ACTIVE:     "bg-green-100 text-green-700 border-green-200",
  EXPIRED:    "bg-amber-100 text-amber-700 border-amber-200",
  TERMINATED: "bg-red-100 text-red-700 border-red-200",
  SUSPENDED:  "bg-orange-100 text-orange-700 border-orange-200",
}

const STATUS_FILTERS = ["ALL", "DRAFT", "ACTIVE", "EXPIRED", "TERMINATED", "SUSPENDED"]
const CYCLE_LABELS: Record<string, string> = {
  MONTHLY: "Monthly", QUARTERLY: "Quarterly", ANNUAL: "Annual", ONE_TIME: "One-time",
}

function daysUntilExpiry(endDate: string | null): number | null {
  if (!endDate) return null
  const diff = new Date(endDate).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function ExpiryBadge({ endDate }: { endDate: string | null }) {
  const days = daysUntilExpiry(endDate)
  if (days === null) return <span className="text-xs text-gray-400">Open-ended</span>
  if (days < 0)  return <span className="text-xs font-medium text-red-600">Expired {Math.abs(days)}d ago</span>
  if (days <= 30) return (
    <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
      <AlertCircle className="h-3 w-3" /> {days}d left
    </span>
  )
  return <span className="text-xs text-gray-600">{formatDate(endDate)}</span>
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ContractsPage() {
  const [contracts,    setContracts]    = useState<Contract[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetchError,   setFetchError]   = useState<string | null>(null)
  const [search,       setSearch]       = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  useEffect(() => {
    fetch("/api/db/contracts")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setContracts(d)
        else setFetchError(d?.error ?? "Failed to load")
      })
      .catch(e => setFetchError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const filtered = contracts.filter(c => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.contract_number.toLowerCase().includes(q) ||
      (c.customer_name ?? "").toLowerCase().includes(q) ||
      (c.boat_name ?? "").toLowerCase().includes(q) ||
      (c.berth_code ?? "").toLowerCase().includes(q)
    )
  })

  // Expiring soon (active, within 30 days)
  const expiringSoon = contracts.filter(c => {
    if (c.status !== "ACTIVE") return false
    const days = daysUntilExpiry(c.end_date)
    return days !== null && days <= 30 && days >= 0
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contracts"
        description="Berth, storage, and service agreement management"
        actions={
          <Button size="sm" variant="teal" className="gap-2" asChild>
            <Link href="/contracts/new"><Plus className="h-4 w-4" /> New Contract</Link>
          </Button>
        }
      />

      {/* Expiring soon banner */}
      {expiringSoon.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2 text-amber-700 text-sm font-semibold mb-2">
            <AlertCircle className="h-4 w-4" /> Expiring Soon ({expiringSoon.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {expiringSoon.map(c => (
              <Link key={c.id} href={`/contracts/${c.id}`}
                className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors">
                <FileText className="h-3 w-3" />
                {c.contract_number} — {c.customer_name ?? "—"}
                {c.end_date && ` (${daysUntilExpiry(c.end_date)}d)`}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by number, customer, boat, or berth…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === s ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s === "ALL" ? "All" : s}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading contracts…</span>
          </div>
        ) : fetchError ? (
          <div className="flex items-center justify-center py-12 text-red-500 text-sm">{fetchError}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText className="h-10 w-10 mb-3 text-gray-300" />
            <p className="text-sm font-medium">No contracts found</p>
            <p className="text-xs mt-1">Adjust filters or create a new contract</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="px-5 py-3 text-left">Contract No.</th>
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-left">Customer / Vessel</th>
                  <th className="px-5 py-3 text-left">Berth / Slot</th>
                  <th className="px-5 py-3 text-left">Start Date</th>
                  <th className="px-5 py-3 text-left">End Date</th>
                  <th className="px-5 py-3 text-left">Rate</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(c => {
                  const typeInfo = TYPE_LABELS[c.contract_type] ?? { label: c.contract_type, color: "bg-gray-100 text-gray-600" }
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/contracts/${c.id}`} className="font-semibold text-teal-700 hover:underline">
                          {c.contract_number}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">{c.customer_name ?? "—"}</div>
                        {c.boat_name && (
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Ship className="h-3 w-3" />{c.boat_name}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-700">{c.berth_code ?? "—"}</td>
                      <td className="px-5 py-3 text-gray-700">
                        <div className="flex items-center gap-1 text-xs">
                          <CalendarDays className="h-3 w-3 text-gray-400" />
                          {formatDate(c.start_date)}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <ExpiryBadge endDate={c.end_date} />
                      </td>
                      <td className="px-5 py-3 text-gray-700 text-xs">
                        {c.rate_amount != null
                          ? <span className="font-medium">{c.rate_amount.toLocaleString()} {c.rate_currency} / {CYCLE_LABELS[c.billing_cycle] ?? c.billing_cycle}</span>
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="ghost" size="sm" className="text-xs" asChild>
                          <Link href={`/contracts/${c.id}`}>View →</Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t text-xs text-gray-400">
              Showing {filtered.length} of {contracts.length} contracts
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
