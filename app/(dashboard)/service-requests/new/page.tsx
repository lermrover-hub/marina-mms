"use client"
import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Customer, Boat } from "@/lib/supabase"

// ── constants ────────────────────────────────────────────────────────────────
const JOB_CATEGORIES = [
  "Engine", "Electrical", "Fiberglass", "Painting", "Antifouling",
  "Interior", "Canvas", "Stainless / Metal Work", "Cleaning / Detailing",
  "Plumbing", "Generator", "Air Conditioning", "Other",
]

const PRIORITY_OPTIONS = [
  { value: "LOW",    label: "Low",    color: "bg-gray-100 text-gray-600 border-gray-300" },
  { value: "NORMAL", label: "Normal", color: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "HIGH",   label: "High",   color: "bg-orange-100 text-orange-700 border-orange-300" },
  { value: "URGENT", label: "Urgent", color: "bg-red-100 text-red-700 border-red-300" },
]

const LOCATION_OPTIONS = [
  "In Water — Wet Berth",
  "On Hard — Dry Storage",
  "On Hard — Repair Yard",
  "Customer Brings In",
  "Other",
]

// ── component ────────────────────────────────────────────────────────────────
export default function NewServiceRequestPage() {
  const router = useRouter()
  const [saving,         setSaving]         = useState(false)
  const [customers,      setCustomers]      = useState<Customer[]>([])
  const [customersError, setCustomersError] = useState<string | null>(null)
  const [boats,          setBoats]          = useState<Boat[]>([])

  useEffect(() => {
    Promise.all([
      fetch("/api/db/customers").then(r => r.json()),
      fetch("/api/db/boats").then(r => r.json()),
    ]).then(([c, b]) => {
      if (Array.isArray(c)) {
        setCustomers(c)
      } else if (c?.error) {
        setCustomersError(c.error)
        console.error("Customers load error:", c.error)
      }
      if (Array.isArray(b)) setBoats(b)
    }).catch((e) => {
      setCustomersError(String(e))
      console.error("Customers/boats fetch failed:", e)
    })
  }, [])

  // ── form state ──────────────────────────────────────────────────────────
  const [customerId, setCustomerId]     = useState("")
  const [boatId, setBoatId]             = useState("")
  const [category, setCategory]         = useState("")
  const [priority, setPriority]         = useState("NORMAL")
  const [location, setLocation]         = useState("")
  const [description, setDescription]   = useState("")
  const [symptomDetail, setSymptom]     = useState("")
  const [requestedDate, setReqDate]     = useState("")
  const [requiresInspection, setInsp]   = useState(true)
  const [estimatedBudget, setBudget]    = useState("")
  const [depositPct, setDepositPct]     = useState("50")
  const [laborRate, setLaborRate]       = useState("450")
  const [contractorMarkup, setMarkup]   = useState("15")
  const [attachNote, setAttachNote]     = useState("")
  const [internalNote, setInternalNote] = useState("")

  // ── derived ──────────────────────────────────────────────────────────────
  const boatsForCustomer = useMemo(() =>
    customerId ? boats.filter((b) => b.owner_id === customerId) : [],
  [boats, customerId])

  const selectedCustomer = customers.find((c) => c.id === customerId)
  const selectedBoat     = boats.find((b) => b.id === boatId)

  function handleCustomerChange(id: string) {
    setCustomerId(id)
    setBoatId("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const selectedC = customers.find(c => c.id === customerId)
      const selectedB = boats.find(b => b.id === boatId)
      const body = {
        customer_id:         customerId || null,
        customer_name:       selectedC ? (selectedC.company_name ?? [selectedC.first_name, selectedC.last_name].filter(Boolean).join(" ")) : null,
        boat_id:             boatId || null,
        boat_name:           selectedB?.name ?? null,
        category,
        priority,
        title:               description.trim().split("\n")[0]?.slice(0, 80) || "Service Request",
        description:         description || null,
        location:            location || null,
        requested_date:      requestedDate || null,
        requires_inspection: requiresInspection,
        estimated_budget:    estimatedBudget ? parseFloat(estimatedBudget) : null,
        deposit_pct:         depositPct ? parseFloat(depositPct) : null,
        labor_rate:          laborRate ? parseFloat(laborRate) : null,
        contractor_markup:   contractorMarkup ? parseFloat(contractorMarkup) : null,
        notes:               internalNote || null,
        status:              "NEW_REQUEST",
        reference:           `SR-${Date.now().toString().slice(-6)}`,
      }
      const res = await fetch("/api/db/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Save failed")
      router.push(data?.id ? `/service-requests/${data.id}` : "/service-requests")
    } catch {
      setSaving(false)
    }
  }

  const isFormValid = customerId && boatId && category && description.trim().length > 10

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="New Service Request"
        description="Submit a new boat service or repair request"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/service-requests">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Customer & Boat ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer & Boat</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Customer */}
            <div className="space-y-1.5">
              <Label htmlFor="customer">Customer <span className="text-red-500">*</span></Label>
              <select
                id="customer"
                value={customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
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
              {customersError && (
                <p className="text-xs text-red-500 mt-1">Failed to load customers: {customersError}</p>
              )}
              {selectedCustomer && (
                <p className="text-xs text-gray-500">
                  {selectedCustomer.phone} · {selectedCustomer.email}
                </p>
              )}
            </div>

            {/* Boat */}
            <div className="space-y-1.5">
              <Label htmlFor="boat">Boat <span className="text-red-500">*</span></Label>
              <select
                id="boat"
                value={boatId}
                onChange={(e) => setBoatId(e.target.value)}
                disabled={!customerId}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100 disabled:text-gray-400"
                required
              >
                <option value="">— Select boat —</option>
                {boatsForCustomer.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.boat_type ?? ""})
                  </option>
                ))}
              </select>
              {selectedBoat && (
                <p className="text-xs text-gray-500">
                  LOA {selectedBoat.loa_ft ?? "?"}ft · {selectedBoat.engine_brand ?? ""} · {selectedBoat.current_location_code ?? ""}
                </p>
              )}
              {customerId && boatsForCustomer.length === 0 && (
                <p className="text-xs text-amber-600">No boats linked to this customer.</p>
              )}
            </div>

          </CardContent>
        </Card>

        {/* ── Service Details ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Category */}
              <div className="space-y-1.5">
                <Label htmlFor="category">Job Category <span className="text-red-500">*</span></Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                >
                  <option value="">— Select category —</option>
                  {JOB_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Current Location */}
              <div className="space-y-1.5">
                <Label htmlFor="location">Current Boat Location</Label>
                <select
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">— Select location —</option>
                  {LOCATION_OPTIONS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label>Priority <span className="text-red-500">*</span></Label>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-all ${
                      priority === p.value
                        ? p.color + " ring-2 ring-offset-1 ring-current"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">
                Problem Description <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe the problem clearly (minimum 10 characters)…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                required
              />
              <p className="text-xs text-gray-400">{description.length} chars</p>
            </div>

            {/* Symptom Detail */}
            <div className="space-y-1.5">
              <Label htmlFor="symptom">Symptom Detail / When does it occur?</Label>
              <textarea
                id="symptom"
                value={symptomDetail}
                onChange={(e) => setSymptom(e.target.value)}
                rows={2}
                placeholder="e.g. Occurs at high RPM above 3,000, only on port engine…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            {/* Requested Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="reqDate">Requested Service Date</Label>
                <Input
                  id="reqDate"
                  type="date"
                  value={requestedDate}
                  onChange={(e) => setReqDate(e.target.value)}
                />
              </div>

              {/* Inspection toggle */}
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setInsp((v) => !v)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${requiresInspection ? "bg-teal-500" : "bg-gray-300"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${requiresInspection ? "translate-x-5" : ""}`}
                    />
                  </div>
                  <span className="text-sm text-gray-700">Inspection required before quote</span>
                </label>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* ── Costing Parameters ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Costing Parameters</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

            <div className="space-y-1.5">
              <Label htmlFor="budget">Estimated Budget (THB)</Label>
              <Input
                id="budget"
                type="number"
                min="0"
                value={estimatedBudget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-gray-400">Customer&apos;s budget expectation</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deposit">Deposit % Required</Label>
              <div className="relative">
                <Input
                  id="deposit"
                  type="number"
                  min="0"
                  max="100"
                  value={depositPct}
                  onChange={(e) => setDepositPct(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
              <p className="text-xs text-gray-400">Default 50% before work starts</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="laborRate">Labor Rate (THB/hr)</Label>
              <select
                id="laborRate"
                value={laborRate}
                onChange={(e) => setLaborRate(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="350">350 THB/hr — Standard</option>
                <option value="450">450 THB/hr — Skilled</option>
                <option value="600">600 THB/hr — Specialist</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="markup">Contractor Markup %</Label>
              <div className="relative">
                <Input
                  id="markup"
                  type="number"
                  min="0"
                  value={contractorMarkup}
                  onChange={(e) => setMarkup(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
              <p className="text-xs text-gray-400">Default 15% markup on contractors</p>
            </div>

          </CardContent>
        </Card>

        {/* ── Notes ──────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes & Attachments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            <div className="space-y-1.5">
              <Label htmlFor="attachNote">Customer Notes / Attachment Instructions</Label>
              <textarea
                id="attachNote"
                value={attachNote}
                onChange={(e) => setAttachNote(e.target.value)}
                rows={2}
                placeholder="Any special instructions from the customer, photos already received, etc."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="internalNote">Internal Note (staff only)</Label>
              <textarea
                id="internalNote"
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                rows={2}
                placeholder="Internal notes not visible to customer…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            {/* Photo upload placeholder */}
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
              <p className="text-sm text-gray-500">
                📎 Photo / document upload — drag &amp; drop or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-1">
                JPEG, PNG, PDF — max 10 MB each
              </p>
            </div>

          </CardContent>
        </Card>

        {/* ── Validation alert ──────────────────────────────────────────── */}
        {!isFormValid && (customerId || category || description) && (
          <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Please select a customer, a boat, a category, and provide a description (min 10 chars).
          </div>
        )}

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pb-8">
          <Link href="/service-requests">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <div className="flex gap-3">
            <Button variant="outline" type="button" disabled={saving}>
              Save as Draft
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || saving}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Submitting…" : "Submit Service Request"}
            </Button>
          </div>
        </div>

      </form>
    </div>
  )
}
