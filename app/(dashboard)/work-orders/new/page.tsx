"use client"
import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Customer, Boat, Staff } from "@/lib/supabase"
import { formatTHB } from "@/lib/utils"

// ── constants ────────────────────────────────────────────────────────────────
const JOB_CATEGORIES = [
  "Engine", "Electrical", "Fiberglass", "Painting", "Antifouling",
  "Interior", "Canvas", "Stainless / Metal Work", "Cleaning / Detailing",
  "Plumbing", "Generator", "Air Conditioning", "Other",
]

const LABOR_RATES = [
  { value: 350, label: "350 THB/hr — Standard" },
  { value: 450, label: "450 THB/hr — Skilled" },
  { value: 600, label: "600 THB/hr — Specialist" },
]

// ── types ────────────────────────────────────────────────────────────────────
interface Task {
  id: string
  title: string
  assignedTo: string
  estHours: number
  laborRate: number
  notes: string
}

interface PartLine {
  id: string
  itemCode: string
  description: string
  unit: string
  qty: number
  unitCost: number
  markup: number
  chargeToCustomer: boolean
}

function genId() { return Math.random().toString(36).slice(2, 9) }

// ── component ────────────────────────────────────────────────────────────────
export default function NewWorkOrderPage() {
  const router = useRouter()
  const [saving,    setSaving]    = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [boats,     setBoats]     = useState<Boat[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])

  useEffect(() => {
    Promise.all([
      fetch("/api/db/customers").then(r => r.json()),
      fetch("/api/db/boats").then(r => r.json()),
      fetch("/api/db/staff").then(r => r.json()),
    ]).then(([c, b, s]) => {
      if (Array.isArray(c)) setCustomers(c)
      if (Array.isArray(b)) setBoats(b)
      if (Array.isArray(s)) setStaffList(s)
    }).catch(() => {})
  }, [])

  // ── header state ────────────────────────────────────────────────────────
  const [customerId, setCustomerId]  = useState("")
  const [boatId, setBoatId]          = useState("")
  const [srRef, setSrRef]            = useState("")
  const [category, setCategory]      = useState("")
  const [startDate, setStartDate]    = useState("")
  const [endDate, setEndDate]        = useState("")
  const [scopeOfWork, setScope]      = useState("")
  const [depositPct, setDepositPct]  = useState("50")
  const [vatRate]                    = useState(7)
  const [contractorMarkup, setMarkup] = useState("15")
  const [internalNote, setInternalNote] = useState("")

  // ── tasks ────────────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>([
    { id: genId(), title: "", assignedTo: "", estHours: 1, laborRate: 450, notes: "" },
  ])

  // ── parts ────────────────────────────────────────────────────────────────
  const [parts, setParts] = useState<PartLine[]>([])

  // ── contractors ─────────────────────────────────────────────────────────
  const [contractors, setContractors] = useState("")
  const [contractorCost, setContractorCost] = useState("")

  // ── derived ──────────────────────────────────────────────────────────────
  const boatsForCustomer = useMemo(() =>
    customerId ? boats.filter((b) => b.owner_id === customerId) : [],
  [boats, customerId])

  const selectedBoat = boats.find((b) => b.id === boatId)

  const technicianStaff = staffList.filter((s) =>
    ["HEAD_MECHANIC","ELECTRICIAN","PAINTER","FIBERGLASS_TECH","OPERATION_STAFF"].includes(s.role ?? "")
  )

  // ── costing calculations ─────────────────────────────────────────────────
  const laborTotal = tasks.reduce((sum, t) => sum + t.estHours * t.laborRate, 0)

  const partsWithMarkup = parts.reduce((sum, p) => sum + p.qty * p.unitCost * (1 + p.markup / 100), 0)

  const contractorNum = parseFloat(contractorCost) || 0
  const contractorWithMarkup = contractorNum * (1 + parseFloat(contractorMarkup) / 100)

  const subtotal = laborTotal + partsWithMarkup + contractorWithMarkup
  const vatAmount = subtotal * (vatRate / 100)
  const grandTotal = subtotal + vatAmount
  const depositAmount = grandTotal * (parseFloat(depositPct) / 100)

  // ── task helpers ─────────────────────────────────────────────────────────
  function addTask() {
    setTasks((prev) => [
      ...prev,
      { id: genId(), title: "", assignedTo: "", estHours: 1, laborRate: 450, notes: "" },
    ])
  }

  function updateTask(id: string, field: keyof Task, value: string | number) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, [field]: value } : t))
  }

  function removeTask(id: string) {
    if (tasks.length === 1) return
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  // ── parts helpers ────────────────────────────────────────────────────────
  function addPart() {
    setParts((prev) => [
      ...prev,
      { id: genId(), itemCode: "", description: "", unit: "pc", qty: 1, unitCost: 0, markup: 0, chargeToCustomer: true },
    ])
  }

  function updatePart(id: string, field: keyof PartLine, value: string | number | boolean) {
    setParts((prev) => prev.map((p) => p.id === id ? { ...p, [field]: value } : p))
  }

  function removePart(id: string) {
    setParts((prev) => prev.filter((p) => p.id !== id))
  }

  // ── submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const selectedC = customers.find(c => c.id === customerId)
      const selectedB = boats.find(b => b.id === boatId)
      const body = {
        customer_id:       customerId || null,
        customer_name:     selectedC ? (selectedC.company_name ?? [selectedC.first_name, selectedC.last_name].filter(Boolean).join(" ")) : null,
        boat_id:           boatId || null,
        boat_name:         selectedB?.name ?? null,
        service_request_ref: srRef || null,
        category,
        start_date:        startDate || null,
        estimated_end_date: endDate || null,
        scope_of_work:     scopeOfWork || null,
        deposit_pct:       depositPct ? parseFloat(depositPct) : null,
        contractor_markup: contractorMarkup ? parseFloat(contractorMarkup) : null,
        notes:             internalNote || null,
        status:            "NEW_REQUEST",
        reference:         `WO-${Date.now().toString().slice(-6)}`,
        total_labor_cost:  laborTotal,
        total_material_cost: partsWithMarkup,
        total_contractor_cost: contractorWithMarkup,
        total_revenue:     grandTotal,
      }
      const res = await fetch("/api/db/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Save failed")
      router.push(data?.id ? `/work-orders/${data.id}` : "/work-orders")
    } catch {
      setSaving(false)
    }
  }

  const isValid = customerId && boatId && category && scopeOfWork.trim().length > 5

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="New Work Order"
        description="Create a work order for boat repair or service"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/work-orders">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Header Info ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work Order Header</CardTitle>
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
              </div>

              {/* Boat */}
              <div className="space-y-1.5">
                <Label>Boat <span className="text-red-500">*</span></Label>
                <select
                  value={boatId}
                  onChange={(e) => setBoatId(e.target.value)}
                  disabled={!customerId}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100"
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
                    {selectedBoat.brand ?? ""} {selectedBoat.model ?? ""} · {selectedBoat.loa_ft ?? "?"}ft · {selectedBoat.engine_brand ?? ""}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* SR Reference */}
              <div className="space-y-1.5">
                <Label>Service Request Ref.</Label>
                <Input
                  value={srRef}
                  onChange={(e) => setSrRef(e.target.value)}
                  placeholder="SR-2026-041"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label>Job Category <span className="text-red-500">*</span></Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                >
                  <option value="">— Select —</option>
                  {JOB_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Deposit % */}
              <div className="space-y-1.5">
                <Label>Required Deposit %</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={depositPct}
                    onChange={(e) => setDepositPct(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Estimated Completion Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            {/* Scope of Work */}
            <div className="space-y-1.5">
              <Label>Scope of Work <span className="text-red-500">*</span></Label>
              <textarea
                value={scopeOfWork}
                onChange={(e) => setScope(e.target.value)}
                rows={3}
                placeholder="Describe the full scope of work to be performed…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                required
              />
            </div>

          </CardContent>
        </Card>

        {/* ── Task List ────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Job Tasks & Technician Assignment</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addTask}>
                <Plus className="h-4 w-4 mr-1" /> Add Task
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">

            {tasks.map((task, idx) => (
              <div key={task.id} className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Task {idx + 1}</span>
                  {tasks.length > 1 && (
                    <button type="button" onClick={() => removeTask(task.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Title */}
                  <div className="space-y-1">
                    <Label className="text-xs">Task Description *</Label>
                    <Input
                      value={task.title}
                      onChange={(e) => updateTask(task.id, "title", e.target.value)}
                      placeholder="e.g. Drain engine oil and replace filter"
                    />
                  </div>

                  {/* Technician */}
                  <div className="space-y-1">
                    <Label className="text-xs">Assigned Technician</Label>
                    <select
                      value={task.assignedTo}
                      onChange={(e) => updateTask(task.id, "assignedTo", e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">— Unassigned —</option>
                      {technicianStaff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({(s.role ?? "").replace(/_/g, " ")})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Est Hours */}
                  <div className="space-y-1">
                    <Label className="text-xs">Est. Hours</Label>
                    <Input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={task.estHours}
                      onChange={(e) => updateTask(task.id, "estHours", parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  {/* Labor Rate */}
                  <div className="space-y-1">
                    <Label className="text-xs">Labor Rate</Label>
                    <select
                      value={task.laborRate}
                      onChange={(e) => updateTask(task.id, "laborRate", parseInt(e.target.value))}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {LABOR_RATES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Labor Cost */}
                  <div className="space-y-1">
                    <Label className="text-xs">Labor Cost</Label>
                    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-right font-medium text-gray-700">
                      {formatTHB(task.estHours * task.laborRate)}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Task Notes</Label>
                  <Input
                    value={task.notes}
                    onChange={(e) => updateTask(task.id, "notes", e.target.value)}
                    placeholder="Special instructions or materials needed…"
                  />
                </div>
              </div>
            ))}

            <div className="flex justify-end">
              <div className="rounded-md bg-teal-50 border border-teal-200 px-4 py-2 text-sm">
                <span className="text-gray-600">Total Labor:</span>{" "}
                <span className="font-bold text-teal-700">{formatTHB(laborTotal)}</span>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* ── Parts / Materials ────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Parts & Materials</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addPart}>
                <Plus className="h-4 w-4 mr-1" /> Add Part
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {parts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No parts added yet — click &quot;Add Part&quot; to begin.
              </p>
            ) : (
              <div className="space-y-3">
                {/* Header row */}
                <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase px-2">
                  <span className="col-span-3">Item / Description</span>
                  <span className="col-span-1 text-center">Unit</span>
                  <span className="col-span-1 text-center">Qty</span>
                  <span className="col-span-2 text-right">Unit Cost</span>
                  <span className="col-span-1 text-center">Markup%</span>
                  <span className="col-span-2 text-right">Sell Price</span>
                  <span className="col-span-1 text-center">Bill?</span>
                  <span className="col-span-1" />
                </div>

                {parts.map((p) => (
                  <div key={p.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3">
                      <Input
                        value={p.description}
                        onChange={(e) => updatePart(p.id, "description", e.target.value)}
                        placeholder="Item name / code"
                        className="text-xs"
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        value={p.unit}
                        onChange={(e) => updatePart(p.id, "unit", e.target.value)}
                        className="text-xs text-center"
                        placeholder="pc"
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        min="1"
                        value={p.qty}
                        onChange={(e) => updatePart(p.id, "qty", parseInt(e.target.value) || 1)}
                        className="text-xs text-center"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="0"
                        value={p.unitCost}
                        onChange={(e) => updatePart(p.id, "unitCost", parseFloat(e.target.value) || 0)}
                        className="text-xs text-right"
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        min="0"
                        value={p.markup}
                        onChange={(e) => updatePart(p.id, "markup", parseFloat(e.target.value) || 0)}
                        className="text-xs text-center"
                      />
                    </div>
                    <div className="col-span-2 text-right text-sm font-medium text-gray-700">
                      {formatTHB(p.qty * p.unitCost * (1 + p.markup / 100))}
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <input
                        type="checkbox"
                        checked={p.chargeToCustomer}
                        onChange={(e) => updatePart(p.id, "chargeToCustomer", e.target.checked)}
                        className="h-4 w-4 rounded text-teal-600"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button type="button" onClick={() => removePart(p.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end pt-2">
                  <div className="text-sm text-gray-600">
                    Parts total (with markup):{" "}
                    <span className="font-bold text-gray-900">{formatTHB(partsWithMarkup)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Contractor ───────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contractor / Subcontractor</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5 md:col-span-1">
              <Label>Contractor Name</Label>
              <Input
                value={contractors}
                onChange={(e) => setContractors(e.target.value)}
                placeholder="e.g. Samui Fiberglass Co."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contractor Cost (THB)</Label>
              <Input
                type="number"
                min="0"
                value={contractorCost}
                onChange={(e) => setContractorCost(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Markup % on Contractor</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  value={contractorMarkup}
                  onChange={(e) => setMarkup(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
              <p className="text-xs text-gray-400">
                Billed to customer: {formatTHB(contractorWithMarkup)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Cost Summary ─────────────────────────────────────────────────── */}
        <Card className="border-teal-200 bg-teal-50/30">
          <CardHeader>
            <CardTitle className="text-base text-teal-800">Cost &amp; Revenue Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-sm ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Labor</span>
                <span className="font-medium">{formatTHB(laborTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Parts &amp; Materials</span>
                <span className="font-medium">{formatTHB(partsWithMarkup)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Contractor (incl. {contractorMarkup}% markup)</span>
                <span className="font-medium">{formatTHB(contractorWithMarkup)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatTHB(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">VAT {vatRate}%</span>
                <span className="font-medium">{formatTHB(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-teal-300 pt-2 text-teal-800">
                <span>Grand Total</span>
                <span>{formatTHB(grandTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-amber-700 bg-amber-50 rounded px-3 py-2 mt-2">
                <span>Required Deposit ({depositPct}%)</span>
                <span className="font-bold">{formatTHB(depositAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Notes ──────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Internal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              rows={3}
              placeholder="Internal notes, special requirements, supplier contacts…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </CardContent>
        </Card>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pb-8">
          <Link href="/work-orders">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <div className="flex gap-3">
            <Button variant="outline" type="button" disabled={saving}>
              Save as Draft
            </Button>
            <Button
              type="submit"
              disabled={!isValid || saving}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Creating…" : "Create Work Order"}
            </Button>
          </div>
        </div>

      </form>
    </div>
  )
}
