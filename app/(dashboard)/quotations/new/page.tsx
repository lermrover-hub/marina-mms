"use client"
import React, { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Save, Send, Sparkles, BookOpen, X, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineItemRow } from "@/components/quotations/LineItemRow"
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

interface PricingOption {
  id: string
  code: string
  serviceNameEn: string
  serviceNameTh: string | null
  category: string
  unit: string
  rateThb: number
}

const CATEGORIES = [
  "Ramp Access", "Haul-out", "Towing Truck Cost", "Yard Services",
  "Storage - Speedboat", "Storage - Small Craft", "Repair Yard",
  "Wash & Cleaning", "Utilities", "Wet Berth", "OT / After-Hours Labor",
  "VAT & Discounts", "Additional Rates", "Paint Services",
  "Engine", "Electrical", "Fiberglass", "Painting", "Paint & Coating",
  "Antifouling", "Interior", "Canvas", "Stainless / Metal", "Cleaning",
  "Plumbing", "Generator", "Air Conditioning", "Berth Fee", "Ramp Service",
  "Labour", "Material", "Other",
]

const UNITS = [
  "job", "hr", "day", "week", "month", "trip", "round trip", "event",
  "stand/day", "stand/wk", "stand/mo", "ft", "ft/day", "ft/week",
  "ft/month", "ft/round trip", "1000L", "litre", "kWh", "invoice",
  "hr add-on", "persons", "%", "% off", "package", "sqm", "zone",
  "pc", "set", "m", "m²", "kg", "unit", "year", "qtr", "quotation",
]

const DISCOUNT_TYPES = [
  { value: "NONE",    label: "No discount" },
  { value: "PERCENT", label: "Percentage (%)" },
  { value: "FIXED",   label: "Fixed amount (฿)" },
]

function uid() { return Math.random().toString(36).slice(2, 9) }

// ─── Rate Card Panel ──────────────────────────────────────────────────────────
function RateCardPanel({
  onAdd,
  onClose,
}: {
  onAdd: (item: PricingOption) => void
  onClose: () => void
}) {
  const [items, setItems] = useState<PricingOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("All")

  useEffect(() => {
    fetch("/api/pricing-master?isActive=true")
      .then((r) => r.json())
      .then((d) => setItems(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category))).sort()]

  const filtered = items.filter((i) => {
    const matchCat = activeCategory === "All" || i.category === activeCategory
    const matchSearch =
      !search ||
      i.serviceNameEn.toLowerCase().includes(search.toLowerCase()) ||
      i.code.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 pt-16 pr-4">
      <div className="w-[480px] max-h-[80vh] flex flex-col rounded-xl bg-white shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-teal-600" />
            <span className="font-semibold text-gray-900 text-sm">Rate Card</span>
            <span className="text-xs text-gray-400">({items.length} items)</span>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Search service or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-sm h-8"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                activeCategory === cat
                  ? "bg-teal-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading rate card…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">No items found</div>
          ) : (
            <div className="space-y-1">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 hover:border-teal-200 hover:bg-teal-50 group transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400">{item.code}</span>
                      <span className="text-sm font-medium text-gray-900 truncate">{item.serviceNameEn}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{item.category}</span>
                      <span className="text-xs font-semibold text-teal-700">
                        {formatTHB(item.rateThb)}/{item.unit}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onAdd(item)}
                    className="ml-3 shrink-0 rounded-md bg-teal-600 px-2.5 py-1 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-teal-700"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── AI Generate Modal ────────────────────────────────────────────────────────
function AiGenerateModal({
  selectedBoat,
  onApply,
  onClose,
}: {
  selectedBoat: Boat | undefined
  onApply: (items: LineItem[]) => void
  onClose: () => void
}) {
  const [serviceDescription, setServiceDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    if (!serviceDescription.trim()) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/quotations/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boatName:           selectedBoat?.name ?? null,
          boatType:           selectedBoat?.boat_type ?? null,
          loa:                selectedBoat?.loa_ft ?? null,
          beam:               selectedBoat?.beam_ft ?? null,
          draft:              selectedBoat?.draft_ft ?? null,
          serviceDescription,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? "AI generation failed.")
        return
      }
      const mapped: LineItem[] = (data.items as Array<{
        description: string
        category: string
        unit: string
        qty: number
        unitPrice: number
      }>).map((i) => ({
        id:          uid(),
        description: i.description ?? "",
        category:    i.category ?? "Other",
        unit:        i.unit ?? "job",
        qty:         Number(i.qty) || 1,
        unitPrice:   Number(i.unitPrice) || 0,
      }))
      onApply(mapped)
    } catch {
      setError("Network error — please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            <h2 className="font-semibold text-gray-900">AI Quotation Generator</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100 text-gray-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        {selectedBoat && (
          <div className="mb-4 rounded-lg bg-teal-50 border border-teal-200 px-3 py-2 text-xs text-teal-700">
            <span className="font-semibold">{selectedBoat.name}</span>
            {selectedBoat.boat_type && <span> · {selectedBoat.boat_type.replace(/_/g, " ")}</span>}
            {selectedBoat.loa_ft && <span> · LOA {selectedBoat.loa_ft} ft</span>}
            {selectedBoat.draft_ft && <span> · Draft {selectedBoat.draft_ft} ft</span>}
          </div>
        )}

        <div className="space-y-3">
          <Label>Describe the work needed</Label>
          <textarea
            rows={5}
            value={serviceDescription}
            onChange={(e) => setServiceDescription(e.target.value)}
            placeholder="e.g. Full haul-out service for a 45ft sailing catamaran — antifouling paint, hull wash, engine service, zinc replacement, and 5 days in the repair yard."
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 resize-y"
          />
          <p className="text-xs text-gray-400">
            AI will suggest line items using your pricing master rate card.
          </p>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700 text-white"
            onClick={generate}
            disabled={loading || !serviceDescription.trim()}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Generate</>
            )}
          </Button>
        </div>
      </div>
    </div>
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
        }
      })
      .catch((e) => setCustomersError(String(e)))
    fetch("/api/db/boats").then(r => r.json()).then(d => { if (Array.isArray(d)) setBoats(d) }).catch(() => {})
  }, [])

  // Panels
  const [showRateCard,  setShowRateCard]  = useState(false)
  const [showAiModal,   setShowAiModal]   = useState(false)

  // Form state
  const [customerId,     setCustomerId]     = useState("")
  const [boatId,         setBoatId]         = useState("")
  const [title,          setTitle]          = useState("")
  const [validDays,      setValidDays]      = useState(7)
  const [discountType,   setDiscountType]   = useState("NONE")
  const [discountValue,  setDiscountValue]  = useState(0)
  const [taxRate,        setTaxRate]        = useState(7)
  const [depositPct,     setDepositPct]     = useState(50)
  const [notes,          setNotes]          = useState("")
  const [customizeBooking, setCustomizeBooking] = useState("")
  const [managerName,    setManagerName]    = useState("")
  const [managerSignature, setManagerSignature] = useState("")
  const [saving,         setSaving]         = useState(false)

  const [items, setItems] = useState<LineItem[]>([
    { id: uid(), description: "", category: "Other", unit: "job", qty: 1, unitPrice: 0 },
  ])

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
  const discountPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0
  const discountLevel =
    discountPercent >= 10 && discountPercent <= 15 ? "L1" :
    discountPercent >= 6 && discountPercent < 10 ? "L2" :
    discountPercent >= 3 && discountPercent < 6 ? "L3" :
    discountPercent > 15 ? "BLOCKED" : ""
  const requiresManagerApproval = !!customizeBooking.trim() || discountPercent >= 3
  const hasManagerApproval = managerName.trim().length > 0 && managerSignature.trim().length > 0
  const approvalBlocked = discountLevel === "BLOCKED"

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

  // Add from rate card panel
  const handleAddFromRateCard = useCallback((pricing: PricingOption) => {
    setItems((prev) => [
      ...prev,
      {
        id:          uid(),
        description: `${pricing.code} - ${pricing.serviceNameEn}`,
        category:    pricing.category,
        unit:        pricing.unit,
        qty:         1,
        unitPrice:   Number(pricing.rateThb),
      },
    ])
  }, [])

  // Apply AI-generated items (appends to existing)
  const handleApplyAiItems = useCallback((aiItems: LineItem[]) => {
    setItems((prev) => {
      const onlyEmpty =
        prev.length === 1 && prev[0].description === "" && prev[0].unitPrice === 0
      return onlyEmpty ? aiItems : [...prev, ...aiItems]
    })
    setShowAiModal(false)
  }, [])

  async function handleSave(andSend = false) {
    if (andSend && approvalBlocked) {
      alert("Discount above 15% is outside the configured authorization levels.")
      return
    }
    if (andSend && requiresManagerApproval && !hasManagerApproval) {
      alert("Manager name and signature are required before sending this customized or discounted quotation.")
      return
    }
    setSaving(true)
    try {
      const validUntilDate = new Date()
      validUntilDate.setDate(validUntilDate.getDate() + validDays)
      const approvalNotes = [
        customizeBooking.trim() ? `[Customize Booking]\n${customizeBooking.trim()}` : "",
        requiresManagerApproval ? `[Manager Approval]\nLevel: ${discountLevel || "Required"}\nManager: ${managerName.trim() || "-"}\nSignature: ${managerSignature.trim() || "-"}\nDiscount percent: ${discountPercent.toFixed(2)}%` : "",
      ].filter(Boolean).join("\n\n")
      const finalNotes = [notes.trim(), approvalNotes].filter(Boolean).join("\n\n")
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
        notes:            finalNotes || null,
        customize_booking: customizeBooking.trim() || null,
        manager_approval_name: managerName.trim() || null,
        manager_approval_signature: managerSignature.trim() || null,
        discount_authorization_level: discountLevel || null,
        subtotal,
        discount_amount:  discountAmount,
        after_discount:   afterDiscount,
        tax_amount:       taxAmount,
        grand_total:      grandTotal,
        deposit_req:      depositReq,
        status:           andSend ? "SENT" : "DRAFT",
        items,
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
      {showRateCard && (
        <RateCardPanel
          onAdd={handleAddFromRateCard}
          onClose={() => setShowRateCard(false)}
        />
      )}
      {showAiModal && (
        <AiGenerateModal
          selectedBoat={selectedBoat}
          onApply={handleApplyAiItems}
          onClose={() => setShowAiModal(false)}
        />
      )}

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
            <Button size="sm" variant="teal" onClick={() => handleSave(true)} disabled={saving || !customerId || approvalBlocked || (requiresManagerApproval && !hasManagerApproval)} className="gap-2">
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
                <Input id="valid-days" type="number" min={1} max={365} value={validDays} onChange={(e) => setValidDays(parseInt(e.target.value) || 7)} />
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
                {discountPercent > 0 && (
                  <div className={cn(
                    "rounded-md border px-3 py-2 text-xs",
                    approvalBlocked ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"
                  )}>
                    Authorization: {discountLevel || "Below L3"} {discountLevel === "L3" ? "(3-5%)" : discountLevel === "L2" ? "(6-10%)" : discountLevel === "L1" ? "(10-15%)" : approvalBlocked ? "(over 15% not allowed)" : ""}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customize-booking">Customize Booking</Label>
                <textarea
                  id="customize-booking"
                  rows={3}
                  value={customizeBooking}
                  onChange={(e) => setCustomizeBooking(e.target.value)}
                  placeholder="Customer negotiation, special booking conditions, or price adjustment reason..."
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-y"
                />
              </div>

              {requiresManagerApproval && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Manager Confirmation Required</p>
                    <p className="mt-1 text-xs text-amber-700">Customized booking or L1/L2/L3 discount cannot be sent until a manager confirms with name and signature.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="manager-name">Manager Name</Label>
                    <Input id="manager-name" value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Approving manager" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="manager-signature">Manager Signature</Label>
                    <Input id="manager-signature" value={managerSignature} onChange={(e) => setManagerSignature(e.target.value)} placeholder="Typed signature / approval code" />
                  </div>
                </div>
              )}

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
              <div className="flex items-center gap-2">
                {/* AI Generate */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAiModal(true)}
                  className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50 hover:border-violet-400"
                >
                  <Sparkles className="h-3.5 w-3.5" /> AI Generate
                </Button>
                {/* Rate Card */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRateCard(true)}
                  className="gap-1.5 border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400"
                >
                  <BookOpen className="h-3.5 w-3.5" /> Rate Card
                </Button>
                <Button size="sm" variant="outline" onClick={addItem} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Item
                </Button>
              </div>
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
                      <LineItemRow
                        key={item.id}
                        item={item}
                        index={index}
                        categories={CATEGORIES}
                        units={UNITS}
                        onChange={updateItem}
                        onRemove={removeItem}
                      />
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
                    { label: "Subtotal",         value: subtotal,        color: "text-gray-900" },
                    { label: `Discount`,          value: -discountAmount, color: "text-green-600", hide: discountAmount === 0 },
                    { label: `VAT ${taxRate}%`,   value: taxAmount,       color: "text-gray-600" },
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
                <Button className="flex-1 gap-2" variant="teal" onClick={() => handleSave(true)} disabled={saving || !customerId || approvalBlocked || (requiresManagerApproval && !hasManagerApproval)}>
                  <Send className="h-4 w-4" /> {saving ? "Saving…" : "Save & Send to Customer"}
                </Button>
              </div>
              {!customerId && (
                <p className="text-xs text-center text-amber-600 mt-2">Select a customer before sending.</p>
              )}
              {approvalBlocked && (
                <p className="text-xs text-center text-red-600 mt-2">Discount over 15% is outside L1/L2/L3 approval limits.</p>
              )}
              {customerId && !approvalBlocked && requiresManagerApproval && !hasManagerApproval && (
                <p className="text-xs text-center text-amber-600 mt-2">Manager name and signature are required before sending.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
