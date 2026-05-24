"use client"
import React, { useEffect, useState } from "react"
import Link from "next/link"
import {
  Ship, Receipt, Wrench, FileText, CheckCircle2,
  Anchor, Calendar, Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTHB, formatDate } from "@/lib/utils"
import type { Boat, Invoice, ServiceRequest } from "@/lib/supabase"

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  NEW_REQUEST:      { label: "New",          color: "bg-gray-100 text-gray-600" },
  QUOTATION_SENT:   { label: "Quote Sent",   color: "bg-blue-100 text-blue-700" },
  IN_PROGRESS:      { label: "In Progress",  color: "bg-teal-100 text-teal-700" },
  COMPLETED:        { label: "Completed",    color: "bg-green-100 text-green-700" },
  CLOSED:           { label: "Closed",       color: "bg-gray-100 text-gray-500" },
  ISSUED:           { label: "Outstanding",  color: "bg-amber-100 text-amber-700" },
  PARTIALLY_PAID:   { label: "Partial",      color: "bg-blue-100 text-blue-700" },
  PAID:             { label: "Paid",         color: "bg-green-100 text-green-700" },
  OVERDUE:          { label: "Overdue",      color: "bg-red-100 text-red-700" },
}

const OPEN_REQUEST_STATUSES = ["NEW_REQUEST", "INSPECTION_REQUIRED", "QUOTATION_DRAFT", "QUOTATION_SENT", "IN_PROGRESS", "WAITING_PARTS"]

export default function PortalDashboardPage() {
  const [boats, setBoats]       = useState<Boat[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // Get portal session
        const sessionRes = await fetch("/api/portal/session")
        const sessionData = await sessionRes.json()
        const cid: string | null = sessionData?.customerId ?? null
        // If no customer linked, show message
        if (!cid) {
          setLoading(false)
          return
        }
        const [boatsData, invoicesData, requestsData] = await Promise.all([
          fetch(`/api/db/boats?customer_id=${cid}`).then((r) => r.json()),
          fetch(`/api/db/invoices?customer_id=${cid}`).then((r) => r.json()),
          fetch(`/api/db/service-requests?customer_id=${cid}`).then((r) => r.json()),
        ])
        if (Array.isArray(boatsData))    setBoats(boatsData)
        if (Array.isArray(invoicesData)) setInvoices(invoicesData)
        if (Array.isArray(requestsData)) setRequests(requestsData)
      } catch {/* silently continue with empty arrays */}
      finally { setLoading(false) }
    }
    load()
  }, [])

  const outstandingAmount = invoices
    .filter((i) => i.status !== "PAID" && i.status !== "CANCELLED")
    .reduce((s, i) => s + (i.outstanding_balance ?? 0), 0)

  const pendingInvoiceCount = invoices.filter((i) => i.status !== "PAID" && i.status !== "CANCELLED").length

  const inWaterBoats  = boats.filter((b) => b.status === "IN_WATER" || b.status === "in_water")
  const openRequests  = requests.filter((r) => OPEN_REQUEST_STATUSES.includes(r.status))
  const recentBoats   = boats.slice(0, 3)
  const recentRequests = requests.slice(0, 3)
  const recentInvoices = invoices.slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="text-sm text-gray-500 mt-1">Your marina account summary — {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      {/* ── Quick stats ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <Ship className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{boats.length}</p>
                )}
                <p className="text-xs text-gray-500">My Boats</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {loading ? "…" : `${inWaterBoats.length} currently in water`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{formatTHB(outstandingAmount)}</p>
                )}
                <p className="text-xs text-gray-500">Outstanding</p>
              </div>
            </div>
            <p className="text-xs text-amber-600 mt-2">
              {loading ? "…" : `${pendingInvoiceCount} invoice(s) pending`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Wrench className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{openRequests.length}</p>
                )}
                <p className="text-xs text-gray-500">Open Requests</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {loading ? "…" : `${requests.length} total requests`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">—</p>
                <p className="text-xs text-gray-500">Upcoming</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Next 90 days</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main content grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: boats + requests */}
        <div className="lg:col-span-2 space-y-6">

          {/* My Boats */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ship className="h-4 w-4 text-teal-600" /> My Boats
                </CardTitle>
                <Link href="/portal/boats" className="text-xs text-teal-600 hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading && (
                <div className="flex items-center gap-2 py-4 text-gray-400 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading boats…
                </div>
              )}
              {!loading && recentBoats.map((boat) => (
                <Link key={boat.id} href="/portal/boats">
                  <div className="flex items-center gap-4 rounded-lg border border-gray-100 p-3 hover:border-teal-200 hover:bg-teal-50/30 transition-colors cursor-pointer">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shrink-0">
                      <Anchor className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{boat.name}</p>
                      <p className="text-xs text-gray-500">
                        {boat.boat_type}
                        {boat.loa_ft ? ` · ${boat.loa_ft}ft` : ""}
                        {boat.current_location_code ? ` · ${boat.current_location_code}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        (boat.status === "IN_WATER" || boat.status === "in_water")
                          ? "bg-teal-100 text-teal-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {(boat.status === "IN_WATER" || boat.status === "in_water") ? "In Water" : "In Storage"}
                      </span>
                      {boat.insurance_expiry && (
                        <p className="text-xs text-gray-400 mt-0.5">Ins: {formatDate(boat.insurance_expiry)}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
              <Link href="/portal/requests/new">
                <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 text-center hover:border-teal-300 hover:bg-teal-50/30 transition-colors cursor-pointer">
                  <p className="text-sm text-gray-500">
                    <span className="text-teal-600 font-medium">+ Submit a Service Request</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Engine, electrical, painting, antifouling &amp; more</p>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Service Requests */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-blue-600" /> Service Requests
                </CardTitle>
                <Link href="/portal/requests" className="text-xs text-teal-600 hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-gray-100">
              {loading && (
                <div className="flex items-center gap-2 py-4 text-gray-400 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading requests…
                </div>
              )}
              {!loading && recentRequests.length === 0 && (
                <p className="text-sm text-gray-400 py-4 text-center">No service requests yet</p>
              )}
              {!loading && recentRequests.map((req) => {
                const cfg = STATUS_CONFIG[req.status] ?? { label: req.status, color: "bg-gray-100 text-gray-600" }
                return (
                  <div key={req.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{req.title}</p>
                      <p className="text-xs text-gray-400">
                        {req.reference} · {req.requested_date ? formatDate(req.requested_date) : "—"}
                      </p>
                    </div>
                    <span className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                )
              })}
            </CardContent>
          </Card>

        </div>

        {/* Right: invoices + quick links */}
        <div className="space-y-6">

          {/* Invoices */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-amber-600" /> Invoices
                </CardTitle>
                <Link href="/portal/invoices" className="text-xs text-teal-600 hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-gray-100">
              {loading && (
                <div className="flex items-center gap-2 py-4 text-gray-400 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading invoices…
                </div>
              )}
              {!loading && recentInvoices.length === 0 && (
                <p className="text-sm text-gray-400 py-4 text-center">No invoices yet</p>
              )}
              {!loading && recentInvoices.map((inv) => {
                const cfg = STATUS_CONFIG[inv.status] ?? { label: inv.status, color: "bg-gray-100 text-gray-600" }
                const outstanding = inv.outstanding_balance ?? 0
                return (
                  <div key={inv.id} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-gray-500">{inv.invoice_number}</p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">
                          {inv.boat_name ?? inv.customer_name ?? "Invoice"}
                        </p>
                        <p className="text-xs text-gray-400">
                          Due: {inv.due_date ? formatDate(inv.due_date) : "—"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm">{formatTHB(inv.total_amount)}</p>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                    {inv.status !== "PAID" && outstanding > 0 && (
                      <div className="mt-2">
                        <Link href="/portal/invoices">
                          <button className="w-full rounded-md bg-teal-600 text-white text-xs font-medium py-1.5 hover:bg-teal-700 transition-colors">
                            View &amp; Pay
                          </button>
                        </Link>
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600 uppercase tracking-wide">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/portal/requests/new">
                <button className="w-full text-left rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50/30 transition-colors flex items-center gap-2">
                  <Wrench className="h-4 w-4" /> Submit Service Request
                </button>
              </Link>
              <Link href="/portal/quotations">
                <button className="w-full text-left rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50/30 transition-colors flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Review Quotations
                </button>
              </Link>
              <Link href="/portal/ramp-booking">
                <button className="w-full text-left rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50/30 transition-colors flex items-center gap-2">
                  <Anchor className="h-4 w-4" /> Book Ramp Slot
                </button>
              </Link>
              <Link href="/portal/invoices">
                <button className="w-full text-left rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50/30 transition-colors flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> View &amp; Pay Invoices
                </button>
              </Link>
              <Link href="/portal/documents">
                <button className="w-full text-left rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50/30 transition-colors flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Upload Documents
                </button>
              </Link>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
