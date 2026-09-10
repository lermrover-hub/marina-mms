"use client"
import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Save, ArrowLeft } from "lucide-react"
import Link from "next/link"

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

export default function NewContractorPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")
  const [form, setForm] = useState({
    name: "", company_name: "", specialty: "", phone: "", email: "",
    address: "", tax_id: "", rate_type: "daily", daily_rate: "", status: "active", notes: "",
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required"); return }
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/db/contractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, daily_rate: form.daily_rate ? Number(form.daily_rate) : null }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      router.push(`/contractors/${data.id}`)
    } catch (e) {
      setError(String(e)); setSaving(false)
    }
  }

  const F = "w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Add Contractor"
        description="Register a new subcontractor for boat yard work"
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/contractors"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
          </Button>
        }
      />

      {error && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardHeader><CardTitle className="text-base">Contractor Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name <span className="text-red-500">*</span></label>
            <input className={F} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. สมชาย รักงาน" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Company Name</label>
            <input className={F} value={form.company_name} onChange={e => set("company_name", e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Specialty</label>
            <select className={F} value={form.specialty} onChange={e => set("specialty", e.target.value)}>
              <option value="">— Select —</option>
              {SPECIALTIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
            <input className={F} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="0xx-xxx-xxxx" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input type="email" className={F} value={form.email} onChange={e => set("email", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tax ID / ID Card</label>
            <input className={F} value={form.tax_id} onChange={e => set("tax_id", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rate Type</label>
            <select className={F} value={form.rate_type} onChange={e => set("rate_type", e.target.value)}>
              <option value="daily">Daily Rate</option>
              <option value="hourly">Hourly Rate</option>
              <option value="fixed">Fixed Price</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Daily Rate (THB)</label>
            <input type="number" className={F} value={form.daily_rate} onChange={e => set("daily_rate", e.target.value)} placeholder="e.g. 1500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select className={F} value={form.status} onChange={e => set("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
            <textarea rows={2} className={F} value={form.address} onChange={e => set("address", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea rows={2} className={F} value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" asChild><Link href="/contractors">Cancel</Link></Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />{saving ? "Saving…" : "Save Contractor"}
        </Button>
      </div>
    </div>
  )
}
