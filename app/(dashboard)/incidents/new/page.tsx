"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Save, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Customer, Boat } from "@/lib/supabase"

const INCIDENT_TYPES = [
  { value: "BOAT_DAMAGE",      label: "Boat Damage" },
  { value: "INJURY",           label: "Injury / Personnel" },
  { value: "POLLUTION",        label: "Pollution / Environmental" },
  { value: "FIRE",             label: "Fire" },
  { value: "SECURITY",         label: "Security / Theft" },
  { value: "EQUIPMENT_DAMAGE", label: "Equipment Damage" },
  { value: "NEAR_MISS",        label: "Near Miss" },
  { value: "OTHER",            label: "Other" },
]
const SEVERITY_OPTIONS = [
  { value: "LOW",      label: "Low",      color: "bg-green-100 text-green-700 border-green-300" },
  { value: "MEDIUM",   label: "Medium",   color: "bg-amber-100 text-amber-700 border-amber-300" },
  { value: "HIGH",     label: "High",     color: "bg-red-100 text-red-700 border-red-300" },
  { value: "CRITICAL", label: "Critical", color: "bg-red-900 text-white border-red-900" },
]
const LOCATIONS = [
  "Main Ramp", "Concrete Hardstand (C Zone)", "Wash Bay (W Zone)", "Beach Area (B Zone)",
  "Fuel Dock", "Workshop", "Gate / Entrance", "Office", "Wet Berth Area", "Water", "Other",
]

export default function NewIncidentPage() {
  const router = useRouter()
  const [saving, setSaving]       = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [boats, setBoats]         = useState<Boat[]>([])

  const [type, setType]               = useState("BOAT_DAMAGE")
  const [severity, setSeverity]       = useState("MEDIUM")
  const [date, setDate]               = useState(new Date().toISOString().slice(0, 10))
  const [time, setTime]               = useState(new Date().toTimeString().slice(0, 5))
  const [location, setLocation]       = useState("")
  const [customLocation, setCustLoc]  = useState("")
  const [customerId, setCustomerId]   = useState("")
  const [boatId, setBoatId]           = useState("")
  const [description, setDesc]        = useState("")
  const [injuredParty, setInjured]    = useState("")
  const [immediateAction, setAction]  = useState("")
  const [reportedBy, setReporter]     = useState("")
  const [witnesses, setWitnesses]     = useState("")

  useEffect(() => {
    Promise.all([
      fetch("/api/db/customers").then(r => r.json()),
      fetch("/api/db/boats").then(r => r.json()),
    ]).then(([c, b]) => {
      if (Array.isArray(c)) setCustomers(c)
      if (Array.isArray(b)) setBoats(b)
    }).catch(() => {})
  }, [])
  const [notes, setNotes]             = useState("")

  const customerBoats = customerId ? boats.filter((b) => b.owner_id === customerId) : []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const selectedCust = customers.find(c => c.id === customerId)
      const selectedBoat = boats.find(b => b.id === boatId)
      const body = {
        title:         description.slice(0, 120) || `${type} - ${date}`,
        incident_type: type,
        severity,
        status:        "OPEN",
        customer_id:   customerId || null,
        customer_name: selectedCust
          ? (selectedCust.company_name ?? [selectedCust.first_name, selectedCust.last_name].filter(Boolean).join(" "))
          : null,
        boat_id:       boatId || null,
        boat_name:     selectedBoat?.name ?? null,
        reported_by:   reportedBy || null,
        incident_date: date,
        location:      location === "Other" ? customLocation : location || null,
        description:   description || null,
        action_taken:  immediateAction || null,
      }
      const res = await fetch("/api/db/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Save failed")
      router.push(data?.id ? `/incidents/${data.id}` : "/incidents")
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Incident"
        breadcrumb={[{ label: "Incidents", href: "/incidents" }, { label: "New Report" }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild><Link href="/incidents">Cancel</Link></Button>
            <Button size="sm" variant="teal" form="incident-form" type="submit" disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />{saving ? "Saving…" : "Submit Report"}
            </Button>
          </div>
        }
      />

      <form id="incident-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">

            {/* Incident Classification */}
            <Card>
              <CardHeader><CardTitle>Incident Classification</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {/* Severity picker */}
                <div className="space-y-2">
                  <Label>Severity <span className="text-red-500">*</span></Label>
                  <div className="flex gap-2 flex-wrap">
                    {SEVERITY_OPTIONS.map((s) => (
                      <button key={s.value} type="button" onClick={() => setSeverity(s.value)}
                        className={`rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all ${severity === s.value ? s.color + " ring-2 ring-offset-1 ring-gray-400" : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Incident Type <span className="text-red-500">*</span></Label>
                    <select value={type} onChange={(e) => setType(e.target.value)} required
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none">
                      {INCIDENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Location <span className="text-red-500">*</span></Label>
                    <select value={location} onChange={(e) => setLocation(e.target.value)} required
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none">
                      <option value="">— Select location —</option>
                      {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  {location === "Other" && (
                    <div className="col-span-2 space-y-1.5">
                      <Label>Specify Location</Label>
                      <Input value={customLocation} onChange={(e) => setCustLoc(e.target.value)} placeholder="Describe the exact location" />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Date <span className="text-red-500">*</span></Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Time</Label>
                    <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Involved Parties */}
            <Card>
              <CardHeader><CardTitle>Involved Parties</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Customer (if applicable)</Label>
                    <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setBoatId("") }}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none">
                      <option value="">— Not customer-related —</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.company_name ?? ([c.first_name, c.last_name].filter(Boolean).join(" ") || c.id)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Boat (if applicable)</Label>
                    <select value={boatId} onChange={(e) => setBoatId(e.target.value)} disabled={!customerId}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none disabled:bg-gray-50">
                      <option value="">— Select boat —</option>
                      {customerBoats.map((b) => (
                        <option key={b.id} value={b.id}>{b.name ?? b.id}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Reported By <span className="text-red-500">*</span></Label>
                    <Input value={reportedBy} onChange={(e) => setReporter(e.target.value)} placeholder="Name of person reporting" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Witnesses</Label>
                    <Input value={witnesses} onChange={(e) => setWitnesses(e.target.value)} placeholder="Names of witnesses (if any)" />
                  </div>
                </div>
                {(type === "INJURY") && (
                  <div className="space-y-1.5">
                    <Label>Injured Party / Person Involved</Label>
                    <Input value={injuredParty} onChange={(e) => setInjured(e.target.value)} placeholder="Name and role of injured person" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description & Actions */}
            <Card>
              <CardHeader><CardTitle>Description & Immediate Actions</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Incident Description <span className="text-red-500">*</span></Label>
                  <textarea value={description} onChange={(e) => setDesc(e.target.value)} rows={4} required
                    placeholder="Describe what happened, sequence of events, conditions at the time…"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm resize-none focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                </div>
                <div className="space-y-1.5">
                  <Label>Immediate Action Taken</Label>
                  <textarea value={immediateAction} onChange={(e) => setAction(e.target.value)} rows={3}
                    placeholder="What was done immediately after the incident? (first aid, area secured, authorities notified…)"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm resize-none focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                </div>
                <div className="space-y-1.5">
                  <Label>Additional Notes</Label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                    placeholder="Any additional information, follow-up required…"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm resize-none focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle className="text-sm">Report Summary</CardTitle></CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium text-right">{INCIDENT_TYPES.find(t => t.value === type)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Severity</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${SEVERITY_OPTIONS.find(s => s.value === severity)?.color}`}>
                    {severity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="font-medium">{date || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Location</span>
                  <span className="font-medium text-right">{location || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Reporter</span>
                  <span className="font-medium">{reportedBy || "—"}</span>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-xs text-red-700 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-4 w-4" /> Severity Guidelines
              </div>
              <div className="space-y-1 text-red-600">
                <p><span className="font-medium">LOW</span> — Minor, no injury, minimal damage</p>
                <p><span className="font-medium">MEDIUM</span> — Moderate damage or potential injury</p>
                <p><span className="font-medium">HIGH</span> — Significant damage or injury occurred</p>
                <p><span className="font-medium">CRITICAL</span> — Severe injury, major damage, or regulatory breach</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" asChild><Link href="/incidents">Cancel</Link></Button>
              <Button variant="teal" className="flex-1 gap-2" type="submit" form="incident-form" disabled={saving}>
                <Save className="h-4 w-4" />{saving ? "…" : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
