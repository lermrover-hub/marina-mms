"use client"
import React, { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatTHB } from "@/lib/utils"

const STATUS_STYLE: Record<string, string> = {
  draft:"bg-gray-100 text-gray-600", sent:"bg-blue-100 text-blue-700",
  approved:"bg-purple-100 text-purple-700", received:"bg-green-100 text-green-700", cancelled:"bg-red-100 text-red-700",
}

interface POItem { id: string; item_code?: string; description: string; qty: number; unit?: string; unit_price: number; line_total: number }
interface PO {
  id: string; po_number: string; supplier_id?: string; supplier_name?: string; status: string
  order_date?: string; expected_date?: string; subtotal?: number; vat_amount?: number; total_amount?: number; notes?: string
  mms_purchase_order_items?: POItem[]
}

export default function PODetailPage() {
  const { id } = useParams() as { id: string }
  const [po,       setPO]       = useState<PO | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState("")
  const [newItem,  setNewItem]  = useState({ description: "", item_code: "", qty: "1", unit: "pcs", unit_price: "" })
  const [addingItem, setAddingItem] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/db/purchase-orders/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPO(d) })
  }, [id])

  useEffect(() => { load() }, [load])

  async function updateStatus(status: string) {
    setSaving(true)
    await fetch(`/api/db/purchase-orders/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    })
    load(); setSaving(false)
  }

  async function addItem() {
    if (!newItem.description.trim()) return
    setAddingItem(true); setError("")
    try {
      const res = await fetch("/api/db/purchase-order-items", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newItem, po_id: id, qty: Number(newItem.qty), unit_price: Number(newItem.unit_price) }),
      })
      if (!res.ok) throw new Error(await res.text())
      setNewItem({ description: "", item_code: "", qty: "1", unit: "pcs", unit_price: "" })
      load()
    } catch (e) { setError(String(e)) } finally { setAddingItem(false) }
  }

  async function deleteItem(itemId: string) {
    await fetch(`/api/db/purchase-order-items/${itemId}`, { method: "DELETE" })
    load()
  }

  if (!po) return <div className="p-12 text-center text-sm text-gray-400">Loading…</div>
  const items = po.mms_purchase_order_items ?? []
  const F = "border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={po.po_number}
        description={po.supplier_name ?? "Purchase Order"}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild><Link href="/purchase-orders"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
            {po.status === "draft" && <Button size="sm" variant="outline" onClick={() => updateStatus("sent")} disabled={saving}>Mark Sent</Button>}
            {po.status === "sent"  && <Button size="sm" variant="outline" onClick={() => updateStatus("received")} disabled={saving}>Mark Received</Button>}
          </div>
        }
      />

      {error && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Header info */}
      <Card><CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div><p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium mt-0.5 ${STATUS_STYLE[po.status] ?? "bg-gray-100 text-gray-500"}`}>{po.status}</span>
        </div>
        <div><p className="text-xs text-gray-400 uppercase tracking-wide">Order Date</p>
          <p className="text-sm mt-0.5">{po.order_date ? new Date(po.order_date).toLocaleDateString("en-GB") : "—"}</p>
        </div>
        <div><p className="text-xs text-gray-400 uppercase tracking-wide">Expected</p>
          <p className="text-sm mt-0.5">{po.expected_date ? new Date(po.expected_date).toLocaleDateString("en-GB") : "—"}</p>
        </div>
        <div><p className="text-xs text-gray-400 uppercase tracking-wide">Total Amount</p>
          <p className="text-sm font-bold mt-0.5">{po.total_amount ? formatTHB(po.total_amount) : "฿0"}</p>
        </div>
      </CardContent></Card>

      {/* Line items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Line Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Code</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Description</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">Qty</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Unit</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Unit Price</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Total</th>
                <th className="px-4 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{item.item_code ?? "—"}</td>
                  <td className="px-4 py-2.5">{item.description}</td>
                  <td className="px-4 py-2.5 text-center">{item.qty}</td>
                  <td className="px-4 py-2.5 text-gray-500">{item.unit ?? "pcs"}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatTHB(item.unit_price)}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-medium">{formatTHB(item.line_total)}</td>
                  <td className="px-4 py-2.5 text-center">
                    {po.status === "draft" && (
                      <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {/* Add item row — only in draft */}
              {po.status === "draft" && (
                <tr className="bg-teal-50 border-t-2 border-teal-100">
                  <td className="px-4 py-2"><input className={`${F} w-24`} placeholder="Code" value={newItem.item_code} onChange={e => setNewItem(n => ({ ...n, item_code: e.target.value }))} /></td>
                  <td className="px-4 py-2"><input className={`${F} w-full`} placeholder="Description *" value={newItem.description} onChange={e => setNewItem(n => ({ ...n, description: e.target.value }))} /></td>
                  <td className="px-4 py-2"><input type="number" className={`${F} w-16 text-center`} value={newItem.qty} onChange={e => setNewItem(n => ({ ...n, qty: e.target.value }))} /></td>
                  <td className="px-4 py-2"><input className={`${F} w-16`} value={newItem.unit} onChange={e => setNewItem(n => ({ ...n, unit: e.target.value }))} /></td>
                  <td className="px-4 py-2"><input type="number" className={`${F} w-28 text-right`} placeholder="0.00" value={newItem.unit_price} onChange={e => setNewItem(n => ({ ...n, unit_price: e.target.value }))} /></td>
                  <td className="px-4 py-2 text-right text-xs text-gray-400">
                    {newItem.qty && newItem.unit_price ? formatTHB(Number(newItem.qty) * Number(newItem.unit_price)) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <button onClick={addItem} disabled={addingItem} className="text-teal-600 hover:text-teal-800">
                      <Plus className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t-2 border-gray-200">
              <tr><td colSpan={5} className="px-4 py-2 text-right text-xs text-gray-500 font-medium">Subtotal</td>
                <td className="px-4 py-2 text-right font-mono">{formatTHB(po.subtotal ?? 0)}</td><td></td></tr>
              <tr><td colSpan={5} className="px-4 py-2 text-right text-xs text-gray-500 font-medium">VAT 7%</td>
                <td className="px-4 py-2 text-right font-mono">{formatTHB(po.vat_amount ?? 0)}</td><td></td></tr>
              <tr className="bg-gray-50"><td colSpan={5} className="px-4 py-2.5 text-right text-sm font-bold">Total</td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-teal-700">{formatTHB(po.total_amount ?? 0)}</td><td></td></tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {po.notes && (
        <Card><CardContent className="p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-gray-600">{po.notes}</p>
        </CardContent></Card>
      )}
    </div>
  )
}
