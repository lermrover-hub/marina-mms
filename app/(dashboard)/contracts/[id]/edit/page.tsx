"use client"
import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Contract } from "@/lib/supabase"

const CONTRACT_TYPES = ["WET_BERTH","DRY_STORAGE","RAMP_SERVICE","SERVICE_AGREEMENT"]
const BILLING_CYCLES = ["MONTHLY","QUARTERLY","ANNUAL","ONE_TIME"]
const TYPE_LABELS: Record<string,string> = {
  WET_BERTH:"Wet Berth",DRY_STORAGE:"Dry Storage",
  RAMP_SERVICE:"Ramp Service",SERVICE_AGREEMENT:"Service Agreement",
}
const CYCLE_LABELS: Record<string,string> = {
  MONTHLY:"Monthly",QUARTERLY:"Quarterly",ANNUAL:"Annual",ONE_TIME:"One-time",
}

export default function ContractEditPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id ?? ""

  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [saveErr,  setSaveErr]  = useState<string | null>(null)
  const [contract, setContract] = useState<Contract | null>(null)

  // form fields
  const [form, setForm] = useState({
    contract_type:       "",
    billing_cycle:       "",
    start_date:          "",
    end_date:            "",
    auto_renew:          false,
    renewal_notice_days: 30,
    rate_amount:         "",
    rate_currency:       "THB",
    deposit_amount:      "",
    deposit_paid:        false,
    deposit_paid_date:   "",
    berth_code:          "",
    terms_text:          "",
    special_conditions:  "",
    notes:               "",
  })

  useEffect(() => {
    if (!id) return
    fetch(`/api/db/contracts/${id}`)
      .then(r => r.json())
      .then((d: Contract) => {
        if (!d || (d as { error?: string }).error) { setError("Contract not found"); setLoading(false); return }
        setContract(d)
        setForm({
          contract_type:       d.contract_type,
          billing_cycle:       d.billing_cycle,
          start_date:          d.start_date,
          end_date:            d.end_date ?? "",
          auto_renew:          d.auto_renew,
          renewal_notice_days: d.renewal_notice_days,
          rate_amount:         d.rate_amount != null ? String(d.rate_amount) : "",
          rate_currency:       d.rate_currency,
          deposit_amount:      d.deposit_amount != null ? String(d.deposit_amount) : "",
          deposit_paid:        d.deposit_paid,
          deposit_paid_date:   d.deposit_paid_date ?? "",
          berth_code:          d.berth_code ?? "",
          terms_text:          d.terms_text ?? "",
          special_conditions:  d.special_conditions ?? "",
          notes:               d.notes ?? "",
        })
        setLoading(false)
      })
      .catch(() => { setError("Failed to load"); setLoading(false) })
  }, [id])

  function set(k: string, v: string | boolean | number) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setSaveErr(null)
    try {
      const payload = {
        contract_type:       form.contract_type,
        billing_cycle:       form.billing_cycle,
        start_date:          form.start_date,
        end_date:            form.end_date || null,
        auto_renew:          form.auto_renew,
        renewal_notice_days: Number(form.renewal_notice_days),
        rate_amount:         form.rate_amount ? Number(form.rate_amount) : null,
        rate_currency:       form.rate_currency,
        deposit_amount:      form.deposit_amount ? Number(form.deposit_amount) : null,
        deposit_paid:        form.deposit_paid,
        deposit_paid_date:   form.deposit_paid_date || null,
        berth_code:          form.berth_code || null,
        terms_text:          form.terms_text || null,
        special_conditions:  form.special_conditions || null,
        notes:               form.notes || null,
      }
      const res  = await fetch(`/api/db/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Save failed")
      router.push(`/contracts/${id}`)
    } catch (e) { setSaveErr(String(e)) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-gray-400">
      <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
    </div>
  )
  if (error || !contract) return (
    <div className="py-32 text-center text-gray-500">
      <p>{error ?? "Not found"}</p>
      <Link href="/contracts" className="text-sm text-teal-600 hover:underline mt-2 inline-block">← Back to contracts</Link>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${contract.contract_number}`}
        description={`${TYPE_LABELS[contract.contract_type] ?? contract.contract_type} · ${contract.customer_name ?? "—"}`}
        breadcrumb={[
          { label: "Contracts", href: "/contracts" },
          { label: contract.contract_number, href: `/contracts/${id}` },
          { label: "Edit" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/contracts/${id}`}><X className="h-4 w-4 mr-1" />Cancel</Link>
            </Button>
            <Button size="sm" variant="teal" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save Changes
            </Button>
          </div>
        }
      />

      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Contract Type & Period</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Contract Type *</label>
                  <select value={form.contract_type} onChange={e => set("contract_type", e.target.value)} required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {CONTRACT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Berth / Slot Code</label>
                  <Input value={form.berth_code} onChange={e => set("berth_code", e.target.value)} placeholder="e.g. A-12" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Start Date *</label>
                  <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">End Date</label>
                  <Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} />
                  <p className="text-xs text-gray-400 mt-0.5">Leave blank for open-ended</p>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="auto_renew" checked={form.auto_renew}
                    onChange={e => set("auto_renew", e.target.checked)} className="h-4 w-4 accent-teal-600" />
                  <label htmlFor="auto_renew" className="text-sm text-gray-700">Auto-renew</label>
                </div>
                {form.auto_renew && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Notice Period (days)</label>
                    <Input type="number" min="0" value={form.renewal_notice_days}
                      onChange={e => set("renewal_notice_days", Number(e.target.value))} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader><CardTitle>Billing & Deposit</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Billing Cycle *</label>
                    <select value={form.billing_cycle} onChange={e => set("billing_cycle", e.target.value)} required
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-teal-500">
                      {BILLING_CYCLES.map(c => <option key={c} value={c}>{CYCLE_LABELS[c]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Currency</label>
                    <select value={form.rate_currency} onChange={e => set("rate_currency", e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="THB">THB</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Rate Amount</label>
                    <Input type="number" min="0" step="0.01" value={form.rate_amount}
                      onChange={e => set("rate_amount", e.target.value)} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Security Deposit</label>
                    <Input type="number" min="0" step="0.01" value={form.deposit_amount}
                      onChange={e => set("deposit_amount", e.target.value)} placeholder="0.00" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="deposit_paid" checked={form.deposit_paid}
                    onChange={e => set("deposit_paid", e.target.checked)} className="h-4 w-4 accent-teal-600" />
                  <label htmlFor="deposit_paid" className="text-sm text-gray-700">Deposit Paid</label>
                </div>
                {form.deposit_paid && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Deposit Paid Date</label>
                    <Input type="date" value={form.deposit_paid_date} onChange={e => set("deposit_paid_date", e.target.value)} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Terms & Conditions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Standard Terms</label>
                  <textarea value={form.terms_text} onChange={e => set("terms_text", e.target.value)} rows={6}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Special Conditions</label>
                  <textarea value={form.special_conditions} onChange={e => set("special_conditions", e.target.value)} rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                    placeholder="Any special terms for this contract…" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Internal Notes</label>
                  <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                    placeholder="Private notes not shown on the printed contract…" />
                </div>
              </CardContent>
            </Card>

            {saveErr && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveErr}</div>
            )}

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" asChild>
                <Link href={`/contracts/${id}`}>Cancel</Link>
              </Button>
              <Button type="submit" variant="teal" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
