"use client"
import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  AlertCircle, CheckCircle2, Image as ImageIcon,
  Package, Ship, Wrench, XCircle, TrendingUp, Trash2, Loader2, PlusCircle, Printer, Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PhotoUpload } from "@/components/shared/PhotoUpload"
import type { WorkOrder, MaterialUsage, WorkOrderTask } from "@/lib/supabase"
import { formatDate, formatTHB } from "@/lib/utils"

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  NEW_REQUEST:               { label: "New Request",         color: "bg-blue-100 text-blue-700" },
  INSPECTION_REQUIRED:       { label: "Inspection Required", color: "bg-amber-100 text-amber-700" },
  WAITING_CUSTOMER_APPROVAL: { label: "Waiting Approval",    color: "bg-yellow-100 text-yellow-700" },
  APPROVED:                  { label: "Approved",            color: "bg-teal-100 text-teal-700" },
  IN_PROGRESS:               { label: "In Progress",         color: "bg-blue-100 text-blue-800" },
  WAITING_PARTS:             { label: "Waiting Parts",       color: "bg-orange-100 text-orange-700" },
  WAITING_CONTRACTOR:        { label: "Waiting Contractor",  color: "bg-purple-100 text-purple-700" },
  ON_HOLD:                   { label: "On Hold",             color: "bg-gray-100 text-gray-500" },
  COMPLETED:                 { label: "Completed",           color: "bg-green-100 text-green-700" },
  CLOSED:                    { label: "Closed",              color: "bg-gray-200 text-gray-600" },
  CANCELLED:                 { label: "Cancelled",           color: "bg-red-100 text-red-700" },
}

// ─── Add material form default ──────────────────────────────────────────────────
const EMPTY_FORM = {
  item_name:          "",
  description:        "",
  quantity:           1,
  unit:               "pcs",
  unit_cost:          0,
  supplier:           "",
  charge_to_customer: true,
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WorkOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""

  const [wo,        setWo]        = useState<WorkOrder | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("tasks")

  // Tasks (live)
  const [tasks,         setTasks]         = useState<WorkOrderTask[]>([])
  const [tasksLoading,  setTasksLoading]  = useState(false)
  const [newTaskTitle,  setNewTaskTitle]  = useState("")
  const [addingTask,    setAddingTask]    = useState(false)
  const [updatingTask,  setUpdatingTask]  = useState<string | null>(null)

  // Materials (live)
  const [materials,        setMaterials]        = useState<MaterialUsage[]>([])
  const [materialsLoading, setMaterialsLoading] = useState(false)
  const [materialsError,   setMaterialsError]   = useState<string | null>(null)
  const [addForm,          setAddForm]          = useState(EMPTY_FORM)
  const [adding,           setAdding]           = useState(false)
  const [deletingId,       setDeletingId]       = useState<string | null>(null)

  // Timesheets (live)
  const [timesheets,        setTimesheets]        = useState<{id:string;staff_name?:string;date?:string;hours_worked?:number;hourly_rate?:number;total_cost?:number;notes?:string}[]>([])
  const [tsLoading,         setTsLoading]         = useState(false)
  const [tsForm,            setTsForm]            = useState({ staff_name: "", date: new Date().toISOString().slice(0,10), hours_worked: "", hourly_rate: "", notes: "" })
  const [tsAdding,          setTsAdding]          = useState(false)

  // Fetch WO
  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/db/work-orders/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d?.error) setError("Work order not found")
        else setWo(d)
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false))
  }, [id])

  // Fetch tasks (lazy on tab switch to "tasks")
  const fetchTasks = useCallback(async () => {
    if (!id) return
    setTasksLoading(true)
    try {
      const res = await fetch(`/api/db/work-order-tasks?work_order_id=${id}`)
      const data = await res.json()
      if (Array.isArray(data)) setTasks(data)
    } catch { /* ignore */ }
    finally { setTasksLoading(false) }
  }, [id])

  // Fetch materials (lazy on tab switch)
  const fetchMaterials = useCallback(async () => {
    if (!id) return
    setMaterialsLoading(true)
    setMaterialsError(null)
    try {
      const res = await fetch(`/api/db/material-usage?work_order_id=${id}`)
      if (!res.ok) throw new Error(await res.text())
      setMaterials(await res.json())
    } catch (e) {
      setMaterialsError(String(e))
    } finally {
      setMaterialsLoading(false)
    }
  }, [id])

  const fetchTimesheets = useCallback(async () => {
    if (!id) return
    setTsLoading(true)
    try {
      const res = await fetch(`/api/db/timesheets?work_order_id=${id}`)
      const data = await res.json()
      if (Array.isArray(data)) setTimesheets(data)
    } catch { /* ignore */ }
    finally { setTsLoading(false) }
  }, [id])

  useEffect(() => {
    if (activeTab === "tasks")      fetchTasks()
    if (activeTab === "materials")  fetchMaterials()
    if (activeTab === "labor")      fetchTimesheets()
  }, [activeTab, fetchTasks, fetchMaterials, fetchTimesheets])

  async function handleAddTimesheet(e: React.FormEvent) {
    e.preventDefault()
    if (!tsForm.staff_name.trim() || !tsForm.hours_worked) return
    setTsAdding(true)
    try {
      const res = await fetch("/api/db/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work_order_id: id, ...tsForm, hours_worked: Number(tsForm.hours_worked), hourly_rate: tsForm.hourly_rate ? Number(tsForm.hourly_rate) : null }),
      })
      if (!res.ok) throw new Error(await res.text())
      setTsForm(f => ({ ...f, staff_name: "", hours_worked: "", notes: "" }))
      fetchTimesheets()
    } catch (e) { alert("Failed: " + String(e)) }
    finally { setTsAdding(false) }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    setAddingTask(true)
    try {
      const res = await fetch("/api/db/work-order-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work_order_id: id, title: newTaskTitle.trim(), status: "TODO", priority: "NORMAL" }),
      })
      if (!res.ok) throw new Error(await res.text())
      setNewTaskTitle("")
      await fetchTasks()
    } catch (e) { alert("Failed to add task: " + String(e)) }
    finally { setAddingTask(false) }
  }

  async function handleTaskStatus(taskId: string, newStatus: string) {
    setUpdatingTask(taskId)
    try {
      const completed_at = newStatus === "COMPLETED" ? new Date().toISOString() : null
      const res = await fetch(`/api/db/work-order-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, completed_at }),
      })
      if (!res.ok) throw new Error(await res.text())
      await fetchTasks()
    } catch (e) { alert("Failed to update task: " + String(e)) }
    finally { setUpdatingTask(null) }
  }

  async function handleWorkOrderStatus(newStatus: string, progressPercent?: number) {
    try {
      const res = await fetch(`/api/db/work-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ...(progressPercent !== undefined ? { progress_percent: progressPercent } : {}),
          ...(newStatus === "COMPLETED" ? { actual_end_date: new Date().toISOString().slice(0, 10) } : {}),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || data?.error) throw new Error(data?.error ?? "Failed to update work order")
      setWo(data)
    } catch (e) {
      alert("Failed to update work order: " + (e instanceof Error ? e.message : String(e)))
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm("Delete this task?")) return
    try {
      await fetch(`/api/db/work-order-tasks/${taskId}`, { method: "DELETE" })
      await fetchTasks()
    } catch (e) { alert("Failed to delete: " + String(e)) }
  }

  async function handleAddMaterial(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.item_name.trim()) return
    setAdding(true)
    try {
      const res = await fetch("/api/db/material-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, work_order_id: id }),
      })
      if (!res.ok) throw new Error(await res.text())
      setAddForm(EMPTY_FORM)
      await fetchMaterials()
    } catch (e) {
      alert("Failed to add material: " + String(e))
    } finally {
      setAdding(false)
    }
  }

  async function handleDeleteMaterial(materialId: string) {
    if (!confirm("Delete this material entry?")) return
    setDeletingId(materialId)
    try {
      const res = await fetch(`/api/db/material-usage?id=${materialId}`, { method: "DELETE" })
      if (!res.ok) throw new Error(await res.text())
      await fetchMaterials()
    } catch (e) {
      alert("Failed to delete: " + String(e))
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
      </div>
    )
  }

  if (error || !wo) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-gray-500">{error ?? "Work order not found"}</p>
        <Link href="/work-orders" className="text-sm text-teal-600 hover:underline mt-2">← Back</Link>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[wo.status] ?? { label: wo.status, color: "bg-gray-100 text-gray-600" }

  // Costing
  const totalCost   = wo.total_labor_cost + wo.total_material_cost + wo.total_contractor_cost
  const grossProfit = wo.total_revenue - totalCost
  const margin      = wo.total_revenue > 0 ? (grossProfit / wo.total_revenue) * 100 : 0
  const marginColor = margin >= 30 ? "text-green-700" : margin >= 15 ? "text-amber-700" : "text-red-600"

  // Materials totals
  const materialsTotalCost = materials.reduce((s, m) => s + (m.total_cost ?? 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={wo.reference}
        description={wo.title}
        breadcrumb={[{ label: "Work Orders", href: "/work-orders" }, { label: wo.reference }]}
        actions={
          <div className="flex gap-2">
            {wo.status === "IN_PROGRESS" && (
              <Button size="sm" variant="teal" className="gap-2" onClick={() => handleWorkOrderStatus("COMPLETED", 100)}>
                <CheckCircle2 className="h-4 w-4" /> Mark Completed
              </Button>
            )}
            {wo.status === "WAITING_CUSTOMER_APPROVAL" && (
              <Button size="sm" variant="teal" className="gap-2" onClick={() => handleWorkOrderStatus("APPROVED")}>
                <CheckCircle2 className="h-4 w-4" /> Confirm Approval
              </Button>
            )}
            <Button
              size="sm" variant="outline" className="gap-2"
              onClick={() => window.open(`/print/work-orders/${id}`, "_blank")}
            >
              <Printer className="h-4 w-4" /> Job Report
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/work-orders">Back</Link>
            </Button>
          </div>
        }
      />

      {/* Status & progress bar */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${statusCfg.color}`}>
            <Wrench className="h-3.5 w-3.5" />{statusCfg.label}
          </span>
          {wo.category && <span className="text-sm text-gray-500">{wo.category}</span>}
          {wo.assigned_to && <span className="text-sm text-gray-500">· Assigned to {wo.assigned_to}</span>}
          <span className="ml-auto text-xs text-gray-400">
            {wo.start_date ? `Started ${formatDate(wo.start_date)}` : "Not yet started"}
            {wo.estimated_end_date ? ` · ETA ${formatDate(wo.estimated_end_date)}` : ""}
          </span>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress: <strong className="text-gray-800">{wo.progress_percent}%</strong></span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${wo.progress_percent === 100 ? "bg-green-500" : "bg-teal-500"}`}
              style={{ width: `${wo.progress_percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Revenue",      value: formatTHB(wo.total_revenue),  sub: "Quoted",              color: "text-gray-900" },
          { label: "Total Cost",   value: formatTHB(totalCost),         sub: "Labor + Mat + Contr.", color: "text-gray-900" },
          { label: "Gross Profit", value: formatTHB(grossProfit),       sub: "Revenue − Cost",       color: grossProfit >= 0 ? "text-green-700" : "text-red-600" },
          { label: "Gross Margin", value: `${margin.toFixed(1)}%`,      sub: "Profit / Revenue",     color: marginColor },
        ].map(({ label, value, sub, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Main: tabs ── */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-5">
              <TabsTrigger value="tasks" className="gap-1.5">
                <Wrench className="h-3.5 w-3.5" /> Tasks{tasks.length > 0 && <span className="ml-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs">{tasks.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="materials" className="gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Materials{materials.length > 0 && <span className="ml-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs">{materials.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="labor" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Labor{timesheets.length > 0 && <span className="ml-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs">{timesheets.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="photos" className="gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" /> Photos
              </TabsTrigger>
              <TabsTrigger value="costing" className="gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Costing
              </TabsTrigger>
            </TabsList>

            {/* ── TASKS ── */}
            <TabsContent value="tasks" className="mt-4 space-y-3">
              {/* Add task form */}
              <Card>
                <CardContent className="p-3">
                  <form onSubmit={handleAddTask} className="flex gap-2">
                    <input
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Add a task… (e.g. Replace engine oil, Sand hull)"
                      className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                    <Button type="submit" size="sm" variant="teal" disabled={addingTask || !newTaskTitle.trim()} className="gap-1.5 shrink-0">
                      {addingTask ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
                      Add Task
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Task list */}
              <Card>
                {tasksLoading ? (
                  <CardContent className="py-8 text-center">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-300" />
                  </CardContent>
                ) : tasks.length === 0 ? (
                  <CardContent className="py-12 text-center text-gray-400">
                    <Wrench className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No tasks yet. Add the first task above.</p>
                  </CardContent>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {tasks.map((task) => {
                      const isDone = task.status === "COMPLETED"
                      const isUpdating = updatingTask === task.id
                      return (
                        <div key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group">
                          <button
                            onClick={() => handleTaskStatus(task.id, isDone ? "TODO" : "COMPLETED")}
                            disabled={isUpdating}
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              isDone
                                ? "border-green-500 bg-green-500 text-white"
                                : "border-gray-300 hover:border-teal-400"
                            }`}
                          >
                            {isUpdating
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : isDone && <CheckCircle2 className="h-3 w-3" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${isDone ? "line-through text-gray-400" : "text-gray-900"}`}>
                              {task.title}
                            </p>
                            {task.assigned_to && (
                              <p className="text-xs text-gray-400 mt-0.5">→ {task.assigned_to}</p>
                            )}
                          </div>
                          <select
                            value={task.status}
                            onChange={(e) => handleTaskStatus(task.id, e.target.value)}
                            disabled={isUpdating}
                            className="text-xs rounded border border-gray-200 bg-white px-1.5 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-400"
                          >
                            {["TODO","IN_PROGRESS","WAITING","COMPLETED"].map(s => (
                              <option key={s} value={s}>{s.replace(/_/g," ")}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
                {tasks.length > 0 && (
                  <div className="border-t border-gray-100 px-4 py-2.5 flex justify-between text-xs text-gray-400">
                    <span>{tasks.filter(t => t.status === "COMPLETED").length} / {tasks.length} completed</span>
                    <span>{tasks.filter(t => t.status === "IN_PROGRESS").length} in progress</span>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* ── MATERIALS ── */}
            <TabsContent value="materials" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Materials &amp; Parts</CardTitle>
                    {materialsLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {materialsError && (
                    <div className="px-4 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100">
                      {materialsError}
                    </div>
                  )}
                  {!materialsLoading && materials.length === 0 && !materialsError ? (
                    <div className="py-10 text-center text-gray-400">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No materials recorded yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50">
                            <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Item</th>
                            <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                            <th className="py-2.5 px-4 text-center text-xs font-semibold text-gray-500 uppercase">Qty</th>
                            <th className="py-2.5 px-4 text-center text-xs font-semibold text-gray-500 uppercase">Unit</th>
                            <th className="py-2.5 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Unit Cost</th>
                            <th className="py-2.5 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                            <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                            <th className="py-2.5 px-4 text-center text-xs font-semibold text-gray-500 uppercase">Charge?</th>
                            <th className="py-2.5 px-4 text-center text-xs font-semibold text-gray-500 uppercase">Del</th>
                          </tr>
                        </thead>
                        <tbody>
                          {materials.map((m) => (
                            <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">{m.item_name}</td>
                              <td className="py-3 px-4 text-xs text-gray-500 max-w-[160px] truncate">{m.description ?? "—"}</td>
                              <td className="py-3 px-4 text-center tabular-nums text-gray-700">{m.quantity}</td>
                              <td className="py-3 px-4 text-center text-gray-500">{m.unit}</td>
                              <td className="py-3 px-4 text-right tabular-nums text-gray-700">{formatTHB(m.unit_cost)}</td>
                              <td className="py-3 px-4 text-right tabular-nums font-medium text-gray-900">{formatTHB(m.total_cost)}</td>
                              <td className="py-3 px-4 text-xs text-gray-500">{m.supplier ?? "—"}</td>
                              <td className="py-3 px-4 text-center">
                                {m.charge_to_customer
                                  ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                                  : <XCircle className="h-4 w-4 text-gray-300 mx-auto" />}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => handleDeleteMaterial(m.id)}
                                  disabled={deletingId === m.id}
                                  className="text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                                >
                                  {deletingId === m.id
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Trash2 className="h-4 w-4" />}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {materials.length > 0 && (
                          <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                            <tr>
                              <td colSpan={5} className="py-3 px-4 text-sm font-semibold text-gray-700">
                                Total Materials Cost
                              </td>
                              <td className="py-3 px-4 text-right font-bold tabular-nums text-gray-900">
                                {formatTHB(materialsTotalCost)}
                              </td>
                              <td colSpan={3} />
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add Material Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PlusCircle className="h-4 w-4 text-teal-600" /> Add Material / Part
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddMaterial} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Item Name *</label>
                        <input
                          required
                          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                          placeholder="e.g. Engine Oil 15W-40"
                          value={addForm.item_name}
                          onChange={(e) => setAddForm((f) => ({ ...f, item_name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Supplier</label>
                        <input
                          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                          placeholder="e.g. Marine Store"
                          value={addForm.supplier}
                          onChange={(e) => setAddForm((f) => ({ ...f, supplier: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                      <input
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        placeholder="Optional notes"
                        value={addForm.description}
                        onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 items-end">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                        <input
                          required type="number" min="0.01" step="0.01"
                          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                          value={addForm.quantity}
                          onChange={(e) => setAddForm((f) => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                        <input
                          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                          value={addForm.unit}
                          onChange={(e) => setAddForm((f) => ({ ...f, unit: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Unit Cost (THB) *</label>
                        <input
                          required type="number" min="0" step="0.01"
                          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                          value={addForm.unit_cost}
                          onChange={(e) => setAddForm((f) => ({ ...f, unit_cost: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="flex items-center gap-2 pb-2">
                        <input
                          id="charge_to_customer"
                          type="checkbox"
                          checked={addForm.charge_to_customer}
                          onChange={(e) => setAddForm((f) => ({ ...f, charge_to_customer: e.target.checked }))}
                          className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                        <label htmlFor="charge_to_customer" className="text-xs text-gray-600 select-none">
                          Charge to customer
                        </label>
                      </div>
                    </div>
                    {addForm.quantity > 0 && addForm.unit_cost > 0 && (
                      <p className="text-xs text-gray-500">
                        Total: <strong className="text-gray-800">{formatTHB(addForm.quantity * addForm.unit_cost)}</strong>
                      </p>
                    )}
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" variant="teal" disabled={adding} className="gap-2">
                        {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                        Add Material
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── LABOR ── */}
            <TabsContent value="labor" className="mt-4 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-teal-600" />Add Labor Entry</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleAddTimesheet} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Staff Name *</label>
                        <input required className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                          value={tsForm.staff_name} onChange={e => setTsForm(f => ({...f, staff_name: e.target.value}))} placeholder="e.g. สมชาย" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                        <input type="date" className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                          value={tsForm.date} onChange={e => setTsForm(f => ({...f, date: e.target.value}))} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Hours *</label>
                        <input required type="number" step="0.5" min="0.5" className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                          value={tsForm.hours_worked} onChange={e => setTsForm(f => ({...f, hours_worked: e.target.value}))} placeholder="8" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Hourly Rate (฿)</label>
                        <input type="number" step="1" className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                          value={tsForm.hourly_rate} onChange={e => setTsForm(f => ({...f, hourly_rate: e.target.value}))} placeholder="200" />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                        <input className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                          value={tsForm.notes} onChange={e => setTsForm(f => ({...f, notes: e.target.value}))} placeholder="Optional" />
                      </div>
                    </div>
                    {tsForm.hours_worked && tsForm.hourly_rate && (
                      <p className="text-xs text-gray-500">Cost: <strong>{formatTHB(Number(tsForm.hours_worked) * Number(tsForm.hourly_rate))}</strong></p>
                    )}
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" variant="teal" disabled={tsAdding} className="gap-2">
                        {tsAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />} Add Entry
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
              <Card>
                {tsLoading ? (
                  <CardContent className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-300" /></CardContent>
                ) : timesheets.length === 0 ? (
                  <CardContent className="py-10 text-center text-gray-400">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No labor entries yet.</p>
                  </CardContent>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b bg-gray-50">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Staff</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Hours</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Rate</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Cost</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Notes</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {timesheets.map(t => (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{t.staff_name ?? "—"}</td>
                            <td className="px-4 py-3 text-gray-500">{t.date ? new Date(t.date).toLocaleDateString("en-GB") : "—"}</td>
                            <td className="px-4 py-3 text-right font-mono">{t.hours_worked ?? "—"}</td>
                            <td className="px-4 py-3 text-right font-mono">{t.hourly_rate ? formatTHB(t.hourly_rate) : "—"}</td>
                            <td className="px-4 py-3 text-right font-mono font-medium text-orange-700">{t.total_cost ? formatTHB(t.total_cost) : "—"}</td>
                            <td className="px-4 py-3 text-xs text-gray-400">{t.notes ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 bg-gray-50">
                        <tr>
                          <td colSpan={4} className="px-4 py-2.5 text-sm font-semibold">Total Labor Cost</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-orange-700">
                            {formatTHB(timesheets.reduce((s,t) => s + (Number(t.total_cost)||0), 0))}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* ── PHOTOS ── */}
            <TabsContent value="photos" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-teal-600" /> Job Photos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <PhotoUpload folder={`work-orders/${id}/before`} category="Before Work" />
                  <div className="border-t border-gray-100" />
                  <PhotoUpload folder={`work-orders/${id}/after`}  category="After Work"  />
                  <div className="border-t border-gray-100" />
                  <PhotoUpload folder={`work-orders/${id}/defect`} category="Defect / Evidence" />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── COSTING ── */}
            <TabsContent value="costing" className="mt-4">
              <Card>
                <CardHeader><CardTitle>Job Cost Breakdown</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Labor",      cost: wo.total_labor_cost,      color: "bg-blue-500" },
                    { label: "Materials",  cost: wo.total_material_cost,   color: "bg-teal-500" },
                    { label: "Contractor", cost: wo.total_contractor_cost, color: "bg-purple-500" },
                  ].map(({ label, cost, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{label}</span>
                        <span className="font-medium tabular-nums">{formatTHB(cost)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${color}`}
                          style={{ width: totalCost > 0 ? `${(cost / totalCost) * 100}%` : "0%" }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    {[
                      { label: "Total Cost",   value: totalCost,        bold: false, color: "text-gray-800" },
                      { label: "Revenue",      value: wo.total_revenue, bold: false, color: "text-gray-800" },
                      { label: "Gross Profit", value: grossProfit,      bold: true,  color: grossProfit >= 0 ? "text-green-700" : "text-red-600" },
                    ].map(({ label, value, bold, color }) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className={`${bold ? "font-semibold" : ""} text-gray-600`}>{label}</span>
                        <span className={`tabular-nums ${bold ? "font-bold text-base" : ""} ${color}`}>
                          {formatTHB(value)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold pt-1 border-t border-dashed border-gray-200">
                      <span className="text-gray-700">Gross Margin</span>
                      <span className={`text-base ${marginColor}`}>{margin.toFixed(1)}%</span>
                    </div>
                  </div>
                  {wo.contractor_name && (
                    <div className="rounded-md bg-purple-50 border border-purple-200 px-4 py-3">
                      <p className="text-xs font-semibold text-purple-700 mb-0.5">Contractor Assigned</p>
                      <p className="text-sm text-purple-800">{wo.contractor_name}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-5">
          {/* Customer */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Customer</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                  {(wo.customer_name ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  {wo.customer_id ? (
                    <Link
                      href={`/customers/${wo.customer_id}`}
                      className="font-semibold text-sm text-gray-900 hover:text-teal-700 truncate block"
                    >
                      {wo.customer_name ?? "Unknown"}
                    </Link>
                  ) : (
                    <p className="font-semibold text-sm text-gray-900">{wo.customer_name ?? "Unknown"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Boat */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Boat</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                  <Ship className="h-4 w-4" />
                </div>
                <div>
                  {wo.boat_id ? (
                    <Link
                      href={`/boats/${wo.boat_id}`}
                      className="font-semibold text-sm text-gray-900 hover:text-teal-600"
                    >
                      {wo.boat_name ?? "Unknown"}
                    </Link>
                  ) : (
                    <p className="font-semibold text-sm text-gray-900">{wo.boat_name ?? "Unknown"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scope */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Scope of Work</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-gray-800 font-medium">{wo.title}</p>
              {wo.notes && (
                <p className="text-sm text-gray-500 italic border-l-2 border-gray-200 pl-3">{wo.notes}</p>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {[
                  { label: "Created",   value: formatDate(wo.created_at) },
                  { label: "Started",   value: wo.start_date ? formatDate(wo.start_date) : "—" },
                  { label: "ETA",       value: wo.estimated_end_date ? formatDate(wo.estimated_end_date) : "—" },
                  ...(wo.actual_end_date ? [{ label: "Completed", value: formatDate(wo.actual_end_date) }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-medium text-gray-700">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Live indicator */}
      <p className="text-xs text-gray-400 text-center pb-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 align-middle" />
        Live database · {wo.reference}
      </p>
    </div>
  )
}
