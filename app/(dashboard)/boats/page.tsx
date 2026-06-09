"use client"
import React, { useState, useMemo } from "react"
import Link from "next/link"
import { Plus, Search, Filter, Download, Ship, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatFt, formatM, ftToM, BOAT_TYPE_LABELS } from "@/lib/utils"
import type { Boat } from "@/lib/supabase"
import { useApiList } from "@/hooks/useApiList"
import { exportRowsCsv } from "@/lib/client-export"

const STATUS_FILTERS = ["All", "ACTIVE", "IN_WATER", "IN_STORAGE", "IN_REPAIR", "INACTIVE"]

export default function BoatsPage() {
  const { data: boats, loading, error } = useApiList<Boat>("/api/db/boats")
  const [search, setSearch]         = useState("")
  const [statusFilter, setStatus]   = useState("All")

  const filtered = useMemo(() => {
    return boats.filter((b) => {
      const matchesSearch = !search ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.brand?.toLowerCase().includes(search.toLowerCase()) ||
        b.registration_number?.toLowerCase().includes(search.toLowerCase()) ||
        b.owner_name?.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === "All" || b.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [boats, search, statusFilter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Boats"
        description={loading ? "Loading…" : `${boats.length} boats in the system`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                exportRowsCsv(
                  `boats-${new Date().toISOString().slice(0, 10)}.csv`,
                  filtered.map((boat) => ({
                    name: boat.name,
                    owner: boat.owner_name,
                    type: boat.boat_type,
                    loa_ft: boat.loa_ft,
                    beam_m: boat.beam_ft != null ? ftToM(boat.beam_ft) : null,
                    registration_number: boat.registration_number,
                    status: boat.status,
                    current_location_code: boat.current_location_code,
                  })),
                )
              }
            >
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" className="gap-2" asChild>
              <Link href="/boats/new"><Plus className="h-4 w-4" /> Register Boat</Link>
            </Button>
          </>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, owner, registration…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-gray-400" />
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Boat</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dimensions</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Insurance</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState icon={Ship} title="No boats found" description="Try adjusting your search or filters." />
                    </td>
                  </tr>
                ) : (
                  filtered.map((boat) => {
                    const insExpired  = boat.insurance_expiry && new Date(boat.insurance_expiry) < new Date()
                    const insExpiring = !insExpired && boat.insurance_expiry &&
                      new Date(boat.insurance_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    return (
                      <tr key={boat.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                              <Ship className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <Link href={`/boats/${boat.id}`} className="font-medium text-gray-900 hover:text-teal-700 transition-colors">
                                {boat.name}
                              </Link>
                              <p className="text-xs text-gray-400">{boat.registration_number ?? "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          {boat.owner_id ? (
                            <Link href={`/customers/${boat.owner_id}`} className="text-gray-700 hover:text-teal-700 transition-colors">
                              {boat.owner_name ?? "—"}
                            </Link>
                          ) : (
                            <span className="text-gray-500">{boat.owner_name ?? "—"}</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge variant="default" className="text-xs">
                            {BOAT_TYPE_LABELS[boat.boat_type] ?? boat.boat_type}
                          </Badge>
                          <p className="text-xs text-gray-400 mt-0.5">{boat.brand} {boat.model}</p>
                        </td>
                        <td className="px-6 py-3.5 text-gray-600">
                          <div className="space-y-0.5 text-xs">
                            <div>LOA: <span className="font-medium">{boat.loa_ft ? formatFt(boat.loa_ft) : "—"}</span></div>
                            <div>Draft: <span className="font-medium">{boat.draft_ft ? formatM(ftToM(boat.draft_ft)) : "—"}</span></div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          {boat.current_location_code ? (
                            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-mono font-medium text-gray-700">
                              {boat.current_location_code}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          {boat.insurance_expiry ? (
                            <div className="flex items-center gap-1">
                              {(insExpired || insExpiring) && (
                                <AlertCircle className={`h-3.5 w-3.5 ${insExpired ? "text-red-500" : "text-amber-500"}`} />
                              )}
                              <span className={`text-xs ${insExpired ? "text-red-600 font-medium" : insExpiring ? "text-amber-600" : "text-gray-500"}`}>
                                {formatDate(boat.insurance_expiry)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          <StatusBadge type="boat" status={boat.status} />
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <Link
                            href={`/boats/${boat.id}`}
                            className="text-xs text-teal-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity font-medium"
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
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <p className="text-xs text-gray-500">
              Showing {filtered.length} of {boats.length} boats
              <span className="ml-2 text-teal-600 font-medium">● Live database</span>
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
