"use client"
import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Bell, AlertTriangle, Receipt, Wrench, ShieldAlert,
  CheckCircle2, FileText, Loader2, RefreshCw, Anchor,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { formatDate } from "@/lib/utils"

// ─── types ────────────────────────────────────────────────────────────────────

type Alert = {
  id: string
  type: string
  priority: "HIGH" | "MEDIUM" | "LOW"
  title: string
  message: string
  href: string
  date: string
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  OVERDUE_INVOICE:   { icon: Receipt,    color: "text-red-500 bg-red-50",     label: "Invoice Alert"    },
  CONTRACT_EXPIRY:   { icon: FileText,   color: "text-amber-500 bg-amber-50", label: "Contract Alert"   },
  INSURANCE_EXPIRY:  { icon: ShieldAlert,color: "text-amber-500 bg-amber-50", label: "Insurance Alert"  },
  WORK_ORDER_OVERDUE:{ icon: Wrench,     color: "text-orange-500 bg-orange-50",label: "Work Order"      },
  RAMP_TODAY:        { icon: Anchor,     color: "text-teal-500 bg-teal-50",   label: "Ramp Operation"   },
  SERVICE_REQUEST:   { icon: CheckCircle2,color:"text-blue-500 bg-blue-50",   label: "Service Request"  },
}

const PRIORITY_COLORS: Record<string, string> = {
  HIGH:   "bg-red-100 text-red-700 border-red-200",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
  LOW:    "bg-gray-100 text-gray-600 border-gray-200",
}

const TYPE_FILTERS = ["ALL", "OVERDUE_INVOICE", "CONTRACT_EXPIRY", "INSURANCE_EXPIRY", "WORK_ORDER_OVERDUE", "RAMP_TODAY", "SERVICE_REQUEST"]

// ─── helpers ─────────────────────────────────────────────────────────────────

function daysBetween(a: string, b: string) {
  return Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [loading,     setLoading]     = useState(true)
  const [alerts,      setAlerts]      = useState<Alert[]>([])
  const [typeFilter,  setTypeFilter]  = useState("ALL")
  const [dismissed,   setDismissed]   = useState<Set<string>>(new Set())

  const today = new Date().toISOString().slice(0, 10)

  async function loadAlerts() {
    setLoading(true)
    const generated: Alert[] = []

    try {
      // 1. Overdue invoices
      const invoices = await fetch("/api/db/invoices").then(r => r.json()).catch(() => [])
      if (Array.isArray(invoices)) {
        for (const inv of invoices) {
          if (inv.status === "OVERDUE" || (inv.due_date && inv.due_date < today && !["PAID","CANCELLED"].includes(inv.status) && (inv.outstanding_balance ?? 0) > 0)) {
            const days = inv.due_date ? daysBetween(inv.due_date, today) : 0
            generated.push({
              id:       `inv-${inv.id}`,
              type:     "OVERDUE_INVOICE",
              priority: days > 14 ? "HIGH" : "MEDIUM",
              title:    "Overdue Invoice",
              message:  `${inv.invoice_number} — ${inv.customer_name ?? "—"} is ${days} day${days !== 1 ? "s" : ""} overdue. Outstanding: ฿${(inv.outstanding_balance ?? 0).toLocaleString()}`,
              href:     `/invoices/${inv.id}`,
              date:     inv.due_date ?? inv.invoice_date,
            })
          }
        }
      }

      // 2. Expiring contracts (active, end_date within 60 days)
      const contracts = await fetch("/api/db/contracts?status=ACTIVE").then(r => r.json()).catch(() => [])
      if (Array.isArray(contracts)) {
        for (const c of contracts) {
          if (!c.end_date) continue
          const days = daysBetween(today, c.end_date)
          if (days >= 0 && days <= 60) {
            generated.push({
              id:       `ctr-${c.id}`,
              type:     "CONTRACT_EXPIRY",
              priority: days <= 14 ? "HIGH" : days <= 30 ? "MEDIUM" : "LOW",
              title:    "Contract Expiring",
              message:  `${c.contract_number} — ${c.customer_name ?? "—"} expires in ${days} day${days !== 1 ? "s" : ""} (${formatDate(c.end_date)})`,
              href:     `/contracts/${c.id}`,
              date:     today,
            })
          }
        }
      }

      // 3. Boat insurance expiring within 90 days
      const boats = await fetch("/api/db/boats").then(r => r.json()).catch(() => [])
      if (Array.isArray(boats)) {
        for (const b of boats) {
          if (!b.insurance_expiry) continue
          const days = daysBetween(today, b.insurance_expiry)
          if (days >= 0 && days <= 90) {
            generated.push({
              id:       `ins-${b.id}`,
              type:     "INSURANCE_EXPIRY",
              priority: days <= 30 ? "HIGH" : "MEDIUM",
              title:    "Insurance Expiring",
              message:  `${b.name} — insurance expires in ${days} day${days !== 1 ? "s" : ""} (${formatDate(b.insurance_expiry)})`,
              href:     `/boats/${b.id}`,
              date:     today,
            })
          }
        }
      }

      // 4. Today's ramp bookings
      const ramps = await fetch("/api/db/ramp-bookings").then(r => r.json()).catch(() => [])
      if (Array.isArray(ramps)) {
        for (const r of ramps) {
          if (r.requested_date === today && !["CANCELLED","COMPLETED"].includes(r.status)) {
            generated.push({
              id:       `ramp-${r.id}`,
              type:     "RAMP_TODAY",
              priority: "MEDIUM",
              title:    "Ramp Operation Today",
              message:  `${r.reference} — ${r.operation_type.replace(/_/g," ")} for ${r.boat_name ?? "—"}${r.confirmed_time ? ` at ${r.confirmed_time}` : " (time TBC)"}`,
              href:     `/ramp-bookings/${r.id}`,
              date:     today,
            })
          }
        }
      }

      // 5. Work orders overdue (scheduled end date passed, not completed)
      const wos = await fetch("/api/db/work-orders").then(r => r.json()).catch(() => [])
      if (Array.isArray(wos)) {
        for (const w of wos) {
          if (w.scheduled_end && w.scheduled_end < today && !["COMPLETED","CLOSED","CANCELLED"].includes(w.status)) {
            const days = daysBetween(w.scheduled_end, today)
            generated.push({
              id:       `wo-${w.id}`,
              type:     "WORK_ORDER_OVERDUE",
              priority: days > 7 ? "HIGH" : "MEDIUM",
              title:    "Work Order Overdue",
              message:  `${w.reference} — ${w.title ?? "Work order"} is ${days} day${days !== 1 ? "s" : ""} past scheduled end`,
              href:     `/work-orders/${w.id}`,
              date:     today,
            })
          }
        }
      }

      // Sort by priority then date
      const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }
      generated.sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2))
      setAlerts(generated)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { loadAlerts() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() =>
    alerts.filter(a => !dismissed.has(a.id) && (typeFilter === "ALL" || a.type === typeFilter)),
    [alerts, dismissed, typeFilter]
  )

  const highCount = alerts.filter(a => !dismissed.has(a.id) && a.priority === "HIGH").length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications & Alerts"
        description="Live operational alerts from across the system"
        actions={
          <Button size="sm" variant="outline" className="gap-2" onClick={loadAlerts} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        }
      />

      {/* Summary banner */}
      {highCount > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <div>
            <span className="font-semibold text-red-700">{highCount} high-priority alert{highCount > 1 ? "s" : ""} require attention</span>
            <span className="text-red-500 text-sm ml-2">— overdue invoices, expiring contracts, or delayed work orders</span>
          </div>
        </div>
      )}

      {/* Type filters */}
      <div className="flex flex-wrap gap-1.5">
        {TYPE_FILTERS.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              typeFilter === t ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {t === "ALL" ? `All (${alerts.filter(a => !dismissed.has(a.id)).length})` : TYPE_CONFIG[t]?.label ?? t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Scanning for alerts…
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-gray-400">
            <Bell className="h-10 w-10 mb-3 text-gray-300" />
            <p className="text-sm font-medium">{typeFilter === "ALL" ? "No active alerts" : "No alerts in this category"}</p>
            <p className="text-xs mt-1">System is up to date</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(alert => {
            const cfg  = TYPE_CONFIG[alert.type] ?? { icon: Bell, color: "text-gray-500 bg-gray-50", label: alert.type }
            const Icon = cfg.icon
            return (
              <Card key={alert.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 shrink-0 ${cfg.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{alert.title}</span>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[alert.priority]}`}>
                          {alert.priority}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">{cfg.label}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{alert.message}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={alert.href}>
                        <Button size="sm" variant="outline" className="text-xs h-7 px-2">View</Button>
                      </Link>
                      <button onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
                        className="text-gray-300 hover:text-gray-500 transition-colors text-xs px-1">✕</button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          <p className="text-xs text-gray-400 text-center pt-2">
            Showing {filtered.length} alert{filtered.length !== 1 ? "s" : ""} · {dismissed.size > 0 ? `${dismissed.size} dismissed this session` : "Click ✕ to dismiss"}
          </p>
        </div>
      )}
    </div>
  )
}
