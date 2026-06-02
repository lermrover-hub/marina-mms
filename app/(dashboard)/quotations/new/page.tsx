"use client"
import React, { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Save, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Customer, Boat } from "@/lib/supabase"
import { formatTHB, cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────
interface LineItem {
  id: string
  description: string
  category: string
  unit: string
  qty: number
  unitPrice: number
}

const CATEGORIES = [
  "Engine", "Electrical", "Fiberglass", "Painting", "Paint & Coating",
  "Antifouling", "Interior", "Canvas", "Stainless / Metal", "Cleaning",
  "Plumbing", "Generator", "Air Conditioning", "Berth Fee", "Ramp Service",
  "Labour", "Material", "Other",
]

const UNITS = ["job", "hr", "day", "pc", "set", "m", "m²", "kg", "litre", "unit", "year", "qtr", "month"]

const DISCOUNT_TYPES = [
  { value: "NONE",    label: "No discount" },
  { value: "PERCENT", label: "Percentage (%)" },
  { value: "FIXED",   label: "Fixed amount (฿)" },
]

function uid() { return Math.random().toString(36).slice(2, 9) }

// ─── Line item row ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LineItemRow({
  item, index, onChange, onRemove,
}: {
  item: LineItem; index: number
  onChange: (id: string, field: keyof LineItem, value: string | number) => void
  onRemove: (id: string) => void
}) {
  const amount = item.qty * item.unitPrice

  return (
    <tr className="group border-b border-gray-100 last:border-0">
      <td className="py-2 pr-2 text-xs text-gray-400 w-6 text-center">{index + 1}</td>
      <td className="py-2 pr-2">
        <Input
          value={item.description}
          onChange={(e) => onChange(item.id, "description", e.target.value)}
          placeholder="Describe the service or item…"
          className="text-sm"
        />
      </td>
      <td className="py-2 pr-2 w-36">
        <select
          value={item.category}
          onChange={(e) => onChange(item.id, "category", e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        >
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </td>
      <td className="py-2 pr-2 w-20">
        <select
          value={item.unit}
          onChange={(e) => onChange(item.id, "unit", e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        >
          {UNITS.map((u) => <option key={u}>{u}</option>)}
        </select>
      </td>
      <td className="py-2 pr-2 w-20">
        <Input
          type="number" min={0} step="0.5"
          value={item.qty}
          onChange={(e) => onChange(item.id, "qty", parseFloat(e.target.value) || 0)}
          className="text-sm text-right tabular-nums"
        />
      </td>
      <td className="py-2 pr-2 w-32">
        <Input
          type="number" min={0} step="100"
          value={item.unitPrice}
          onChange={(e) => onChange(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
          className="text-sm text-right tabular-nums"
        />
      </td>
      <td className="py-2 pr-2 w-32 text-right tabular-nums text-sm font-semibold text-gray-900">
        {formatTHB(amount)}
      </td>
      <td className="py-2 w-8">
        <button
          onClick={() => onRemove(item.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1 hover:bg-red-50 hover:text-red-500 text-gray-300"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function NewQuotationPage() {
  const router = useRouter()

  // Live data
  const [customers,      setCustomers]      = useState<Customer[]>([])
  const [customersError, setCustomersError] = useState<string | null>(null)
  const [boats,          setBoats]          = useState<Boat[]>([])

  useEffect(() => {
    fetch("/api/db/customers")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setCustomers(d)
        } else if (d?.error) {
          setCustomersError(d.error)
          console.error("Customers load error:", d.error)
        }
      })
      .catch((e) => {
        setCustomersError(String(e))
        console.error("Customers fetch failed:", e)
      })
    fetch("/api/db/boats").then(r => r.json()).then(d => { if (Array.isArray(d)) setBoats(d) }).catch(() => {})
  }, [])

  // Form state
  const [customerId, setCustomerId]     = useState("")
  const [boatId, setBoatId]             = useState("")
  const [title, setTitle]               = useState("")
  const [validDays, setValidDays]       = useState(30)
  const [discountType, setDiscountType] = useState("NONE")
  const [discountValue, setDiscountValue] = useState(0)
  const [taxRate, setTaxRate]           = useState(7)
  const [depositPct, setDepositPct]     = useState(30)
  const [notes, setNotes]               = useState("")
  const [saving, setSaving]             = useState(false)

  const [items, setItems] = useState<LineItem[]>([
    { id: uid(), description: "", category: "Other", unit: "job", qty: 1, unitPrice: 0 },
  ])

  // Derived customer boats
  const selectedCustomer = customers.find((c) => c.id === customerId)
  const customerBoats    = boats.filter((b) => b.owner_id === customerId)
  const selectedBoat     = boats.find((b) => b.id === boatId)

  // Totals
  const subtotal       = items.reduce((s, i) => s + i.qty * i.unitPrice, 0)
  const discountAmount = discountType === "PERCENT"
    ? Math.round(subtotal * discountValue / 100)
    : discountType === "FIXED" ? discountValue : 0
  const afterDiscount  = subtotal - discountAmount
  const taxAmount      = Math.round(afterDiscount * taxRate / 100)
  const grandTotal     = afterDiscount + taxAmount
  const depositReq     = Math.round(grandTotal * depositPct / 100)

  // Item handlers
  const addItem = useCallback(() => {
    setItems((prev) => [...prev, { id: uid(), description: "", category: "Other", unit: "job", qty: 1, unitPrice: 0 }])
  }, [])

  const updateItem = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, [field]: value } : item))
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  async function handleSave(andSend = false) {
    setSaving(true)
    try {
      const validUntilDate = new Date()
      validUntilDate.setDate(validUntilDate.getDate() + validDays)
      const body = {
        customer_id:      customerId || null,
        boat_id:          boatId || null,
        title:            title || null,
        valid_days:       validDays,
        valid_until:      validUntilDate.toISOString().split("T")[0],
        discount_type:    discountType,
        discount_value:   discountValue,
        tax_rate:         taxRate,
        deposit_pct:      depositPct,
        notes:            notes || null,
        subtotal:         subtotal,
        discount_amount:  discountAmount,
        after_discount:   afterDiscount,
        tax_amount:       taxAmount,
        grand_total:      grandTotal,
        deposit_req:      depositReq,
        status:           andSend ? "SENT" : "DRAFT",
        items:            items,
        created_at:       new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      }
      const res = await fetch("/api/db/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Save failed")
      router.push(data?.id ? `/quotations/${data.id}` : "/quotations")
    } catch {
      setSaving(false)
    }
  }

  const validUntil = new Date()
  validUntil.setDate(validUntil.getDate() + validDays)
  const validUntilStr = validUntil.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Quotation"
        breadcrumb={[
          { label: "Quotations", href: "/quotations" },
          { label: "New" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild><Link href="/quotations">Cancel</Link></Button>
            <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> Save Draft
            </Button>
            <Button size="sm" variant="teal" onClick={() => handleSave(true)} disabled={saving} className="gap-2">
              <Send className="h-4 w-4" /> Save & Send
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left sidebar — header info */}
        <div className="space-y-4">
          {/* Customer */}
          <Card>
            <CardHeader><CardTitle>Customer & Boat</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="customer">Customer *</Label>
                <select
                  id="customer"
                  value={customerId}
                  onChange={(e) => { setCustomerId(e.target.value); setBoatId("") }}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">— Select customer —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name ?? ([c.first_name, c.last_name].filter(Boolean).join(" ") || c.id)}
                    </option>
                  ))}
                </select>
                {customersError && (
                  <p className="text-xs text-red-500 mt-1">Failed to load customers: {customersError}</p>
                )}
              </div>

              {customerId && customerBoats.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="boat">Boat <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <select
                    id="boat"
                    value={boatId}
                    onChange={(e) => setBoatId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="">— No specific boat —</option>
                    {customerBoats.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} ({b.boat_type.replace("_"," ")})</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedCustomer && (
                <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-xs text-gray-600 space-y-0.5">
                  <p><span className="text-gray-400">Payment terms:</span> {selectedCustomer.payment_terms ?? "—"} days</p>
                  <p><span className="text-gray-400">Credit limit:</span> {formatTHB(selectedCustomer.credit_limit ?? 0)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quotation settings */}
          <Card>
            <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title / Subject</Label>
                <Input id="title" placeholder="e.g. Engine overhaul — Sea Hawk" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="valid-days">Valid for (days)</Label>
                <Input id="valid-days" type="number" min={1} max={365} value={validDays} onChange={(e) => setValidDays(parseInt(e.target.value) || 30)} />
                <p className="text-xs text-gray-400">Expires: {validUntilStr}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tax-rate">VAT Rate (%)</Label>
                <Input id="tax-rate" type="number" min={0} max={30} step={0.5} value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} />
              </div>

              <div className="space-y-1.5">
                <Label>Discount</Label>
                <select
                  value={discountType}
                  onChange={(e) => { setDiscountType(e.target.value); setDiscountValue(0) }}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  {DISCOUNT_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                {discountType !== "NONE" && (
                  <Input
                    type="number" min={0}
                    placeholder={discountType === "PERCENT" ? "e.g. 10" : "e.g. 5000"}
                    value={discountValue || ""}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deposit">Deposit Required (%)</Label>
                <Input id="deposit" type="number" min={0} max={100} value={depositPct} onChange={(e) => setDepositPct(parseInt(e.target.value) || 0)} />
                {depositPct > 0 && grandTotal > 0 && (
                  <p className="text-xs text-gray-400">Deposit amount: {formatTHB(depositReq)}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes / Terms</Label>
                <textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Payment terms, warranty notes, scope exclusions…"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-y"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: line items + totals */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Line Items</CardTitle>
              <Button size="sm" variant="outline" onClick={addItem} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full px-5">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-400 w-6">#</th>
                      <th className="px-0 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                      <th className="px-0 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-36">Category</th>
                      <th className="px-0 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-20">Unit</th>
                      <th className="px-0 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase w-20">Qty</th>
                      <th className="px-0 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase w-32">Unit Price</th>
                      <th className="px-0 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase w-32">Amount</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="px-5">
                    {items.map((item, index) => (
                      <tr key={item.id} className="group border-b border-gray-100 last:border-0">
                        <td className="pl-5 py-2 pr-2 text-xs text-gray-400 text-center">{index + 1}</td>
                        <td className="py-2 pr-2">
                          <Input value={item.description} onChange={(e) => updateItem(item.id,"description",e.target.value)} placeholder="Service or item description…" className="text-sm" />
                        </td>
                        <td className="py-2 pr-2">
                          <select value={item.category} onChange={(e) => updateItem(item.id,"category",e.target.value)}
                            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20">
                            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="py-2 pr-2">
                          <select value={item.unit} onChange={(e) => updateItem(item.id,"unit",e.target.value)}
                            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20">
                            {UNITS.map((u) => <option key={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="py-2 pr-2">
                          <Input type="number" min={0} step="0.5" value={item.qty}
                            onChange={(e) => updateItem(item.id,"qty",parseFloat(e.target.value)||0)}
                            className="text-sm text-right tabular-nums" />
                        </td>
                        <td className="py-2 pr-2">
                          <Input type="number" min={0} step="100" value={item.unitPrice}
                            onChange={(e) => updateItem(item.id,"unitPrice",parseFloat(e.target.value)||0)}
                            className="text-sm text-right tabular-nums" />
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums text-sm font-semibold text-gray-900">
                          {formatTHB(item.qty * item.unitPrice)}
                        </td>
                        <td className="py-2 pr-5">
                          <button onClick={() => removeItem(item.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 hover:bg-red-50 hover:text-red-500 text-gray-300">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-5 py-3 border-t">
                <Button size="sm" variant="ghost" onClick={addItem} className="gap-1.5 text-teal-600 hover:text-teal-700 hover:bg-teal-50">
                  <Plus className="h-3.5 w-3.5" /> Add another item
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Live totals card */}
          <Card className={cn("border-2 transition-colors", grandTotal > 0 ? "border-teal-200" : "border-gray-100")}>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Totals</p>
                  {[
                    { label: "Subtotal",         value: subtotal,       color: "text-gray-900" },
                    { label: `Discount`,         value: -discountAmount, color: "text-green-600", hide: discountAmount === 0 },
                    { label: `VAT ${taxRate}%`,  value: taxAmount,      color: "text-gray-600" },
                  ].filter((r) => !r.hide).map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-gray-500">{label}</span>
                      <span className={cn("tabular-nums font-medium", color)}>
                        {value < 0 ? `− ${formatTHB(-value)}` : formatTHB(value)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-2 text-base font-bold text-gray-900">
                    <span>Grand Total</span>
                    <span className="tabular-nums text-teal-700">{formatTHB(grandTotal)}</span>
                  </div>
                  {depositPct > 0 && (
                    <div className="flex justify-between text-sm text-navy-600 font-medium">
                      <span>Deposit ({depositPct}%)</span>
                      <span className="tabular-nums">{formatTHB(depositReq)}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Summary</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Line items</span>
                    <span className="font-medium">{items.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Customer</span>
                    <span className="font-medium truncate max-w-[140px] text-right">
                      {selectedCustomer
                        ? (selectedCustomer.company_name ?? ([selectedCustomer.first_name, selectedCustomer.last_name].filter(Boolean).join(" ") || selectedCustomer.id))
                        : <span className="text-gray-300">Not selected</span>}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Boat</span>
                    <span className="font-medium">{selectedBoat?.name ?? <span className="text-gray-300">None</span>}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Valid until</span>
                    <span className="font-medium">{validUntilStr}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t mt-4">
                <Button className="flex-1 gap-2" variant="outline" onClick={() => handleSave(false)} disabled={saving}>
                  <Save className="h-4 w-4" /> Save as Draft
                </Button>
                <Button className="flex-1 gap-2" variant="teal" onClick={() => handleSave(true)} disabled={saving || !customerId}>
                  <Send className="h-4 w-4" /> {saving ? "Saving…" : "Save & Send to Customer"}
                </Button>
              </div>
              {!customerId && (
                <p className="text-xs text-center text-amber-600 mt-2">Select a customer before sending.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
