"use client"
import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, type PieLabelRenderProps } from "recharts"
import { Users, Star, AlertCircle, Clock, UserPlus, Loader2, ArrowLeft } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTHB } from "@/lib/utils"

type SegCustomer = {
  id: string; name: string; customer_type: string; status: string
  totalRevenue: number; invCount: number; lastDate: string | null
  daysSinceLast: number | null; boats: number; segment: string
}

type SegData = {
  customers: SegCustomer[]
  segments: Record<string, number>
  totalRevenue: number
}

const SEG_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType; desc: string }> = {
  "VIP":     { color: "#7c3aed", bg: "bg-purple-100 text-purple-700", icon: Star,        desc: "Revenue > ฿500k"     },
  "Active":  { color: "#14b8a6", bg: "bg-teal-100 text-teal-700",     icon: Users,       desc: "Active last 90 days" },
  "At Risk": { color: "#f59e0b", bg: "bg-amber-100 text-amber-700",   icon: AlertCircle, desc: "90–180 days inactive" },
  "Dormant": { color: "#6b7280", bg: "bg-gray-100 text-gray-600",     icon: Clock,       desc: "180+ days inactive"  },
  "New":     { color: "#3b82f6", bg: "bg-blue-100 text-blue-700",     icon: UserPlus,    desc: "No invoices yet"     },
}

export default function CustomerSegmentationPage() {
  const [data,    setData]    = useState<SegData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState("All")

  useEffect(() => {
    fetch("/api/db/customers/segmentation")
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!data) return []
    return filter === "All" ? data.customers : data.customers.filter(c => c.segment === filter)
  }, [data, filter])

  const pieData = data
    ? Object.entries(data.segments)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value, fill: SEG_CONFIG[name]?.color ?? "#999" }))
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Segmentation"
        description="RFM-based customer health and value analysis"
        breadcrumb={[{ label: "Customers", href: "/customers" }, { label: "Segmentation" }]}
        actions={
          <Link href="/customers" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600">
            <ArrowLeft className="h-4 w-4" /> Back to Customers
          </Link>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Analysing customers…
        </div>
      ) : data && (
        <>
          {/* Segment cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {Object.entries(SEG_CONFIG).map(([seg, cfg]) => {
              const Icon = cfg.icon
              const count = data.segments[seg] ?? 0
              return (
                <button
                  key={seg}
                  onClick={() => setFilter(filter === seg ? "All" : seg)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    filter === seg ? "ring-2 ring-teal-500 border-transparent" : "border-gray-200 hover:border-teal-300"
                  } bg-white`}
                >
                  <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold mb-2 ${cfg.bg}`}>
                    <Icon className="h-3 w-3" />{seg}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{cfg.desc}</p>
                </button>
              )
            })}
          </div>

          {/* Chart + top customers */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Segment Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }: PieLabelRenderProps) =>
                          `${name ?? ""} ${(((percent as number) ?? 0) * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-purple-500" />Top Customers by Revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.customers
                  .sort((a, b) => b.totalRevenue - a.totalRevenue)
                  .slice(0, 5)
                  .map((c, i) => {
                    const cfg = SEG_CONFIG[c.segment]
                    const Icon = cfg?.icon ?? Users
                    return (
                      <div key={c.id} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/customers/${c.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-teal-600 truncate block"
                          >
                            {c.name}
                          </Link>
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${cfg?.bg ?? "bg-gray-100 text-gray-600"}`}>
                            <Icon className="h-3 w-3" />{c.segment}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 tabular-nums shrink-0">
                          {formatTHB(c.totalRevenue)}
                        </span>
                      </div>
                    )
                  })}
                {data.customers.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No customer data</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Customer table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Customers ({filtered.length})</CardTitle>
                {filter !== "All" && (
                  <button onClick={() => setFilter("All")} className="text-xs text-teal-600 hover:underline">
                    Clear filter
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      {["Customer", "Type", "Segment", "Boats", "Invoices", "Revenue", "Last Active"].map(h => (
                        <th
                          key={h}
                          className={`px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase ${
                            ["Boats", "Invoices", "Revenue"].includes(h) ? "text-right" : "text-left"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered
                      .sort((a, b) => b.totalRevenue - a.totalRevenue)
                      .map(c => {
                        const cfg = SEG_CONFIG[c.segment]
                        const Icon = cfg?.icon ?? Users
                        return (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <Link href={`/customers/${c.id}`} className="font-medium text-teal-700 hover:underline">
                                {c.name || "—"}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {c.customer_type?.replace(/_/g, " ") ?? "—"}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg?.bg ?? "bg-gray-100 text-gray-600"}`}>
                                <Icon className="h-3 w-3" />{c.segment}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">{c.boats}</td>
                            <td className="px-4 py-3 text-right">{c.invCount}</td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums">
                              {formatTHB(c.totalRevenue)}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {c.daysSinceLast !== null ? `${c.daysSinceLast}d ago` : "Never"}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
