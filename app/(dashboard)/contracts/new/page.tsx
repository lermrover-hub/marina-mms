"use client"
import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  FileText, Ship, User, CalendarDays, DollarSign,
  Loader2, ChevronLeft, CheckCircle2, Anchor,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Boat, Customer } from "@/lib/supabase"

// ─── constants ───────────────────────────────────────────────────────────────

const CONTRACT_TYPES = [
  { value: "WET_BERTH",         label: "Wet Berth",        icon: "⚓", desc: "Marina berth rental" },
  { value: "DRY_STORAGE",       label: "Dry Storage",      icon: "🏗️", desc: "Dry storage yard slot" },
  { value: "RAMP_SERVICE",      label: "Ramp Service",     icon: "🚢", desc: "Ongoing ramp agreement" },
  { value: "SERVICE_AGREEMENT", label: "Service Agreement",icon: "🔧", desc: "Maintenance / service contract" },
]

const BILLING_CYCLES = [
  { value: "MONTHLY",   label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUAL",    label: "Annual" },
  { value: "ONE_TIME",  label: "One-time" },
]

const DEFAULT_TERMS = `1. Payment is due within 7 days of invoice date.
2. The vessel must comply with marina regulations at all times.
3. The marina accepts no liability for damage to vessels unless caused by negligence of marina staff.
4. Sub-leasing of the berth is strictly prohibited.
5. The marina reserves the right to terminate this agreement with 30 days written notice.`

// ─── page ─────────────────────────────────────────────────────────────────────

export default function NewContractPage() {
  const router = useRouter()

  // contract type & billing
  const [contractType,  setContractType]  = useState("WET_BERTH")
  const [billingCycle,  setBillingCycle]  = useState("MONTHLY")
  const [rateAmount,    setRateAmount]    = useState("")
  const [depositAmount, setDepositAmount] = useState("")
  const [startDate,     setStartDate]     = useState("")
  const [endDate,       setEndDate]       = useState("")
  const [autoRenew,     setAutoRenew]     = useState(false)
  const [renewalDays,   setRenewalDays]   = useState("30")
  const [berthCode,     setBerthCode]     = useState("")

  // parties
  const [customerQuery,   setCustomerQuery]   = useState("")
  const [selectedCustomer,setSelectedCustomer]= useState<Customer | null>(null)
  const [customers,       setCustomers]       = useState<Customer[]>([])
  const [showCustDrop,    setShowCustDrop]    = useState(false)

  const [boatQuery,     setBoatQuery]     = useState("")
  const [selectedBoat,  setSelectedBoat]  = useState<Boat | null>(null)
  const [boats,         setBoats]         = useState<Boat[]>([])
  const [showBoatDrop,  setShowBoatDrop]  = useState(false)

  // terms
  const [termsText,    setTermsText]    = useState(DEFAULT_TERMS)
  const [specialConds, setSpecialConds] = useState("")
  const [notes,        setNotes]        = useState("")

  // submit
  const [submitting, setSubmitting] = useState(false)
  const [formError,  setFormError]  = useState<string | null>(null)

  // ── load data ──
  const loadCustomers = useCallback(() => {
    fetch("/api/db/customers?limit=200")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setCustomers(d) })
      .catch(() => {/* ignore */})
  }, [])

  const loadBoats = useCallback(() => {
    fetch("/api/db/boats?limit=200")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setBoats(d) })
      .catch(() => {/* ignore */})
  }, [])

  useEffect(() => { loadCustomers(); loadBoats() }, [loadCustomers, loadBoats])

  const filteredCustomers = customers.filter(c => {
    if (!customerQuery) return true
    const q = customerQuery.toLowerCase()
    const name = [c.first_name, c.last_name, c.company_name].filter(Boolean).join(" ").toLowerCase()
    return name.includes(q) || (c.email ?? "").toLowerCase().includes(q)
  }).slice(0, 8)

  const filteredBoats = boats.filter(b => {
    if (!boatQuery) return true
    const q = boatQuery.toLowerCase()
    return (b.name ?? "").toLowerCase().includes(q) ||
           (b.registration_number ?? "").toLowerCase().includes(q) ||
           (b.owner_name ?? "").toLowerCase().includes(q)
  }).slice(0, 8)

  function customerDisplayName(c: Customer) {
    if (c.company_name) return c.company_name
    return [c.first_name, c.last_name].filter(Boolean).join(" ") || "—"
  }

  function selectCustomer(c: Customer) {
    setSelectedCustomer(c)
    setCustomerQuery(customerDisplayName(c))
    setShowCustDrop(false)
  }

  function selectBoat(b: Boat) {
    setSelectedBoat(b)
    setBoatQuery(b.name ?? "")
    // pre-fill customer from boat if not already selected
    if (!selectedCustomer && b.owner_name) setCustomerQuery(b.owner_name)
    setShowBoatDrop(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!startDate) { setFormError("Start date is required"); return }
    if (!selectedCustomer && !customerQuery) { setFormError("Customer is required"); return }

    setSubmitting(true)
    setFormError(null)
    try {
      const body = {
        contract_type: contractType,
        billing_cycle: billingCycle,
        rate_amount:    rateAmount    ? parseFloat(rateAmount)    : null,
        deposit_amount: depositAmount ? parseFloat(depositAmount) : null,
        start_date:     startDate,
        end_date:       endDate       || null,
        auto_renew:     autoRenew,
        renewal_notice_days: parseInt(renewalDays) || 30,
        berth_code:     berthCode || null,
        customer_id:    selectedCustomer?.id   ?? null,
        customer_name:  selectedCustomer ? customerDisplayName(selectedCustomer) : (customerQuery || null),
        boat_id:        selectedBoat?.id       ?? null,
        boat_name:      selectedBoat?.name     ?? (boatQuery || null),
        terms_text:     termsText     || null,
        special_conditions: specialConds || null,
        notes:          notes          || null,
        status: "DRAFT",
      }
      const res  = await fetch("/api/db/contracts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Create failed")
      router.push(`/contracts/${data.id}`)
    } catch (e) {
      setFormError(String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Contract"
        description="Create a berth, storage, or service agreement"
        breadcrumb={[{ label: "Contracts", href: "/contracts" }, { label: "New Contract" }]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/contracts"><ChevronLeft className="h-4 w-4 mr-1" />Back</Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ── Left: main form ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Contract type */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4 text-teal-500" />Contract Type</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {CONTRACT_TYPES.map(ct => (
                    <button key={ct.value} type="button" onClick={() => setContractType(ct.value)}
                      className={`rounded-lg border-2 p-3 text-left transition-colors ${
                        contractType === ct.value
                          ? "border-teal-500 bg-teal-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}>
                      <div className="text-xl mb-1">{ct.icon}</div>
                      <div className={`text-sm font-semibold ${contractType === ct.value ? "text-teal-700" : "text-gray-800"}`}>{ct.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{ct.desc}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Parties */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-4 w-4 text-gray-400" />Parties</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {/* Customer */}
                <div className="space-y-1.5 relative">
                  <label className="text-sm font-medium text-gray-700">Customer <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input className="pl-9" placeholder="Search customer…"
                      value={customerQuery}
                      onChange={e => { setCustomerQuery(e.target.value); setSelectedCustomer(null); setShowCustDrop(true) }}
                      onFocus={() => setShowCustDrop(true)}
                      onBlur={() => setTimeout(() => setShowCustDrop(false), 200)} />
                  </div>
                  {showCustDrop && filteredCustomers.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {filteredCustomers.map(c => (
                        <button key={c.id} type="button"
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b last:border-0 transition-colors"
                          onClick={() => selectCustomer(c)}>
                          <div className="text-sm font-medium text-gray-900">{customerDisplayName(c)}</div>
                          {c.email && <div className="text-xs text-gray-500">{c.email}</div>}
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedCustomer && (
                    <div className="flex items-center gap-1.5 text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded px-2 py-1">
                      <CheckCircle2 className="h-3 w-3" /> Linked to customer record
                    </div>
                  )}
                </div>

                {/* Boat */}
                <div className="space-y-1.5 relative">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Ship className="h-3.5 w-3.5" /> Vessel (optional)
                  </label>
                  <div className="relative">
                    <Ship className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input className="pl-9" placeholder="Search boat…"
                      value={boatQuery}
                      onChange={e => { setBoatQuery(e.target.value); setSelectedBoat(null); setShowBoatDrop(true) }}
                      onFocus={() => setShowBoatDrop(true)}
                      onBlur={() => setTimeout(() => setShowBoatDrop(false), 200)} />
                  </div>
                  {showBoatDrop && filteredBoats.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {filteredBoats.map(b => (
                        <button key={b.id} type="button"
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b last:border-0 transition-colors"
                          onClick={() => selectBoat(b)}>
                          <div className="text-sm font-medium text-gray-900">{b.name}</div>
                          <div className="text-xs text-gray-500">
                            {b.registration_number && `${b.registration_number} · `}
                            {b.owner_name}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedBoat && (
                    <div className="flex items-center gap-1.5 text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded px-2 py-1">
                      <CheckCircle2 className="h-3 w-3" /> Linked to vessel record
                    </div>
                  )}
                </div>

                {/* Berth code */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Anchor className="h-3.5 w-3.5" /> Berth / Slot Code
                  </label>
                  <Input placeholder="e.g. A-12, DS-05…"
                    value={berthCode} onChange={e => setBerthCode(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {/* Period */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-gray-400" />Contract Period</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Start Date <span className="text-red-500">*</span></label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">End Date <span className="text-xs text-gray-400">(leave blank for open-ended)</span></label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="autorenew" checked={autoRenew}
                    onChange={e => setAutoRenew(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-teal-600" />
                  <label htmlFor="autorenew" className="text-sm text-gray-700">Auto-renew on expiry</label>
                  {autoRenew && (
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-sm text-gray-500">Notify</span>
                      <Input type="number" min="1" max="90" className="w-20 text-center"
                        value={renewalDays} onChange={e => setRenewalDays(e.target.value)} />
                      <span className="text-sm text-gray-500">days before</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Billing */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-teal-500" />Billing &amp; Deposit</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Billing Cycle</label>
                  <div className="flex flex-wrap gap-2">
                    {BILLING_CYCLES.map(bc => (
                      <button key={bc.value} type="button"
                        onClick={() => setBillingCycle(bc.value)}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors border ${
                          billingCycle === bc.value
                            ? "bg-teal-600 text-white border-teal-600"
                            : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                        }`}>
                        {bc.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Rate (THB)</label>
                    <Input type="number" min="0" step="0.01" placeholder="e.g. 15000"
                      value={rateAmount} onChange={e => setRateAmount(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Security Deposit (THB)</label>
                    <Input type="number" min="0" step="0.01" placeholder="e.g. 30000"
                      value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Terms */}
            <Card>
              <CardHeader><CardTitle>Terms &amp; Conditions</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Standard Terms</label>
                  <textarea rows={6}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={termsText} onChange={e => setTermsText(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Special Conditions</label>
                  <textarea rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Any special conditions or amendments to standard terms…"
                    value={specialConds} onChange={e => setSpecialConds(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Internal Notes</label>
                  <textarea rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Internal notes (not printed on contract)…"
                    value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Right: sidebar ── */}
          <div className="space-y-4">
            {/* Submit */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                {formError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                    {formError}
                  </div>
                )}
                <Button type="submit" variant="teal" className="w-full gap-2" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  {submitting ? "Creating…" : "Create Contract"}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => router.back()} disabled={submitting}>
                  Cancel
                </Button>
                <p className="text-xs text-gray-400 text-center">Contract will be created as DRAFT. Activate it when all parties are ready.</p>
              </CardContent>
            </Card>

            {/* Summary preview */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium">{CONTRACT_TYPES.find(t => t.value === contractType)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer</span>
                  <span className="font-medium text-right max-w-[140px] truncate">
                    {selectedCustomer ? customerDisplayName(selectedCustomer) : (customerQuery || "—")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Vessel</span>
                  <span className="font-medium text-right max-w-[140px] truncate">
                    {selectedBoat?.name ?? (boatQuery || "—")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Start</span>
                  <span className="font-medium">{startDate || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">End</span>
                  <span className="font-medium">{endDate || "Open-ended"}</span>
                </div>
                {rateAmount && (
                  <div className="flex justify-between pt-1 border-t">
                    <span className="text-gray-500">Rate</span>
                    <span className="font-semibold text-teal-700">
                      {parseFloat(rateAmount).toLocaleString()} THB / {BILLING_CYCLES.find(c => c.value === billingCycle)?.label}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Workflow info */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Contract Workflow</CardTitle></CardHeader>
              <CardContent className="text-xs text-gray-600 space-y-1.5">
                <div className="flex items-center gap-2"><span className="w-16 text-right font-medium text-gray-500">DRAFT</span><span>→ Enter details, review</span></div>
                <div className="flex items-center gap-2"><span className="w-16 text-right font-medium text-green-700">ACTIVE</span><span>→ Both parties sign, billing begins</span></div>
                <div className="flex items-center gap-2"><span className="w-16 text-right font-medium text-amber-700">EXPIRED</span><span>→ Auto on end date (if set)</span></div>
                <div className="flex items-center gap-2"><span className="w-16 text-right font-medium text-orange-700">SUSPENDED</span><span>→ Temporarily paused</span></div>
                <div className="flex items-center gap-2"><span className="w-16 text-right font-medium text-red-700">TERMINATED</span><span>→ Contract ended early</span></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
