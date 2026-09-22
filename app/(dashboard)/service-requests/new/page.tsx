"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/PageHeader"
import { HelpHint } from "@/components/shared/HelpHint"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Boat, Customer } from "@/lib/supabase"
import { formatTHB } from "@/lib/utils"
import { maxOperationalDiscountForRole, QUOTATION_PRICE_EDIT_ROLES, roleAllowed } from "@/lib/workflow-access"

type Price = { id: string; code: string; serviceNameEn: string; category: string; unit: string; rateThb: number; directCostThb: number | null }
type ServiceLine = { pricing_code: string; description: string; qty: number; unit: string; unit_price: number; direct_cost: number; discount_pct: number }

export default function NewServiceRequestPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const actorRole = (session?.user as { role?: string } | undefined)?.role ?? ""
  const maximumDiscount = maxOperationalDiscountForRole(actorRole)
  const canEditCost = roleAllowed(actorRole, QUOTATION_PRICE_EDIT_ROLES)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [boats, setBoats] = useState<Boat[]>([])
  const [prices, setPrices] = useState<Price[]>([])
  const [customerId, setCustomerId] = useState("")
  const [boatId, setBoatId] = useState("")
  const requestType = "RAMP_SERVICE"
  const [rampPlan, setRampPlan] = useState("HAUL_OUT_CONFIRMED_LAUNCH_OPEN")
  const [haulOutDate, setHaulOutDate] = useState("")
  const [launchDate, setLaunchDate] = useState("")
  const [serviceType, setServiceType] = useState("STORAGE")
  const [storagePeriod, setStoragePeriod] = useState("DAILY")
  const [operatorType, setOperatorType] = useState("OCEAN_ROVER")
  const [trade, setTrade] = useState("Paint")
  const [markupPct, setMarkupPct] = useState(10)
  const [paymentMode, setPaymentMode] = useState("FULL_PREPAYMENT")
  const [goodCredit, setGoodCredit] = useState(false)
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [selectedPrice, setSelectedPrice] = useState("")
  const [items, setItems] = useState<ServiceLine[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/db/customers").then((r) => r.json()),
      fetch("/api/db/boats").then((r) => r.json()),
      fetch("/api/pricing-master?isActive=true").then((r) => r.json()),
    ]).then(([customerRows, boatRows, priceRows]) => {
      setCustomers(Array.isArray(customerRows) ? customerRows : [])
      setBoats(Array.isArray(boatRows) ? boatRows : [])
      setPrices(Array.isArray(priceRows?.data) ? priceRows.data : [])
    }).catch((e) => setError(String(e)))
  }, [])

  useEffect(() => {
    setPaymentMode(serviceType === "YARD_SERVICE" && operatorType === "OCEAN_ROVER" ? "DEPOSIT" : "FULL_PREPAYMENT")
  }, [serviceType, operatorType])

  const boatsForCustomer = useMemo(() => boats.filter((boat) => boat.owner_id === customerId), [boats, customerId])
  const selectedCustomer = customers.find((customer) => customer.id === customerId)
  const selectedBoat = boats.find((boat) => boat.id === boatId)
  const total = items.reduce((sum, item) => sum + item.qty * item.unit_price * (1 - item.discount_pct / 100), 0)

  function addRate() {
    const price = prices.find((row) => row.code === selectedPrice)
    if (!price) return
    setItems((rows) => [...rows, { pricing_code: price.code, description: price.serviceNameEn, qty: 1, unit: price.unit, unit_price: price.rateThb, direct_cost: price.directCostThb ?? 0, discount_pct: 0 }])
    setSelectedPrice("")
  }

  function addSuggestedService(keywords: string[]) {
    const price = prices.find((row) => keywords.some((keyword) => `${row.code} ${row.serviceNameEn}`.toLowerCase().includes(keyword)))
    if (!price) {
      setError(`No active rate-card item found for ${keywords[0]}. Please select it from the rate card.`)
      return
    }
    setItems((rows) => [...rows, { pricing_code: price.code, description: price.serviceNameEn, qty: 1, unit: price.unit, unit_price: price.rateThb, direct_cost: price.directCostThb ?? 0, discount_pct: 0 }])
  }

  function updateLine(index: number, patch: Partial<ServiceLine>) {
    setItems((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/db/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: `SR-${Date.now().toString().slice(-6)}`,
          customer_id: customerId,
          customer_name: selectedCustomer?.company_name ?? [selectedCustomer?.first_name, selectedCustomer?.last_name].filter(Boolean).join(" "),
          boat_id: boatId,
          boat_name: selectedBoat?.name,
          title: title || `${requestType === "RAMP_SERVICE" ? "Ramp service" : serviceType} — ${selectedBoat?.name ?? "boat"}`,
          description: notes,
          request_type: requestType,
          ramp_operation_plan: requestType === "RAMP_SERVICE" ? rampPlan : null,
          confirmed_haul_out_date: haulOutDate || null,
          confirmed_launch_date: launchDate || null,
          service_type: serviceType,
          storage_period: serviceType === "STORAGE" ? storagePeriod : null,
          operator_type: operatorType,
          subcontractor_trade: operatorType === "OCEAN_ROVER_SUBCONTRACTOR" ? trade : null,
          markup_pct: operatorType === "OCEAN_ROVER_SUBCONTRACTOR" ? markupPct : 0,
          payment_mode: paymentMode,
          good_credit_customer: paymentMode === "CREDIT" && goodCredit,
          notes,
          items: items.map((item) => ({ ...item, operator_type: operatorType, markup_pct: operatorType === "OCEAN_ROVER_SUBCONTRACTOR" ? markupPct : 0, service_group: requestType === "RAMP_SERVICE" ? "RAMP_SERVICE" : serviceType })),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? "Unable to create workflow")
      router.push(`/service-requests/${data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="New Service Request" description="Operational request, rate-card quotation and payment gate in one workflow" actions={<Button variant="outline" size="sm" asChild><Link href="/service-requests"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>} />
      <form onSubmit={submit} className="space-y-6">
        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <Card><CardHeader><CardTitle>1. Customer & Boat</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
          <div><Label>Customer *</Label><select required className="mt-1 w-full rounded-md border p-2" value={customerId} onChange={(e) => { setCustomerId(e.target.value); setBoatId("") }}><option value="">Select customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.company_name ?? [c.first_name, c.last_name].filter(Boolean).join(" ")}</option>)}</select></div>
          <div><Label>Boat / Vessel *</Label><select required className="mt-1 w-full rounded-md border p-2" value={boatId} onChange={(e) => setBoatId(e.target.value)}><option value="">Select boat</option>{boatsForCustomer.map((boat) => <option key={boat.id} value={boat.id}>{boat.name} — {boat.boat_type ?? "type not set"}</option>)}</select>{selectedBoat && <p className="mt-1 text-xs text-gray-500">Boat type: {selectedBoat.boat_type ?? "Not set"} · LOA {selectedBoat.loa_ft ?? "?"} ft</p>}</div>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>2. Ramp Service <HelpHint title="Ramp Service workflow">Every request on this screen starts with ramp planning, then branches to Storage or Yard Service. Yard Service then branches by who performs the work.</HelpHint></CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="grid gap-4 rounded-lg border border-sky-200 bg-sky-50 p-4 md:grid-cols-3"><div><Label>Ramp plan *</Label><select className="mt-1 w-full rounded-md border p-2" value={rampPlan} onChange={(e) => setRampPlan(e.target.value)}><option value="HAUL_OUT_AND_LAUNCH_CONFIRMED">Confirm haul-out + launch dates</option><option value="HAUL_OUT_CONFIRMED_LAUNCH_OPEN">Confirm haul-out / launch open</option></select></div><div><Label>Confirmed haul-out *</Label><Input required type="date" value={haulOutDate} onChange={(e) => setHaulOutDate(e.target.value)} /></div><div><Label>Confirmed launch</Label><Input required={rampPlan === "HAUL_OUT_AND_LAUNCH_CONFIRMED"} type="date" value={launchDate} onChange={(e) => setLaunchDate(e.target.value)} /></div></div>
          <div><Label>Choose service under Ramp Service *</Label><div className="mt-2 grid gap-3 md:grid-cols-2"><button type="button" onClick={() => { setServiceType("STORAGE"); setOperatorType("OCEAN_ROVER") }} className={`rounded-lg border p-4 text-left ${serviceType === "STORAGE" ? "border-teal-500 bg-teal-50" : "border-gray-200"}`}><b>A. Storage</b><p className="text-sm text-gray-500">Daily, weekly or monthly boat storage</p></button><button type="button" onClick={() => setServiceType("YARD_SERVICE")} className={`rounded-lg border p-4 text-left ${serviceType === "YARD_SERVICE" ? "border-teal-500 bg-teal-50" : "border-gray-200"}`}><b>B. Yard Service</b><p className="text-sm text-gray-500">Marina work or external contractor work</p></button></div></div>
          {serviceType === "STORAGE" ? <div className="rounded-lg border bg-gray-50 p-4"><Label>Storage billing period</Label><div className="mt-2 grid grid-cols-3 gap-2">{["DAILY", "WEEKLY", "MONTHLY"].map((period) => <button type="button" key={period} onClick={() => setStoragePeriod(period)} className={`rounded-md border px-3 py-2 text-sm font-medium ${storagePeriod === period ? "border-teal-500 bg-white text-teal-700" : "border-gray-200 bg-white text-gray-600"}`}>{period[0] + period.slice(1).toLowerCase()}</button>)}</div>{storagePeriod === "MONTHLY" && <p className="mt-2 text-xs text-amber-700">Monthly storage creates an officer billing reminder.</p>}</div> : <div className="space-y-4 rounded-lg border bg-gray-50 p-4"><div><Label>Who performs the Yard Service? <HelpHint title="Operator affects price and approval">Ocean Rover work may receive an authorised discount. Boat-owner contractor work requires verified insurance. Ocean Rover subcontractor work uses direct cost plus markup and cannot receive a Marina discount.</HelpHint></Label><div className="mt-2 grid gap-2 md:grid-cols-3">{[{ value: "OCEAN_ROVER", label: "Ocean Rover" }, { value: "BOAT_OWNER_CONTRACTOR", label: "Boat owner / contractor" }, { value: "OCEAN_ROVER_SUBCONTRACTOR", label: "Ocean Rover subcontractor" }].map((operator) => <button type="button" key={operator.value} onClick={() => setOperatorType(operator.value)} className={`rounded-md border p-3 text-sm font-semibold ${operatorType === operator.value ? "border-teal-500 bg-white text-teal-700" : "border-gray-200 bg-white"}`}>{operator.label}</button>)}</div></div>
          {operatorType === "OCEAN_ROVER" && <div><Label>Common Ocean Rover services</Label><div className="mt-2 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => addSuggestedService(["tow", "truck"])}>+ Tow truck</Button><Button type="button" size="sm" variant="outline" onClick={() => addSuggestedService(["pressure", "bottom clean"])}>+ Hi-pressure bottom cleaning</Button><Button type="button" size="sm" variant="outline" onClick={() => addSuggestedService(["boat wash", "wash"])}>+ Boat wash</Button></div></div>}
          {operatorType === "BOAT_OWNER_CONTRACTOR" && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">Enter the contractor scope in Internal Notes. Insurance starts as Requested and must be verified before confirming the Service Order.</p>}
          {operatorType === "OCEAN_ROVER_SUBCONTRACTOR" && <div className="grid gap-4 md:grid-cols-2"><div><Label>Trade</Label><select className="mt-1 w-full rounded-md border p-2" value={trade} onChange={(e) => setTrade(e.target.value)}><option>Paint</option><option>Mechanic</option><option>Electrical</option><option>Other</option></select></div><div><Label>Markup %</Label><Input type="number" min="0" max="100" value={markupPct} onChange={(e) => setMarkupPct(Number(e.target.value))} /></div></div>}</div>}
        </CardContent></Card>

        <Card><CardHeader><CardTitle>3. Ordered Service Items (Rate Card) <HelpHint title="How pricing works">Select every billable item from the active rate card in document order. The Draft keeps a price and direct-cost snapshot so later rate changes do not alter the quotation.</HelpHint></CardTitle></CardHeader><CardContent className="space-y-3">
          <div className="flex gap-2"><select className="min-w-0 flex-1 rounded-md border p-2" value={selectedPrice} onChange={(e) => setSelectedPrice(e.target.value)}><option value="">Select rate-card item</option>{prices.map((price) => <option key={price.id} value={price.code}>{price.code} — {price.serviceNameEn} ({formatTHB(price.rateThb)}/{price.unit})</option>)}</select><Button type="button" variant="outline" onClick={addRate}><Plus className="mr-1 h-4 w-4" />Add</Button></div>
          {items.map((item, index) => <div key={`${item.pricing_code}-${index}`} className="grid items-end gap-2 rounded-lg border p-3 md:grid-cols-[1fr_90px_110px_90px_40px]"><div><p className="text-xs text-gray-500">{item.pricing_code}</p><p className="font-medium">{item.description}</p><p className="text-xs text-gray-500">Rate {formatTHB(item.unit_price)} / {item.unit}</p></div><div><Label>Qty</Label><Input type="number" min="0.001" step="0.001" value={item.qty} onChange={(e) => updateLine(index, { qty: Number(e.target.value) })} /></div><div><Label>Direct cost</Label><Input type="number" min="0" step="0.01" disabled={!canEditCost} title={canEditCost ? "" : "Admin or Finance only"} value={item.direct_cost} onChange={(e) => updateLine(index, { direct_cost: Number(e.target.value) })} /></div><div><Label>Discount %</Label><Input type="number" min="0" max={maximumDiscount} step="0.01" disabled={operatorType !== "OCEAN_ROVER" || maximumDiscount === 0} title={`Maximum ${maximumDiscount}% for your role`} value={item.discount_pct} onChange={(e) => updateLine(index, { discount_pct: Math.min(maximumDiscount, Number(e.target.value)) })} /></div><Button type="button" variant="ghost" onClick={() => setItems((rows) => rows.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4 text-red-500" /></Button></div>)}
          {!items.length && <p className="py-6 text-center text-sm text-gray-400">Add services in the order they should appear on the quotation.</p>}
          <p className="text-right font-semibold">Preview subtotal: {formatTHB(total)}</p>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>4. Payment Rule <HelpHint title="Service Request vs Work Order">You can save the Service Request before payment. A Work Order is created only after Finance clears full payment, the required deposit, or approved credit, and an officer confirms the Service Order.</HelpHint></CardTitle></CardHeader><CardContent className="space-y-4"><div><Label>Payment mode <HelpHint title="Payment options">Full pre-payment is standard for ramp/storage. Deposit defaults to 50/40/10 for Ocean Rover yard work, with the first payment never below committed material/subcontractor cost. Credit needs Finance/GM approval and uses a maximum 30-day first cycle.</HelpHint></Label><select className="mt-1 w-full rounded-md border p-2" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}><option value="FULL_PREPAYMENT">Full pre-payment — must be Paid before service</option><option value="DEPOSIT">Deposit — 50/40/10 (initial amount covers committed cost)</option><option value="CREDIT">Credit — maximum first 30-day cycle</option></select></div>{paymentMode === "CREDIT" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={goodCredit} onChange={(e) => setGoodCredit(e.target.checked)} />Existing good-credit customer (Finance/GM approval still required; max 7 days after launch)</label>}<div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional; generated automatically if blank" /></div><div><Label>Internal notes</Label><textarea className="mt-1 min-h-24 w-full rounded-md border p-2 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} /></div></CardContent></Card>
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">Saving creates the Service Request, an ordered Draft quotation, and its payment plan. It does not send anything to the customer. Review the Draft, then use Submit for Approval.</div>
        <Button type="submit" variant="teal" disabled={saving || !customerId || !boatId || !items.length}><Save className="mr-2 h-4 w-4" />{saving ? "Creating workflow…" : "Save Draft Workflow"}</Button>
      </form>
    </div>
  )
}
