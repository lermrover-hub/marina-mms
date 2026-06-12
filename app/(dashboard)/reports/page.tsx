"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import {
  BarChart3, Download, TrendingUp, Ship, Wrench, DollarSign,
  ArrowRight, TrendingDown, Anchor, Loader2, Users, CheckCircle2,
  AlertCircle, FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTHB } from "@/lib/utils"

// ── Live-data types ───────────────────────────────────────────────────────────
type ReportStats = {
  invoiceStats: {
    total: number; paid: number; overdue: number; partiallyPaid: number
    totalRevenue: number; outstandingBalance: number; overdueAmount: number
  }
  workOrderStats: {
    total: number; inProgress: number; completed: number; closed: number
    totalRevenue: number; totalCost: number; averageMarginPercent: number
  }
  customerStats: {
    total: number; active: number; prospect: number; inactive: number
  }
  boatStats: {
    total: number; inWater: number; inStorage: number; inRepair: number
  }
  quotationStats: {
    total: number; sent: number; accepted: number; rejected: number
    conversionRate: number; totalValue: number
  }
  paymentStats: {
    totalReceived: number; thisMonth: number; lastMonth: number
  }
}

// ── Fiscal year data (Jan 2026 = fiscal start) ───────────────────────────────
const MONTHLY_REVENUE = [
  { month: "Jan",  year: 2026, marina: 980000,  boatYard: 820000,  ramp: 95000,  other: 32000  },
  { month: "Feb",  year: 2026, marina: 1020000, boatYard: 1080000, ramp: 102000, other: 28000  },
  { month: "Mar",  year: 2026, marina: 1050000, boatYard: 1300000, ramp: 145000, other: 41000  },
  { month: "Apr",  year: 2026, marina: 1100000, boatYard: 980000,  ramp: 88000,  other: 35000  },
  { month: "May",  year: 2026, marina: 1120000, boatYard: 1200000, ramp: 92000,  other: 38000  },
  { month: "Jun",  year: 2026, marina: 0,        boatYard: 0,        ramp: 0,       other: 0      },
  { month: "Jul",  year: 2026, marina: 0,        boatYard: 0,        ramp: 0,       other: 0      },
  { month: "Aug",  year: 2026, marina: 0,        boatYard: 0,        ramp: 0,       other: 0      },
  { month: "Sep",  year: 2026, marina: 0,        boatYard: 0,        ramp: 0,       other: 0      },
  { month: "Oct",  year: 2026, marina: 0,        boatYard: 0,        ramp: 0,       other: 0      },
  { month: "Nov",  year: 2026, marina: 0,        boatYard: 0,        ramp: 0,       other: 0      },
  { month: "Dec",  year: 2026, marina: 0,        boatYard: 0,        ramp: 0,       other: 0      },
]

const PREV_YEAR_REVENUE = [
  { month: "Jan",  total: 1650000 },
  { month: "Feb",  total: 1880000 },
  { month: "Mar",  total: 2100000 },
  { month: "Apr",  total: 1950000 },
  { month: "May",  total: 2190000 },
]

// ── Occupancy data ────────────────────────────────────────────────────────────
const OCCUPANCY_HISTORY = [
  { month: "Jan", wetBerth: 70, dryStorage: 82 },
  { month: "Feb", wetBerth: 74, dryStorage: 85 },
  { month: "Mar", wetBerth: 80, dryStorage: 88 },
  { month: "Apr", wetBerth: 75, dryStorage: 86 },
  { month: "May", wetBerth: 78, dryStorage: 84 },
]

// ── Job profitability ─────────────────────────────────────────────────────────
const JOB_MARGIN_DATA = [
  { wo: "WO-2026-018", boat: "Blue Horizon I", category: "Engine",      revenue: 420000, cost: 280000 },
  { wo: "WO-2026-017", boat: "Sea Hawk",        category: "AC/Mechanical", revenue: 185000, cost: 120000 },
  { wo: "WO-2026-015", boat: "Nordic Star",     category: "Antifouling",   revenue: 98000,  cost: 55000  },
  { wo: "WO-2026-014", boat: "Manta Ray",       category: "Electrical",    revenue: 32000,  cost: 18000  },
  { wo: "WO-2026-012", boat: "Blue Dream",      category: "Fiberglass",    revenue: 156000, cost: 88000  },
]

// ── Revenue by unit ───────────────────────────────────────────────────────────
const BU_COLORS: Record<string, string> = {
  "Wet Berth / Marina": "bg-teal-500",
  "Boat Yard":          "bg-blue-500",
  "Ramp & Launch":      "bg-amber-500",
  "Other":              "bg-gray-400",
}

// ── report catalog ────────────────────────────────────────────────────────────
const REPORT_GROUPS = [
  {
    title: "Financial Reports", icon: DollarSign, color: "bg-green-100 text-green-700",
    reports: [
      { name: "Monthly Revenue Report",    description: "Revenue by month and business unit", available: true,  href: "/reports/revenue" },
      { name: "Outstanding Invoice Report",description: "Unpaid and overdue invoices",         available: true,  href: "/invoices" },
      { name: "Customer Aging Report",     description: "Accounts receivable aging",           available: true,  href: "/reports/aging" },
      { name: "Payment Summary",           description: "All payments by method and date",     available: true,  href: "/payments" },
    ],
  },
  {
    title: "Marina Operations", icon: Ship, color: "bg-blue-100 text-blue-700",
    reports: [
      { name: "Berth Occupancy Report",  description: "Current berth and storage utilization", available: true,  href: "/reports/occupancy" },
      { name: "Boat Movement Report",    description: "All boat entries and exits",             available: true,  href: "/movements" },
      { name: "Ramp Booking Report",     description: "Launch and retrieval operations",        available: true,  href: "/ramp-bookings" },
      { name: "Contract Expiry",         description: "Contracts expiring within 90 days",      available: true,  href: "/contracts" },
    ],
  },
  {
    title: "Boat Yard", icon: Wrench, color: "bg-orange-100 text-orange-700",
    reports: [
      { name: "Job Profitability",        description: "Revenue, cost, margin per WO",   available: true,  href: "/work-orders" },
      { name: "Technician Timesheets",    description: "Hours and labor cost by staff",   available: true,  href: "/timesheets" },
      { name: "Contractor Cost",          description: "Subcontractor spend by job",      available: true,  href: "/contractors" },
      { name: "Inventory Usage by WO",    description: "Material costs issued to repairs", available: true, href: "/reports/inventory-usage" },
    ],
  },
  {
    title: "Sales & CRM", icon: TrendingUp, color: "bg-purple-100 text-purple-700",
    reports: [
      { name: "Quotation Conversion", description: "Quote-to-invoice conversion pipeline", available: true, href: "/reports/quotations" },
      { name: "Recurring Billing",    description: "Contract billing preview & run",        available: true, href: "/billing/recurring" },
      { name: "Audit Log",            description: "Security and sensitive action log",      available: true, href: "/audit-log" },
    ],
  },
]

// ── helpers ───────────────────────────────────────────────────────────────────
function pct(value: number, max: number) {
  return max > 0 ? Math.round((value / max) * 100) : 0
}

// ── sub-components ────────────────────────────────────────────────────────────
function LiveStatCard({
  label, value, sub, icon: Icon, iconColor,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  iconColor: string
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconColor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-none mb-1">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── component ─────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [revenueView, setRevenueView] = useState<"stacked" | "mom">("stacked")
  const [reportStats, setReportStats] = useState<ReportStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/db/reports")
      .then(r => r.json())
      .then(d => {
        if (d.error) setFetchError(d.error)
        else setReportStats(d)
      })
      .catch(e => setFetchError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  // Totals (static FY data)
  const ytdRevenue = MONTHLY_REVENUE.reduce((s, m) => s + m.marina + m.boatYard + m.ramp + m.other, 0)
  const currentMonth = MONTHLY_REVENUE[4] // May
  const prevMonth    = MONTHLY_REVENUE[3] // Apr
  const currentTotal = currentMonth.marina + currentMonth.boatYard + currentMonth.ramp + currentMonth.other
  const prevTotal    = prevMonth.marina + prevMonth.boatYard + prevMonth.ramp + prevMonth.other
  const momChange    = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal * 100).toFixed(1) : "0"
  const momUp        = currentTotal >= prevTotal

  const currentOccupancy = OCCUPANCY_HISTORY[4]
  const prevOccupancy    = OCCUPANCY_HISTORY[3]

  const avgMargin = JOB_MARGIN_DATA.reduce((s, j) => s + (j.revenue - j.cost) / j.revenue, 0) / JOB_MARGIN_DATA.length

  const maxMonthlyTotal = Math.max(...MONTHLY_REVENUE.map((m) => m.marina + m.boatYard + m.ramp + m.other))

  // Business unit breakdown for current month
  const buData = [
    { name: "Wet Berth / Marina", value: currentMonth.marina },
    { name: "Boat Yard",          value: currentMonth.boatYard },
    { name: "Ramp & Launch",      value: currentMonth.ramp },
    { name: "Other",              value: currentMonth.other },
  ]
  const buTotal = buData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Business intelligence — Fiscal Year 2026 (Jan–Dec)"
        actions={
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
            <Download className="h-4 w-4" /> Export All
          </Button>
        }
      />

      {/* ── Quick links to detail reports ─────────────────────────────────── */}
      <div className="flex gap-3 flex-wrap">
        <Link
          href="/reports/job-margin"
          className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 transition-colors"
        >
          <TrendingUp className="h-4 w-4" /> Job Margin Analytics →
        </Link>
      </div>

      {/* ── KPI Summary (static) ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue (May 2026)</p>
              <DollarSign className="h-4 w-4 text-teal-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatTHB(currentTotal)}</p>
            <p className={`mt-1 text-xs font-medium flex items-center gap-1 ${momUp ? "text-green-600" : "text-red-500"}`}>
              {momUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {momUp ? "+" : ""}{momChange}% vs Apr
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">YTD Revenue</p>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatTHB(ytdRevenue)}</p>
            <p className="mt-1 text-xs text-gray-400">Jan–May 2026</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Wet Berth Occupancy</p>
              <Anchor className="h-4 w-4 text-teal-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{currentOccupancy.wetBerth}%</p>
            <p className={`mt-1 text-xs font-medium flex items-center gap-1 ${currentOccupancy.wetBerth >= prevOccupancy.wetBerth ? "text-green-600" : "text-amber-600"}`}>
              {currentOccupancy.wetBerth >= prevOccupancy.wetBerth ? "+" : ""}{currentOccupancy.wetBerth - prevOccupancy.wetBerth}% vs Apr
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Avg Job Margin</p>
              <Wrench className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{(avgMargin * 100).toFixed(1)}%</p>
            <p className="mt-1 text-xs text-gray-400">Last {JOB_MARGIN_DATA.length} work orders</p>
          </CardContent>
        </Card>

      </div>

      {/* ── Live Database Stats ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-teal-600" />
              Live Database Overview
            </CardTitle>
            <span className="flex items-center gap-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2.5 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
              Live database
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading live data...</span>
            </div>
          ) : fetchError ? (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Failed to load live data: {fetchError}
            </div>
          ) : reportStats ? (
            <div className="space-y-6">

              {/* Financial Overview */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Financial Overview</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <LiveStatCard
                    label="Total Revenue (Paid)"
                    value={formatTHB(reportStats.invoiceStats.totalRevenue)}
                    sub={`${reportStats.invoiceStats.paid} paid invoices`}
                    icon={DollarSign}
                    iconColor="bg-green-100 text-green-700"
                  />
                  <LiveStatCard
                    label="Outstanding Balance"
                    value={formatTHB(reportStats.invoiceStats.outstandingBalance)}
                    sub={`${reportStats.invoiceStats.partiallyPaid} partially paid`}
                    icon={FileText}
                    iconColor="bg-amber-100 text-amber-700"
                  />
                  <LiveStatCard
                    label="Overdue Amount"
                    value={formatTHB(reportStats.invoiceStats.overdueAmount)}
                    sub={`${reportStats.invoiceStats.overdue} overdue invoices`}
                    icon={AlertCircle}
                    iconColor="bg-red-100 text-red-700"
                  />
                  <LiveStatCard
                    label="Payment This Month"
                    value={formatTHB(reportStats.paymentStats.thisMonth)}
                    sub={`Last month: ${formatTHB(reportStats.paymentStats.lastMonth)}`}
                    icon={TrendingUp}
                    iconColor="bg-teal-100 text-teal-700"
                  />
                </div>
              </div>

              {/* Work Orders */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Work Orders</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <LiveStatCard
                    label="Total Work Orders"
                    value={reportStats.workOrderStats.total}
                    sub={`${reportStats.workOrderStats.inProgress} in progress`}
                    icon={Wrench}
                    iconColor="bg-orange-100 text-orange-700"
                  />
                  <LiveStatCard
                    label="Completed"
                    value={reportStats.workOrderStats.completed}
                    sub={`${reportStats.workOrderStats.closed} closed`}
                    icon={CheckCircle2}
                    iconColor="bg-green-100 text-green-700"
                  />
                  <LiveStatCard
                    label="WO Total Revenue"
                    value={formatTHB(reportStats.workOrderStats.totalRevenue)}
                    sub={`Cost: ${formatTHB(reportStats.workOrderStats.totalCost)}`}
                    icon={DollarSign}
                    iconColor="bg-blue-100 text-blue-700"
                  />
                  <LiveStatCard
                    label="Avg Gross Margin"
                    value={`${reportStats.workOrderStats.averageMarginPercent}%`}
                    sub="Revenue minus all costs"
                    icon={TrendingUp}
                    iconColor="bg-purple-100 text-purple-700"
                  />
                </div>
              </div>

              {/* Fleet & Customers */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Fleet & Customers</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <LiveStatCard
                    label="Total Boats"
                    value={reportStats.boatStats.total}
                    sub={`${reportStats.boatStats.inWater} in water`}
                    icon={Ship}
                    iconColor="bg-teal-100 text-teal-700"
                  />
                  <LiveStatCard
                    label="In Storage"
                    value={reportStats.boatStats.inStorage}
                    sub={`${reportStats.boatStats.inRepair} in repair`}
                    icon={Anchor}
                    iconColor="bg-blue-100 text-blue-700"
                  />
                  <LiveStatCard
                    label="Active Customers"
                    value={reportStats.customerStats.active}
                    sub={`${reportStats.customerStats.prospect} prospects`}
                    icon={Users}
                    iconColor="bg-indigo-100 text-indigo-700"
                  />
                  <LiveStatCard
                    label="Total Customers"
                    value={reportStats.customerStats.total}
                    sub={`${reportStats.customerStats.inactive} inactive`}
                    icon={Users}
                    iconColor="bg-gray-100 text-gray-600"
                  />
                </div>
              </div>

              {/* Quotations */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quotations</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <LiveStatCard
                    label="Total Quotations"
                    value={reportStats.quotationStats.total}
                    sub={`${reportStats.quotationStats.sent} sent to customers`}
                    icon={FileText}
                    iconColor="bg-purple-100 text-purple-700"
                  />
                  <LiveStatCard
                    label="Accepted"
                    value={reportStats.quotationStats.accepted}
                    sub={`${reportStats.quotationStats.rejected} rejected`}
                    icon={CheckCircle2}
                    iconColor="bg-green-100 text-green-700"
                  />
                  <LiveStatCard
                    label="Conversion Rate"
                    value={`${reportStats.quotationStats.conversionRate}%`}
                    sub="Accepted / Sent"
                    icon={TrendingUp}
                    iconColor="bg-amber-100 text-amber-700"
                  />
                  <LiveStatCard
                    label="Pipeline Value"
                    value={formatTHB(reportStats.quotationStats.totalValue)}
                    sub="All quotation amounts"
                    icon={DollarSign}
                    iconColor="bg-teal-100 text-teal-700"
                  />
                </div>
              </div>

            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Revenue Chart ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-teal-600" />
              Monthly Revenue — FY 2026
            </CardTitle>
            <div className="flex gap-2">
              <button
                onClick={() => setRevenueView("stacked")}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  revenueView === "stacked" ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                By Unit
              </button>
              <button
                onClick={() => setRevenueView("mom")}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  revenueView === "mom" ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                MoM vs 2025
              </button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => window.print()}>
                <Download className="h-3 w-3" /> Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>

          {revenueView === "stacked" ? (
            /* Stacked bar chart by business unit */
            <div className="space-y-3">
              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-xs">
                {Object.entries(BU_COLORS).map(([name, color]) => (
                  <div key={name} className="flex items-center gap-1.5">
                    <div className={`h-2.5 w-2.5 rounded-sm ${color}`} />
                    <span className="text-gray-600">{name}</span>
                  </div>
                ))}
              </div>

              {/* Bars */}
              <div className="flex items-end gap-1.5 h-44 pt-2">
                {MONTHLY_REVENUE.map((m) => {
                  const total = m.marina + m.boatYard + m.ramp + m.other
                  const isProjected = total === 0
                  const barH = isProjected ? 4 : pct(total, maxMonthlyTotal)
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                      {/* Value label */}
                      <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
                        {total > 0 ? `${(total / 1000000).toFixed(1)}M` : ""}
                      </span>
                      {/* Bar container */}
                      <div className="w-full flex flex-col justify-end" style={{ height: "130px" }}>
                        {isProjected ? (
                          <div
                            className="w-full rounded-t-sm border-2 border-dashed border-gray-200 bg-gray-50"
                            style={{ height: "15%" }}
                          />
                        ) : (
                          <div className="w-full rounded-t-sm overflow-hidden flex flex-col-reverse" style={{ height: `${barH}%` }}>
                            <div className="bg-teal-500"   style={{ height: `${pct(m.marina, total)}%`,   minHeight: m.marina   > 0 ? "2px" : 0 }} />
                            <div className="bg-blue-500"   style={{ height: `${pct(m.boatYard, total)}%`, minHeight: m.boatYard > 0 ? "2px" : 0 }} />
                            <div className="bg-amber-500"  style={{ height: `${pct(m.ramp, total)}%`,     minHeight: m.ramp     > 0 ? "2px" : 0 }} />
                            <div className="bg-gray-400"   style={{ height: `${pct(m.other, total)}%`,    minHeight: m.other    > 0 ? "2px" : 0 }} />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500">{m.month}</span>
                    </div>
                  )
                })}
              </div>

              {/* YTD total */}
              <div className="border-t border-gray-100 pt-3 flex justify-between text-sm">
                <span className="text-gray-500">YTD Total (Jan–May)</span>
                <span className="font-bold text-teal-700">{formatTHB(ytdRevenue)}</span>
              </div>
            </div>
          ) : (
            /* Month-on-month vs prior year */
            <div className="space-y-3">
              <p className="text-xs text-gray-500">2026 vs 2025 — same month comparison</p>
              <div className="flex items-end gap-2 h-44 pt-2">
                {MONTHLY_REVENUE.slice(0, 5).map((m, i) => {
                  const curr = m.marina + m.boatYard + m.ramp + m.other
                  const prev = PREV_YEAR_REVENUE[i]?.total ?? 0
                  const maxV = Math.max(curr, prev, 2500000)
                  const currPct = pct(curr, maxV)
                  const prevPct = pct(prev, maxV)
                  const up = curr >= prev
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className={`text-[9px] font-medium ${up ? "text-green-600" : "text-red-500"}`}>
                        {up ? "▲" : "▼"}{Math.abs(((curr - prev) / prev) * 100).toFixed(0)}%
                      </span>
                      <div className="w-full flex gap-0.5 items-end" style={{ height: "120px" }}>
                        {/* 2026 bar */}
                        <div className="flex-1 flex items-end" style={{ height: "100%" }}>
                          <div className="w-full rounded-t-sm bg-teal-500" style={{ height: `${currPct}%`, minHeight: "4px" }} />
                        </div>
                        {/* 2025 bar */}
                        <div className="flex-1 flex items-end" style={{ height: "100%" }}>
                          <div className="w-full rounded-t-sm bg-gray-200" style={{ height: `${prevPct}%`, minHeight: "4px" }} />
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-500">{m.month}</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-teal-500" /><span className="text-gray-600">2026</span></div>
                <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-gray-200" /><span className="text-gray-600">2025</span></div>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* ── Revenue by Business Unit + Occupancy ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Revenue by unit */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Revenue by Business Unit — May 2026
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {buData.map(({ name, value }) => {
              const share = buTotal > 0 ? (value / buTotal) * 100 : 0
              return (
                <div key={name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 font-medium">{name}</span>
                    <span className="font-semibold">{formatTHB(value)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${BU_COLORS[name]}`}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">{share.toFixed(1)}% of total</p>
                </div>
              )
            })}
            <div className="border-t border-gray-100 pt-2 flex justify-between text-sm font-bold">
              <span>Total</span>
              <span className="text-teal-700">{formatTHB(buTotal)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Occupancy history */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Anchor className="h-4 w-4 text-blue-600" />
              Berth &amp; Storage Occupancy — 2026
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {OCCUPANCY_HISTORY.map((o) => (
              <div key={o.month} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 w-8">{o.month}</span>
                  <div className="flex-1 mx-3 space-y-1">
                    {/* Wet Berth */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-16 shrink-0">Wet Berth</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-teal-400" style={{ width: `${o.wetBerth}%` }} />
                      </div>
                      <span className="text-xs font-medium text-teal-700 w-9 text-right">{o.wetBerth}%</span>
                    </div>
                    {/* Dry Storage */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-16 shrink-0">Dry Storage</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-400" style={{ width: `${o.dryStorage}%` }} />
                      </div>
                      <span className="text-xs font-medium text-blue-700 w-9 text-right">{o.dryStorage}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>

      {/* ── Job Profitability ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4 text-orange-600" />
              Job Profitability — Recent Work Orders
            </CardTitle>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => window.print()}>
              <Download className="h-3 w-3" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                <th className="text-left py-2 pr-3">Work Order</th>
                <th className="text-left py-2 pr-3">Boat</th>
                <th className="text-left py-2 pr-3">Category</th>
                <th className="text-right py-2 pr-3">Revenue</th>
                <th className="text-right py-2 pr-3">Cost</th>
                <th className="text-right py-2 pr-3">Profit</th>
                <th className="text-right py-2 pr-3">Margin</th>
                <th className="text-left py-2">Visual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {JOB_MARGIN_DATA.map((j) => {
                const profit = j.revenue - j.cost
                const margin = j.revenue > 0 ? (profit / j.revenue) * 100 : 0
                const marginColor = margin >= 35 ? "text-green-600" : margin >= 25 ? "text-amber-600" : "text-red-500"
                const barColor    = margin >= 35 ? "bg-green-400" : margin >= 25 ? "bg-amber-400" : "bg-red-400"
                return (
                  <tr key={j.wo} className="hover:bg-gray-50">
                    <td className="py-2.5 pr-3 font-mono text-xs text-teal-700">{j.wo}</td>
                    <td className="py-2.5 pr-3 font-medium">{j.boat}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{j.category}</td>
                    <td className="py-2.5 pr-3 text-right">{formatTHB(j.revenue)}</td>
                    <td className="py-2.5 pr-3 text-right text-gray-500">{formatTHB(j.cost)}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold text-gray-900">{formatTHB(profit)}</td>
                    <td className={`py-2.5 pr-3 text-right font-bold ${marginColor}`}>{margin.toFixed(1)}%</td>
                    <td className="py-2.5 w-24">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(margin, 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td colSpan={3} className="pt-2 text-xs font-semibold text-gray-500">Average</td>
                <td className="pt-2 text-right font-bold">
                  {formatTHB(JOB_MARGIN_DATA.reduce((s, j) => s + j.revenue, 0) / JOB_MARGIN_DATA.length)}
                </td>
                <td className="pt-2 text-right font-bold text-gray-500">
                  {formatTHB(JOB_MARGIN_DATA.reduce((s, j) => s + j.cost, 0) / JOB_MARGIN_DATA.length)}
                </td>
                <td className="pt-2 text-right font-bold">
                  {formatTHB(JOB_MARGIN_DATA.reduce((s, j) => s + j.revenue - j.cost, 0) / JOB_MARGIN_DATA.length)}
                </td>
                <td className="pt-2 text-right font-bold text-green-700">
                  {(avgMargin * 100).toFixed(1)}%
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* ── Report Catalog ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {REPORT_GROUPS.map(({ title, icon: Icon, color, reports }) => (
          <Card key={title}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {reports.map(({ name, description, available, href }) => {
                  const inner = (
                    <>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                      </div>
                      {available ? (
                        <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 shrink-0">Coming soon</span>
                      )}
                    </>
                  )
                  return available && href ? (
                    <Link key={name} href={href} className="flex items-center justify-between px-5 py-3 group hover:bg-gray-50 cursor-pointer">
                      {inner}
                    </Link>
                  ) : (
                    <div key={name} className={`flex items-center justify-between px-5 py-3 group ${available ? "hover:bg-gray-50 cursor-pointer" : "opacity-50"}`}>
                      {inner}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  )
}
