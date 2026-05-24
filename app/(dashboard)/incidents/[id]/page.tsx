"use client"
import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft, ShieldAlert, CheckCircle, Clock, AlertTriangle, XCircle,
  Plus, Loader2, Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import type { Incident, IncidentAction } from "@/lib/supabase"

const SEVERITY_STYLE: Record<string, string> = {
  LOW:      "bg-green-100 text-green-700",
  MEDIUM:   "bg-amber-100 text-amber-700",
  HIGH:     "bg-red-100 text-red-700",
  CRITICAL: "bg-red-900 text-white",
}
const STATUS_STYLE: Record<string, { badge: string; icon: React.ReactNode }> = {
  INVESTIGATING: { badge: "bg-blue-100 text-blue-700",   icon: <Clock className="h-4 w-4" /> },
  RESOLVED:      { badge: "bg-green-100 text-green-700", icon: <CheckCircle className="h-4 w-4" /> },
  CLOSED:        { badge: "bg-gray-100 text-gray-500",   icon: <XCircle className="h-4 w-4" /> },
  OPEN:          { badge: "bg-amber-100 text-amber-700", icon: <AlertTriangle className="h-4 w-4" /> },
}
const TYPE_LABEL: Record<string, string> = {
  BOAT_DAMAGE:      "Boat Damage",
  INJURY:           "Injury",
  POLLUTION:        "Pollution",
  FIRE:             "Fire",
  SECURITY:         "Security",
  EQUIPMENT_DAMAGE: "Equipment Damage",
  NEAR_MISS:        "Near Miss",
  OTHER:            "Other",
}
const ACTION_STATUS_STYLE: Record<string, string> = {
  TODO:        "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  DONE:        "bg-green-100 text-green-700",
}

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""

  const [incident,     setIncident]     = useState<Incident | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState<string | null>(null)

  const [actions,      setActions]      = useState<IncidentAction[]>([])
  const [actionsLoading, setActionsLoading] = useState(false)

  const [showAddAction, setShowAddAction]   = useState(false)
  const [newAction,     setNewAction]       = useState("")
  const [newAssignee,   setNewAssignee]     = useState("")
  const [newDue,        setNewDue]          = useState("")
  const [addingAction,  setAddingAction]    = useState(false)

  // Load incident
  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/db/incidents/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject("not found"))
      .then(d => { if (d?.error) setLoadError("Incident not found"); else setIncident(d) })
      .catch(() => setLoadError("Incident not found"))
      .finally(() => setLoading(false))
  }, [id])

  // Load corrective actions
  const fetchActions = useCallback(() => {
    if (!id) return
    setActionsLoading(true)
    fetch(`/api/db/incident-actions?incident_id=${id}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setActions(d) })
      .catch(() => {})
      .finally(() => setActionsLoading(false))
  }, [id])

  useEffect(() => { fetchActions() }, [fetchActions])

  async function handleAddAction() {
    if (!newAction.trim() || !id) return
    setAddingAction(true)
    try {
      const res = await fetch("/api/db/incident-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident_id: id,
          action:      newAction.trim(),
          assigned_to: newAssignee.trim() || null,
          due_date:    newDue || null,
          status:      "TODO",
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setActions(prev => [...prev, created])
        setNewAction(""); setNewAssignee(""); setNewDue("")
        setShowAddAction(false)
      }
    } finally {
      setAddingAction(false)
    }
  }

  async function handleActionStatus(actionId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/db/incident-actions/${actionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        const updated = await res.json()
        setActions(prev => prev.map(a => a.id === actionId ? updated : a))
      }
    } catch {}
  }

  async function handleDeleteAction(actionId: string) {
    try {
      await fetch(`/api/db/incident-actions/${actionId}`, { method: "DELETE" })
      setActions(prev => prev.filter(a => a.id !== actionId))
    } catch {}
  }

  async function handleUpdateIncidentStatus(newStatus: string) {
    try {
      const res = await fetch(`/api/db/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        const updated = await res.json()
        setIncident(prev => prev ? { ...prev, status: updated.status } : prev)
      }
    } catch {}
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-gray-400">
      <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
    </div>
  )

  if (loadError || !incident) return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <ShieldAlert className="h-10 w-10 text-gray-200 mb-3" />
      <p className="text-gray-500">{loadError ?? "Incident not found"}</p>
      <Link href="/incidents" className="text-sm text-teal-600 hover:underline mt-2">← Back to Incidents</Link>
    </div>
  )

  const st = STATUS_STYLE[incident.status] ?? STATUS_STYLE.OPEN

  const doneCount       = actions.filter(a => a.status === "DONE").length
  const inProgressCount = actions.filter(a => a.status === "IN_PROGRESS").length
  const todoCount       = actions.filter(a => a.status === "TODO").length

  return (
    <div className="space-y-6">
      <PageHeader
        title={incident.incident_ref}
        breadcrumb={[{ label: "Incidents", href: "/incidents" }, { label: incident.incident_ref }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/incidents"><ArrowLeft className="h-4 w-4" /> Back</Link>
            </Button>
            {incident.status === "OPEN" && (
              <Button size="sm" variant="teal" className="gap-2" onClick={() => handleUpdateIncidentStatus("INVESTIGATING")}>
                <Clock className="h-4 w-4" /> Start Investigation
              </Button>
            )}
            {incident.status === "INVESTIGATING" && (
              <Button size="sm" variant="teal" className="gap-2" onClick={() => handleUpdateIncidentStatus("RESOLVED")}>
                <CheckCircle className="h-4 w-4" /> Mark Resolved
              </Button>
            )}
            {incident.status === "RESOLVED" && (
              <Button size="sm" variant="outline" className="gap-2 text-gray-600" onClick={() => handleUpdateIncidentStatus("CLOSED")}>
                <XCircle className="h-4 w-4" /> Close Incident
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">

          {/* Incident header card */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`rounded px-2.5 py-1 text-xs font-bold ${SEVERITY_STYLE[incident.severity]}`}>
                      {incident.severity}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${st.badge}`}>
                      {st.icon}{incident.status}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-1">
                      {TYPE_LABEL[incident.incident_type] ?? incident.incident_type}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">{incident.title}</h2>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm border-t pt-4">
                <div>
                  <span className="text-gray-500 text-xs block">Date</span>
                  <span className="font-medium">{formatDate(incident.incident_date)}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">Location</span>
                  <span className="font-medium">{incident.location ?? "—"}</span>
                </div>
                {incident.boat_name && (
                  <div>
                    <span className="text-gray-500 text-xs block">Boat Involved</span>
                    <span className="font-medium">{incident.boat_name}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500 text-xs block">Reported By</span>
                  <span className="font-medium">{incident.reported_by ?? "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {incident.description && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Incident Description</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{incident.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Immediate Action Taken */}
          {incident.action_taken && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Immediate Action Taken</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 bg-teal-50 rounded-lg p-3 border border-teal-100">
                  {incident.action_taken}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Corrective Actions — live from DB */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Corrective Actions</CardTitle>
                <button
                  onClick={() => setShowAddAction(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-teal-600 hover:underline font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />Add Action
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Add action form */}
              {showAddAction && (
                <div className="rounded-lg border border-dashed border-teal-300 bg-teal-50 p-3 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <input
                        value={newAction}
                        onChange={e => setNewAction(e.target.value)}
                        placeholder="Describe corrective action…"
                        className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <input
                      value={newAssignee}
                      onChange={e => setNewAssignee(e.target.value)}
                      placeholder="Assigned to"
                      className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-teal-500"
                    />
                    <input
                      type="date"
                      value={newDue}
                      onChange={e => setNewDue(e.target.value)}
                      className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowAddAction(false)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddAction}
                      disabled={addingAction || !newAction.trim()}
                      className="text-xs bg-teal-600 text-white rounded px-3 py-1 hover:bg-teal-700 disabled:opacity-50"
                    >
                      {addingAction ? "Adding…" : "Add"}
                    </button>
                  </div>
                </div>
              )}

              {actionsLoading ? (
                <div className="flex items-center justify-center py-6 text-gray-400 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading actions…</span>
                </div>
              ) : actions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No corrective actions yet. Add actions to track follow-up tasks.
                </p>
              ) : (
                actions.map((ca) => (
                  <div key={ca.id} className="group flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">{ca.action}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {ca.assigned_to && (
                          <p className="text-xs text-gray-400">
                            Assigned: <span className="text-gray-600 font-medium">{ca.assigned_to}</span>
                          </p>
                        )}
                        {ca.due_date && (
                          <p className="text-xs text-gray-400">Due: {formatDate(ca.due_date)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={ca.status}
                        onChange={e => handleActionStatus(ca.id, e.target.value)}
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold border-0 cursor-pointer ${ACTION_STATUS_STYLE[ca.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        <option value="TODO">TODO</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="DONE">DONE</option>
                      </select>
                      <button
                        onClick={() => handleDeleteAction(ca.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Timeline — derived from incident record */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
            <CardContent>
              <ol className="relative border-l border-gray-200 ml-2 space-y-4">
                <li className="pl-5">
                  <span className="absolute -left-[5px] flex h-2.5 w-2.5 items-center justify-center rounded-full bg-teal-400 ring-4 ring-white" />
                  <p className="text-xs text-gray-500 mb-0.5">{formatDate(incident.created_at)}</p>
                  <p className="text-sm text-gray-800">
                    Incident reported by <span className="font-medium">{incident.reported_by ?? "staff"}</span>
                  </p>
                </li>
                {incident.status !== "OPEN" && (
                  <li className="pl-5">
                    <span className="absolute -left-[5px] flex h-2.5 w-2.5 items-center justify-center rounded-full bg-blue-400 ring-4 ring-white" />
                    <p className="text-xs text-gray-500 mb-0.5">{formatDate(incident.updated_at)}</p>
                    <p className="text-sm text-gray-800">
                      Status changed to <span className="font-semibold">{incident.status}</span>
                    </p>
                  </li>
                )}
                {actions.filter(a => a.status === "DONE").map(a => (
                  <li key={a.id} className="pl-5">
                    <span className="absolute -left-[5px] flex h-2.5 w-2.5 items-center justify-center rounded-full bg-green-400 ring-4 ring-white" />
                    <p className="text-xs text-gray-500 mb-0.5">{formatDate(a.updated_at)}</p>
                    <p className="text-sm text-gray-800">
                      Action completed: <span className="font-medium">{a.action}</span>
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Incident Info</CardTitle></CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Ref</span>
                <span className="font-mono font-bold text-gray-700">{incident.incident_ref}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.badge}`}>{incident.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Severity</span>
                <span className={`rounded px-2 py-0.5 text-xs font-bold ${SEVERITY_STYLE[incident.severity]}`}>
                  {incident.severity}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="font-medium text-right">{TYPE_LABEL[incident.incident_type] ?? incident.incident_type}</span>
              </div>
              <div className="flex justify-between border-t pt-2.5">
                <span className="text-gray-500">Date</span>
                <span className="font-medium">{formatDate(incident.incident_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Location</span>
                <span className="font-medium text-right">{incident.location ?? "—"}</span>
              </div>
              {incident.boat_name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Boat</span>
                  <span className="font-medium">{incident.boat_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Reported By</span>
                <span className="font-medium">{incident.reported_by ?? "—"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Corrective Actions summary — live */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Actions Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Total",       value: actions.length, color: "text-gray-700" },
                { label: "Done",        value: doneCount,       color: "text-green-700" },
                { label: "In Progress", value: inProgressCount, color: "text-blue-700" },
                { label: "Pending",     value: todoCount,       color: "text-amber-700" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className={`font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {incident.status === "INVESTIGATING" && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-blue-700 space-y-1">
              <p className="font-semibold">Under Investigation</p>
              <p>Assign and complete all corrective actions before resolving this incident.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
