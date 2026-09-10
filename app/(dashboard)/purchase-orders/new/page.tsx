"use client"
import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Supplier { id: string; name: string }

export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")
  const [form, setForm] = useState({
    supplier_id: "", supplier_name: "", order_date: new Date().toISOString().slice(0, 10),
    expected_date: "", notes: "", status: "draft",
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const F = "w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"

  useEffect(() => {
    fetch("/api/db/suppliers").then(r => r.ok ? r.json() : []).then(d => setSuppliers(Array.isArray(d) ? d : []))
  }, [])

  function handleSupplierChange(id: string) {
    const s = suppliers.find(s => s.id === id)
    setForm(f => ({ ...f, supplier_id: id, supplier_name: s?.name ?? "" }))
  }

  async function handleSave() {
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/db/purchase-orders", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      router.push(`/purchase-orders/${data.id}`)
    } catch (e) { setError(String(e)); setSaving(false) }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="New Purchase Order" description="Create a purchase order for a supplier"
        actions={<Button variant="ghost" size="sm" asChild><Link href="/purchase-orders"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>}
      />
      {error && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      <Card>
        <CardHeader><CardTitle className="text-base">Order Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Supplier</label>
            <select className={F} value={form.supplier_id} onChange={e => handleSupplierChange(e.target.value)}>
              <option value="">— Select Supplier —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {!form.supplier_id && (
              <input className={`${F} mt-2`} placeholder="Or type supplier name manually"
                value={form.supplier_name}
                onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Order Date</label>
            <input type="date" className={F} value={form.order_date} onChange={e => set("order_date", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Expected Delivery</label>
            <input type="date" className={F} value={form.expected_date} onChange={e => set("expected_date", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select className={F} value={form.status} onChange={e => set("status", e.target.value)}>
              <option value="draft">Draft</option>
              <option value="sent">Sent to Supplier</option>
              <option value="approved">Approved</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea rows={2} className={F} value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-gray-400">After creating the PO, you can add line items on the detail page.</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" asChild><Link href="/purchase-orders">Cancel</Link></Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />{saving ? "Saving…" : "Create PO"}
        </Button>
      </div>
    </div>
  )
}
