"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  FileText, Ship, User, CalendarDays, AlertCircle, CheckCircle2,
  Loader2, ChevronRight, Printer, DollarSign, Pencil,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, formatDateLong } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { Contract } from "@/lib/supabase"

// ─── constants ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  WET_BERTH:"Wet Berth", DRY_STORAGE:"Dry Storage",
  RAMP_SERVICE:"Ramp Service", SERVICE_AGREEMENT:"Service Agreement",
}
const CYCLE_LABELS: Record<string, string> = {
  MONTHLY:"Monthly", QUARTERLY:"Quarterly", ANNUAL:"Annual", ONE_TIME:"One-time",
}
const STATUS_COLORS: Record<string, string> = {
  DRAFT:"bg-gray-100 text-gray-600 border-gray-200",
  ACTIVE:"bg-green-100 text-green-700 border-green-200",
  EXPIRED:"bg-amber-100 text-amber-700 border-amber-200",
  TERMINATED:"bg-red-100 text-red-700 border-red-200",
  SUSPENDED:"bg-orange-100 text-orange-700 border-orange-200",
}
const STATUS_TRANSITIONS: Record<string, { next: string; label: string }[]> = {
  DRAFT:     [{ next: "ACTIVE",     label: "Activate" }],
  ACTIVE:    [{ next: "SUSPENDED",  label: "Suspend" }, { next: "TERMINATED", label: "Terminate" }],
  SUSPENDED: [{ next: "ACTIVE",     label: "Reinstate" }, { next: "TERMINATED", label: "Terminate" }],
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value, highlight, className }: { label: string; value: React.ReactNode; highlight?: boolean; className?: string }) {
  return (
    <div className={cn("flex justify-between items-center border-b last:border-0 pb-2 last:pb-0", className)}>
      <span className="text-gray-500 text-sm">{label}</span>
      <span className={cn("font-medium text-sm text-right", highlight ? "text-teal-700" : "text-gray-900")}>{value}</span>
    </div>
  )
}

function SignaturePill({ signed, label }: { signed: boolean; label: string }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border",
      signed ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"
    )}>
      {signed ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border border-gray-400" />}
      {label}
    </div>
  )
}

function daysUntilExpiry(endDate: string | null): number | null {
  if (!endDate) return null
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ContractDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""

  const [contract, setContract] = useState<Contract | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/db/contracts/${id}`)
      .then(r => r.json())
      .then(d => { if (d?.error) setError("Contract not found"); else setContract(d) })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false))
  }, [id])

  async function handleStatusChange(newStatus: string) {
    if (!contract) return
    setUpdating(true)
    try {
      const res  = await fetch(`/api/db/contracts/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Update failed")
      setContract(data)
    } catch (e) { alert("Failed: " + String(e)) }
    finally { setUpdating(false) }
  }

  async function toggleField(field: "signed_by_customer" | "signed_by_marina", current: boolean) {
    if (!contract) return
    try {
      const patch: Record<string, unknown> = { [field]: !current }
      if (!current && field === "signed_by_marina" && contract.signed_by_customer) {
        patch.signed_date = new Date().toISOString().slice(0, 10)
      }
      const res  = await fetch(`/api/db/contracts/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Update failed")
      setContract(data)
    } catch (e) { alert("Failed: " + String(e)) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-gray-400">
      <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
    </div>
  )
  if (error || !contract) return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <FileText className="h-10 w-10 text-gray-300 mb-3" />
      <p className="text-gray-500">{error ?? "Contract not found"}</p>
      <Link href="/contracts" className="text-sm text-teal-600 hover:underline mt-2">← Back to contracts</Link>
    </div>
  )

  const transitions = STATUS_TRANSITIONS[contract.status] ?? []
  const daysLeft    = daysUntilExpiry(contract.end_date)
  const expiryWarn  = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0 && contract.status === "ACTIVE"

  return (
    <div className="space-y-6">
      <PageHeader
        title={contract.contract_number}
        description={`${TYPE_LABELS[contract.contract_type] ?? contract.contract_type} · ${contract.customer_name ?? "—"}`}
        breadcrumb={[{ label: "Contracts", href: "/contracts" }, { label: contract.contract_number }]}
        actions={
          <div className="flex gap-2 flex-wrap">
            {transitions.map(({ next, label }) => (
              <Button key={next} size="sm" variant="teal" className="gap-2"
                disabled={updating} onClick={() => handleStatusChange(next)}>
                {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {label}
              </Button>
            ))}
            <Button size="sm" variant="outline" className="gap-2" asChild>
              <Link href={`/contracts/${id}/edit`}><Pencil className="h-4 w-4" /> Edit</Link>
            </Button>
            <Button size="sm" variant="outline" className="gap-2"
              onClick={() => window.open(`/print/contracts/${id}`, "_blank")}>
              <Printer className="h-4 w-4" /> Print Contract
            </Button>
          </div>
        }
      />

      {/* Status bar */}
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 flex-wrap">
        <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold", STATUS_COLORS[contract.status])}>
          {contract.status}
        </span>
        <span className="text-sm font-semibold text-gray-700">{TYPE_LABELS[contract.contract_type] ?? contract.contract_type}</span>
        {expiryWarn && (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            <AlertCircle className="h-3 w-3" /> Expiring in {daysLeft} days
          </span>
        )}
        {contract.auto_renew && (
          <span className="text-xs text-teal-600 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">Auto-renew</span>
        )}
        <span className="ml-auto text-xs text-gray-400">{formatDateLong(contract.start_date)}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-4">
          {/* Contract details */}
          <Card>
            <CardHeader><CardTitle>Contract Details</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <InfoRow label="Reference"     value={contract.contract_number} />
              <InfoRow label="Type"          value={TYPE_LABELS[contract.contract_type] ?? contract.contract_type} />
              <InfoRow label="Status"        value={contract.status} highlight />
              <InfoRow label="Start Date"    value={formatDate(contract.start_date)} />
              <InfoRow label="End Date"      value={contract.end_date ? formatDate(contract.end_date) : "Open-ended"} />
              <InfoRow label="Auto Renew"    value={contract.auto_renew ? "Yes" : "No"} />
              {contract.auto_renew && (
                <InfoRow label="Notice Period" value={`${contract.renewal_notice_days} days`} />
              )}
            </CardContent>
          </Card>

          {/* Customer */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-4 w-4 text-gray-400" />Customer</CardTitle></CardHeader>
            <CardContent>
              {contract.customer_id ? (
                <Link href={`/customers/${contract.customer_id}`} className="flex items-center gap-2 text-teal-600 hover:underline text-sm font-medium">
                  {contract.customer_name}<ChevronRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <p className="text-sm text-gray-500">{contract.customer_name ?? "—"}</p>
              )}
            </CardContent>
          </Card>

          {/* Vessel */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Ship className="h-4 w-4 text-gray-400" />Vessel</CardTitle></CardHeader>
            <CardContent>
              {contract.boat_id ? (
                <Link href={`/boats/${contract.boat_id}`} className="flex items-center gap-2 text-teal-600 hover:underline text-sm font-medium">
                  {contract.boat_name}<ChevronRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <p className="text-sm text-gray-500">{contract.boat_name ?? "—"}</p>
              )}
              {contract.berth_code && (
                <div className="mt-2 text-sm text-gray-600">
                  Berth / Slot: <span className="font-medium text-gray-900">{contract.berth_code}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Billing & Deposit */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-teal-500" />Billing &amp; Deposit</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-teal-50 border border-teal-200 p-4">
                  <div className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-1">Rate</div>
                  <div className="text-2xl font-bold text-teal-700">
                    {contract.rate_amount != null
                      ? contract.rate_amount.toLocaleString()
                      : "—"}
                  </div>
                  <div className="text-xs text-teal-600 mt-0.5">
                    {contract.rate_currency} / {CYCLE_LABELS[contract.billing_cycle] ?? contract.billing_cycle}
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Security Deposit</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {contract.deposit_amount != null ? contract.deposit_amount.toLocaleString() : "—"}
                  </div>
                  <div className={cn("text-xs mt-0.5 font-medium", contract.deposit_paid ? "text-green-600" : "text-amber-600")}>
                    {contract.deposit_paid
                      ? `Paid${contract.deposit_paid_date ? ` · ${formatDate(contract.deposit_paid_date)}` : ""}`
                      : "Not yet paid"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signatures */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-gray-400" />Signatures</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <SignaturePill signed={contract.signed_by_customer} label="Customer / Boat Owner" />
                <SignaturePill signed={contract.signed_by_marina}   label="Marina Manager" />
                {contract.signed_date && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> Signed {formatDate(contract.signed_date)}
                  </span>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="text-xs gap-1.5"
                  onClick={() => toggleField("signed_by_customer", contract.signed_by_customer)}>
                  {contract.signed_by_customer ? "Unmark" : "Mark"} Customer Signed
                </Button>
                <Button size="sm" variant="outline" className="text-xs gap-1.5"
                  onClick={() => toggleField("signed_by_marina", contract.signed_by_marina)}>
                  {contract.signed_by_marina ? "Unmark" : "Mark"} Marina Signed
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Terms */}
          {(contract.terms_text || contract.special_conditions) && (
            <Card>
              <CardHeader><CardTitle>Terms &amp; Conditions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {contract.terms_text && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Standard Terms</div>
                    <p className="text-sm text-gray-700 whitespace-pre-line bg-gray-50 rounded p-3 border border-gray-100">
                      {contract.terms_text}
                    </p>
                  </div>
                )}
                {contract.special_conditions && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Special Conditions</div>
                    <p className="text-sm text-gray-700 whitespace-pre-line bg-amber-50 rounded p-3 border border-amber-100">
                      {contract.special_conditions}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {contract.notes && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-line">{contract.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader><CardTitle className="text-sm text-gray-500">Record Info</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <InfoRow label="Created" value={formatDate(contract.created_at)} />
              {contract.created_by  && <InfoRow label="Created By"  value={contract.created_by} />}
              {contract.approved_by && <InfoRow label="Approved By" value={contract.approved_by} />}
              {contract.approved_at && <InfoRow label="Approved At" value={formatDate(contract.approved_at)} />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
