"use client"
import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Save, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const CATEGORIES = ["Engine","Paint","Electrical","Fiberglass","Cleaning","Mechanical","Safety","Misc"]
const UNITS = ["pc","L","kg","m","m2","set","tube","roll","box","pair","hr"]

export default function NewInventoryItemPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [itemCode, setItemCode]       = useState("")
  const [name, setName]               = useState("")
  const [category, setCategory]       = useState("Engine")
  const [unit, setUnit]               = useState("pc")
  const [minStock, setMinStock]       = useState("5")
  const [avgCost, setAvgCost]         = useState("")
  const [sellingPrice, setSellPrice]  = useState("")
  const [supplier, setSupplier]       = useState("")
  const [initialQty, setInitQty]      = useState("0")
  const [chargeToCustomer, setCharge] = useState(true)
  const [notes, setNotes]             = useState("")

  const margin = avgCost && sellingPrice
    ? Math.round(((+sellingPrice - +avgCost) / +sellingPrice) * 100) : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const onHand = parseFloat(initialQty) || 0
      const minimumStock = parseFloat(minStock) || 0
      const stockStatus = onHand === 0 ? "OUT" : onHand <= minimumStock ? "LOW" : "OK"
      const body = {
        item_code:          itemCode || `INV-${Date.now().toString().slice(-6)}`,
        name:               name || null,
        category:           category || null,
        unit,
        on_hand:            onHand,
        min_stock:          minimumStock,
        avg_cost:           avgCost ? parseFloat(avgCost) : 0,
        selling_price:      sellingPrice ? parseFloat(sellingPrice) : 0,
        supplier:           supplier || null,
        charge_to_customer: chargeToCustomer,
        notes:              notes || null,
        status:             stockStatus,
        created_at:         now,
        updated_at:         now,
      }
      const res = await fetch("/api/db/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? "Save failed")
      }
      if (!data?.id) {
        throw new Error("Server returned no item ID")
      }
      router.push(`/inventory?created=${data.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed"
      setError(message)
      setSaving(false)
      console.error("Inventory save error:", err)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Inventory Item"
        breadcrumb={[{ label: "Inventory", href: "/inventory" }, { label: "New Item" }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild><Link href="/inventory">Cancel</Link></Button>
            <Button size="sm" variant="teal" form="inv-form" type="submit" disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />{saving ? "Saving…" : "Save Item"}
            </Button>
          </div>
        }
      />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          <p className="font-semibold mb-1">Error saving inventory item:</p>
          <p>{error}</p>
        </div>
      )}

      <form id="inv-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader><CardTitle>Item Identity</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Item Code <span className="text-red-500">*</span></Label>
                    <Input value={itemCode} onChange={(e) => setItemCode(e.target.value)} placeholder="e.g. ENG-OIL-15W40" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none">
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Item Name <span className="text-red-500">*</span></Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Engine Oil 15W-40" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unit of Measure</Label>
                    <select value={unit} onChange={(e) => setUnit(e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none">
                      {UNITS.map((u) => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Minimum Stock Level</Label>
                    <Input type="number" min={0} value={minStock} onChange={(e) => setMinStock(e.target.value)} placeholder="5" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Supplier</Label>
                    <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. Marine Parts Asia" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Average Cost (฿ / unit)</Label>
                    <Input type="number" min={0} value={avgCost} onChange={(e) => setAvgCost(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Selling Price (฿ / unit)</Label>
                    <Input type="number" min={0} value={sellingPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="0.00" />
                  </div>
                </div>
                {margin !== null && (
                  <div className={`rounded-lg p-3 text-sm font-semibold ${margin >= 30 ? "bg-green-50 text-green-700" : margin >= 15 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                    Gross Margin: {margin}%
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input id="charge" type="checkbox" checked={chargeToCustomer}
                    onChange={(e) => setCharge(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-teal-600" />
                  <label htmlFor="charge" className="text-sm text-gray-700 cursor-pointer">Charge to customer when issued to work order</label>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle>Opening Stock</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Initial Quantity ({unit})</Label>
                  <Input type="number" min={0} value={initialQty} onChange={(e) => setInitQty(e.target.value)} />
                  <p className="text-xs text-gray-400">Will create an opening stock-in movement.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  placeholder="Storage location, handling notes, etc."
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm resize-y focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" asChild><Link href="/inventory">Cancel</Link></Button>
              <Button variant="teal" className="flex-1 gap-2" type="submit" form="inv-form" disabled={saving}>
                <Package className="h-4 w-4" />{saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
