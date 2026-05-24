"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Save, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { InventoryItem } from "@/lib/supabase"

const CATEGORIES = [
  "Engine Parts", "Electrical", "Fiberglass", "Paint", "Plumbing",
  "Safety Equipment", "Cleaning", "Hardware", "Tools", "Other",
]
const URGENCY_OPTIONS = [
  { value: "ROUTINE",  label: "Routine",  color: "bg-gray-100 text-gray-700" },
  { value: "URGENT",   label: "Urgent",   color: "bg-amber-100 text-amber-700" },
  { value: "CRITICAL", label: "Critical", color: "bg-red-100 text-red-700" },
]

interface PRItem {
  id: string
  itemId: string
  description: string
  unit: string
  qty: number
  estimatedUnitCost: number
  reason: string
}

function genId() { return Math.random().toString(36).slice(2, 9) }

export default function NewPurchaseRequestPage() {
  const router = useRouter()
  const [saving, setSaving]             = useState(false)
  const [inventoryItems, setInventory]  = useState<InventoryItem[]>([])

  useEffect(() => {
    fetch("/api/db/inventory")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setInventory(d) })
      .catch(() => {})
  }, [])

  const [urgency, setUrgency]         = useState("ROUTINE")
  const [requestedBy, setReqBy]       = useState("")
  const [department, setDept]         = useState("")
  const [neededBy, setNeededBy]       = useState("")
  const [workOrderRef, setWORef]      = useState("")
  const [supplierHint, setSupplier]   = useState("")
  const [notes, setNotes]             = useState("")
  const [items, setItems]             = useState<PRItem[]>([
    { id: genId(), itemId: "", description: "", unit: "pcs", qty: 1, estimatedUnitCost: 0, reason: "" },
  ])

  function addItem() {
    setItems(prev => [...prev, { id: genId(), itemId: "", description: "", unit: "pcs", qty: 1, estimatedUnitCost: 0, reason: "" }])
  }
  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }
  function updateItem(id: string, field: keyof PRItem, value: string | number) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }
  function onItemSelect(id: string, itemId: string) {
    const inv = inventoryItems.find(i => i.id === itemId)
    if (inv) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, itemId, description: inv.name ?? "", unit: inv.unit ?? "pcs", estimatedUnitCost: inv.avg_cost ?? 0 } : i))
    } else {
      updateItem(id, "itemId", itemId)
    }
  }

  const total = items.reduce((n, i) => n + i.qty * i.estimatedUnitCost, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        requested_by: requestedBy || null,
        department:   department || null,
        status:       "DRAFT",
        priority:     urgency,
        needed_by:    neededBy || null,
        supplier:     supplierHint || null,
        notes:        notes || null,
        total_amount: total,
        items: items.filter(i => i.description.trim()).map((it, idx) => ({
          item_name:      it.description,
          qty:            it.qty,
          unit:           it.unit,
          estimated_cost: it.estimatedUnitCost,
          sort_order:     idx,
        })),
      }
      const res = await fetch("/api/db/purchase-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Save failed")
      router.push(data?.id ? `/purchase-requests/${data.id}` : "/purchase-requests")
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Purchase Request"
        breadcrumb={[{ label: "Purchase Requests", href: "/purchase-requests" }, { label: "New" }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild><Link href="/purchase-requests">Cancel</Link></Button>
            <Button size="sm" variant="teal" form="pr-form" type="submit" disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />{saving ? "Saving…" : "Submit Request"}
            </Button>
          </div>
        }
      />

      <form id="pr-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">

            {/* Request Details */}
            <Card>
              <CardHeader><CardTitle>Request Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {/* Urgency */}
                <div className="space-y-2">
                  <Label>Urgency <span className="text-red-500">*</span></Label>
                  <div className="flex gap-2">
                    {URGENCY_OPTIONS.map((u) => (
                      <button key={u.value} type="button" onClick={() => setUrgency(u.value)}
                        className={`rounded-lg border-2 px-4 py-1.5 text-sm font-semibold transition-all ${urgency === u.value ? u.color + " border-transparent ring-2 ring-offset-1 ring-gray-300" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Requested By <span className="text-red-500">*</span></Label>
                    <Input value={requestedBy} onChange={(e) => setReqBy(e.target.value)} placeholder="Your name" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Department</Label>
                    <select value={department} onChange={(e) => setDept(e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none">
                      <option value="">— Select dept —</option>
                      <option>Boat Yard</option>
                      <option>Marina Ops</option>
                      <option>Finance</option>
                      <option>Front Office</option>
                      <option>Management</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Needed By Date</Label>
                    <Input type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Work Order Ref (if applicable)</Label>
                    <Input value={workOrderRef} onChange={(e) => setWORef(e.target.value)} placeholder="e.g. WO-2026-011" className="font-mono" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Preferred Supplier (optional)</Label>
                    <Input value={supplierHint} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier name or preference" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Items to Purchase</CardTitle>
                  <button type="button" onClick={addItem}
                    className="flex items-center gap-1.5 text-xs text-teal-600 hover:underline font-medium">
                    <Plus className="h-3.5 w-3.5" />Add Item
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((item, idx) => (
                  <div key={item.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">Item {idx + 1}</span>
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">Link to Inventory Item</label>
                        <select value={item.itemId} onChange={(e) => onItemSelect(item.id, e.target.value)}
                          className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-teal-500 focus:outline-none">
                          <option value="">— Select existing item —</option>
                          {inventoryItems.map((i) => (
                            <option key={i.id} value={i.id}>{i.item_code} — {i.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">Category</label>
                        <select className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-teal-500 focus:outline-none">
                          <option value="">—</option>
                          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs text-gray-500">Description / Item Name <span className="text-red-500">*</span></label>
                        <input value={item.description} onChange={(e) => updateItem(item.id, "description", e.target.value)}
                          placeholder="Full description of item required" required
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">Qty <span className="text-red-500">*</span></label>
                        <input type="number" min={1} value={item.qty} onChange={(e) => updateItem(item.id, "qty", parseInt(e.target.value) || 1)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">Unit</label>
                        <input value={item.unit} onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                          placeholder="pcs, L, m, set…"
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">Est. Unit Cost (THB)</label>
                        <input type="number" min={0} step={0.01} value={item.estimatedUnitCost}
                          onChange={(e) => updateItem(item.id, "estimatedUnitCost", parseFloat(e.target.value) || 0)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none" />
                      </div>
                      <div className="flex items-end">
                        <div className="rounded bg-white border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 w-full text-center">
                          ฿ {(item.qty * item.estimatedUnitCost).toLocaleString()}
                        </div>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs text-gray-500">Reason / Justification</label>
                        <input value={item.reason} onChange={(e) => updateItem(item.id, "reason", e.target.value)}
                          placeholder="Why is this item needed?"
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none" />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="flex justify-end border-t pt-3">
                  <div className="text-sm font-semibold text-gray-700">
                    Estimated Total: <span className="text-base text-navy-700 ml-2">฿ {total.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Additional Notes</CardTitle></CardHeader>
              <CardContent>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  placeholder="Any additional instructions for procurement or approver…"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm resize-none focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle className="text-sm">Request Summary</CardTitle></CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Urgency</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${URGENCY_OPTIONS.find(u => u.value === urgency)?.color}`}>{urgency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Requested By</span>
                  <span className="font-medium">{requestedBy || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Department</span>
                  <span className="font-medium">{department || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Needed By</span>
                  <span className="font-medium">{neededBy || "—"}</span>
                </div>
                {workOrderRef && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Work Order</span>
                    <span className="font-mono font-medium text-teal-700">{workOrderRef}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2.5">
                  <span className="text-gray-500">Items</span>
                  <span className="font-bold">{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Est. Total</span>
                  <span className="font-bold text-navy-700">฿ {total.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-xs text-blue-700 space-y-1.5">
              <p className="font-semibold">Approval Flow</p>
              <p>ROUTINE → Department Head</p>
              <p>URGENT → Marina Manager</p>
              <p>CRITICAL → MD / Owner approval</p>
              <p className="text-blue-500 mt-1">Approved PRs become Purchase Orders.</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" asChild><Link href="/purchase-requests">Cancel</Link></Button>
              <Button variant="teal" className="flex-1 gap-2" type="submit" form="pr-form" disabled={saving}>
                <Save className="h-4 w-4" />{saving ? "…" : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
