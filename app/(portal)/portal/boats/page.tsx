"use client"
import React, { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Anchor, Wrench, AlertTriangle, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import type { Boat } from "@/lib/supabase"

const BOAT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active:      { label: "Active",      color: "bg-teal-100 text-teal-700"  },
  in_water:    { label: "In Water",    color: "bg-teal-100 text-teal-700"  },
  IN_WATER:    { label: "In Water",    color: "bg-teal-100 text-teal-700"  },
  in_storage:  { label: "In Storage",  color: "bg-gray-100 text-gray-600"  },
  IN_STORAGE:  { label: "In Storage",  color: "bg-gray-100 text-gray-600"  },
  in_repair:   { label: "In Repair",   color: "bg-amber-100 text-amber-700"},
  IN_REPAIR:   { label: "In Repair",   color: "bg-amber-100 text-amber-700"},
  inactive:    { label: "Inactive",    color: "bg-gray-100 text-gray-400"  },
  moved_out:   { label: "Moved Out",   color: "bg-red-100 text-red-500"    },
}

function insuranceWarning(expiry: string | null): boolean {
  if (!expiry) return false
  return new Date(expiry) < new Date(Date.now() + 60 * 24 * 3600_000)
}

export default function PortalBoatsPage() {
  const [boats, setBoats]   = useState<Boat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        // Get portal session
        const sessionRes = await fetch("/api/portal/session")
        const sessionData = await sessionRes.json()
        const cid: string | null = sessionData?.customerId ?? null
        // If no customer linked, show message
        if (!cid) {
          setError("No customer portal account linked to your login.")
          setLoading(false)
          return
        }
        const r = await fetch(`/api/db/boats?customer_id=${cid}`)
        const data = await r.json()
        if (Array.isArray(data)) setBoats(data)
        else setError(data.error ?? "Failed to load boats")
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Boats</h1>
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <p className="text-sm text-gray-500">{boats.length} registered vessel{boats.length !== 1 ? "s" : ""}</p>
          )}
        </div>
        <Link href="/portal">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading your vessels…</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load boats: {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && boats.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Anchor className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No boats registered</p>
            <p className="text-sm text-gray-400 mt-1">Contact the marina to register your vessel</p>
          </CardContent>
        </Card>
      )}

      {/* Boat cards */}
      {!loading && !error && boats.length > 0 && (
        <div className="space-y-8">
          {boats.map((boat) => {
            const statusCfg = BOAT_STATUS_CONFIG[boat.status] ?? { label: boat.status, color: "bg-gray-100 text-gray-600" }
            const insExpiring = insuranceWarning(boat.insurance_expiry)

            return (
              <div key={boat.id} className="space-y-4">

                {/* Boat header */}
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shrink-0">
                    <Anchor className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{boat.name}</h2>
                        <p className="text-sm text-gray-500">
                          {[boat.brand, boat.model].filter(Boolean).join(" ")}
                          {boat.year_built ? ` · ${boat.year_built}` : ""}
                          {boat.loa_ft ? ` · ${boat.loa_ft}ft` : ""}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {boat.current_location_code && (
                        <span>📍 {boat.current_location_code} · </span>
                      )}
                      {boat.registration_number && `Reg: ${boat.registration_number}`}
                    </p>
                  </div>
                </div>

                {/* Insurance warning */}
                {insExpiring && boat.insurance_expiry && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <p>
                      Insurance expires on <span className="font-semibold">{formatDate(boat.insurance_expiry)}</span> — please renew soon.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Technical specs */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-600 uppercase tracking-wide">Vessel Specs</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-sm">
                      {[
                        ["Type",     boat.boat_type],
                        ["LOA",      boat.loa_ft    ? `${boat.loa_ft}ft`   : null],
                        ["Beam",     boat.beam_ft   ? `${boat.beam_ft}ft`  : null],
                        ["Draft",    boat.draft_ft  ? `${boat.draft_ft}ft` : null],
                        ["Weight",   boat.weight_t  ? `${boat.weight_t}t`  : null],
                        ["Hull",     boat.hull_material],
                        ["Engine",   boat.engine_brand ?? boat.engine_type],
                        ["Engines",  boat.num_engines != null ? String(boat.num_engines) : null],
                        ["Fuel",     boat.fuel_type],
                      ]
                        .filter(([, v]) => v)
                        .map(([label, value]) => (
                          <div key={label} className="flex justify-between">
                            <span className="text-gray-500">{label}</span>
                            <span className="font-medium text-gray-900">{value}</span>
                          </div>
                        ))}
                      {boat.insurance_expiry && (
                        <div className="border-t border-gray-100 pt-1.5 flex justify-between">
                          <span className="text-gray-500">Insurance</span>
                          <span className={`font-medium ${insExpiring ? "text-amber-600" : "text-gray-900"}`}>
                            {formatDate(boat.insurance_expiry)}
                            {insExpiring && " ⚠️"}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick actions */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-600 uppercase tracking-wide">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Link href="/portal/requests/new">
                        <button className="w-full rounded-md bg-teal-50 border border-teal-200 py-2.5 text-sm text-teal-700 font-medium hover:bg-teal-100 transition-colors flex items-center justify-center gap-2">
                          <Wrench className="h-4 w-4" /> Request Service for {boat.name}
                        </button>
                      </Link>
                      {boat.special_handling && (
                        <div className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          <span className="font-semibold">Special handling: </span>{boat.special_handling}
                        </div>
                      )}
                      {boat.notes && (
                        <div className="rounded-md border border-gray-100 px-3 py-2 text-xs text-gray-500">
                          {boat.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
