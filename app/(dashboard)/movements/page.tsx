"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Navigation, Search, ArrowRight, Ship, Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import type { BoatMovement } from "@/lib/supabase"

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  LAUNCH:     { label: "Launch",      color: "bg-teal-100 text-teal-700" },
  RETRIEVAL:  { label: "Retrieval",   color: "bg-blue-100 text-blue-700" },
  TO_STORAGE: { label: "To Storage",  color: "bg-orange-100 text-orange-700" },
  TO_REPAIR:  { label: "To Repair",   color: "bg-red-100 text-red-600" },
  ARRIVAL:    { label: "Arrival",     color: "bg-purple-100 text-purple-700" },
  DEPARTURE:  { label: "Departure",   color: "bg-gray-100 text-gray-600" },
  INSPECTION: { label: "Inspection",  color: "bg-amber-100 text-amber-700" },
  MOVE:       { label: "Move",        color: "bg-indigo-100 text-indigo-700" },
}

export default function MovementsPage() {
  const [movements, setMovements] = useState<BoatMovement[]>([])
  const [loading, setLoading]     = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch]       = useState("")

  useEffect(() => {
    fetch("/api/db/boat-movements")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setMovements(d)
        else setFetchError(d?.error ?? "Failed to load")
      })
      .catch(e => setFetchError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const filtered = movements.filter((m) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (m.boat_name ?? "").toLowerCase().includes(q) ||
      m.movement_type.toLowerCase().includes(q) ||
      (m.to_location ?? "").toLowerCase().includes(q) ||
      (m.from_location ?? "").toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Boat Movements"
        description="Log of all boat location changes"
        actions={
          <Button size="sm" variant="teal" className="gap-2" asChild>
            <Link href="/movements/new"><Plus className="h-4 w-4" /> Record Movement</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by boat name, type, or location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading movements…</span>
          </div>
        ) : fetchError ? (
          <div className="p-8 text-center text-sm text-red-500">{fetchError}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Boat</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Movement</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Operated By</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((m) => {
                    const typeInfo = TYPE_LABELS[m.movement_type] ?? { label: m.movement_type, color: "bg-gray-100 text-gray-600" }
                    return (
                      <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3.5 text-gray-500 whitespace-nowrap">{formatDate(m.moved_at)}</td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-100 shrink-0">
                              <Ship className="h-4 w-4 text-navy-600" />
                            </div>
                            <span className="font-medium text-gray-900">{m.boat_name ?? "—"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600">{m.from_location ?? "External"}</span>
                            <ArrowRight className="h-3 w-3 text-gray-400 shrink-0" />
                            <span className="rounded bg-navy-100 px-2 py-0.5 text-navy-700">{m.to_location}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-gray-600">{m.operated_by ?? "—"}</td>
                        <td className="px-6 py-3.5 text-gray-400 text-xs">{m.notes || "—"}</td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Navigation className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">
                          {search ? "No movements match your search." : "No boat movements recorded yet."}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 px-6 py-3">
              <p className="text-xs text-gray-500">
                Showing {filtered.length} of {movements.length} movement records
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
