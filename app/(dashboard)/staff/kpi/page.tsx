"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Users, CheckCircle2, Clock, Loader2, ArrowLeft, Anchor, Award } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type StaffKPI = {
  id: string; full_name: string; role: string; department: string | null
  kpi: { totalTasks: number; completedTasks: number; pendingTasks: number; rampOps: number; completionRate: number }
}

function RateBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-green-500" : value >= 50 ? "bg-teal-500" : "bg-amber-500"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold w-8 text-right text-gray-700">{value}%</span>
    </div>
  )
}

export default function StaffKPIPage() {
  const [staff, setStaff]     = useState<StaffKPI[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/db/staff/kpi").then(r => r.json())
      .then(d => Array.isArray(d) && setStaff(d))
      .finally(() => setLoading(false))
  }, [])

  const chartData = staff.map(s => ({
    name: s.full_name.split(" ")[0],
    Completed: s.kpi.completedTasks,
    Pending: s.kpi.pendingTasks,
    Ramp: s.kpi.rampOps,
  }))

  const topPerformer = [...staff].sort((a, b) => b.kpi.completionRate - a.kpi.completionRate)[0]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff KPI Dashboard"
        description="Task completion rates and operational performance"
        breadcrumb={[{ label: "Staff", href: "/staff" }, { label: "KPI Dashboard" }]}
        actions={
          <Link href="/staff" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600">
            <ArrowLeft className="h-4 w-4" /> Back to Staff
          </Link>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading KPI data…
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card><CardContent className="p-4">
              <div className="text-xs text-gray-500 font-medium">Total Staff</div>
              <div className="text-2xl font-bold text-gray-800 mt-1">{staff.length}</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-gray-500 font-medium">Total Tasks</div>
              <div className="text-2xl font-bold text-gray-800 mt-1">{staff.reduce((s, x) => s + x.kpi.totalTasks, 0)}</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Completed</div>
              <div className="text-2xl font-bold text-green-700 mt-1">{staff.reduce((s, x) => s + x.kpi.completedTasks, 0)}</div>
            </CardContent></Card>
            {topPerformer && (
              <Card><CardContent className="p-4">
                <div className="text-xs text-amber-600 font-medium flex items-center gap-1"><Award className="h-3 w-3" />Top Performer</div>
                <div className="text-sm font-bold text-gray-800 mt-1">{topPerformer.full_name.split(" ")[0]}</div>
                <div className="text-xs text-gray-500">{topPerformer.kpi.completionRate}% rate</div>
              </CardContent></Card>
            )}
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Task Activity by Staff</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="Completed" fill="#16a34a" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="Pending"   fill="#f59e0b" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="Ramp"      fill="#14b8a6" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* KPI table */}
          <Card>
            <CardHeader><CardTitle className="text-base">KPI by Staff Member</CardTitle></CardHeader>
            <CardContent className="p-0">
              {staff.length === 0 ? (
                <p className="text-center text-gray-400 py-12 text-sm">No staff data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-gray-50">
                      {["Staff", "Role", "Total Tasks", "Completed", "Pending", "Ramp Ops", "Completion Rate"].map(h => (
                        <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase ${["Total Tasks", "Completed", "Pending", "Ramp Ops"].includes(h) ? "text-center" : h === "Completion Rate" ? "text-left pl-8" : "text-left"}`}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y">
                      {staff.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Link href={`/staff/${s.id}`} className="font-medium text-teal-700 hover:underline">{s.full_name}</Link>
                            {s.department && <p className="text-xs text-gray-400">{s.department}</p>}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{s.role ?? "—"}</td>
                          <td className="px-4 py-3 text-center font-semibold">{s.kpi.totalTasks}</td>
                          <td className="px-4 py-3 text-center text-green-700 font-medium">{s.kpi.completedTasks}</td>
                          <td className="px-4 py-3 text-center text-amber-600">{s.kpi.pendingTasks}</td>
                          <td className="px-4 py-3 text-center text-teal-600">{s.kpi.rampOps}</td>
                          <td className="px-4 py-3 w-40"><RateBar value={s.kpi.completionRate} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
