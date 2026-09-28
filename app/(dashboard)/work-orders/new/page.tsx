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
}

interface EligibleServiceRequest {
  id: string
  reference: string
  customer_id: string | null
  boat_id: string | null
  title: string | null
  status: string
  service_order_confirmed_at?: string | null
}

function genId() { return Math.random().toString(36).slice(2, 9) }

// ── component ────────────────────────────────────────────────────────────────
export default function NewWorkOrderPage() {
  const router = useRouter()
  const [saving,    setSaving]    = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [boats,     setBoats]     = useState<Boat[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [serviceRequests, setServiceRequests] = useState<EligibleServiceRequest[]>([])
  const [serviceRequestId, setServiceRequestId] = useState("")
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/db/customers").then(r => r.json()),
      fetch("/api/db/boats").then(r => r.json()),
      fetch("/api/db/staff").then(r => r.json()),
      fetch("/api/db/service-requests").then(r => r.json()),
    ]).then(([c, b, s, requests]) => {
      if (Array.isArray(c)) setCustomers(c)
      if (Array.isArray(b)) setBoats(b)
      if (Array.isArray(s)) setStaffList(s)
      if (Array.isArray(requests)) setServiceRequests(requests.filter((request) => request.status === "SERVICE_ORDER_CONFIRMED"))
    }).catch(() => {})
  }, [])

  // ── header state ────────────────────────────────────────────────────────
  const [customerId, setCustomerId]  = useState("")
  const [boatId, setBoatId]          = useState("")
  const [srRef, setSrRef]            = useState("")
  const [executionType, setExecutionType] = useState<"INTERNAL" | "SUBCONTRACTOR" | "MIXED">("INTERNAL")
  const [category, setCategory]      = useState("")
  const [startDate, setStartDate]    = useState("")
  const [endDate, setEndDate]        = useState("")
  const [scopeOfWork, setScope]      = useState("")
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

  const partsCost = parts.reduce((sum, p) => sum + p.qty * p.unitCost, 0)

  const contractorNum = parseFloat(contractorCost) || 0
  const totalExecutionCost = laborTotal + partsCost + contractorNum

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
      { id: genId(), itemCode: "", description: "", unit: "pc", qty: 1, unitCost: 0 },
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
    setSaveError(null)
    try {
      const selectedC = customers.find(c => c.id === customerId)
      const selectedB = boats.find(b => b.id === boatId)
      const body = {
        customer_id:       customerId || null,
        customer_name:     selectedC ? (selectedC.company_name ?? [selectedC.first_name, selectedC.last_name].filter(Boolean).join(" ")) : null,
        boat_id:           boatId || null,
        boat_name:         selectedB?.name ?? null,
        service_request_ref: srRef || null,
        service_request_id: serviceRequestId,
        execution_type: executionType,
        category,
        start_date:        startDate || null,
        estimated_end_date: endDate || null,
        scope_of_work:     scopeOfWork || null,
        contractor_markup: 0,
        notes:             internalNote || null,
        status:            "NEW_REQUEST",
        reference:         `WO-${Date.now().toString().slice(-6)}`,
        total_labor_cost:  laborTotal,
        total_material_cost: partsCost,
        total_contractor_cost: contractorNum,
      }
      const res = await fetch("/api/db/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Save failed")
      router.push(data?.id ? `/work-orders/${data.id}` : "/work-orders")
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error))
      setSaving(false)
    }
  }

  const isValid = serviceRequestId && customerId && boatId && category && scopeOfWork.trim().length > 5

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
        {saveError && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{saveError}</div>}

        {/* ── Header Info ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work Order Header</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-4"><Label>Paid &amp; Confirmed Service Order <span className="text-red-500">*</span></Label><select required className="mt-1 w-full rounded-md border border-teal-300 bg-white px-3 py-2 text-sm" value={serviceRequestId} onChange={(e) => { const id = e.target.value; const request = serviceRequests.find((row) => row.id === id); setServiceRequestId(id); setSrRef(request?.reference ?? ""); setCustomerId(request?.customer_id ?? ""); setBoatId(request?.boat_id ?? ""); setScope(request?.title ?? "") }}><option value="">— Select service order cleared for execution —</option>{serviceRequests.map((request) => <option key={request.id} value={request.id}>{request.reference} — {request.title ?? "Service"}</option>)}</select><p className="mt-2 text-xs text-teal-800">Only Service Requests whose payment gate passed and Service Order was confirmed are available. Pricing remains in the approved quotation; this page assigns execution work, staff/subcontractor and dates.</p></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Customer */}
              <div className="space-y-1.5">
                <Label>Customer <span className="text-red-500">*</span></Label>
                <select
                  value={customerId}
                  disabled
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
                  disabled
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
                <Input value={srRef} readOnly placeholder="Select a confirmed service order above" />
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

              {/* Delivery model */}
              <div className="space-y-1.5">
                <Label>Delivery Model</Label>
                <select
                  value={executionType}
                  onChange={(e) => setExecutionType(e.target.value as typeof executionType)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="INTERNAL">Internal team</option>
                  <option value="SUBCONTRACTOR">External subcontractor</option>
                  <option value="MIXED">Mixed delivery</option>
                </select>
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
                  <span className="col-span-4 text-right">Actual Cost</span>
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
                    <div className="col-span-4 text-right text-sm font-medium text-gray-700">
                      {formatTHB(p.qty * p.unitCost)}
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
                    Actual parts cost:{" "}
                    <span className="font-bold text-gray-900">{formatTHB(partsCost)}</span>
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
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
          </CardContent>
        </Card>

        {/* ── Cost Summary ─────────────────────────────────────────────────── */}
        <Card className="border-teal-200 bg-teal-50/30">
          <CardHeader>
            <CardTitle className="text-base text-teal-800">Execution Cost Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-sm ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Labor</span>
                <span className="font-medium">{formatTHB(laborTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Parts &amp; Materials</span>
                <span className="font-medium">{formatTHB(partsCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Contractor actual cost</span>
                <span className="font-medium">{formatTHB(contractorNum)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                 <span className="font-semibold text-gray-700">Total execution cost</span>
                 <span className="font-bold text-teal-800">{formatTHB(totalExecutionCost)}</span>
               </div>
               <p className="border-t pt-2 text-xs text-gray-500">Customer revenue and discount come from the approved quotation and cannot be edited in the Work Order.</p>
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
