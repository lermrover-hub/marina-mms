"use client"
import React, { useState, useMemo } from "react"
import Link from "next/link"
import { Plus, Search, Filter, Download, Users, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Card, CardContent } from "@/components/ui/card"
import { formatTHB, formatDate } from "@/lib/utils"
import type { Customer } from "@/lib/supabase"
import { useApiList } from "@/hooks/useApiList"

const STATUS_FILTERS = ["All", "ACTIVE", "PROSPECT", "INACTIVE", "BLOCKED"]

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  PRIVATE_OWNER:      "Private Owner",
  CHARTER_OPERATOR:   "Charter Operator",
  SPEEDBOAT_OPERATOR: "Speedboat Operator",
  YACHT_BROKER:       "Yacht Broker",
  CONTRACTOR:         "Contractor",
  SUPPLIER:           "Supplier",
}

function displayName(c: Customer): string {
  if (c.company_name) return c.company_name
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unknown"
}

export default function CustomersPage() {
  const { data: customers, loading, error } = useApiList<Customer>("/api/db/customers")
  const [search, setSearch]       = useState("")
  const [statusFilter, setStatus] = useState("All")

  const filtered = useMemo(() => {
    return customers.filter(c => {
      const name = displayName(c).toLowerCase()
      const matchSearch = !search ||
        name.includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
      const matchStatus = statusFilter === "All" || c.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [customers, search, statusFilter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description={loading ? "Loading…" : `${customers.length} customers in database`}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" className="gap-2" asChild>
              <Link href="/customers/new"><Plus className="h-4 w-4" /> New Customer</Link>
            </Button>
          </>
        }
      />

      {/* Search & filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, phone…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-gray-400" />
              <div className="flex gap-1 flex-wrap">
                {STATUS_FILTERS.map(s => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      statusFilter === s ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {s === "All" ? "All Status" : s}
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Credit Limit</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Since</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState icon={Users} title="No customers found" description="Try adjusting your search or filters." />
                    </td>
                  </tr>
                ) : (
                  filtered.map(c => {
                    const name = displayName(c)
                    return (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-bold shrink-0">
                              {name.slice(0, 2).toUpperCase()}
                            </div>
                            <Link href={`/customers/${c.id}`} className="font-medium text-gray-900 hover:text-teal-700 transition-colors">
                              {name}
                            </Link>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge variant="default" className="text-xs">
                            {CUSTOMER_TYPE_LABELS[c.customer_type] ?? c.customer_type}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5">
                          <p className="text-gray-700">{c.phone ?? "—"}</p>
                          <p className="text-xs text-gray-400">{c.email ?? ""}</p>
                        </td>
                        <td className="px-6 py-3.5 text-right tabular-nums text-gray-600">
                          {c.credit_limit ? formatTHB(c.credit_limit) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-6 py-3.5">
                          <StatusBadge type="customer" status={c.status} />
                        </td>
                        <td className="px-6 py-3.5 text-gray-500 text-xs">
                          {formatDate(c.created_at)}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <Link href={`/customers/${c.id}`} className="text-xs text-teal-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity font-medium">
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
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <p className="text-xs text-gray-500">
              Showing {filtered.length} of {customers.length} customers
              <span className="ml-2 text-teal-600 font-medium">● Live database</span>
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
