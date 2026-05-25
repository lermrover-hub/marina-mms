"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  Download, Send, CheckCircle, XCircle,
  AlertCircle, User, Ship, ChevronRight, FileText,
  ArrowRight, Edit, Copy, Loader2, PenLine,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SignatureApprovalModal } from "@/components/ui/SignatureApprovalModal"
import type { Quotation, QuotationItem } from "@/lib/supabase"
import { formatTHB, formatDate, formatDateLong } from "@/lib/utils"
import { cn } from "@/lib/utils"

// ─── Confirm dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({
  title, message, confirmLabel, confirmVariant, onConfirm, onCancel, saving,
}: {
  title: string; message: string; confirmLabel: string
  confirmVariant?: "default" | "teal" | "destructive"
  onConfirm: () => void; onCancel: () => void
  saving?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{message}</p>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button variant={confirmVariant ?? "default"} className="flex-1 gap-2" onClick={onConfirm} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function QuotationDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""

  const [quotation,  setQuotation]  = useState<Quotation | null>(null)
  const [lineItems,  setLineItems]  = useState<QuotationItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [dialog,     setDialog]     = useState<"send" | "accept" | "reject" | "convert" | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [showSigModal, setShowSigModal] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/db/quotations/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d?.error) { setError("Quotation not found"); return }
        const { mms_quotation_items, ...qt } = d
        setQuotation(qt as Quotation)
        if (Array.isArray(mms_quotation_items)) setLineItems(mms_quotation_items)
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false))
  }, [id])

  async function handleAction(newStatus: string) {
    if (!quotation) return
    setSaving(true)
    try {
      const res = await fetch(`/api/db/quotations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Update failed")
      setQuotation(data)
    } catch (e) {
      alert("Failed to update: " + String(e))
    } finally {
      setSaving(false)
      setDialog(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
      </div>
    )
  }

  if (error || !quotation) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <FileText className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">{error ?? "Quotation not found"}</p>
        <Link href="/quotations" className="text-sm text-teal-600 hover:underline mt-2">← Back to quotations</Link>
      </div>
    )
  }

  const isExpired  = quotation.valid_until ? new Date(quotation.valid_until) < new Date() : false
  const canSend       = ["DRAFT"].includes(quotation.status)
  const canAccept     = ["SENT"].includes(quotation.status)
  const canReject     = ["SENT", "ACCEPTED"].includes(quotation.status)
  const canConvert    = ["ACCEPTED"].includes(quotation.status)
  const canEdit       = ["DRAFT", "SENT"].includes(quotation.status)
  const canSignApprove = ["SENT", "PENDING_APPROVAL"].includes(quotation.status)
  const hasSignature  = !!(quotation.signature_data)

  // Derive totals from Quotation type fields
  const subtotal       = quotation.subtotal
  const discountAmount = quotation.discount ?? 0
  const taxAmount      = quotation.vat_amount
  const grandTotal     = quotation.total_amount
  const depositReq     = quotation.deposit_amount ?? 0

  return (
    <>
      {showSigModal && (
        <SignatureApprovalModal
          quotation={{
            id: quotation.id,
            quote_number: quotation.quote_number,
            title: quotation.title,
            customer_name: quotation.customer_name,
            total_amount: quotation.total_amount,
          }}
          onClose={() => setShowSigModal(false)}
          onApproved={(updated) => {
            setQuotation((prev) => prev ? { ...prev, ...(updated as Partial<Quotation>) } : prev)
            setShowSigModal(false)
          }}
        />
      )}
      {dialog === "send" && (
        <ConfirmDialog
          title="Send Quotation to Customer"
          message={`Send ${quotation.quote_number} to ${quotation.customer_name}? Status will change to SENT.`}
          confirmLabel="Send Quotation"
          confirmVariant="teal"
          saving={saving}
          onConfirm={() => handleAction("SENT")}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === "accept" && (
        <ConfirmDialog
          title="Mark as Accepted"
          message="Record customer acceptance of this quotation? You can then convert it to a work order or invoice."
          confirmLabel="Mark Accepted"
          confirmVariant="teal"
          saving={saving}
          onConfirm={() => handleAction("ACCEPTED")}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === "reject" && (
        <ConfirmDialog
          title="Mark as Rejected"
          message="Mark this quotation as rejected by the customer? This action will archive the quotation."
          confirmLabel="Mark Rejected"
          confirmVariant="destructive"
          saving={saving}
          onConfirm={() => handleAction("REJECTED")}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === "convert" && (
        <ConfirmDialog
          title="Convert to Invoice"
          message={`Convert ${quotation.quote_number} into a new invoice for ${quotation.customer_name}?`}
          confirmLabel="Convert to Invoice"
          confirmVariant="teal"
          saving={saving}
          onConfirm={() => handleAction("CONVERTED")}
          onCancel={() => setDialog(null)}
        />
      )}

      <div className="space-y-6">
        <PageHeader
          title={quotation.quote_number}
          description={quotation.title ?? ""}
          breadcrumb={[{ label: "Quotations", href: "/quotations" }, { label: quotation.quote_number }]}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline" size="sm" className="gap-2"
                onClick={() => window.open(`/print/quotations/${id}`, "_blank")}
              >
                <Download className="h-4 w-4" /> PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Copy className="h-4 w-4" /> Duplicate
              </Button>
              {canEdit && (
                <Button variant="outline" size="sm" className="gap-2" disabled>
                  <Edit className="h-4 w-4" /> Edit
                </Button>
              )}
              {canSend && (
                <Button size="sm" className="gap-2" onClick={() => setDialog("send")}>
                  <Send className="h-4 w-4" /> Send to Customer
                </Button>
              )}
              {canSignApprove && (
                <Button size="sm" variant="teal" className="gap-2" onClick={() => setShowSigModal(true)}>
                  <PenLine className="h-4 w-4" /> Approve with Signature
                </Button>
              )}
              {canAccept && (
                <Button size="sm" variant="outline" className="gap-2" onClick={() => setDialog("accept")}>
                  <CheckCircle className="h-4 w-4" /> Mark Accepted
                </Button>
              )}
              {canConvert && (
                <Button size="sm" className="gap-2 bg-blue-700 hover:bg-blue-800 text-white" onClick={() => setDialog("convert")}>
                  <ArrowRight className="h-4 w-4" /> Convert to Invoice
                </Button>
              )}
              {canReject && (
                <Button size="sm" variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setDialog("reject")}>
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
              )}
            </div>
          }
        />

        {isExpired && !["ACCEPTED", "CONVERTED", "REJECTED"].includes(quotation.status) && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            This quotation expired on
            <strong className="mx-1">{quotation.valid_until ? formatDateLong(quotation.valid_until) : "—"}</strong>.
            Consider reissuing with a new validity date.
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              label: "Status",
              content: <StatusBadge type="quotation" status={quotation.status} />,
            },
            {
              label: "Grand Total",
              content: <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatTHB(grandTotal)}</p>,
            },
            {
              label: "Deposit Req.",
              content: <p className="text-2xl font-bold text-blue-700 tabular-nums">{depositReq > 0 ? formatTHB(depositReq) : "—"}</p>,
            },
            {
              label: "VAT",
              content: <p className="text-2xl font-bold text-gray-600 tabular-nums">{formatTHB(taxAmount)}</p>,
            },
          ].map(({ label, content }) => (
            <Card key={label}>
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
                {content}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ── Left column ── */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Quotation Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Quote No.",   value: quotation.quote_number },
                  { label: "Created",     value: formatDate(quotation.created_at) },
                  { label: "Valid Until", value: quotation.valid_until ? formatDate(quotation.valid_until) : "—" },
                  { label: "VAT",         value: formatTHB(taxAmount) },
                  { label: "Discount",    value: discountAmount > 0 ? `− ${formatTHB(discountAmount)}` : "None" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className={cn(
                      "text-sm font-medium text-right",
                      label === "Discount" && discountAmount > 0 ? "text-green-600" : "text-gray-900"
                    )}>{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
              <CardContent>
                {quotation.customer_id ? (
                  <Link
                    href={`/customers/${quotation.customer_id}`}
                    className="flex items-center gap-3 hover:bg-gray-50 -mx-2 px-2 py-2 rounded-md transition-colors"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 shrink-0">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 hover:text-teal-700">{quotation.customer_name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        View profile <ChevronRight className="h-3 w-3" />
                      </p>
                    </div>
                  </Link>
                ) : (
                  <p className="text-sm text-gray-600">{quotation.customer_name ?? "—"}</p>
                )}
              </CardContent>
            </Card>

            {quotation.boat_name && (
              <Card>
                <CardHeader><CardTitle>Boat</CardTitle></CardHeader>
                <CardContent>
                  {quotation.boat_id ? (
                    <Link
                      href={`/boats/${quotation.boat_id}`}
                      className="flex items-center gap-3 hover:bg-gray-50 -mx-2 px-2 py-2 rounded-md transition-colors"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 shrink-0">
                        <Ship className="h-4 w-4 text-teal-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 hover:text-teal-600">{quotation.boat_name}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          View boat <ChevronRight className="h-3 w-3" />
                        </p>
                      </div>
                    </Link>
                  ) : (
                    <p className="text-sm text-gray-600">{quotation.boat_name}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {quotation.notes && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 leading-relaxed">{quotation.notes}</p>
                </CardContent>
              </Card>
            )}

            {hasSignature && (
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><PenLine className="h-4 w-4 text-teal-600" /> Approval Signature</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={quotation.signature_data!}
                      alt="Approval signature"
                      className="max-h-24 mx-auto"
                    />
                  </div>
                  {quotation.approved_by_name && (
                    <p className="text-xs text-gray-500">
                      Signed by: <span className="font-medium text-gray-700">{quotation.approved_by_name}</span>
                    </p>
                  )}
                  {quotation.approved_at && (
                    <p className="text-xs text-gray-500">
                      Date: <span className="font-medium text-gray-700">{formatDateLong(quotation.approved_at)}</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Right: line items ── */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="items">
              <TabsList>
                <TabsTrigger value="items">Line Items</TabsTrigger>
                <TabsTrigger value="summary">Cost Summary</TabsTrigger>
              </TabsList>

              <TabsContent value="items">
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                          <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Qty</th>
                          <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
                          <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {lineItems.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">
                              No line items recorded.
                            </td>
                          </tr>
                        ) : lineItems.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3">
                              <p className="text-sm font-medium text-gray-900">{item.description}</p>
                            </td>
                            <td className="px-5 py-3 text-left text-xs text-gray-500">—</td>
                            <td className="px-5 py-3 text-right text-sm tabular-nums text-gray-900">{item.qty}</td>
                            <td className="px-5 py-3 text-right text-sm tabular-nums text-gray-900">{formatTHB(item.unit_price)}</td>
                            <td className="px-5 py-3 text-right text-sm tabular-nums font-semibold text-gray-900">{formatTHB(item.line_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Totals footer */}
                  <div className="border-t border-gray-100 px-5 py-4">
                    <div className="ml-auto w-full max-w-xs space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Subtotal</span>
                        <span className="tabular-nums">{formatTHB(subtotal)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount</span>
                          <span className="tabular-nums">− {formatTHB(discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>VAT 7%</span>
                        <span className="tabular-nums">{formatTHB(taxAmount)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 text-base font-bold text-gray-900">
                        <span>Grand Total</span>
                        <span className="tabular-nums">{formatTHB(grandTotal)}</span>
                      </div>
                      {depositReq > 0 && (
                        <div className="flex justify-between text-sm text-blue-700 font-medium border-t pt-2">
                          <span>Deposit Required</span>
                          <span className="tabular-nums">{formatTHB(depositReq)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="summary">
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Financial Summary</p>
                    {[
                      { label: "Subtotal (before VAT)", value: subtotal,      color: "text-gray-800" },
                      { label: "VAT 7%",                value: taxAmount,     color: "text-gray-600" },
                      { label: "Grand Total",           value: grandTotal,    color: "text-gray-900 font-bold text-base" },
                      { label: "Deposit Required",      value: depositReq,    color: "text-blue-700" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-gray-500">{label}</span>
                        <span className="tabular-nums font-medium text-gray-900">{formatTHB(value)}</span>
                      </div>
                    ))}
                    {quotation.notes && (
                      <div className="pt-4 border-t">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</p>
                        <p className="text-sm text-gray-600">{quotation.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Live indicator */}
        <p className="text-xs text-gray-400 text-center pb-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 align-middle" />
          Live database · {quotation.quote_number}
        </p>
      </div>
    </>
  )
}
