"use client"
import React, { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Search, Plus, Download, AlertTriangle, Package, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { formatTHB } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────
type InventoryItem = {
  id: string
  item_code: string
  name: string
  category: string | null
  unit: string
  on_hand: number
  min_stock: number
  avg_cost: number
  selling_price: number
  supplier: string | null
  charge_to_customer: boolean
  status: string
  notes: string | null
  created_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ["All", "Engine", "Paint", "Electrical", "Fiberglass", "Cleaning", "Mechanical", "Safety", "Misc"]

const STATUS_STYLE: Record<string, { badge: string; row: string }> = {
  OK:  { badge: "bg-green-100 text-green-700",  row: "" },
  LOW: { badge: "bg-amber-100 text-amber-700",  row: "bg-amber-50/40" },
  OUT: { badge: "bg-red-100 text-red-700",      row: "bg-red-50/40" },
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const [items,       setItems]   = useState<InventoryItem[]>([])
  const [loading,     setLoading] = useState(true)
  const [error,       setError]   = useState<string | null>(null)
  const [search,      setSearch]  = useState("")
  const [catFilter,   setCat]     = useState("All")
  const [showLowOnly, setLow]     = useState(false)

  useEffect(() => {
    fetch("/api/db/inventory")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setItems(data)
        else setError("Failed to load inventory")
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() =>
    items.filter(i => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        i.name.toLowerCase().includes(q) ||
        i.item_code.toLowerCase().includes(q) ||
        (i.supplier ?? "").toLowerCase().includes(q)
      const matchCat  = catFilter === "All" || i.category === catFilter
      const matchLow  = !showLowOnly || i.status !== "OK"
      return matchSearch && matchCat && matchLow
    }),
  [items, search, catFilter, showLowOnly])

  const stats = useMemo(() => ({
    total:      items.length,
    ok:         items.filter(i => i.status === "OK").length,
    low:        items.filter(i => i.status === "LOW").length,
    out:        items.filter(i => i.status === "OUT").length,
    totalValue: items.reduce((s, i) => s + (i.on_hand * i.avg_cost), 0),
  }), [items])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description={loading ? "Loading…" : `${stats.total} items · Stock value ${formatTHB(stats.totalValue)}`}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" className="gap-2" asChild>
              <Link href="/inventory/new"><Plus className="h-4 w-4" /> Add Item</Link>
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total Items",  value: stats.total,      bg: "bg-gray-100",   text: "text-gray-800" },
          { label: "OK",           value: stats.ok,         bg: "bg-green-100",  text: "text-green-800" },
          { label: "Low Stock",    value: stats.low,        bg: "bg-amber-100",  text: "text-amber-800" },
          { label: "Out of Stock", value: stats.out,        bg: "bg-red-100",    text: "text-red-800" },
          { label: "Stock Value",  value: loading ? "—" : formatTHB(stats.totalValue), bg: "bg-teal-100", text: "text-teal-800" },
        ].map(({ label, value, bg, text }) => (
          <Card key={label} className="overflow-hidden">
            <CardContent className={`p-4 ${bg}`}>
              <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
              <p className={`text-xl font-bold ${text}`}>{loading ? "—" : value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low/out stock alert */}
      {!loading && (stats.low + stats.out) > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Stock Alert</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {stats.out > 0 && <span>{stats.out} item{stats.out !== 1 ? "s" : ""} out of stock. </span>}
              {stats.low > 0 && <span>{stats.low} item{stats.low !== 1 ? "s" : ""} below minimum stock level.</span>}
            </p>
          </div>
          <button onClick={() => setLow(v => !v)}
            className="ml-auto text-xs font-semibold text-amber-700 hover:underline whitespace-nowrap">
            {showLowOnly ? "Show all" : "Show alerts only"}
          </button>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search name, code, supplier…" value={search}
                onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-1 flex-wrap">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCat(c)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors
                    ${catFilter === c ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {c === "All" ? "All Categories" : c}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading inventory…
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      {!loading && !error && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Category</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">On Hand</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Min Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Avg Cost</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Sell Price</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Supplier</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-gray-400">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No items found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(item => {
                    const ss = STATUS_STYLE[item.status] ?? STATUS_STYLE.OK
                    const isLow = item.on_hand <= item.min_stock && item.on_hand > 0
                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${ss.row}`}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                          <p className="text-[10px] font-mono text-gray-400 mt-0.5">{item.item_code}</p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs text-gray-600">{item.category ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold text-sm ${item.status === "OUT" ? "text-red-600" : isLow ? "text-amber-600" : "text-gray-800"}`}>
                            {item.on_hand}
                          </span>
                          <span className="text-[10px] text-gray-400 ml-1">{item.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-500 hidden md:table-cell">
                          {item.min_stock} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-600 hidden lg:table-cell">
                          {formatTHB(item.avg_cost)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-600 hidden lg:table-cell">
                          {formatTHB(item.selling_price)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 hidden xl:table-cell">
                          {item.supplier ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ss.badge}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/inventory/${item.id}`}
                            className="text-xs text-teal-600 hover:underline font-medium">
                            View
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Live indicator */}
      <p className="text-xs text-gray-400 text-center pb-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 align-middle" />
        Live database · {items.length} items loaded
      </p>
    </div>
  )
}
