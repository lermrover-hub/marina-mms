"use client"
import React, { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Wrench, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import type { ServiceRequest } from "@/lib/supabase"

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; desc: string }> = {
  NEW_REQUEST:          { label: "New",             color: "bg-gray-100 text-gray-600",    icon: Clock,        desc: "Received by marina" },
  INSPECTION_REQUIRED:  { label: "Needs Inspection",color: "bg-purple-100 text-purple-700",icon: AlertCircle,  desc: "Awaiting inspection" },
  QUOTATION_DRAFT:      { label: "Preparing Quote", color: "bg-amber-100 text-amber-600",  icon: Clock,        desc: "We are preparing your quote" },
  QUOTATION_SENT:       { label: "Quote Sent",      color: "bg-blue-100 text-blue-700",    icon: AlertCircle,  desc: "Please review & approve" },
  IN_PROGRESS:          { label: "In Progress",     color: "bg-teal-100 text-teal-700",    icon: Wrench,       desc: "Work is underway" },
  COMPLETED:            { label: "Completed",       color: "bg-green-100 text-green-700",  icon: CheckCircle2, desc: "Work complete" },
  CANCELLED:            { label: "Cancelled",       color: "bg-red-100 text-red-500",      icon: CheckCircle2, desc: "Cancelled" },
  CLOSED:               { label: "Closed",          color: "bg-gray-100 text-gray-500",    icon: CheckCircle2, desc: "Closed" },
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW:    "bg-gray-100 text-gray-500",
  NORMAL: "bg-blue-100 text-blue-600",
  HIGH:   "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
}

const DONE_STATUSES = ["COMPLETED", "CLOSED", "CANCELLED"]

export default function PortalRequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

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
        const r = await fetch(`/api/db/service-requests?customer_id=${cid}`)
        const data = await r.json()
        if (Array.isArray(data)) setRequests(data)
        else setError(data.error ?? "Failed to load service requests")
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const open = requests.filter((r) => !DONE_STATUSES.includes(r.status))
  const past = requests.filter((r) => DONE_STATUSES.includes(r.status))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <p className="text-sm text-gray-500">{open.length} active · {past.length} completed</p>
          )}
        </div>
        <Link href="/portal/requests/new">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
            <Plus className="h-4 w-4" /> New Request
          </Button>
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading your requests…</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load service requests: {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && requests.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Wrench className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No service requests yet</p>
            <p className="text-sm text-gray-400 mt-1">Submit a request to get started</p>
          </CardContent>
        </Card>
      )}

      {/* Active requests */}
      {!loading && !error && open.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Active</h2>
          {open.map((req) => {
            const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG["NEW_REQUEST"]
            const StatusIcon = cfg.icon
            return (
              <Card key={req.id} className="border-teal-100">
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_COLOR[req.priority] ?? "bg-gray-100 text-gray-500"}`}>
                          {req.priority}
                        </span>
                        <span className="text-xs font-mono text-gray-400">{req.reference}</span>
                      </div>
                      <p className="font-semibold text-gray-900">{req.title}</p>
                      <p className="text-xs text-gray-500">
                        {req.boat_name ?? "—"} · {req.category} · Submitted: {req.requested_date ? formatDate(req.requested_date) : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Status message */}
                  <div className={`mt-3 rounded-lg px-3 py-2.5 text-sm ${
                    req.status === "QUOTATION_SENT"
                      ? "bg-blue-50 border border-blue-200 text-blue-800"
                      : "bg-gray-50 border border-gray-200 text-gray-700"
                  }`}>
                    <p className="font-medium text-xs opacity-70 mb-0.5">{cfg.desc}</p>
                    <p>{req.notes ?? "No additional notes."}</p>
                  </div>

                  {/* Action for quotes */}
                  {req.status === "QUOTATION_SENT" && (
                    <div className="flex gap-2 mt-3">
                      <button className="flex-1 rounded-md bg-teal-600 text-white text-sm font-medium py-2 hover:bg-teal-700 transition-colors">
                        ✓ Review &amp; Approve Quote
                      </button>
                      <button className="rounded-md border border-red-300 text-red-600 text-sm px-4 py-2 hover:bg-red-50 transition-colors">
                        Reject
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Past requests */}
      {!loading && !error && past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Completed / Closed</h2>
          {past.map((req) => {
            const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG["CLOSED"]
            const StatusIcon = cfg.icon
            return (
              <Card key={req.id} className="opacity-80">
                <CardContent className="py-3.5 px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" /> {cfg.label}
                        </span>
                        <span className="text-xs font-mono text-gray-400">{req.reference}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 mt-1">{req.title}</p>
                      <p className="text-xs text-gray-400">
                        {req.boat_name ?? "—"} · {req.category} · {req.requested_date ? formatDate(req.requested_date) : "—"}
                      </p>
                    </div>
                    <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${PRIORITY_COLOR[req.priority] ?? "bg-gray-100 text-gray-500"}`}>
                      {req.priority}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
