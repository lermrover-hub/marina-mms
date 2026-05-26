"use client"
import React, { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Plus, Search, Wrench, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import type { ServiceRequest } from "@/lib/supabase"

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  NEW_REQUEST:         { label: "New Request",      color: "bg-gray-100 text-gray-600" },
  INSPECTION_REQUIRED: { label: "Inspection Needed", color: "bg-purple-100 text-purple-700" },
  QUOTATION_DRAFT:     { label: "Quote Draft",       color: "bg-amber-100 text-amber-700" },
  QUOTATION_SENT:      { label: "Quote Sent",        color: "bg-blue-100 text-blue-700" },
  IN_PROGRESS:         { label: "In Progress",       color: "bg-teal-100 text-teal-700" },
  COMPLETED:           { label: "Completed",         color: "bg-green-100 text-green-700" },
  CANCELLED:           { label: "Cancelled",         color: "bg-red-100 text-red-600" },
}

const PRIORITY_STYLE: Record<string, string> = {
  LOW:    "bg-gray-100 text-gray-500",
  MEDIUM: "bg-blue-100 text-blue-600",
  HIGH:   "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-600",
}

const STATUS_FILTERS = ["All", "NEW_REQUEST", "INSPECTION_REQUIRED", "QUOTATION_DRAFT", "QUOTATION_SENT", "IN_PROGRESS", "COMPLETED"]

export default function ServiceRequestsPage() {
  const [services, setServices] = useState<ServiceRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [search, setSearch]     = useState("")
  const [statusFilter, setStatus] = useState("All")

  useEffect(() => {
    fetch("/api/db/service-requests")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setServices(data)
        else setError(data.error ?? "Failed to load")
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() =>
    services.filter((sr) => {
      const matchSearch = !search ||
        sr.reference.toLowerCase().includes(search.toLowerCase()) ||
        (sr.customer_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (sr.boat_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        sr.category.toLowerCase().includes(search.toLowerCase()) ||
        (sr.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
        sr.title.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "All" || sr.status === statusFilter
      return matchSearch && matchStatus
    }),
  [services, search, statusFilter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Requests"
        description={loading ? "Loading…" : `${services.length} requests total`}
        actions={
          <Button size="sm" className="gap-2" asChild>
            <Link href="/service-requests/new"><Plus className="h-4 w-4" /> New Request</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search requests…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-1 flex-wrap">
              {STATUS_FILTERS.map((s) => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === s ? "bg-navy-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {s === "All" ? "All Status" : (STATUS_STYLE[s]?.label ?? s.replace(/_/g, " "))}
                </button>
              ))}
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ref #</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer / Boat</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Title / Description</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState icon={Wrench} title="No service requests found" /></td></tr>
                ) : (
                  filtered.map((sr) => {
                    const statusInfo = STATUS_STYLE[sr.status] ?? { label: sr.status, color: "bg-gray-100 text-gray-600" }
                    return (
                      <tr key={sr.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3.5">
                          <Link href={`/service-requests/${sr.id}`} className="font-mono text-xs text-navy-600 hover:underline font-medium">{sr.reference}</Link>
                        </td>
                        <td className="px-6 py-3.5">
                          <p className="font-medium text-gray-900">{sr.customer_name ?? "—"}</p>
                          <p className="text-xs text-gray-500">{sr.boat_name ?? "—"}</p>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="inline-flex items-center rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-700">{sr.category}</span>
                        </td>
                        <td className="px-6 py-3.5 text-gray-600 max-w-[260px]">
                          <p className="font-medium text-gray-800 truncate">{sr.title}</p>
                          {sr.description && <p className="text-xs text-gray-500 truncate">{sr.description}</p>}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_STYLE[sr.priority] ?? "bg-gray-100 text-gray-600"}`}>
                            {sr.priority}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-gray-500">{formatDate(sr.requested_date ?? sr.created_at)}</td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
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
              Showing {filtered.length} of {services.length} requests
              <span className="ml-2 text-teal-600 font-medium">● Live database</span>
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
