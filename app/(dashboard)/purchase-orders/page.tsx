"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, ShoppingCart, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { formatTHB } from "@/lib/utils"

const STATUS_STYLE: Record<string, string> = {
  draft:    "bg-gray-100 text-gray-600",
  sent:     "bg-blue-100 text-blue-700",
  approved: "bg-purple-100 text-purple-700",
  received: "bg-green-100 text-green-700",
  cancelled:"bg-red-100 text-red-700",
}

interface PurchaseOrder {
  id: string; po_number: string; supplier_name?: string; status: string
  order_date?: string; expected_date?: string; total_amount?: number; notes?: string
}

export default function PurchaseOrdersPage() {
  const [pos,     setPos]    = useState<PurchaseOrder[]>([])
  const [filter,  setFilter] = useState("All")
  const [search,  setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const FILTERS = ["All", "draft", "sent", "approved", "received", "cancelled"]

  useEffect(() => {
    fetch("/api/db/purchase-orders")
      .then(r => r.ok ? r.json() : [])
      .then(d => { setPos(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setPos([]); setLoading(false) })
  }, [])

  const visible = pos.filter(p => {
    const matchStatus = filter === "All" || p.status === filter
    const q = search.toLowerCase()
    const matchSearch = !q || p.po_number.toLowerCase().includes(q) || (p.supplier_name ?? "").toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Manage supplier purchase orders and procurement"
        actions={
          <Button size="sm" className="gap-2" asChild>
            <Link href="/purchase-orders/new"><Plus className="h-4 w-4" />New PO</Link>
          </Button>
        }
      />

      <Card><CardContent className="p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search PO number or supplier…"
            className="pl-9 pr-4 py-1.5 border rounded-md text-sm w-full"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === f ? "bg-navy-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {f === "All" ? "All Status" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </CardContent></Card>

      <Card>
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No purchase orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">PO Number</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expected</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/purchase-orders/${p.id}`} className="font-medium text-teal-700 hover:underline font-mono">
                        {p.po_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{p.supplier_name ?? "—"}</td>
                    <td className="px-5 py-3 text-gray-500">{p.order_date ? new Date(p.order_date).toLocaleDateString("en-GB") : "—"}</td>
                    <td className="px-5 py-3 text-gray-500">{p.expected_date ? new Date(p.expected_date).toLocaleDateString("en-GB") : "—"}</td>
                    <td className="px-5 py-3 text-right font-medium">{p.total_amount ? formatTHB(p.total_amount) : "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[p.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
