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
import type { Boat, Customer, CustomerContact } from "@/lib/supabase"
import { formatTHB } from "@/lib/utils"
import { maxOperationalDiscountForRole, QUOTATION_PRICE_EDIT_ROLES, roleAllowed } from "@/lib/workflow-access"
import { rateCardItemsForSection, serviceCategories, storagePeriodMatches, type ServiceWorkflowSection } from "@/lib/service-rate-card"
import { deriveRampMovementPlan } from "@/lib/service-workflow"

type Price = { id: string; code: string; serviceNameEn: string; category: string; unit: string; rateThb: number; directCostThb: number | null; serviceGroup?: string | null; subgroup?: string | null; revenueGlCode?: string | null; costGlCode?: string | null; pnlCategory?: string | null }
type ServiceLine = { pricing_code?: string; description: string; service_group: ServiceWorkflowSection | "OPEN_RATE"; operator_type: string; qty: number; unit: string; unit_price: number; direct_cost: number; discount_pct: number; is_open_rate?: boolean; revenue_gl_code?: string | null; cost_gl_code?: string | null; pnl_category?: string | null }

export default function NewServiceRequestPage() {
  const router = useRouter()
  const [followUpTo, setFollowUpTo] = useState("")
  const { data: session } = useSession()
  const actorRole = (session?.user as { role?: string } | undefined)?.role ?? ""
  const maximumDiscount = maxOperationalDiscountForRole(actorRole)
  const canEditCost = roleAllowed(actorRole, QUOTATION_PRICE_EDIT_ROLES)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [boats, setBoats] = useState<Boat[]>([])
  const [prices, setPrices] = useState<Price[]>([])
  const [customerId, setCustomerId] = useState("")
  const [boatId, setBoatId] = useState("")
  const [contacts, setContacts] = useState<CustomerContact[]>([])
  const [operationalContactId, setOperationalContactId] = useState("")
  const requestType = "RAMP_SERVICE"
  const [haulOut, setHaulOut] = useState(false)
  const [haulOutDate, setHaulOutDate] = useState("")
  const [towIn, setTowIn] = useState(false)
  const [towInDate, setTowInDate] = useState("")
  const [launch, setLaunch] = useState(false)
  const [launchDate, setLaunchDate] = useState("")
  const [towOut, setTowOut] = useState(false)
  const [towOutDate, setTowOutDate] = useState("")
  const [primaryService, setPrimaryService] = useState<"STORAGE" | "YARD">("STORAGE")
  const [addYardToStorage, setAddYardToStorage] = useState(false)
  const [storagePeriod, setStoragePeriod] = useState("DAILY")
  const [operatorType, setOperatorType] = useState("OCEAN_ROVER")
  const [trade, setTrade] = useState("Paint")
  const [markupPct, setMarkupPct] = useState(10)
  const [paymentMode, setPaymentMode] = useState("FULL_PREPAYMENT")
  const [goodCredit, setGoodCredit] = useState(false)
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [activeSection, setActiveSection] = useState<ServiceWorkflowSection>("RAMP")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedPrice, setSelectedPrice] = useState("")
  const [openRateDescription, setOpenRateDescription] = useState("")
  const [openRatePrice, setOpenRatePrice] = useState("")
  const [openRateCost, setOpenRateCost] = useState("")
  const [items, setItems] = useState<ServiceLine[]>([])
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const includeStorage = primaryService === "STORAGE"
  const includeYardService = primaryService === "YARD" || addYardToStorage

  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    const parentId = query.get("follow_up_to") ?? ""
    setFollowUpTo(parentId)
    setCustomerId(query.get("customer_id") ?? "")
    setBoatId(query.get("boat_id") ?? "")
    if (parentId) setPrimaryService("YARD")
  }, [])

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
    setPaymentMode(includeYardService && operatorType === "OCEAN_ROVER" ? "DEPOSIT" : "FULL_PREPAYMENT")
  }, [includeYardService, operatorType])

  const boatsForCustomer = useMemo(() => boats.filter((boat) => boat.owner_id === customerId), [boats, customerId])
  const selectedCustomer = customers.find((customer) => customer.id === customerId)
  const selectedBoat = boats.find((boat) => boat.id === boatId)
  const selectedOperationalContact = contacts.find((contact) => contact.id === operationalContactId)
  const total = items.reduce((sum, item) => sum + item.qty * item.unit_price * (1 - item.discount_pct / 100), 0)
  const sectionPrices = useMemo(() => rateCardItemsForSection(prices, activeSection).filter((price) => activeSection !== "STORAGE" || storagePeriodMatches(price, storagePeriod)), [prices, activeSection, storagePeriod])
  const categories = useMemo(() => serviceCategories(sectionPrices), [sectionPrices])
  const filteredPrices = useMemo(() => sectionPrices.filter((price) => (price.subgroup || price.category) === selectedCategory), [sectionPrices, selectedCategory])
  const movement = deriveRampMovementPlan({ haulOut, haulOutDate, towIn, towInDate, launch, launchDate, towOut, towOutDate })
  const movementRateRequired = haulOut || launch
  const selectedSections = useMemo<ServiceWorkflowSection[]>(() => [
    "RAMP",
    ...(includeStorage ? ["STORAGE" as const] : []),
    ...(includeYardService ? ["YARD" as const] : []),
  ], [includeStorage, includeYardService])

  useEffect(() => {
    setSelectedCategory("")
    setSelectedPrice("")
  }, [activeSection, storagePeriod])

  useEffect(() => {
    if (!customerId) {
      setContacts([])
      setOperationalContactId("")
      return
    }
    fetch(`/api/db/customer-contacts?customer_id=${encodeURIComponent(customerId)}`)
      .then((response) => response.json())
      .then((rows) => setContacts(Array.isArray(rows) ? rows : []))
      .catch(() => setContacts([]))
  }, [customerId])

  useEffect(() => {
    setOperationalContactId(selectedBoat?.captain_contact_id ?? "")
  }, [selectedBoat?.captain_contact_id, boatId])

  function addRate() {
    const price = prices.find((row) => row.code === selectedPrice)
    if (!price) return
    const lineOperator = activeSection === "YARD" ? operatorType : "OCEAN_ROVER"
    const directCost = price.directCostThb ?? 0
    const unitPrice = lineOperator === "OCEAN_ROVER_SUBCONTRACTOR" ? directCost * (1 + markupPct / 100) : price.rateThb
    setItems((rows) => [...rows, { pricing_code: price.code, description: price.serviceNameEn, service_group: activeSection, operator_type: lineOperator, qty: 1, unit: price.unit, unit_price: unitPrice, direct_cost: directCost, discount_pct: 0, revenue_gl_code: price.revenueGlCode, cost_gl_code: price.costGlCode, pnl_category: price.pnlCategory }])
    setSelectedPrice("")
  }

  function addOpenRate() {
    if (!canEditCost || !openRateDescription.trim() || openRatePrice === "") return
    setItems((rows) => [...rows, { description: openRateDescription.trim(), service_group: activeSection, operator_type: activeSection === "YARD" ? operatorType : "OCEAN_ROVER", qty: 1, unit: "item", unit_price: Number(openRatePrice), direct_cost: Number(openRateCost || 0), discount_pct: 0, is_open_rate: true }])
    setOpenRateDescription("")
    setOpenRatePrice("")
    setOpenRateCost("")
  }

  function updateLine(index: number, patch: Partial<ServiceLine>) {
    setItems((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row))
  }

  function changeYardOperator(nextOperator: string) {
    setOperatorType(nextOperator)
    setItems((rows) => rows.map((row) => {
      if (row.service_group !== "YARD") return row
      const rateCardPrice = prices.find((price) => price.code === row.pricing_code)?.rateThb
      return {
        ...row,
        operator_type: nextOperator,
        discount_pct: nextOperator === "OCEAN_ROVER" ? row.discount_pct : 0,
        unit_price: row.is_open_rate
          ? row.unit_price
          : nextOperator === "OCEAN_ROVER_SUBCONTRACTOR"
            ? row.direct_cost * (1 + markupPct / 100)
            : rateCardPrice ?? row.unit_price,
      }
    }))
  }

  function changePrimaryService(next: "STORAGE" | "YARD") {
    setPrimaryService(next)
    setAddYardToStorage(false)
    setItems((rows) => rows.filter((row) => row.service_group !== (next === "STORAGE" ? "YARD" : "STORAGE")))
  }

  function toggleAdditionalYardService(checked: boolean) {
    setAddYardToStorage(checked)
    if (!checked) setItems((rows) => rows.filter((row) => row.service_group !== "YARD"))
  }

  function changeStoragePeriod(nextPeriod: string) {
    setStoragePeriod(nextPeriod)
    setItems((rows) => rows.filter((row) => row.service_group !== "STORAGE"))
  }

  function changeMarkup(nextMarkup: number) {
    setMarkupPct(nextMarkup)
    setItems((rows) => rows.map((row) => row.service_group === "YARD" && row.operator_type === "OCEAN_ROVER_SUBCONTRACTOR" && !row.is_open_rate
      ? { ...row, unit_price: row.direct_cost * (1 + nextMarkup / 100) }
      : row))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (movement.error) {
      setError(movement.error)
      return
    }
    if ((haulOut || launch) && !items.some((item) => item.service_group === "RAMP")) {
      setError("Add at least one Ramp / Haul-out / Launch rate-card item.")
      return
    }
    if (includeStorage && !items.some((item) => item.service_group === "STORAGE")) {
      setError("Add at least one Storage rate-card item.")
      return
    }
    if (includeYardService && !items.some((item) => item.service_group === "YARD")) {
      setError("Add at least one Yard Service rate-card item.")
      return
    }
    setSaving(true)
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
          operational_contact_id: operationalContactId || null,
          title: title || `Ramp service — ${selectedBoat?.name ?? "boat"}`,
          description: notes,
          request_type: requestType,
          ramp_operation_plan: movement.error ? null : movement.rampOperationPlan,
          haul_out: haulOut,
          confirmed_haul_out_date: haulOut ? haulOutDate || null : null,
          tow_in: towIn,
          tow_in_date: towIn ? towInDate || null : null,
          launch,
          confirmed_launch_date: launch ? launchDate || null : null,
          tow_out: towOut,
          tow_out_date: towOut ? towOutDate || null : null,
          service_type: includeYardService ? "YARD_SERVICE" : "STORAGE",
          service_types: [includeStorage ? "STORAGE" : null, includeYardService ? "YARD_SERVICE" : null].filter(Boolean),
          storage_period: includeStorage ? storagePeriod : null,
          operator_type: operatorType,
          subcontractor_trade: operatorType === "OCEAN_ROVER_SUBCONTRACTOR" ? trade : null,
          markup_pct: operatorType === "OCEAN_ROVER_SUBCONTRACTOR" ? markupPct : 0,
          payment_mode: paymentMode,
          good_credit_customer: paymentMode === "CREDIT" && goodCredit,
          notes: [followUpTo ? `Additional service request for stored vessel. Parent service request: ${followUpTo}` : null, notes].filter(Boolean).join("\n"),
          items: items.map((item) => ({ ...item, markup_pct: item.operator_type === "OCEAN_ROVER_SUBCONTRACTOR" ? markupPct : 0 })),
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
        <div className="grid grid-cols-3 gap-2 rounded-xl border bg-white p-3">{["Customer & Movement", "Service & Rate Card", "Review Draft"].map((label, index) => { const step = index + 1; return <div key={label} className={`flex items-center gap-2 rounded-lg p-2 text-xs font-medium ${currentStep === step ? "bg-teal-50 text-teal-800" : currentStep > step ? "text-teal-700" : "text-gray-400"}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-bold ${currentStep >= step ? "border-teal-600 bg-teal-600 text-white" : "border-gray-300"}`}>{currentStep > step ? "✓" : step}</span><span className="hidden sm:inline">{label}</span></div> })}</div>
        {currentStep === 1 && <>
        <Card><CardHeader><CardTitle>1. Customer & Boat</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
          <div><Label>Customer *</Label><select required className="mt-1 w-full rounded-md border p-2" value={customerId} onChange={(e) => { setCustomerId(e.target.value); setBoatId(""); setOperationalContactId("") }}><option value="">Select customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.company_name ?? [c.first_name, c.last_name].filter(Boolean).join(" ")}</option>)}</select></div>
          <div><Label>Boat / Vessel *</Label><select required className="mt-1 w-full rounded-md border p-2" value={boatId} onChange={(e) => setBoatId(e.target.value)}><option value="">Select boat</option>{boatsForCustomer.map((boat) => <option key={boat.id} value={boat.id}>{boat.name} — {boat.boat_type ?? "type not set"}</option>)}</select>{selectedBoat && <p className="mt-1 text-xs text-gray-500">Boat type: {selectedBoat.boat_type ?? "Not set"} · LOA {selectedBoat.loa_ft ?? "?"} ft</p>}</div>
          <div className="md:col-span-2"><Label>Operational Contact / Captain</Label><select className="mt-1 w-full rounded-md border p-2" value={operationalContactId} onChange={(event) => setOperationalContactId(event.target.value)}><option value="">— Use customer main contact —</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.full_name}{contact.phone ? ` · ${contact.phone}` : ""}</option>)}</select><p className="mt-1 text-xs text-gray-500">Defaults from the selected boat. You may override it for this request only. This does not change the billing contact.{selectedOperationalContact ? ` Preferred channel: ${selectedOperationalContact.preferred_channel}.` : ""}</p></div>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>2. Vessel Movement &amp; Service <HelpHint title="Arrival and departure workflow">Choose how the vessel enters the yard: marina Haul-out or road Tow in. Departure may remain open, or be confirmed as Launch or Tow out. Tow movements may be free or charged separately by Rate Card / Open Rate.</HelpHint></CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="space-y-4 rounded-lg border border-sky-200 bg-sky-50 p-4">
            <div><Label className="text-base font-semibold">Arrival method *</Label><p className="mt-1 text-xs text-gray-600">Choose one. A vessel arriving on a road trailer does not require Haul-out.</p></div>
            <div className="grid gap-3 md:grid-cols-2">
              <MovementOption checked={haulOut} title="Haul-out" description="Marina hauls vessel out of the water" onChange={(checked) => { setHaulOut(checked); if (checked) { setTowIn(false); setTowInDate(""); setActiveSection("RAMP") } }}>
                {haulOut && <DateField label="Confirmed haul-out date *" value={haulOutDate} onChange={setHaulOutDate} />}
              </MovementOption>
              <MovementOption checked={towIn} title="Tow in" description="Vessel arrives by road on a trailer" onChange={(checked) => { setTowIn(checked); if (checked) { setHaulOut(false); setHaulOutDate(""); setActiveSection("RAMP") } }}>
                {towIn && <><DateField label="Confirmed tow-in date *" value={towInDate} onChange={setTowInDate} /><p className="mt-2 text-xs text-amber-700">Tow charge is optional. Add a Tow Truck Rate Card/Open Rate item only when charging the customer.</p></>}
              </MovementOption>
            </div>
            <div className="border-t border-sky-200 pt-4"><Label className="text-base font-semibold">Departure method</Label><p className="mt-1 text-xs text-gray-600">Optional. Leave both unchecked while the departure date or method is still open.</p></div>
            <div className="grid gap-3 md:grid-cols-2">
              <MovementOption checked={launch} title="Launch" description="Marina launches vessel into the water" onChange={(checked) => { setLaunch(checked); if (checked) { setTowOut(false); setTowOutDate(""); setActiveSection("RAMP") } }}>
                {launch && <DateField label="Confirmed launch date *" value={launchDate} onChange={setLaunchDate} />}
              </MovementOption>
              <MovementOption checked={towOut} title="Tow out" description="Vessel leaves by road on a trailer" onChange={(checked) => { setTowOut(checked); if (checked) { setLaunch(false); setLaunchDate(""); setActiveSection("RAMP") } }}>
                {towOut && <><DateField label="Confirmed tow-out date *" value={towOutDate} onChange={setTowOutDate} /><p className="mt-2 text-xs text-amber-700">Tow charge is optional. Add a Tow Truck Rate Card/Open Rate item only when charging the customer.</p></>}
              </MovementOption>
            </div>
          </div>
          <div><Label>Primary service path *</Label><p className="mt-1 text-xs text-gray-600">Choose the normal route. Storage goes from its billing period and Rate Card directly to Draft Quotation. Yard Service continues through operator, category and service item.</p><div className="mt-2 grid gap-3 md:grid-cols-2"><button type="button" aria-pressed={primaryService === "STORAGE"} onClick={() => changePrimaryService("STORAGE")} className={`rounded-lg border p-4 text-left ${primaryService === "STORAGE" ? "border-teal-500 bg-teal-50" : "border-gray-200"}`}><b>{primaryService === "STORAGE" ? "✓ " : ""}A. Storage</b><p className="text-sm text-gray-500">Daily, weekly or monthly → Draft Quotation</p></button><button type="button" aria-pressed={primaryService === "YARD"} onClick={() => changePrimaryService("YARD")} className={`rounded-lg border p-4 text-left ${primaryService === "YARD" ? "border-teal-500 bg-teal-50" : "border-gray-200"}`}><b>{primaryService === "YARD" ? "✓ " : ""}B. Yard Service</b><p className="text-sm text-gray-500">Operator → Category → Service Item → Draft Quotation</p></button></div></div>
          {includeStorage && <div className="rounded-lg border bg-gray-50 p-4"><Label>Storage billing period</Label><div className="mt-2 grid grid-cols-3 gap-2">{["DAILY", "WEEKLY", "MONTHLY"].map((period) => <button type="button" key={period} onClick={() => changeStoragePeriod(period)} className={`rounded-md border px-3 py-2 text-sm font-medium ${storagePeriod === period ? "border-teal-500 bg-white text-teal-700" : "border-gray-200 bg-white text-gray-600"}`}>{period[0] + period.slice(1).toLowerCase()}</button>)}</div>{storagePeriod === "MONTHLY" && <p className="mt-2 text-xs text-amber-700">Monthly storage creates an officer billing reminder.</p>}</div>}
          {primaryService === "STORAGE" && <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4"><input type="checkbox" className="mt-1 h-4 w-4 accent-amber-600" checked={addYardToStorage} onChange={(event) => toggleAdditionalYardService(event.target.checked)} /><span><b className="text-amber-900">Optional: add Yard / Other Services</b><span className="block text-xs text-amber-800">Use when the stored vessel also needs service now. If service is requested later, start a new linked Service Request from the stored vessel record.</span></span></label>}
          {includeYardService && <div className="space-y-4 rounded-lg border bg-gray-50 p-4"><div><Label>Who performs the Yard Service? <HelpHint title="Operator affects price and approval">Ocean Rover work may receive an authorised discount. Boat-owner contractor work requires verified insurance. Ocean Rover subcontractor work uses direct cost plus markup and cannot receive a Marina discount.</HelpHint></Label><div className="mt-2 grid gap-2 md:grid-cols-3">{[{ value: "OCEAN_ROVER", label: "Ocean Rover" }, { value: "BOAT_OWNER_CONTRACTOR", label: "Boat owner / contractor" }, { value: "OCEAN_ROVER_SUBCONTRACTOR", label: "Ocean Rover subcontractor" }].map((operator) => <button type="button" key={operator.value} onClick={() => changeYardOperator(operator.value)} className={`rounded-md border p-3 text-sm font-semibold ${operatorType === operator.value ? "border-teal-500 bg-white text-teal-700" : "border-gray-200 bg-white"}`}>{operator.label}</button>)}</div></div>
          {operatorType === "BOAT_OWNER_CONTRACTOR" && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">Enter the contractor scope in Internal Notes. Insurance starts as Requested and must be verified before confirming the Service Order.</p>}
          {operatorType === "OCEAN_ROVER_SUBCONTRACTOR" && <div className="grid gap-4 md:grid-cols-2"><div><Label>Trade</Label><select className="mt-1 w-full rounded-md border p-2" value={trade} onChange={(e) => setTrade(e.target.value)}><option>Paint</option><option>Mechanic</option><option>Electrical</option><option>Other</option></select></div><div><Label>Markup %</Label><Input type="number" min="0" max="100" value={markupPct} onChange={(e) => changeMarkup(Number(e.target.value))} /><p className="mt-1 text-xs text-gray-500">Selling price = direct cost + markup. Existing Yard items are recalculated automatically.</p></div></div>}</div>}
        </CardContent></Card>
        <div className="flex justify-end"><Button type="button" variant="teal" onClick={() => { setError(null); if (!customerId || !boatId) { setError("Select the customer and vessel before continuing."); return } if (movement.error) { setError(movement.error); return } setActiveSection(movementRateRequired ? "RAMP" : includeStorage ? "STORAGE" : "YARD"); setCurrentStep(2) }}>Continue to Service Items →</Button></div>
        </>}

        {currentStep === 2 && <>
        <Card><CardHeader><CardTitle>3. Service Items & Rate Card <HelpHint title="Cascading service menu">Choose the workflow section, then a service category, then the exact Rate Card item. Price, unit, direct cost and accounting codes are filled automatically. Only quantity or duration is entered by the officer.</HelpHint></CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900"><b>Movement:</b> {haulOut ? `Haul-out on ${haulOutDate}` : `Tow in on ${towInDate}`} · {launch ? `Launch on ${launchDate}` : towOut ? `Tow out on ${towOutDate}` : "Departure open"}<br /><span className="text-xs">{movementRateRequired ? "Add the required Ramp operation item, then add the main service." : "Tow charge is optional. Add a Tow item only when the customer is charged; otherwise continue with the main service."}</span></div>
          <div className={`grid gap-2 ${selectedSections.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>{selectedSections.map((section) => <button type="button" key={section} onClick={() => setActiveSection(section)} className={`rounded-lg border px-3 py-3 text-sm font-semibold ${activeSection === section ? "border-teal-500 bg-teal-50 text-teal-800" : "border-gray-200 bg-white text-gray-600"}`}>{section === "RAMP" ? (movementRateRequired ? "Ramp Operation (required)" : "Tow Charge (optional)") : section === "STORAGE" ? "Storage (required)" : "Yard / Other Services (required)"}</button>)}</div>
          <div className="grid gap-3 md:grid-cols-[1fr_1.5fr_auto]">
            <div><Label>Service category</Label><select className="mt-1 w-full rounded-md border p-2" value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSelectedPrice("") }}><option value="">Select category</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
            <div><Label>Service item</Label><select disabled={!selectedCategory} className="mt-1 w-full rounded-md border p-2 disabled:bg-gray-100" value={selectedPrice} onChange={(e) => setSelectedPrice(e.target.value)}><option value="">Select rate-card item</option>{filteredPrices.map((price) => <option key={price.id} value={price.code}>{price.serviceNameEn} — {formatTHB(price.rateThb)}/{price.unit}</option>)}</select></div>
            <Button type="button" className="self-end" variant="outline" disabled={!selectedPrice} onClick={addRate}><Plus className="mr-1 h-4 w-4" />Add item</Button>
          </div>
          {canEditCost ? <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3"><div className="mb-2 flex items-center gap-2 font-medium text-amber-900">Others / Open Rate <HelpHint title="Restricted manual price">Use only when no suitable Rate Card item exists. Admin, Managing Director or Finance must enter the negotiated price and the Draft still requires approval.</HelpHint></div><div className="grid gap-2 md:grid-cols-[1.5fr_100px_100px_auto]"><Input value={openRateDescription} onChange={(e) => setOpenRateDescription(e.target.value)} placeholder="Reason / negotiated service" /><Input type="number" min="0" step="0.01" value={openRatePrice} onChange={(e) => setOpenRatePrice(e.target.value)} placeholder="Price" /><Input type="number" min="0" step="0.01" value={openRateCost} onChange={(e) => setOpenRateCost(e.target.value)} placeholder="Cost" /><Button type="button" variant="outline" disabled={!openRateDescription.trim() || openRatePrice === ""} onClick={addOpenRate}>Add open rate</Button></div></div> : <p className="rounded-md bg-gray-50 p-3 text-xs text-gray-600">Others / Open Rate is restricted to Admin, Managing Director and Finance. Select an approved Rate Card item or request authorised price entry.</p>}
          {items.map((item, index) => <div key={`${item.pricing_code ?? "OPEN"}-${index}`} className="grid items-end gap-2 rounded-lg border p-3 md:grid-cols-[1fr_90px_90px_40px]"><div><div className="flex flex-wrap gap-2 text-xs"><span className="rounded bg-teal-50 px-2 py-0.5 text-teal-700">{item.service_group}</span><span className="text-gray-500">{item.pricing_code ?? "OPEN RATE"}</span><span className="text-gray-500">{item.operator_type.replaceAll("_", " ")}</span></div><p className="mt-1 font-medium">{item.description}</p><p className="text-xs text-gray-500">Rate {formatTHB(item.unit_price)} / {item.unit} · Cost {formatTHB(item.direct_cost)} · Discount {item.discount_pct}%</p>{item.pricing_code && <p className="text-xs text-gray-400">Revenue {item.revenue_gl_code ?? "—"} · Cost {item.cost_gl_code ?? "—"} · {item.pnl_category ?? "P&L not set"}</p>}</div><div><Label>Qty / duration</Label><Input type="number" min="0.001" step="0.001" value={item.qty} onChange={(e) => updateLine(index, { qty: Number(e.target.value) })} /></div><div><Label>Discount %</Label><Input type="number" min="0" max={maximumDiscount} step="0.01" disabled={item.operator_type !== "OCEAN_ROVER" || maximumDiscount === 0} title={`Maximum ${maximumDiscount}% for your role`} value={item.discount_pct} onChange={(e) => updateLine(index, { discount_pct: Math.min(maximumDiscount, Number(e.target.value)) })} /></div><Button type="button" variant="ghost" onClick={() => setItems((rows) => rows.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4 text-red-500" /></Button></div>)}
          {!items.length && <p className="py-6 text-center text-sm text-gray-400">Add services in the order they should appear on the quotation.</p>}
          <p className="text-right font-semibold">Preview subtotal: {formatTHB(total)}</p>
        </CardContent></Card>
        <div className="flex justify-between"><Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>← Back</Button><Button type="button" variant="teal" onClick={() => { if ((haulOut || launch) && !items.some((item) => item.service_group === "RAMP")) { setError("Add at least one Ramp / Haul-out / Launch rate-card item."); return } if (includeStorage && !items.some((item) => item.service_group === "STORAGE")) { setError("Add at least one Storage rate-card item."); return } if (includeYardService && !items.some((item) => item.service_group === "YARD")) { setError("Add at least one Yard / Other Service rate-card item."); return } setError(null); setCurrentStep(3) }}>Review Draft Quote →</Button></div>
        </>}

        {currentStep === 3 && <>
        <Card><CardHeader><CardTitle>4. Payment Rule <HelpHint title="Service Request vs Work Order">You can save the Service Request before payment. A Work Order is created only after Finance clears full payment, the required deposit, or approved credit, and an officer confirms the Service Order.</HelpHint></CardTitle></CardHeader><CardContent className="space-y-4"><div><Label>Payment mode <HelpHint title="Payment options">Full pre-payment is standard for ramp/storage. Deposit defaults to 50/40/10 for Ocean Rover yard work, with the first payment never below committed material/subcontractor cost. Credit needs Finance/GM approval and uses a maximum 30-day first cycle.</HelpHint></Label><select className="mt-1 w-full rounded-md border p-2" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}><option value="FULL_PREPAYMENT">Full pre-payment — must be Paid before service</option><option value="DEPOSIT">Deposit — 50/40/10 (initial amount covers committed cost)</option><option value="CREDIT">Credit — maximum first 30-day cycle</option></select></div>{paymentMode === "CREDIT" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={goodCredit} onChange={(e) => setGoodCredit(e.target.checked)} />Existing good-credit customer (Finance/GM approval still required; max 7 days after launch)</label>}<div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional; generated automatically if blank" /></div><div><Label>Internal notes</Label><textarea className="mt-1 min-h-24 w-full rounded-md border p-2 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} /></div></CardContent></Card>
        <Card><CardHeader><CardTitle>Draft quotation summary</CardTitle></CardHeader><CardContent className="space-y-3"><div className="rounded-md bg-gray-50 p-3 text-sm"><p><b>Customer:</b> {selectedCustomer?.company_name ?? [selectedCustomer?.first_name, selectedCustomer?.last_name].filter(Boolean).join(" ")} · <b>Vessel:</b> {selectedBoat?.name}</p><p><b>Arrival:</b> {haulOut ? `Haul-out ${haulOutDate}` : `Tow in ${towInDate}`} · <b>Departure:</b> {launch ? `Launch ${launchDate}` : towOut ? `Tow out ${towOutDate}` : "Open"}</p><p><b>Selected services:</b> {[includeStorage ? `Storage — ${storagePeriod.toLowerCase()}` : null, includeYardService ? `Yard / Other Services — ${operatorType.replaceAll("_", " ")}` : null].filter(Boolean).join(" + ")}</p></div>{items.map((item, index) => <div key={`${item.pricing_code ?? "OPEN"}-review-${index}`} className="flex justify-between gap-4 border-b py-2 text-sm"><span><span className="mr-2 rounded bg-teal-50 px-1.5 py-0.5 text-xs text-teal-700">{item.service_group}</span>{item.description} × {item.qty}</span><span className="font-medium">{formatTHB(item.qty * item.unit_price * (1 - item.discount_pct / 100))}</span></div>)}<div className="flex justify-between pt-2 font-semibold"><span>Subtotal before VAT</span><span>{formatTHB(total)}</span></div><p className="text-xs text-gray-500">Discount starts at 0%. VAT and deposit are calculated and snapshotted by the server when the Draft is created.</p></CardContent></Card>
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">Saving creates the Service Request, an ordered Draft quotation, and its payment plan. It does not send anything to the customer. Review the Draft, then use Submit for Approval.</div>
        <div className="flex justify-between"><Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>← Back</Button><Button type="submit" variant="teal" disabled={saving || !customerId || !boatId || !items.length}><Save className="mr-2 h-4 w-4" />{saving ? "Creating workflow…" : "Save & Generate Draft Quotation"}</Button></div>
        </>}
      </form>
    </div>
  )
}

function MovementOption({ checked, title, description, onChange, children }: { checked: boolean; title: string; description: string; onChange: (checked: boolean) => void; children?: React.ReactNode }) {
  return <div className={`rounded-lg border p-3 ${checked ? "border-teal-500 bg-white shadow-sm" : "border-sky-200 bg-white/70"}`}><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className="mt-1 h-4 w-4 accent-teal-600" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span><b>{title}</b><span className="block text-xs text-gray-500">{description}</span></span></label>{children && <div className="mt-3 border-t pt-3">{children}</div>}</div>
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div><Label>{label}</Label><Input className="mt-1" required type="date" value={value} onChange={(event) => onChange(event.target.value)} /></div>
}
