"use client"
import React, { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Plus, Search, Filter, ClipboardList, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate, formatTHB } from "@/lib/utils"
import type { WorkOrder } from "@/lib/supabase"

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  NEW_REQUEST:         { label: "New Request",      color: "bg-gray-100 text-gray-600" },
  INSPECTION_REQUIRED: { label: "Inspection",       color: "bg-yellow-100 text-yellow-700" },
  WAITING_QUOTATION:   { label: "Awaiting Quote",   color: "bg-orange-100 text-orange-700" },
  WAITING_APPROVAL:    { label: "Waiting Approval", color: "bg-blue-100 text-blue-700" },
  WAITING_DEPOSIT:     { label: "Waiting Deposit",  color: "bg-purple-100 text-purple-700" },
  APPROVED:            { label: "Approved",         color: "bg-indigo-100 text-indigo-700" },
  IN_PROGRESS:         { label: "In Progress",      color: "bg-teal-100 text-teal-700" },
  WAITING_PARTS:       { label: "Waiting Parts",    color: "bg-amber-100 text-amber-700" },
  WAITING_CONTRACTOR:  { label: "Waiting Contractor",color: "bg-orange-100 text-orange-600" },
  ON_HOLD:             { label: "On Hold",          color: "bg-red-100 text-red-600" },
  COMPLETED:           { label: "Completed",        color: "bg-green-100 text-green-700" },
  WAITING_INVOICE:     { label: "Waiting Invoice",  color: "bg-violet-100 text-violet-700" },
  CLOSED:              { label: "Closed",           color: "bg-gray-100 text-gray-500" },
  CANCELLED:           { label: "Cancelled",        color: "bg-red-50 text-red-400" },
}

const STATUS_FILTERS = ["All", "APPROVED", "IN_PROGRESS", "WAITING_PARTS", "COMPLETED", "CLOSED"]

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [search, setSearch]         = useState("")
  const [statusFilter, setStatus]   = useState("All")

  useEffect(() => {
    fetch("/api/db/work-orders")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setWorkOrders(data)
        else setError(data.error ?? "Failed to load")
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() =>
    workOrders.filter((wo) => {
      const matchSearch = !search ||
        wo.reference.toLowerCase().includes(search.toLowerCase()) ||
        (wo.customer_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (wo.boat_name ?? "").toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "All" || wo.status === statusFilter
      return matchSearch && matchStatus
    }),
  [workOrders, search, statusFilter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Orders"
        description={loading ? "Loading…" : `${workOrders.length} work orders total`}
        actions={
          <Button size="sm" className="gap-2" asChild>
            <Link href="/work-orders/new"><Plus className="h-4 w-4" /> New Work Order</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by WO #, customer, boat…"
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
                    {s === "All" ? "All Status" : (STATUS_STYLE[s]?.label ?? s.replace(/_/g, " "))}
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

      {/* Cards */}
      {!loading && !error && (
        <>
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <Card>
                <CardContent className="py-16">
                  <EmptyState icon={ClipboardList} title="No work orders found" description="Try adjusting your search or filters." />
                </CardContent>
              </Card>
            ) : (
              filtered.map((wo) => {
                const statusInfo = STATUS_STYLE[wo.status] ?? { label: wo.status, color: "bg-gray-100 text-gray-600" }
                const totalCost  = (wo.total_labor_cost ?? 0) + (wo.total_material_cost ?? 0) + (wo.total_contractor_cost ?? 0)
                const margin     = wo.total_revenue > 0 ? Math.round(((wo.total_revenue - totalCost) / wo.total_revenue) * 100) : 0
                const progress   = wo.progress_percent ?? 0
                return (
                  <Card key={wo.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Link
                              href={`/work-orders/${wo.id}`}
                              className="font-mono text-sm text-teal-700 hover:underline font-semibold"
                            >
                              {wo.reference}
                            </Link>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                            {wo.category && (
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                                {wo.category}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-900 font-medium">
                            {wo.boat_name ?? "—"}
                            <span className="text-gray-400 font-normal"> — {wo.customer_name ?? "—"}</span>
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                            {wo.start_date && <span>Start: {formatDate(wo.start_date)}</span>}
                            {wo.estimated_end_date && <span>Est. End: {formatDate(wo.estimated_end_date)}</span>}
                            {wo.assigned_to && <span>Assigned: {wo.assigned_to}</span>}
                          </div>
                        </div>

                        <div className="flex items-start gap-6 text-right">
                          <div>
                            <p className="text-xs text-gray-500">Revenue</p>
                            <p className="font-semibold text-gray-900 tabular-nums">{formatTHB(wo.total_revenue)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Cost</p>
                            <p className="font-semibold text-gray-600 tabular-nums">{formatTHB(totalCost)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Margin</p>
                            <p className={`font-semibold tabular-nums ${margin >= 30 ? "text-green-600" : margin >= 15 ? "text-amber-600" : "text-red-600"}`}>
                              {margin}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>{wo.title}</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-500" : "bg-teal-500"}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
          <div className="flex items-center justify-between px-1 py-1">
            <p className="text-xs text-gray-500">
              Showing {filtered.length} of {workOrders.length} work orders
              <span className="ml-2 text-teal-600 font-medium">● Live database</span>
            </p>
          </div>
        </>
      )}
    </div>
  )
}
