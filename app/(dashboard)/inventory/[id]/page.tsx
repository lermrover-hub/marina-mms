"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft, Package, TrendingDown, TrendingUp, Minus,
  AlertTriangle, Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { InventoryItem } from "@/lib/supabase"
import { formatTHB } from "@/lib/utils"

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  OK:  "bg-green-100 text-green-700 border-green-300",
  LOW: "bg-amber-100 text-amber-700 border-amber-300",
  OUT: "bg-red-100 text-red-700 border-red-300",
}

// ─── Stock Adjust Modal ────────────────────────────────────────────────────────
function StockAdjustModal({
  item,
  onClose,
  onSaved,
}: {
  item: InventoryItem
  onClose: () => void
  onSaved: (updated: InventoryItem) => void
}) {
  const [type,   setType]   = useState<"IN" | "OUT" | "ADJUST">("IN")
  const [qty,    setQty]    = useState("")
  const [ref,    setRef]    = useState("")
  const [note,   setNote]   = useState("")
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState<string | null>(null)

  async function handleSave() {
    const n = parseFloat(qty)
    if (isNaN(n) || n < 0) { setErr("Enter a valid quantity"); return }

    setSaving(true)
    setErr(null)
    try {
      let newQty: number
      if (type === "IN")     newQty = item.on_hand + n
      else if (type === "OUT") newQty = Math.max(0, item.on_hand - n)
      else                   newQty = n                // ADJUST = set exact

      const newStatus = newQty === 0 ? "OUT" : newQty <= item.min_stock ? "LOW" : "OK"

      const res = await fetch(`/api/db/inventory/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on_hand: newQty, status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Update failed")
      onSaved(data)
      onClose()
    } catch (e) {
      setErr(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b">
          <h3 className="font-bold">Stock Movement — {item.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Current: {item.on_hand} {item.unit}
          </p>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(["IN", "OUT", "ADJUST"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded-lg border-2 py-2 text-sm font-semibold transition-colors ${
                  type === t
                    ? t === "IN"     ? "border-green-500 bg-green-50 text-green-700"
                    : t === "OUT"    ? "border-red-500 bg-red-50 text-red-700"
                    :                  "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {t === "IN" ? "Stock In" : t === "OUT" ? "Stock Out" : "Adjust"}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">
              {type === "ADJUST" ? `Set exact quantity (${item.unit}) *` : `Quantity (${item.unit}) *`}
            </label>
            <input
              type="number" min={0} value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
            {type !== "ADJUST" && qty && (
              <p className="text-xs text-gray-400">
                New balance:{" "}
                <span className="font-semibold text-gray-700">
                  {type === "IN"
                    ? item.on_hand + parseFloat(qty || "0")
                    : Math.max(0, item.on_hand - parseFloat(qty || "0"))}{" "}
                  {item.unit}
                </span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Reference (PO / WO)</label>
            <input
              value={ref} onChange={(e) => setRef(e.target.value)}
              placeholder="e.g. WO-2026-031"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Note</label>
            <input
              value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Reason / description"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          {err && <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{err}</p>}
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="teal" disabled={!qty || saving} onClick={handleSave}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Saving…</> : "Record Movement"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function InventoryItemPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""

  const [item,    setItem]    = useState<InventoryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [showAdj, setShowAdj] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/db/inventory/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d?.error) setError("Item not found")
        else setItem(d)
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

  if (error || !item) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Package className="h-10 w-10 text-gray-200 mb-3" />
        <p className="text-gray-500">{error ?? "Item not found"}</p>
        <Link href="/inventory" className="text-sm text-teal-600 hover:underline mt-2">← Back to Inventory</Link>
      </div>
    )
  }

  const stockValue = item.on_hand * item.avg_cost
  const margin = item.avg_cost > 0
    ? Math.round(((item.selling_price - item.avg_cost) / item.selling_price) * 100)
    : 0

  return (
    <div className="space-y-6">
      {showAdj && (
        <StockAdjustModal
          item={item}
          onClose={() => setShowAdj(false)}
          onSaved={(updated) => { setItem(updated); setShowAdj(false) }}
        />
      )}

      <PageHeader
        title={item.name}
        description={`${item.item_code} · ${item.category}`}
        breadcrumb={[{ label: "Inventory", href: "/inventory" }, { label: item.item_code }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/inventory"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <Button size="sm" variant="teal" className="gap-2" onClick={() => setShowAdj(true)}>
              <Package className="h-4 w-4" /> Stock Movement
            </Button>
          </div>
        }
      />

      {item.status !== "OK" && (
        <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
          item.status === "OUT" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
        }`}>
          <AlertTriangle className={`h-5 w-5 shrink-0 ${item.status === "OUT" ? "text-red-500" : "text-amber-500"}`} />
          <p className={`text-sm font-medium ${item.status === "OUT" ? "text-red-700" : "text-amber-700"}`}>
            {item.status === "OUT"
              ? "Out of stock — create a purchase request immediately."
              : `Below minimum stock (${item.min_stock} ${item.unit}) — consider reordering.`}
          </p>
          <Link href="/purchase-requests/new" className="ml-auto text-xs underline text-teal-700">Create PR →</Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "On Hand",
                value: `${item.on_hand} ${item.unit}`,
                extra: `min ${item.min_stock}`,
                color: item.on_hand === 0
                  ? "text-red-700"
                  : item.on_hand <= item.min_stock
                    ? "text-amber-700"
                    : "text-gray-800",
              },
              { label: "Avg Cost",   value: formatTHB(item.avg_cost),      extra: "per unit", color: "text-gray-800" },
              { label: "Sell Price", value: formatTHB(item.selling_price),  extra: "per unit", color: "text-gray-800" },
              {
                label: "Margin",
                value: `${margin}%`,
                extra: "gross",
                color: margin >= 30 ? "text-green-700" : "text-amber-700",
              },
            ].map(({ label, value, extra, color }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-400">{extra}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Stock movement history */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Stock Movement History
                <span className="ml-auto text-xs text-gray-400 font-normal">recent movements</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Movement log placeholder — future: link to mms_stock_movements table */}
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex gap-3 mb-3 text-gray-200">
                  <TrendingUp className="h-6 w-6" />
                  <Minus className="h-6 w-6" />
                  <TrendingDown className="h-6 w-6" />
                </div>
                <p className="text-sm text-gray-400">No movement history recorded yet.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Use <span className="font-semibold">Stock Movement</span> button to record in / out / adjustments.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 gap-1.5"
                  onClick={() => setShowAdj(true)}
                >
                  <Package className="h-3.5 w-3.5" /> Record Movement
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Item Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Item Code",     value: item.item_code },
                { label: "Category",      value: item.category },
                { label: "Unit",          value: item.unit },
                { label: "Supplier",      value: item.supplier ?? "—" },
                { label: "Stock Value",   value: formatTHB(stockValue) },
                { label: "Bill Customer", value: item.charge_to_customer ? "Yes" : "No" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-start gap-2">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-xs font-semibold text-gray-800 text-right">{value}</span>
                </div>
              ))}
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Status</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${STATUS_STYLE[item.status] ?? STATUS_STYLE.OK}`}>
                    {item.status}
                  </span>
                </div>
              </div>
              {item.notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-xs text-gray-700">{item.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock level bar */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Stock Level</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">On hand</span>
                <span className="font-bold">{item.on_hand} {item.unit}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    item.on_hand === 0
                      ? "bg-red-500"
                      : item.on_hand <= item.min_stock
                        ? "bg-amber-400"
                        : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(100, (item.on_hand / Math.max(item.min_stock * 3, 1)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>0</span>
                <span className="text-amber-600 font-medium">min: {item.min_stock}</span>
                <span>{item.min_stock * 3}+</span>
              </div>
            </CardContent>
          </Card>

          <Button variant="teal" className="w-full gap-2" onClick={() => setShowAdj(true)}>
            <Package className="h-4 w-4" /> Record Stock Movement
          </Button>
          <Button variant="outline" className="w-full gap-2" asChild>
            <Link href="/purchase-requests/new">Create Purchase Request</Link>
          </Button>
        </div>
      </div>

      {/* Live indicator */}
      <p className="text-xs text-gray-400 text-center pb-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 align-middle" />
        Live database · {item.item_code}
      </p>
    </div>
  )
}
