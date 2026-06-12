"use client"
import React, { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, HardHat, Phone, Mail, MapPin } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const SPECIALTIES = [
  { value: "fiberglass",    label: "Fiberglass" },
  { value: "painting",      label: "Painting" },
  { value: "mechanic",      label: "Mechanic" },
  { value: "electrical",    label: "Electrical" },
  { value: "interior",      label: "Interior" },
  { value: "canvas",        label: "Canvas" },
  { value: "stainless_work",label: "Stainless / Metal Work" },
  { value: "other",         label: "Other" },
]

interface Contractor {
  id: string; name: string; company_name?: string; specialty?: string
  phone?: string; email?: string; address?: string; tax_id?: string
  rate_type?: string; daily_rate?: number; status: string; notes?: string
  created_at?: string
}

export default function ContractorDetailPage() {
  const { id } = useParams() as { id: string }
  const [c,       setC]       = useState<Contractor | null>(null)
  const [editing, setEditing] = useState(false)
  const [form,    setForm]    = useState<Partial<Contractor>>({})
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState("")

  useEffect(() => {
    fetch(`/api/db/contractors/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setC(d); setForm(d) } })
  }, [id])

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/db/contractors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, daily_rate: form.daily_rate ? Number(form.daily_rate) : null }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setC(data); setForm(data); setEditing(false)
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  if (!c) return <div className="p-12 text-center text-sm text-gray-400">Loading…</div>

  const F = "w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
  const specialtyLabel = SPECIALTIES.find(s => s.value === c.specialty)?.label ?? c.specialty ?? "—"

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={c.name}
        description={c.company_name ?? specialtyLabel}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/contractors"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
            </Button>
            {!editing && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
            )}
          </div>
        }
      />

      {error && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Summary card */}
      {!editing && (
        <Card>
          <CardContent className="p-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Specialty</p>
              <p className="font-medium text-sm mt-0.5">{specialtyLabel}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Rate</p>
              <p className="font-medium text-sm mt-0.5">
                {c.daily_rate ? `฿${Number(c.daily_rate).toLocaleString()} / ${c.rate_type ?? "day"}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium mt-0.5 ${c.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {c.status}
              </span>
            </div>
            {c.phone && <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-3.5 w-3.5 text-gray-400" /> {c.phone}
            </div>}
            {c.email && <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="h-3.5 w-3.5 text-gray-400" /> {c.email}
            </div>}
            {c.address && <div className="flex items-start gap-2 text-sm text-gray-600 col-span-full">
              <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" /> {c.address}
            </div>}
            {c.notes && <div className="col-span-full text-sm text-gray-500 italic border-t pt-3 mt-1">{c.notes}</div>}
          </CardContent>
        </Card>
      )}

      {editing && (
        <Card>
          <CardHeader><CardTitle className="text-base">Edit Contractor</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
              <input className={F} value={form.name ?? ""} onChange={e => set("name", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Company Name</label>
              <input className={F} value={form.company_name ?? ""} onChange={e => set("company_name", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Specialty</label>
              <select className={F} value={form.specialty ?? ""} onChange={e => set("specialty", e.target.value)}>
                <option value="">— Select —</option>
                {SPECIALTIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input className={F} value={form.phone ?? ""} onChange={e => set("phone", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" className={F} value={form.email ?? ""} onChange={e => set("email", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Daily Rate (THB)</label>
              <input type="number" className={F} value={form.daily_rate ?? ""} onChange={e => set("daily_rate", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select className={F} value={form.status ?? "active"} onChange={e => set("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
              <textarea rows={2} className={F} value={form.address ?? ""} onChange={e => set("address", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea rows={2} className={F} value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} />
            </div>
          </CardContent>
        </Card>
      )}

      {editing && (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => { setEditing(false); setForm(c) }}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />{saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  )
}
