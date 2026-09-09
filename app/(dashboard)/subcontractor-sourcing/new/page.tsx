"use client"

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, ClipboardList, Loader2, Plus, Search, ShieldCheck, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ServiceRequest, Subcontractor, SubcontractorQuote } from "@/lib/supabase"
import { formatDate, formatTHB } from "@/lib/utils"

const EMPTY_FORM = {
  supplierId: "",
  supplierName: "",
  contactName: "",
  phone: "",
  specialties: "",
  scope: "",
  quotedAmount: "",
  vatAmount: "",
  leadTimeDays: "",
  warrantyMonths: "",
  paymentTerms: "",
  validUntil: "",
  notes: "",
}

function NewSubcontractorSourcingPageContent() {
  const searchParams = useSearchParams()
  const serviceRequestId = searchParams.get("service_request_id") ?? ""
  const [request, setRequest] = useState<ServiceRequest | null>(null)
  const [suppliers, setSuppliers] = useState<Subcontractor[]>([])
  const [quotes, setQuotes] = useState<SubcontractorQuote[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [costApprover, setCostApprover] = useState("")
  const [poNumber, setPoNumber] = useState("")

  const loadData = useCallback(async () => {
    if (!serviceRequestId) {
      setError("service_request_id is required")
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [requestRes, supplierRes, quoteRes] = await Promise.all([
        fetch(`/api/db/service-requests/${serviceRequestId}`),
        fetch("/api/db/subcontractors"),
        fetch(`/api/db/subcontractor-quotes?service_request_id=${serviceRequestId}`),
      ])
      const [requestData, supplierData, quoteData] = await Promise.all([
        requestRes.json(), supplierRes.json(), quoteRes.json(),
      ])
      if (!requestRes.ok || requestData?.error) throw new Error(requestData?.error ?? "Service request not found")
      if (!supplierRes.ok || !Array.isArray(supplierData)) throw new Error(supplierData?.error ?? "Failed to load subcontractors")
      if (!quoteRes.ok || !Array.isArray(quoteData)) throw new Error(quoteData?.error ?? "Failed to load quotes")
      setRequest(requestData)
      setSuppliers(supplierData)
      setQuotes(quoteData)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setLoading(false)
    }
  }, [serviceRequestId])

  useEffect(() => { loadData() }, [loadData])

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === form.supplierId),
    [form.supplierId, suppliers],
  )

  function setField(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!request || !form.scope.trim() || !form.quotedAmount) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      let subcontractor = selectedSupplier
      if (!subcontractor) {
        if (!form.supplierName.trim()) throw new Error("Select or enter a subcontractor.")
        const supplierRes = await fetch("/api/db/subcontractors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.supplierName.trim(),
            contact_name: form.contactName || null,
            phone: form.phone || null,
            specialties: form.specialties || null,
          }),
        })
        const supplierData = await supplierRes.json()
        if (!supplierRes.ok) throw new Error(supplierData?.error ?? "Failed to create subcontractor")
        subcontractor = supplierData
      }

      const quoteRes = await fetch("/api/db/subcontractor-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_request_id: request.id,
          subcontractor_id: subcontractor?.id ?? null,
          subcontractor_name: subcontractor?.name ?? form.supplierName.trim(),
          scope: form.scope.trim(),
          quoted_amount: Number(form.quotedAmount),
          vat_amount: Number(form.vatAmount) || 0,
          lead_time_days: form.leadTimeDays ? Number(form.leadTimeDays) : null,
          warranty_months: form.warrantyMonths ? Number(form.warrantyMonths) : null,
          payment_terms: form.paymentTerms || null,
          valid_until: form.validUntil || null,
          notes: form.notes || null,
        }),
      })
      const quoteData = await quoteRes.json()
      if (!quoteRes.ok) throw new Error(quoteData?.error ?? "Failed to record quote")
      setForm({ ...EMPTY_FORM, scope: request.description ?? "" })
      setSuccess(`${quoteData.quote_reference} recorded for comparison.`)
      await loadData()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setSaving(false)
    }
  }

  async function selectQuote(quote: SubcontractorQuote) {
    setSelecting(quote.id)
    setError(null)
    try {
      const res = await fetch(`/api/db/subcontractor-quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SELECTED" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Failed to select quote")
      setSuccess(`${quote.subcontractor_name} selected. The request is ready for cost approval.`)
      await loadData()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setSelecting(null)
    }
  }

  async function advanceSelectedQuote(status: "COST_APPROVED" | "PO_ISSUED") {
    if (!selectedQuote) return
    setSelecting(selectedQuote.id)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/db/subcontractor-quotes/${selectedQuote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          cost_approved_by: status === "COST_APPROVED" ? costApprover.trim() : undefined,
          contractor_po_number: status === "PO_ISSUED" ? poNumber.trim() : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Failed to update sourcing status")
      setSuccess(status === "COST_APPROVED" ? "Contractor cost approved. The customer quotation can now be sent." : `Contractor PO ${data.contractor_po_number} issued.`)
      await loadData()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setSelecting(null)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-400"><Loader2 className="mr-2 h-6 w-6 animate-spin" />Loading sourcing workspace…</div>
  if (error && !request) return <div className="space-y-3 py-24 text-center"><p className="text-sm text-red-600">{error}</p><Link href="/service-requests" className="text-sm text-teal-700 hover:underline">Back to Service Requests</Link></div>
  if (!request) return null

  const selectedQuote = quotes.find((quote) => ["SELECTED", "COST_APPROVED", "PO_ISSUED"].includes(quote.status))
  const lowestQuote = quotes.length > 0 ? quotes.reduce((lowest, quote) => quote.total_amount < lowest.total_amount ? quote : lowest) : null

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Subcontractor Sourcing"
        description={`${request.reference} · ${request.title}`}
        breadcrumb={[{ label: "Service Requests", href: "/service-requests" }, { label: request.reference, href: `/service-requests/${request.id}` }, { label: "Sourcing" }]}
        actions={<Button variant="outline" size="sm" asChild><Link href={`/service-requests/${request.id}`}><ArrowLeft className="mr-2 h-4 w-4" />Service Request</Link></Button>}
      />

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"><CheckCircle2 className="h-4 w-4" />{success}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-gray-500">Execution model</p><p className="mt-1 font-semibold text-gray-900">{request.execution_type ?? "INTERNAL"}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-gray-500">Sourcing status</p><p className="mt-1 font-semibold text-teal-700">{request.procurement_status ?? "NEEDS_SOURCING"}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-gray-500">Quotes received</p><p className="mt-1 font-semibold text-gray-900">{quotes.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-gray-500">Lowest total</p><p className="mt-1 font-semibold text-gray-900">{lowestQuote ? formatTHB(lowestQuote.total_amount) : "—"}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4 text-teal-600" />Record Supplier Quote</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700">Existing subcontractor</label><select value={form.supplierId} onChange={(event) => { setField("supplierId", event.target.value); if (event.target.value) setField("supplierName", "") }} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"><option value="">New subcontractor…</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div>
              {!selectedSupplier && <div className="grid grid-cols-1 gap-3"><Input placeholder="Subcontractor name *" value={form.supplierName} onChange={(event) => setField("supplierName", event.target.value)} required /><div className="grid grid-cols-2 gap-2"><Input placeholder="Contact name" value={form.contactName} onChange={(event) => setField("contactName", event.target.value)} /><Input placeholder="Phone" value={form.phone} onChange={(event) => setField("phone", event.target.value)} /></div><Input placeholder="Specialty (e.g. full paint, engine)" value={form.specialties} onChange={(event) => setField("specialties", event.target.value)} /></div>}
              <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700">Scope quoted *</label><textarea required rows={3} value={form.scope} onChange={(event) => setField("scope", event.target.value)} placeholder="Exact scope, inclusions, exclusions…" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" /></div>
              <div className="grid grid-cols-2 gap-2"><div><label className="text-xs text-gray-500">Cost before VAT *</label><Input required type="number" min="0" step="0.01" value={form.quotedAmount} onChange={(event) => setField("quotedAmount", event.target.value)} /></div><div><label className="text-xs text-gray-500">VAT</label><Input type="number" min="0" step="0.01" value={form.vatAmount} onChange={(event) => setField("vatAmount", event.target.value)} /></div></div>
              <div className="grid grid-cols-2 gap-2"><div><label className="text-xs text-gray-500">Lead time (days)</label><Input type="number" min="0" value={form.leadTimeDays} onChange={(event) => setField("leadTimeDays", event.target.value)} /></div><div><label className="text-xs text-gray-500">Warranty (months)</label><Input type="number" min="0" value={form.warrantyMonths} onChange={(event) => setField("warrantyMonths", event.target.value)} /></div></div>
              <Input placeholder="Payment terms" value={form.paymentTerms} onChange={(event) => setField("paymentTerms", event.target.value)} />
              <Input type="date" value={form.validUntil} onChange={(event) => setField("validUntil", event.target.value)} />
              <textarea rows={2} value={form.notes} onChange={(event) => setField("notes", event.target.value)} placeholder="Internal notes, exclusions, risk…" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <Button type="submit" variant="teal" className="w-full gap-2" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{saving ? "Saving…" : "Record Quote"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-4 w-4 text-teal-600" />Quote Comparison</CardTitle></CardHeader>
          <CardContent className="p-0">
            {quotes.length === 0 ? <div className="py-16 text-center text-sm text-gray-400"><ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-40" />No supplier quotes recorded yet.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-y border-gray-100 bg-gray-50 text-left text-xs uppercase text-gray-500"><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Scope</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Lead / Warranty</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-gray-100">{quotes.map((quote) => <tr key={quote.id} className={["SELECTED", "COST_APPROVED", "PO_ISSUED"].includes(quote.status) ? "bg-green-50" : ""}><td className="px-4 py-3"><div className="font-semibold text-gray-900">{quote.subcontractor_name}</div><div className="text-xs text-gray-400">{quote.quote_reference} · {formatDate(quote.received_at)}</div></td><td className="max-w-[220px] px-4 py-3 text-xs text-gray-600">{quote.scope}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{formatTHB(quote.total_amount)}</td><td className="px-4 py-3 text-xs text-gray-600">{quote.lead_time_days != null ? `${quote.lead_time_days} days` : "—"}{quote.warranty_months != null ? ` · ${quote.warranty_months} mo warranty` : ""}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${["SELECTED", "COST_APPROVED", "PO_ISSUED"].includes(quote.status) ? "bg-green-100 text-green-700" : quote.status === "REJECTED" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"}`}>{quote.status}</span></td><td className="px-4 py-3 text-right">{["RECEIVED", "SHORTLISTED"].includes(quote.status) && <Button size="sm" variant="outline" className="gap-1.5" disabled={!!selecting} onClick={() => selectQuote(quote)}>{selecting === quote.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trophy className="h-3.5 w-3.5" />}Select</Button>}</td></tr>)}</tbody></table></div>}
          </CardContent>
        </Card>
      </div>

      {selectedQuote && (
        <Card className="border-purple-200">
          <CardHeader><CardTitle>Cost Approval & Contractor PO</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Selected cost: <span className="font-semibold text-gray-900">{formatTHB(selectedQuote.total_amount)}</span></p>
              <Input placeholder="Cost approver name" value={costApprover} onChange={(event) => setCostApprover(event.target.value)} disabled={selectedQuote.status !== "SELECTED"} />
              <Button variant="teal" disabled={selectedQuote.status !== "SELECTED" || !costApprover.trim() || !!selecting} onClick={() => advanceSelectedQuote("COST_APPROVED")}>Approve Contractor Cost</Button>
              {selectedQuote.cost_approved_by && <p className="text-xs text-green-700">Approved by {selectedQuote.cost_approved_by}{selectedQuote.cost_approved_at ? ` on ${formatDate(selectedQuote.cost_approved_at)}` : ""}</p>}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Issue the contractor PO only after cost approval.</p>
              <Input placeholder="Contractor PO number" value={poNumber} onChange={(event) => setPoNumber(event.target.value)} disabled={selectedQuote.status !== "COST_APPROVED"} />
              <Button variant="outline" disabled={selectedQuote.status !== "COST_APPROVED" || !poNumber.trim() || !!selecting} onClick={() => advanceSelectedQuote("PO_ISSUED")}>Issue Contractor PO</Button>
              {selectedQuote.contractor_po_number && <p className="text-xs text-purple-700">PO {selectedQuote.contractor_po_number} issued{selectedQuote.contractor_po_issued_at ? ` on ${formatDate(selectedQuote.contractor_po_issued_at)}` : ""}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-blue-200 bg-blue-50/40"><CardContent className="flex gap-3 p-4 text-sm text-blue-800"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" /><div><p className="font-semibold">Internal sourcing control</p><p className="mt-1">Supplier quotes and comparison notes are internal cost records. Only the approved customer price and scope should appear on the customer quotation.</p>{selectedQuote && <p className="mt-2 font-medium">Selected supplier: {selectedQuote.subcontractor_name} · {formatTHB(selectedQuote.total_amount)}</p>}</div></CardContent></Card>
    </div>
  )
}

export default function NewSubcontractorSourcingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-32 text-gray-400"><Loader2 className="mr-2 h-6 w-6 animate-spin" />Loading sourcing workspace…</div>}>
      <NewSubcontractorSourcingPageContent />
    </Suspense>
  )
}
