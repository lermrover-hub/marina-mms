"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, ArrowDownCircle, ArrowUpCircle, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { formatTHB } from "@/lib/utils"

const TYPE_STYLE: Record<string, { style: string; icon: React.ReactNode; label: string }> = {
  stock_in:   { style: "bg-green-100 text-green-700", icon: <ArrowDownCircle className="h-3.5 w-3.5" />, label: "Stock In" },
  stock_out:  { style: "bg-orange-100 text-orange-700", icon: <ArrowUpCircle className="h-3.5 w-3.5" />, label: "Stock Out" },
  adjustment: { style: "bg-blue-100 text-blue-700", icon: <RefreshCw className="h-3.5 w-3.5" />, label: "Adjustment" },
  issue:      { style: "bg-purple-100 text-purple-700", icon: <ArrowUpCircle className="h-3.5 w-3.5" />, label: "Issue to WO" },
}

interface StockMovement {
  id: string; item_code?: string; item_name?: string; movement_type: string
  quantity: number; unit_cost?: number; reference_type?: string; reference_id?: string
  notes?: string; created_by?: string; created_at: string
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [filter,    setFilter]    = useState("All")
  const [search,    setSearch]    = useState("")
  const [loading,   setLoading]   = useState(true)

  const FILTERS = ["All", "stock_in", "stock_out", "adjustment", "issue"]

  useEffect(() => {
    const url = filter === "All" ? "/api/db/stock-movements" : `/api/db/stock-movements?movement_type=${filter}`
    fetch(url)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setMovements(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setMovements([]); setLoading(false) })
  }, [filter])

  const visible = movements.filter(m => {
    const q = search.toLowerCase()
    return !q || (m.item_name ?? "").toLowerCase().includes(q) || (m.item_code ?? "").toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements"
        description="All inventory in / out / adjustment transactions"
        actions={
          <Button size="sm" className="gap-2" asChild>
            <Link href="/inventory"><ArrowDownCircle className="h-4 w-4" />Back to Inventory</Link>
          </Button>
        }
      />

      <Card><CardContent className="p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search item name or code…"
            className="pl-9 pr-4 py-1.5 border rounded-md text-sm w-full"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === f ? "bg-navy-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {f === "All" ? "All Types" : TYPE_STYLE[f]?.label ?? f}
            </button>
          ))}
        </div>
      </CardContent></Card>

      <Card>
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No stock movements found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date / Time</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Cost</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reference</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map(m => {
                  const t = TYPE_STYLE[m.movement_type]
                  return (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(m.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium">{m.item_name ?? "Unknown"}</div>
                        {m.item_code && <div className="font-mono text-xs text-gray-400">{m.item_code}</div>}
                      </td>
                      <td className="px-5 py-3">
                        {t ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${t.style}`}>
                            {t.icon}{t.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">{m.movement_type}</span>
                        )}
                      </td>
                      <td className={`px-5 py-3 text-right font-mono font-medium ${m.movement_type === "stock_in" ? "text-green-700" : "text-orange-700"}`}>
                        {m.movement_type === "stock_in" ? "+" : "-"}{m.quantity}
                      </td>
                      <td className="px-5 py-3 text-right font-mono">{m.unit_cost ? formatTHB(m.unit_cost) : "—"}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {m.reference_type && <span>{m.reference_type}</span>}
                        {m.reference_id && <span className="ml-1 font-mono">{m.reference_id.slice(0, 8)}</span>}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400">{m.notes ?? "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
