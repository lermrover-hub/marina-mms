"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft, Phone, Mail, Calendar, CheckCircle,
  Clock, AlertCircle, Loader2, Wrench, Users
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Staff, WorkOrder } from "@/lib/supabase"

// ─── Types ────────────────────────────────────────────────────────────────────
type StaffRow = Staff & {
  department: string | null
  hire_date: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLE_LABEL: Record<string, string> = {
  TECHNICIAN:       "Technician",
  HEAD_MECHANIC:    "Head Mechanic",
  ELECTRICIAN:      "Electrician",
  PAINTER:          "Painter",
  FIBERGLASS_TECH:  "Fiberglass Tech",
  OPERATION_STAFF:  "Operation Staff",
  ACCOUNTANT:       "Accountant",
  CUSTOMER_SERVICE: "Customer Service",
  MANAGER:          "Manager",
}

const DEPT_COLOR: Record<string, string> = {
  "Boat Yard":    "bg-orange-100 text-orange-700",
  "Marina Ops":   "bg-teal-100 text-teal-700",
  "Finance":      "bg-blue-100 text-blue-700",
  "Front Office": "bg-purple-100 text-purple-700",
}

const WO_STATUS_STYLE: Record<string, { badge: string; icon: React.ReactNode }> = {
  NEW_REQUEST:    { badge: "bg-gray-100 text-gray-600",    icon: <Clock className="h-3 w-3" /> },
  IN_PROGRESS:    { badge: "bg-blue-100 text-blue-700",    icon: <AlertCircle className="h-3 w-3" /> },
  COMPLETED:      { badge: "bg-green-100 text-green-700",  icon: <CheckCircle className="h-3 w-3" /> },
  CLOSED:         { badge: "bg-gray-200 text-gray-500",    icon: <CheckCircle className="h-3 w-3" /> },
  APPROVED:       { badge: "bg-teal-100 text-teal-700",    icon: <AlertCircle className="h-3 w-3" /> },
  ON_HOLD:        { badge: "bg-amber-100 text-amber-700",  icon: <Clock className="h-3 w-3" /> },
  CANCELLED:      { badge: "bg-red-100 text-red-600",      icon: <Clock className="h-3 w-3" /> },
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function StaffDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""

  const [member,     setMember]     = useState<StaffRow | null>(null)
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      fetch(`/api/db/staff/${id}`).then(r => r.json()),
      fetch("/api/db/work-orders").then(r => r.json()),
    ])
      .then(([staffData, woData]) => {
        if (staffData?.error) setError("Staff member not found")
        else setMember(staffData)
        if (Array.isArray(woData)) setWorkOrders(woData)
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
      </div>
    )
  }

  if (error || !member) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Users className="h-10 w-10 text-gray-200 mb-3" />
        <p className="text-gray-500">{error ?? "Staff member not found"}</p>
        <Link href="/staff" className="text-sm text-teal-600 hover:underline mt-2">← Back to Staff</Link>
      </div>
    )
  }

  // Work orders assigned to this staff member (match by name)
  const assigned = workOrders.filter(wo =>
    wo.assigned_to && (
      wo.assigned_to.toLowerCase().includes(member.name.toLowerCase().split(" ")[0]) ||
      member.name.toLowerCase().includes(wo.assigned_to.toLowerCase())
    )
  )

  const openWOs      = assigned.filter(w => !["COMPLETED","CLOSED","CANCELLED"].includes(w.status))
  const completedWOs = assigned.filter(w => w.status === "COMPLETED" || w.status === "CLOSED")
  const totalRevenue = assigned.reduce((s, w) => s + (w.total_revenue ?? 0), 0)

  const dept = member.department ?? "—"
  const initials = member.name.split(" ").map(n => n[0]).slice(0, 2).join("")

  return (
    <div className="space-y-6">
      <PageHeader
        title={member.name}
        description={`${ROLE_LABEL[member.role] ?? member.role}${dept !== "—" ? " · " + dept : ""}`}
        breadcrumb={[{ label: "Staff", href: "/staff" }, { label: member.name }]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/staff"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Left: work orders ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Active Jobs",       value: openWOs.length,      bg: "bg-orange-100", text: "text-orange-800" },
              { label: "Completed Jobs",    value: completedWOs.length, bg: "bg-green-100",  text: "text-green-800" },
              { label: "Total Job Revenue", value: `฿${(totalRevenue/1000).toFixed(0)}k`,    bg: "bg-blue-100",   text: "text-blue-800" },
            ].map(({ label, value, bg, text }) => (
              <Card key={label}><CardContent className={`p-4 ${bg}`}>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-xl font-bold ${text}`}>{value}</p>
              </CardContent></Card>
            ))}
          </div>

          {/* Assigned work orders */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4 text-orange-400" />
                Assigned Work Orders
                <span className="ml-auto text-xs text-gray-400 font-normal">{assigned.length} total</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {assigned.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">No work orders assigned to this staff member.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Reference</th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Job</th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Boat</th>
                      <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500">Revenue</th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {assigned.map(wo => {
                      const st = WO_STATUS_STYLE[wo.status] ?? WO_STATUS_STYLE.NEW_REQUEST
                      return (
                        <tr key={wo.id} className={`hover:bg-gray-50 ${wo.status === "CLOSED" || wo.status === "CANCELLED" ? "opacity-60" : ""}`}>
                          <td className="px-5 py-3">
                            <Link href={`/work-orders/${wo.id}`} className="font-mono text-xs text-teal-700 hover:underline">
                              {wo.reference}
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-800 max-w-[180px] truncate">{wo.title}</td>
                          <td className="px-5 py-3 text-xs text-gray-600">{wo.boat_name ?? "—"}</td>
                          <td className="px-5 py-3 text-right text-xs font-semibold text-gray-700">
                            ฿{(wo.total_revenue ?? 0).toLocaleString()}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.badge}`}>
                              {st.icon}{wo.status.replace(/_/g, " ")}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-5">
          {/* Profile card */}
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col items-center text-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xl font-bold mb-3">
                  {initials}
                </div>
                <p className="font-bold text-gray-900">{member.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{ROLE_LABEL[member.role] ?? member.role}</p>
                <div className="flex gap-2 mt-2 flex-wrap justify-center">
                  <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${member.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {member.active ? "ACTIVE" : "INACTIVE"}
                  </span>
                  {dept !== "—" && (
                    <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${DEPT_COLOR[dept] ?? "bg-gray-100 text-gray-600"}`}>
                      {dept}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2.5 border-t pt-4">
                {member.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" /> {member.phone}
                  </div>
                )}
                {member.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4 text-gray-400 shrink-0" /> {member.email}
                  </div>
                )}
                {member.hire_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                    Joined {new Date(member.hire_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Specialty */}
          {member.specialty && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Specialty</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {member.specialty.split(/[,/]/).map(sp => sp.trim()).filter(Boolean).map(sp => (
                    <span key={sp} className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs px-3 py-1 font-medium">{sp}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Live indicator */}
      <p className="text-xs text-gray-400 text-center pb-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 align-middle" />
        Live database · {assigned.length} work orders found
      </p>
    </div>
  )
}
