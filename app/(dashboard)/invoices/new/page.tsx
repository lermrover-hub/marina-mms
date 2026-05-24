"use client"
import React, { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Plus, Trash2, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Customer, Boat } from "@/lib/supabase"
import { formatTHB } from "@/lib/utils"

// ── Company constants (Palm Beach Samui Asset Co., Ltd.) ─────────────────────
const COMPANY = {
  nameTH: "บริษัท ปาล์มบีช สมุย แอสเสท จำกัด",
  nameEN: "Palm beach samui asset Co., Ltd.",
  taxId:  "0845558004072",
  address: "เลขที่ 26/24 ม.4 ต.แม่น้ำ อ.เกาะสมุย จ.สุราษฏร์ธานี 84330",
  vatRate: 7,
  invoiceNote: "กรุณาชำระล่วงหน้าอย่างน้อย 7 วัน / Please pay at least 7 days in advance.",
}

const PAYMENT_TERMS_OPTIONS = [
  { value: 0,  label: "ชำระทันที / Due on Receipt" },
  { value: 7,  label: "Net 7 days" },
  { value: 15, label: "Net 15 days" },
  { value: 30, label: "Net 30 days" },
]

const SERVICE_CATEGORIES = [
  "Wet Berth", "Dry Storage", "Ramp Service", "Launch / Retrieval",
  "Boat Repair", "Antifouling", "Painting", "Engine Service",
  "Electrical", "Cleaning / Detailing", "Fuel", "Water / Electricity",
  "Contractor Service", "Other",
]

// ── types ────────────────────────────────────────────────────────────────────
interface InvoiceItem {
  id: string
  description: string
  category: string
  qty: number
  unit: string
  unitPrice: number
  discount: number
  taxable: boolean
}

function genId() { return Math.random().toString(36).slice(2, 9) }

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

// ── component ────────────────────────────────────────────────────────────────
export default function NewInvoicePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [boats,     setBoats]     = useState<Boat[]>([])

  useEffect(() => {
    fetch("/api/db/customers").then(r => r.json()).then(d => { if (Array.isArray(d)) setCustomers(d) }).catch(() => {})
    fetch("/api/db/boats").then(r => r.json()).then(d => { if (Array.isArray(d)) setBoats(d) }).catch(() => {})
  }, [])

  // ── header ──────────────────────────────────────────────────────────────
  const [customerId, setCustomerId]     = useState("")
  const [boatId, setBoatId]             = useState("")
  const [invoiceDate, setInvoiceDate]   = useState(new Date().toISOString().split("T")[0])
  const [paymentTerms, setPaymentTerms] = useState(7)
  const [dueDate, setDueDate]           = useState(addDays(7))
  const [workOrderRef, setWORef]        = useState("")
  const [quotationRef, setQRef]         = useState("")
  const [invoiceNote, setNote]          = useState(COMPANY.invoiceNote)

  // ── line items ──────────────────────────────────────────────────────────
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: genId(), description: "", category: "", qty: 1, unit: "item", unitPrice: 0, discount: 0, taxable: true },
  ])

  // ── discount / deposit ───────────────────────────────────────────────────
  const [globalDiscount, setGlobalDiscount] = useState(0)
  const [depositPaid, setDepositPaid]       = useState("")

  // ── derived ─────────────────────────────────────────────────────────────
  const boatsForCustomer = useMemo(() =>
    customerId ? boats.filter((b) => b.owner_id === customerId) : [],
  [customerId, boats])

  const selectedCustomer = customers.find((c) => c.id === customerId)
  const selectedBoat     = boats.find((b) => b.id === boatId)

  // Calculate totals
  const lineSubtotals = items.map((it) =>
    it.qty * it.unitPrice * (1 - it.discount / 100)
  )
  const itemsSubtotal  = lineSubtotals.reduce((s, v) => s + v, 0)
  const afterDiscount  = itemsSubtotal * (1 - globalDiscount / 100)
  const depositNum     = parseFloat(depositPaid) || 0

  const nonTaxable     = items.reduce((s, it, i) => !it.taxable ? s + lineSubtotals[i] * (1 - globalDiscount / 100) : s, 0)
  const taxableNet     = afterDiscount - nonTaxable
  const vat            = taxableNet * (COMPANY.vatRate / 100)
  const total          = afterDiscount + vat

  // ── item helpers ─────────────────────────────────────────────────────────
  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: genId(), description: "", category: "", qty: 1, unit: "item", unitPrice: 0, discount: 0, taxable: true },
    ])
  }

  function updateItem(id: string, field: keyof InvoiceItem, value: string | number | boolean) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, [field]: value } : it))
  }

  function removeItem(id: string) {
    if (items.length === 1) return
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  function handleTermsChange(days: number) {
    setPaymentTerms(days)
    setDueDate(addDays(days))
  }

  async function handleSave(draft = false) {
    setSaving(true)
    try {
      const body = {
        customer_id:      customerId || null,
        boat_id:          boatId || null,
        invoice_date:     invoiceDate,
        due_date:         dueDate,
        payment_terms:    paymentTerms,
        work_order_ref:   workOrderRef || null,
        quotation_ref:    quotationRef || null,
        invoice_note:     invoiceNote || null,
        subtotal:         itemsSubtotal,
        global_discount:  globalDiscount,
        after_discount:   afterDiscount,
        vat_amount:       vat,
        total:            total,
        deposit_paid:     depositNum || 0,
        balance_due:      total - depositNum,
        status:           draft ? "DRAFT" : "ISSUED",
        items:            items,
        created_at:       new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      }
      const res = await fetch("/api/db/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Save failed")
      router.push(data?.id ? `/invoices/${data.id}` : "/invoices")
    } catch {
      setSaving(false)
    }
  }

  const isValid = customerId && items.some((it) => it.description.trim() && it.unitPrice > 0)

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="New Invoice"
        description="Create a new invoice for billing"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/invoices">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Link>
          </Button>
        }
      />

      <div className="space-y-6">

        {/* ── Company Info Banner ────────────────────────────────────────── */}
        <Card className="border-navy-200 bg-slate-50">
          <CardContent className="py-3 px-4">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-800">{COMPANY.nameEN}</p>
                <p className="text-xs text-slate-500">{COMPANY.nameTH}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tax ID: {COMPANY.taxId} · {COMPANY.address}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Invoice Header ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Customer */}
              <div className="space-y-1.5">
                <Label>Customer <span className="text-red-500">*</span></Label>
                <select
                  value={customerId}
                  onChange={(e) => { setCustomerId(e.target.value); setBoatId("") }}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                >
                  <option value="">— Select customer —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name ?? ([c.first_name, c.last_name].filter(Boolean).join(" ") || c.id)}
                    </option>
                  ))}
                </select>
                {selectedCustomer && (
                  <div className="rounded-md bg-gray-50 p-2 text-xs text-gray-600 space-y-0.5">
                    <p>{selectedCustomer.address}</p>
                    {selectedCustomer.tax_id && <p>Tax ID: {selectedCustomer.tax_id}</p>}
                    <p>{selectedCustomer.phone} · {selectedCustomer.email}</p>
                  </div>
                )}
              </div>

              {/* Boat */}
              <div className="space-y-1.5">
                <Label>Boat (optional)</Label>
                <select
                  value={boatId}
                  onChange={(e) => setBoatId(e.target.value)}
                  disabled={!customerId}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100"
                >
                  <option value="">— Link to boat —</option>
                  {boatsForCustomer.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.boat_type})
                    </option>
                  ))}
                </select>
                {selectedBoat && (
                  <p className="text-xs text-gray-500">
                    {selectedBoat.brand} {selectedBoat.model} · Reg: {selectedBoat.registration_number}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
              <div className="space-y-1.5">
                <Label>Invoice Date</Label>
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>Payment Terms</Label>
                <select
                  value={paymentTerms}
                  onChange={(e) => handleTermsChange(parseInt(e.target.value))}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {PAYMENT_TERMS_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>Deposit Already Paid</Label>
                <Input
                  type="number"
                  min="0"
                  value={depositPaid}
                  onChange={(e) => setDepositPaid(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label>Work Order Ref.</Label>
                <Input value={workOrderRef} onChange={(e) => setWORef(e.target.value)} placeholder="WO-2026-018" />
              </div>
              <div className="space-y-1.5">
                <Label>Quotation Ref.</Label>
                <Input value={quotationRef} onChange={(e) => setQRef(e.target.value)} placeholder="QT-2026-042" />
              </div>
            </div>

          </CardContent>
        </Card>

        {/* ── Line Items ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Invoice Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Add Line
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">

            {/* Column headers */}
            <div className="hidden lg:grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase px-1">
              <span className="col-span-4">Description</span>
              <span className="col-span-2">Category</span>
              <span className="col-span-1 text-center">Qty</span>
              <span className="col-span-1 text-center">Unit</span>
              <span className="col-span-2 text-right">Unit Price</span>
              <span className="col-span-1 text-right">Subtotal</span>
              <span className="col-span-1" />
            </div>

            {items.map((item, idx) => {
              const lineTotal = item.qty * item.unitPrice * (1 - item.discount / 100)
              return (
                <div key={item.id} className="rounded-lg border border-gray-100 p-3 space-y-2 lg:space-y-0">
                  {/* Mobile label */}
                  <p className="text-xs text-gray-400 lg:hidden">Line {idx + 1}</p>

                  <div className="lg:grid lg:grid-cols-12 lg:gap-2 space-y-2 lg:space-y-0 items-start">

                    {/* Description */}
                    <div className="lg:col-span-4">
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(item.id, "description", e.target.value)}
                        placeholder="Service / item description"
                        className="text-sm"
                      />
                    </div>

                    {/* Category */}
                    <div className="lg:col-span-2">
                      <select
                        value={item.category}
                        onChange={(e) => updateItem(item.id, "category", e.target.value)}
                        className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Category…</option>
                        {SERVICE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Qty */}
                    <div className="lg:col-span-1">
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, "qty", parseFloat(e.target.value) || 1)}
                        className="text-sm text-center"
                      />
                    </div>

                    {/* Unit */}
                    <div className="lg:col-span-1">
                      <Input
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                        className="text-xs text-center"
                        placeholder="item"
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="lg:col-span-2">
                      <Input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="text-sm text-right"
                      />
                    </div>

                    {/* Line total */}
                    <div className="lg:col-span-1 flex items-center justify-end">
                      <span className="text-sm font-medium text-gray-700">{formatTHB(lineTotal)}</span>
                    </div>

                    {/* Remove */}
                    <div className="lg:col-span-1 flex items-center justify-end">
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Discount + VAT toggle row */}
                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Discount %</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount}
                        onChange={(e) => updateItem(item.id, "discount", parseFloat(e.target.value) || 0)}
                        className="w-16 text-xs text-center h-7"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.taxable}
                        onChange={(e) => updateItem(item.id, "taxable", e.target.checked)}
                        className="rounded"
                      />
                      VAT 7%
                    </label>
                  </div>
                </div>
              )
            })}

          </CardContent>
        </Card>

        {/* ── Totals ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: Invoice notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoice Note</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                value={invoiceNote}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
              <div className="rounded-md bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700 space-y-1">
                <p className="font-semibold">Bank: {COMPANY.nameEN.split(" ")[0]} {COMPANY.nameEN.split(" ")[1]}</p>
                <p>ธนาคารกรุงเทพ (BBL) สาขาเซนทรัล หาดเฉวง</p>
                <p>เลขบัญชี: 691-300825-3</p>
                <p>PromptPay: 082-878-9149</p>
              </div>
            </CardContent>
          </Card>

          {/* Right: Total calculation */}
          <Card className="border-teal-200">
            <CardHeader>
              <CardTitle className="text-base text-teal-800">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatTHB(itemsSubtotal)}</span>
              </div>

              {globalDiscount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Invoice Discount ({globalDiscount}%)</span>
                  <span>-{formatTHB(itemsSubtotal * globalDiscount / 100)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Invoice Discount %</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={globalDiscount}
                    onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                    className="w-16 h-7 text-xs text-center"
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
              </div>

              <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                <span className="text-gray-600">Taxable Amount</span>
                <span>{formatTHB(taxableNet)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">VAT {COMPANY.vatRate}%</span>
                <span>{formatTHB(vat)}</span>
              </div>

              <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2">
                <span>Grand Total</span>
                <span className="text-teal-700">{formatTHB(total)}</span>
              </div>

              {depositNum > 0 && (
                <>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Deposit Paid</span>
                    <span>-{formatTHB(depositNum)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-teal-200 pt-2 text-amber-700">
                    <span>Outstanding Balance</span>
                    <span>{formatTHB(total - depositNum)}</span>
                  </div>
                </>
              )}

            </CardContent>
          </Card>
        </div>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pb-8">
          <Link href="/invoices">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <div className="flex gap-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              onClick={() => handleSave(false)}
              disabled={!isValid || saving}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Creating…" : "Issue Invoice"}
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
