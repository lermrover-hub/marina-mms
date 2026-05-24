"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle, ArrowRight, Calendar, CheckCircle2, Clock,
  ClipboardList, Edit, Ship, User, Wrench, XCircle, Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ServiceRequest } from "@/lib/supabase"
import { formatDate } from "@/lib/utils"

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  NEW_REQUEST:               { label: "New Request",         color: "bg-blue-100 text-blue-700",    icon: <ClipboardList className="h-3.5 w-3.5" /> },
  INSPECTION_REQUIRED:       { label: "Inspection Required", color: "bg-amber-100 text-amber-700",  icon: <AlertCircle className="h-3.5 w-3.5" /> },
  QUOTATION_DRAFT:           { label: "Quotation Draft",     color: "bg-gray-100 text-gray-600",    icon: <Edit className="h-3.5 w-3.5" /> },
  QUOTATION_SENT:            { label: "Quotation Sent",      color: "bg-purple-100 text-purple-700",icon: <ArrowRight className="h-3.5 w-3.5" /> },
  WAITING_CUSTOMER_APPROVAL: { label: "Waiting Approval",    color: "bg-yellow-100 text-yellow-700",icon: <Clock className="h-3.5 w-3.5" /> },
  APPROVED:                  { label: "Approved",            color: "bg-teal-100 text-teal-700",    icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  IN_PROGRESS:               { label: "In Progress",         color: "bg-blue-100 text-blue-800",    icon: <Wrench className="h-3.5 w-3.5" /> },
  COMPLETED:                 { label: "Completed",           color: "bg-green-100 text-green-700",  icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  CANCELLED:                 { label: "Cancelled",           color: "bg-red-100 text-red-700",      icon: <XCircle className="h-3.5 w-3.5" /> },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW:    { label: "Low",    color: "bg-gray-100 text-gray-600" },
  MEDIUM: { label: "Medium", color: "bg-amber-100 text-amber-700" },
  HIGH:   { label: "High",   color: "bg-red-100 text-red-700" },
  URGENT: { label: "Urgent", color: "bg-red-600 text-white" },
}

function nextActions(status: string) {
  switch (status) {
    case "NEW_REQUEST":
      return [{ label: "Start Inspection", next: "INSPECTION_REQUIRED", variant: "teal" as const }]
    case "INSPECTION_REQUIRED":
      return [{ label: "Draft Quotation", next: "QUOTATION_DRAFT", variant: "teal" as const }]
    case "QUOTATION_SENT":
      return [
        { label: "Mark Approved",  next: "APPROVED",   variant: "teal" as const },
        { label: "Mark Rejected",  next: "CANCELLED",  variant: "outline" as const },
      ]
    case "APPROVED":
      return [{ label: "Start Work", next: "IN_PROGRESS", variant: "teal" as const }]
    case "IN_PROGRESS":
      return [{ label: "Mark Completed", next: "COMPLETED", variant: "teal" as const }]
    default:
      return []
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ServiceRequestDetailPage() {
  const params = useParams<{ id: string }>()
  const id     = params?.id ?? ""
  const router = useRouter()

  const [sr,      setSr]      = useState<ServiceRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/db/service-requests/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d?.error) setError("Service request not found")
        else setSr(d)
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false))
  }, [id])

  async function handleAction(nextStatus: string) {
    if (!sr) return
    setSaving(true)
    try {
      const res = await fetch(`/api/db/service-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Update failed")
      setSr(data)
    } catch (e) {
      alert("Failed to update: " + String(e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
      </div>
    )
  }

  if (error || !sr) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-gray-500">{error ?? "Service request not found"}</p>
        <Link href="/service-requests" className="text-sm text-teal-600 hover:underline mt-2">← Back</Link>
      </div>
    )
  }

  const statusCfg   = STATUS_CONFIG[sr.status] ?? { label: sr.status, color: "bg-gray-100 text-gray-600", icon: null }
  const priorityCfg = PRIORITY_CONFIG[sr.priority] ?? { label: sr.priority, color: "bg-gray-100 text-gray-600" }
  const actions     = nextActions(sr.status)

  return (
    <div className="space-y-6">
      <PageHeader
        title={sr.reference}
        description={sr.title}
        breadcrumb={[
          { label: "Service Requests", href: "/service-requests" },
          { label: sr.reference },
        ]}
        actions={
          <div className="flex gap-2 flex-wrap">
            {actions.map((a) => (
              <Button
                key={a.next}
                size="sm"
                variant={a.variant}
                className="gap-2"
                onClick={() => handleAction(a.next)}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {a.label}
              </Button>
            ))}
            <Button size="sm" variant="outline" asChild>
              <Link href="/service-requests">Back</Link>
            </Button>
          </div>
        }
      />

      {/* Status bar */}
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${statusCfg.color}`}>
          {statusCfg.icon}{statusCfg.label}
        </span>
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${priorityCfg.color}`}>
          {priorityCfg.label} Priority
        </span>
        <span className="ml-auto text-xs text-gray-400">Created {formatDate(sr.created_at)}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Left: main detail ── */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader><CardTitle>{sr.title}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {sr.description && (
                <div className="rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-700 leading-relaxed">
                  {sr.description}
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Category</p>
                  <p className="font-medium text-gray-800">{sr.category}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Assigned To</p>
                  <p className="font-medium text-gray-800">{sr.assigned_to ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Requested Date</p>
                  <p className="font-medium text-gray-800">
                    {sr.requested_date ? formatDate(sr.requested_date) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Scheduled Date</p>
                  <p className="font-medium text-gray-800">
                    {sr.scheduled_date ? formatDate(sr.scheduled_date) : "—"}
                  </p>
                </div>
                {sr.completed_date && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Completed</p>
                    <p className="font-medium text-green-700">{formatDate(sr.completed_date)}</p>
                  </div>
                )}
              </div>
              {sr.notes && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Internal Notes</p>
                  <p className="text-sm text-amber-800">{sr.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Work Order placeholder */}
          <Card>
            <CardHeader><CardTitle>Work Order</CardTitle></CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-400">
                <Wrench className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No work order linked to this request.</p>
                {["APPROVED", "IN_PROGRESS"].includes(sr.status) && (
                  <Button size="sm" variant="teal" className="mt-3 gap-2" onClick={() => router.push("/work-orders")}>
                    <Wrench className="h-4 w-4" /> View Work Orders
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-5">
          {/* Customer */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Customer</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                  {(sr.customer_name ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  {sr.customer_id ? (
                    <Link
                      href={`/customers/${sr.customer_id}`}
                      className="font-semibold text-gray-900 hover:text-teal-700 text-sm"
                    >
                      {sr.customer_name ?? "Unknown"}
                    </Link>
                  ) : (
                    <p className="font-semibold text-gray-900 text-sm">{sr.customer_name ?? "Unknown"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Boat */}
          {(sr.boat_id || sr.boat_name) && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Boat</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                    <Ship className="h-4 w-4" />
                  </div>
                  <div>
                    {sr.boat_id ? (
                      <Link
                        href={`/boats/${sr.boat_id}`}
                        className="font-semibold text-gray-900 hover:text-teal-600 text-sm"
                      >
                        {sr.boat_name ?? "View Boat"}
                      </Link>
                    ) : (
                      <p className="font-semibold text-gray-900 text-sm">{sr.boat_name}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2 text-sm" asChild>
                <Link href="/quotations/new">
                  <ClipboardList className="h-4 w-4 text-gray-400" /> Create Quotation
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 text-sm" asChild>
                <Link href="/invoices">
                  <Calendar className="h-4 w-4 text-gray-400" /> View Invoices
                </Link>
              </Button>
              {sr.customer_id && (
                <Button variant="outline" className="w-full justify-start gap-2 text-sm" asChild>
                  <Link href={`/customers/${sr.customer_id}`}>
                    <User className="h-4 w-4 text-gray-400" /> Customer Profile
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Live indicator */}
      <p className="text-xs text-gray-400 text-center pb-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 align-middle" />
        Live database · {sr.reference}
      </p>
    </div>
  )
}
