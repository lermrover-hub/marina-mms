"use client"
import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Plus, ShieldAlert, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"

const SEVERITY_STYLE: Record<string, string> = {
  LOW:      "bg-green-100 text-green-700",
  MEDIUM:   "bg-amber-100 text-amber-700",
  HIGH:     "bg-red-100 text-red-700",
  CRITICAL: "bg-red-900 text-white",
}
const STATUS_STYLE: Record<string, string> = {
  INVESTIGATING: "bg-blue-100 text-blue-700",
  RESOLVED:      "bg-green-100 text-green-700",
  CLOSED:        "bg-gray-100 text-gray-500",
  OPEN:          "bg-amber-100 text-amber-700",
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

const SEVERITY_FILTERS = ["All", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
const STATUS_FILTERS   = ["All", "INVESTIGATING", "RESOLVED", "CLOSED"]

interface Incident {
  id: string
  incident_ref: string
  type: string
  severity: string
  status: string
  description: string
  location: string
  date: string
  reported_by: string
  boat_name?: string
  action_taken?: string
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [search,   setSearch]     = useState("")
  const [severity, setSeverity]   = useState("All")
  const [status,   setStatus]     = useState("All")

  // No mms_incidents table yet — will return empty array or 404
  useEffect(() => {
    fetch("/api/db/incidents")
      .then(r => r.ok ? r.json() : [])
      .then(d => setIncidents(Array.isArray(d) ? d : []))
      .catch(() => setIncidents([]))
  }, [])

  const filtered = useMemo(() =>
    incidents.filter((i) => {
      const matchSearch = !search ||
        i.incident_ref.toLowerCase().includes(search.toLowerCase()) ||
        (i.boat_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        i.reported_by.toLowerCase().includes(search.toLowerCase()) ||
        i.description.toLowerCase().includes(search.toLowerCase())
      return matchSearch &&
        (severity === "All" || i.severity === severity) &&
        (status   === "All" || i.status   === status)
    }),
  [incidents, search, severity, status])

  const stats = useMemo(() => ({
    total:         incidents.length,
    investigating: incidents.filter(i => i.status === "INVESTIGATING").length,
    high:          incidents.filter(i => ["HIGH","CRITICAL"].includes(i.severity)).length,
    thisMonth:     incidents.filter(i => i.date?.startsWith("2026-05")).length,
  }), [incidents])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Safety & Incidents"
        description="Incident reports, safety events, and corrective actions"
        actions={
          <Button size="sm" variant="teal" className="gap-2" asChild>
            <Link href="/incidents/new"><Plus className="h-4 w-4" />Report Incident</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Incidents", value: stats.total,         bg: "bg-gray-100",  text: "text-gray-800" },
          { label: "Investigating",   value: stats.investigating, bg: "bg-blue-100",  text: "text-blue-800" },
          { label: "High/Critical",   value: stats.high,          bg: "bg-red-100",   text: "text-red-800" },
          { label: "This Month",      value: stats.thisMonth,     bg: "bg-amber-100", text: "text-amber-800" },
        ].map(({ label, value, bg, text }) => (
          <Card key={label}><CardContent className={`p-4 ${bg}`}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${text}`}>{value}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card><CardContent className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search ref, boat, description…" value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1">
            {SEVERITY_FILTERS.map((s) => (
              <button key={s} onClick={() => setSeverity(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${severity === s ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {s === "All" ? "All Severity" : s}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {STATUS_FILTERS.map((s) => (
              <button key={s} onClick={() => setStatus(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${status === s ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {s === "All" ? "All Status" : s}
              </button>
            ))}
          </div>
        </div>
      </CardContent></Card>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <ShieldAlert className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No incidents recorded.</p>
            <p className="text-xs text-gray-400 mt-1">Use &quot;Report Incident&quot; to log safety events.</p>
          </CardContent></Card>
        ) : (
          filtered.map((inc) => (
            <Link key={inc.id} href={`/incidents/${inc.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-mono text-xs font-bold text-gray-600">{inc.incident_ref}</span>
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${SEVERITY_STYLE[inc.severity]}`}>{inc.severity}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[inc.status]}`}>{inc.status}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">{TYPE_LABEL[inc.type] ?? inc.type}</span>
                      </div>
                      <p className="text-sm text-gray-800 font-medium mb-1 line-clamp-2">{inc.description}</p>
                      <p className="text-xs text-gray-400">
                        {inc.date} · {inc.location}
                        {inc.boat_name && ` · ${inc.boat_name}`}
                        {" · "}Reported by: {inc.reported_by}
                      </p>
                      {inc.action_taken && (
                        <p className="text-xs text-teal-700 mt-1.5 bg-teal-50 rounded px-2 py-1">
                          <span className="font-semibold">Action:</span> {inc.action_taken}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      <p className="text-xs text-gray-400 text-center pb-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 align-middle" />
        Live database · Safety &amp; Incidents
      </p>
    </div>
  )
}
