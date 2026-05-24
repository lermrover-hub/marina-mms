"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import {
  Users, Ship, FileText, Receipt, TrendingUp, AlertTriangle,
  Activity, Wrench, Anchor, CheckCircle2, Clock, ArrowRight,
  Calendar, BarChart3, ShieldAlert, Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { formatTHB, formatDate } from "@/lib/utils"
import type { WorkOrder, Invoice, ServiceRequest } from "@/lib/supabase"

// ── helpers ───────────────────────────────────────────────────────────────────
function StatCard({
  title, value, sub, icon: Icon, accent, trend, href,
}: {
  title: string
  value: string | number
  sub?: string
  icon?: React.ElementType
  accent?: "teal" | "navy" | "amber" | "red" | "blue" | "purple"
  trend?: number
  href?: string
}) {
  const accentMap: Record<string, string> = {
    teal:   "bg-teal-100 text-teal-600",
    navy:   "bg-blue-100 text-blue-700",
    amber:  "bg-amber-100 text-amber-600",
    red:    "bg-red-100 text-red-600",
    blue:   "bg-sky-100 text-sky-600",
    purple: "bg-purple-100 text-purple-600",
  }
  const cls = accentMap[accent ?? "teal"]
  const inner = (
    <div className="flex items-start justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
        <p className="mt-1.5 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
        {trend !== undefined && (
          <p className={`mt-1 text-xs font-medium ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}% vs last month
          </p>
        )}
        {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
      </div>
      {Icon && (
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${cls}`}>
          <Icon className="h-5 w-5" />
        </div>
      )}
    </div>
  )
  if (href) return (
    <Card className="hover:border-gray-300 transition-colors cursor-pointer">
      <CardContent className="p-5"><Link href={href}>{inner}</Link></CardContent>
    </Card>
  )
  return <Card><CardContent className="p-5">{inner}</CardContent></Card>
}

function OccupancyCard({ title, pct, used, total, accent }: {
  title: string; pct: number; used: number; total: number; accent: string
}) {
  const barColor  = accent === "teal" ? "bg-teal-500" : "bg-blue-500"
  const textColor = accent === "teal" ? "text-teal-700" : "text-blue-700"
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
          <Anchor className="h-4 w-4 text-gray-400" />
        </div>
        <p className={`text-2xl font-bold tabular-nums ${textColor}`}>{pct}%</p>
        <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
          <div className={`h-2 rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-gray-400">{used} / {total} occupied</p>
      </CardContent>
    </Card>
  )
}

function PriorityBadge({ p }: { p: string }) {
  const map: Record<string, string> = {
    HIGH:   "bg-red-100 text-red-700",
    MEDIUM: "bg-amber-100 text-amber-700",
    LOW:    "bg-gray-100 text-gray-600",
    URGENT: "bg-red-200 text-red-800 font-bold",
  }
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs ${map[p] ?? "bg-gray-100 text-gray-600"}`}>
      {p}
    </span>
  )
}

function Progress({ pct }: { pct: number }) {
  const color = pct >= 80 ? "bg-green-500" : pct >= 40 ? "bg-teal-500" : "bg-blue-400"
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-gray-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 tabular-nums">{pct}%</span>
    </div>
  )
}

const UPCOMING_ALERTS = [
  { id: 1, icon: ShieldAlert, color: "text-amber-600 bg-amber-50",  label: "Sea Hawk — Insurance expiry",         date: "31 Aug 2026",  href: "/boats" },
  { id: 2, icon: Calendar,    color: "text-blue-600 bg-blue-50",    label: "Berth contract renewal — WB-A01",     date: "01 Jul 2026",  href: "/berths" },
  { id: 3, icon: Wrench,      color: "text-teal-600 bg-teal-50",    label: "Blue Horizon I — Engine overhaul ETA",date: "24 May 2026",  href: "/work-orders" },
  { id: 4, icon: ShieldAlert, color: "text-amber-600 bg-amber-50",  label: "Night Star — Insurance expiry",       date: "15 Dec 2026",  href: "/boats" },
]

type DashboardStats = {
  activeCustomers: number
  boatsInWater: number
  boatsInRepair: number
  boatsInStorage: number
  totalBoats: number
  outstandingInvoices: number
  overdueInvoices: number
  overdueCount: number
  openWorkOrders: number
  openQuotations: number
  openQuotationsValue: number
  ytdRevenue: number
  mtdRevenue: number
  insuranceExpiringSoon: { id: string; name: string; insurance_expiry: string }[]
}

// ── page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats,           setStats]    = useState<DashboardStats | null>(null)
  const [workOrders,      setWOs]      = useState<WorkOrder[]>([])
  const [invoices,        setInvoices] = useState<Invoice[]>([])
  const [serviceRequests, setSRs]      = useState<ServiceRequest[]>([])
  const [loading,         setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/db/dashboard").then(r => r.json()),
      fetch("/api/db/work-orders").then(r => r.json()),
      fetch("/api/db/invoices").then(r => r.json()),
      fetch("/api/db/service-requests").then(r => r.json()),
    ]).then(([statsData, woData, invData, srData]) => {
      if (statsData && !statsData.error) setStats(statsData)
      if (Array.isArray(woData))  setWOs(woData)
      if (Array.isArray(invData)) setInvoices(invData)
      if (Array.isArray(srData))  setSRs(srData)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Derived lists
  const openWOs      = workOrders.filter(w => !["COMPLETED","CLOSED","CANCELLED"].includes(w.status))
  const newSRs       = serviceRequests.filter(s => ["NEW_REQUEST","INSPECTION_REQUIRED","QUOTATION_SENT"].includes(s.status))
  const overdueCount = stats?.overdueCount ?? 0
  const insSoon      = stats?.insuranceExpiringSoon ?? []

  // Build live activity feed from recent records (newest first)
  const recentActivity = React.useMemo(() => {
    type ActivityItem = { id: string; type: string; message: string; time: string; ts: string }
    const items: ActivityItem[] = []
    invoices.slice(0, 8).forEach(inv => items.push({
      id: "inv-" + inv.id,
      type: inv.status === "PAID" ? "payment" : "invoice",
      message: `Invoice ${inv.invoice_number} — ${inv.customer_name ?? "Customer"} · ${formatTHB(inv.total_amount)}`,
      time: formatDate(inv.created_at),
      ts: inv.created_at,
    }))
    workOrders.slice(0, 6).forEach(wo => items.push({
      id: "wo-" + wo.id,
      type: "quotation",
      message: `Work Order ${wo.reference} — ${wo.boat_name ?? wo.customer_name ?? "Job"} · ${wo.status.replace(/_/g, " ")}`,
      time: formatDate(wo.created_at),
      ts: wo.created_at,
    }))
    serviceRequests.slice(0, 4).forEach(sr => items.push({
      id: "sr-" + sr.id,
      type: "boat",
      message: `Service Request ${sr.reference} — ${sr.boat_name ?? sr.customer_name ?? "Request"} · ${sr.category}`,
      time: formatDate(sr.created_at),
      ts: sr.created_at,
    }))
    return items.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 8)
  }, [invoices, workOrders, serviceRequests])

  // YTD + MTD revenue from live payments
  const ytdRevenue = stats?.ytdRevenue ?? 0
  const mtdRevenue = stats?.mtdRevenue ?? 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 gap-3 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Loading dashboard…</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Page title ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Marina & Boat Yard — {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            <span className="ml-2 text-teal-600 font-medium">● Live database</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link href="/reports"><BarChart3 className="h-4 w-4" /> Reports</Link>
          </Button>
          <Button size="sm" className="gap-2 bg-teal-600 hover:bg-teal-700 text-white" asChild>
            <Link href="/service-requests/new"><Wrench className="h-4 w-4" /> New Request</Link>
          </Button>
        </div>
      </div>

      {/* ── Alert banners ───────────────────────────────────────────────────── */}
      {(overdueCount > 0 || insSoon.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {overdueCount > 0 && (
            <Link href="/invoices">
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 hover:bg-red-100 transition-colors">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  <strong>{overdueCount} overdue invoice{overdueCount > 1 ? "s" : ""}</strong>
                  {stats && ` — ${formatTHB(stats.overdueInvoices)} outstanding`}
                </span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </div>
            </Link>
          )}
          {insSoon.map(b => (
            <Link key={b.id} href={`/boats/${b.id}`}>
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-100 transition-colors">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span><strong>{b.name}</strong> insurance expires {formatDate(b.insurance_expiry)}</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── KPI Row 1 ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Revenue This Month"
          value={formatTHB(mtdRevenue)}
          icon={TrendingUp}
          accent="teal"
          href="/reports"
        />
        <StatCard
          title="YTD Revenue"
          value={formatTHB(ytdRevenue)}
          sub="Jan – May 2026"
          icon={BarChart3}
          accent="blue"
          href="/reports"
        />
        <StatCard
          title="Outstanding Balance"
          value={formatTHB(stats?.outstandingInvoices ?? 0)}
          sub={`${overdueCount} invoice${overdueCount !== 1 ? "s" : ""} overdue`}
          icon={Receipt}
          accent="amber"
          href="/invoices"
        />
        <StatCard
          title="Active Customers"
          value={stats?.activeCustomers ?? 0}
          icon={Users}
          accent="navy"
          href="/customers"
        />
      </div>

      {/* ── KPI Row 2 — Occupancy + Operations ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <OccupancyCard
          title="Wet Berth Occupancy"
          pct={78}
          used={Math.round(24 * 0.78)}
          total={24}
          accent="teal"
        />
        <OccupancyCard
          title="Dry Storage Occupancy"
          pct={65}
          used={Math.round(40 * 0.65)}
          total={40}
          accent="navy"
        />
        <StatCard
          title="Active Work Orders"
          value={stats?.openWorkOrders ?? openWOs.length}
          sub="Currently in progress"
          icon={Wrench}
          accent="purple"
          href="/work-orders"
        />
        <StatCard
          title="Open Quotations"
          value={stats?.openQuotations ?? 0}
          sub={formatTHB(stats?.openQuotationsValue ?? 0) + " total value"}
          icon={FileText}
          accent="blue"
          href="/quotations"
        />
      </div>

      {/* ── Main 3-col grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Left 2/3 */}
        <div className="space-y-6 lg:col-span-2">

          {/* Open Work Orders */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wrench className="h-4 w-4 text-purple-500" /> Open Work Orders
                </CardTitle>
                <Link href="/work-orders" className="text-xs text-teal-600 hover:underline font-medium flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {openWOs.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">No open work orders.</div>
                ) : (
                  openWOs.slice(0, 5).map(wo => (
                    <div key={wo.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/work-orders/${wo.id}`} className="text-sm font-medium text-gray-900 hover:text-teal-700 hover:underline">
                            {wo.reference}
                          </Link>
                          <PriorityBadge p={wo.priority} />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{wo.title}</p>
                        <p className="text-xs text-gray-400">{wo.boat_name ?? "—"} · {wo.assigned_to ?? "Unassigned"}</p>
                      </div>
                      <div className="shrink-0 text-right space-y-1">
                        <StatusBadge type="workorder" status={wo.status} />
                        <Progress pct={wo.progress_percent ?? 0} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Receipt className="h-4 w-4 text-amber-500" /> Recent Invoices
                </CardTitle>
                <Link href="/invoices" className="text-xs text-teal-600 hover:underline font-medium flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                      <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Due</th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoices.slice(0, 6).map(inv => (
                      <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-teal-700">
                          <Link href={`/invoices/${inv.id}`} className="hover:underline font-mono">{inv.invoice_number}</Link>
                        </td>
                        <td className="px-5 py-3 text-gray-700 truncate max-w-[160px]">{inv.customer_name ?? "—"}</td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatTHB(inv.total_amount)}</td>
                        <td className="px-5 py-3 text-gray-500 text-xs">{inv.due_date ? formatDate(inv.due_date) : "—"}</td>
                        <td className="px-5 py-3"><StatusBadge type="invoice" status={inv.status} /></td>
                      </tr>
                    ))}
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-sm text-gray-400">No invoices yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1/3 */}
        <div className="space-y-6">

          {/* Activity Feed */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-gray-400" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {recentActivity.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">No recent activity</p>
                ) : recentActivity.map(item => (
                  <div key={item.id} className="flex items-start gap-3 px-5 py-3">
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      item.type === "payment"   ? "bg-green-100"  :
                      item.type === "quotation" ? "bg-blue-100"   :
                      item.type === "invoice"   ? "bg-amber-100"  :
                      item.type === "boat"      ? "bg-sky-100"    : "bg-gray-100"
                    }`}>
                      {item.type === "payment"   && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                      {item.type === "quotation" && <FileText     className="h-3.5 w-3.5 text-blue-600"  />}
                      {item.type === "invoice"   && <Receipt      className="h-3.5 w-3.5 text-amber-600" />}
                      {item.type === "boat"      && <Anchor       className="h-3.5 w-3.5 text-sky-700"   />}
                      {item.type === "customer"  && <Users        className="h-3.5 w-3.5 text-teal-600"  />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-700 leading-relaxed">{item.message}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Alerts */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-purple-500" /> Upcoming / Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {UPCOMING_ALERTS.map(a => {
                  const Icon = a.icon
                  return (
                    <Link key={a.id} href={a.href}>
                      <div className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${a.color}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-800 leading-snug">{a.label}</p>
                          <p className="mt-0.5 text-xs text-gray-400">{a.date}</p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-gray-300 shrink-0 mt-1" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500 uppercase tracking-wide">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { href: "/service-requests/new", icon: Wrench,      label: "New Service Request",  color: "hover:text-purple-700 hover:border-purple-300 hover:bg-purple-50" },
                { href: "/quotations/new",        icon: FileText,    label: "Create Quotation",     color: "hover:text-blue-700 hover:border-blue-300 hover:bg-blue-50" },
                { href: "/invoices/new",           icon: Receipt,     label: "Create Invoice",       color: "hover:text-amber-700 hover:border-amber-300 hover:bg-amber-50" },
                { href: "/payments/new",           icon: CheckCircle2,label: "Record Payment",       color: "hover:text-green-700 hover:border-green-300 hover:bg-green-50" },
                { href: "/ramp-bookings/new",      icon: Anchor,      label: "Book Ramp Slot",       color: "hover:text-teal-700 hover:border-teal-300 hover:bg-teal-50" },
                { href: "/customers/new",          icon: Users,       label: "Add Customer",         color: "hover:text-sky-700 hover:border-sky-300 hover:bg-sky-50" },
              ].map(item => {
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href}>
                    <button className={`w-full flex items-center gap-2.5 rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-gray-700 transition-all ${item.color}`}>
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </button>
                  </Link>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Service Requests needing attention ──────────────────────────────── */}
      {newSRs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-orange-500" /> Service Requests Needing Attention
                <span className="ml-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">{newSRs.length}</span>
              </CardTitle>
              <Link href="/service-requests" className="text-xs text-teal-600 hover:underline font-medium flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Ref</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Customer / Boat</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Issue</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Priority</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Received</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {newSRs.map(sr => (
                    <tr key={sr.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-teal-700">
                        <Link href={`/service-requests/${sr.id}`} className="hover:underline">{sr.reference}</Link>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-gray-900 text-xs font-medium">{sr.customer_name}</p>
                        <p className="text-gray-400 text-xs">{sr.boat_name}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-700 max-w-[220px]">
                        <p className="truncate">{sr.title}</p>
                        <p className="text-xs text-gray-400">{sr.category}</p>
                      </td>
                      <td className="px-5 py-3"><PriorityBadge p={sr.priority} /></td>
                      <td className="px-5 py-3 text-gray-500">{formatDate(sr.requested_date ?? sr.created_at)}</td>
                      <td className="px-5 py-3"><StatusBadge type="servicerequest" status={sr.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Fleet overview ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-teal-200 bg-teal-50/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Boats in Water</p>
                <p className="mt-1 text-3xl font-bold text-teal-800">{stats?.boatsInWater ?? 0}</p>
              </div>
              <Ship className="h-8 w-8 text-teal-400" />
            </div>
            <Link href="/boats" className="mt-2 inline-flex items-center gap-1 text-xs text-teal-600 hover:underline">
              View boats <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Boats in Storage</p>
                <p className="mt-1 text-3xl font-bold text-blue-800">{stats?.boatsInStorage ?? 0}</p>
              </div>
              <Anchor className="h-8 w-8 text-blue-400" />
            </div>
            <Link href="/berths" className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
              View berths <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Boats in Repair</p>
                <p className="mt-1 text-3xl font-bold text-purple-800">{stats?.boatsInRepair ?? 0}</p>
              </div>
              <Wrench className="h-8 w-8 text-purple-400" />
            </div>
            <Link href="/work-orders" className="mt-2 inline-flex items-center gap-1 text-xs text-purple-600 hover:underline">
              View work orders <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
