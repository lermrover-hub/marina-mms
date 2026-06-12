"use client"
import React, { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Phone, Mail, MapPin } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Supplier {
  id: string; code?: string; name: string; contact_name?: string
  phone?: string; email?: string; address?: string; tax_id?: string
  payment_terms?: string; status: string; notes?: string
}

export default function SupplierDetailPage() {
  const { id } = useParams() as { id: string }
  const [s,       setS]       = useState<Supplier | null>(null)
  const [editing, setEditing] = useState(false)
  const [form,    setForm]    = useState<Partial<Supplier>>({})
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState("")

  useEffect(() => {
    fetch(`/api/db/suppliers/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setS(d); setForm(d) } })
  }, [id])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/db/suppliers/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json(); setS(data); setForm(data); setEditing(false)
    } catch (e) { setError(String(e)) } finally { setSaving(false) }
  }

  if (!s) return <div className="p-12 text-center text-sm text-gray-400">Loading…</div>
  const F = "w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title={s.name} description={s.code ?? "Supplier"}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild><Link href="/suppliers"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
            {!editing && <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>}
          </div>
        }
      />
      {error && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!editing && (
        <Card><CardContent className="p-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div><p className="text-xs text-gray-400 uppercase tracking-wide">Code</p><p className="font-mono text-sm mt-0.5">{s.code ?? "—"}</p></div>
          <div><p className="text-xs text-gray-400 uppercase tracking-wide">Payment Terms</p><p className="text-sm mt-0.5">{s.payment_terms ?? "—"}</p></div>
          <div><p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium mt-0.5 ${s.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{s.status}</span>
          </div>
          {s.contact_name && <div className="col-span-full text-sm text-gray-600">Contact: <strong>{s.contact_name}</strong></div>}
          {s.phone && <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="h-3.5 w-3.5 text-gray-400" />{s.phone}</div>}
          {s.email && <div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="h-3.5 w-3.5 text-gray-400" />{s.email}</div>}
          {s.address && <div className="flex items-start gap-2 text-sm text-gray-600 col-span-full"><MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />{s.address}</div>}
          {s.notes && <div className="col-span-full text-sm text-gray-500 italic border-t pt-3 mt-1">{s.notes}</div>}
        </CardContent></Card>
      )}

      {editing && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Edit Supplier</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
                <input className={F} value={form.code ?? ""} onChange={e => set("code", e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input className={F} value={form.name ?? ""} onChange={e => set("name", e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Contact Person</label>
                <input className={F} value={form.contact_name ?? ""} onChange={e => set("contact_name", e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input className={F} value={form.phone ?? ""} onChange={e => set("phone", e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input type="email" className={F} value={form.email ?? ""} onChange={e => set("email", e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Payment Terms</label>
                <select className={F} value={form.payment_terms ?? "Net 30"} onChange={e => set("payment_terms", e.target.value)}>
                  {["Immediate","Net 15","Net 30","Net 45","Net 60"].map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select className={F} value={form.status ?? "active"} onChange={e => set("status", e.target.value)}>
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                </select></div>
              <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                <textarea rows={2} className={F} value={form.address ?? ""} onChange={e => set("address", e.target.value)} /></div>
              <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea rows={2} className={F} value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} /></div>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setEditing(false); setForm(s) }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />{saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
