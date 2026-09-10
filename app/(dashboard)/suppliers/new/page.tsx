"use client"
import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function NewSupplierPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")
  const [form, setForm] = useState({
    code: "", name: "", contact_name: "", phone: "", email: "",
    address: "", tax_id: "", payment_terms: "Net 30", status: "active", notes: "",
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const F = "w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"

  async function handleSave() {
    if (!form.name.trim()) { setError("Supplier name is required"); return }
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/db/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      router.push(`/suppliers/${data.id}`)
    } catch (e) {
      setError(String(e)); setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Add Supplier" description="Register a new parts or materials supplier"
        actions={<Button variant="ghost" size="sm" asChild><Link href="/suppliers"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>}
      />
      {error && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      <Card>
        <CardHeader><CardTitle className="text-base">Supplier Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Supplier Code</label>
            <input className={F} value={form.code} onChange={e => set("code", e.target.value)} placeholder="e.g. SUP-001" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Supplier Name *</label>
            <input className={F} value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contact Person</label>
            <input className={F} value={form.contact_name} onChange={e => set("contact_name", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
            <input className={F} value={form.phone} onChange={e => set("phone", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input type="email" className={F} value={form.email} onChange={e => set("email", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tax ID</label>
            <input className={F} value={form.tax_id} onChange={e => set("tax_id", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Payment Terms</label>
            <select className={F} value={form.payment_terms} onChange={e => set("payment_terms", e.target.value)}>
              <option value="Immediate">Immediate</option>
              <option value="Net 15">Net 15</option>
              <option value="Net 30">Net 30</option>
              <option value="Net 45">Net 45</option>
              <option value="Net 60">Net 60</option>
            </select>
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
        <Button variant="ghost" asChild><Link href="/suppliers">Cancel</Link></Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />{saving ? "Saving…" : "Save Supplier"}
        </Button>
      </div>
    </div>
  )
}
