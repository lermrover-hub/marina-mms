"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  Download, CreditCard, AlertCircle, CheckCircle,
  User, Ship, FileText, ChevronRight, X, Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Invoice, Payment, InvoiceItem } from "@/lib/supabase"
import { formatTHB, formatDate, formatDateLong } from "@/lib/utils"
import { cn } from "@/lib/utils"

// ─── Payment method labels ────────────────────────────────────────────────────
const METHOD_LABELS: Record<string, string> = {
  CASH:          "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CREDIT_CARD:   "Credit Card",
  QR_PAYMENT:    "QR Payment",
  CHEQUE:        "Cheque",
  OTHER:         "Other",
}

const PAYMENT_METHODS = Object.entries(METHOD_LABELS)

// ─── Status progress bar ───────────────────────────────────────────────────────
function StatusBar({ status, paidAmount, grandTotal }: { status: string; paidAmount: number; grandTotal: number }) {
  const pct = grandTotal > 0 ? Math.round((paidAmount / grandTotal) * 100) : 0
  const color =
    status === "PAID"          ? "bg-green-500"  :
    status === "OVERDUE"       ? "bg-red-500"    :
    status === "PARTIALLY_PAID"? "bg-amber-500"  : "bg-gray-200"
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>Paid {pct}%</span>
        <span>{formatTHB(paidAmount)} of {formatTHB(grandTotal)}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Record Payment Modal ─────────────────────────────────────────────────────
function RecordPaymentModal({
  invoice,
  onClose,
  onSaved,
}: {
  invoice: Invoice
  onClose: () => void
  onSaved: () => void
}) {
  const [amount,  setAmount]  = useState(String(invoice.outstanding_balance))
  const [method,  setMethod]  = useState("BANK_TRANSFER")
  const [date,    setDate]    = useState(new Date().toISOString().slice(0, 10))
  const [slipRef, setSlipRef] = useState("")
  const [note,    setNote]    = useState("")
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const n = parseFloat(amount)
    if (isNaN(n) || n <= 0) { setErr("Enter a valid amount"); return }
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch("/api/db/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id:   invoice.id,
          customer_id:  invoice.customer_id,
          customer_name: invoice.customer_name,
          payment_method: method,
          amount: n,
          payment_date: date,
          reference_no: slipRef || null,
          status: "CONFIRMED",
          notes: note || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Payment failed")
      onSaved()
      onClose()
    } catch (e) {
      setErr(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold text-gray-900">Record Payment</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {invoice.invoice_number} · Outstanding: {formatTHB(invoice.outstanding_balance)}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pay-amount">Payment Amount (฿)</Label>
            <Input
              id="pay-amount" type="number" min={1} max={invoice.outstanding_balance}
              value={amount} onChange={(e) => setAmount(e.target.value)}
              required className="text-lg font-semibold"
            />
            <button
              type="button"
              onClick={() => setAmount(String(invoice.outstanding_balance))}
              className="text-xs text-teal-600 hover:underline"
            >
              Full balance ({formatTHB(invoice.outstanding_balance)})
            </button>
          </div>

          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_METHODS.map(([key, label]) => (
                <button
                  key={key} type="button" onClick={() => setMethod(key)}
                  className={cn(
                    "rounded-lg border py-2 px-2 text-xs font-medium transition-colors",
                    method === key
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-date">Payment Date</Label>
            <Input id="pay-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-ref">
              Reference / Slip No.{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Input id="pay-ref" placeholder="e.g. SCB-20260519-001" value={slipRef} onChange={(e) => setSlipRef(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-note">
              Note <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Input id="pay-note" placeholder="Internal note…" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-400">Payment slip upload — connect file storage to enable</p>
          </div>

          {err && <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{err}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="teal" className="flex-1 gap-2" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {saving ? "Saving…" : "Confirm Payment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""

  const [invoice,      setInvoice]      = useState<Invoice | null>(null)
  const [lineItems,    setLineItems]    = useState<InvoiceItem[]>([])
  const [payments,     setPayments]     = useState<Payment[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [payModalOpen, setPayModalOpen] = useState(false)

  async function loadData() {
    if (!id) return
    setLoading(true)
    try {
      const [invRes, payRes] = await Promise.all([
        fetch(`/api/db/invoices/${id}`).then(r => r.json()),
        fetch(`/api/db/payments?invoice_id=${id}`).then(r => r.json()),
      ])
      if (invRes?.error) { setError("Invoice not found"); return }
      // Supabase join returns mms_invoice_items as nested array
      const { mms_invoice_items, ...inv } = invRes
      setInvoice(inv as Invoice)
      if (Array.isArray(mms_invoice_items)) setLineItems(mms_invoice_items)
      if (Array.isArray(payRes)) setPayments(payRes)
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <FileText className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">{error ?? "Invoice not found"}</p>
        <Link href="/invoices" className="text-sm text-teal-600 hover:underline mt-2">← Back to invoices</Link>
      </div>
    )
  }

  const outstanding = invoice.outstanding_balance
  const canPay      = outstanding > 0 && invoice.status !== "CANCELLED"
  const isOverdue   = invoice.status === "OVERDUE"

  // Derive totals from invoice fields
  const grandTotal = invoice.total_amount
  const taxAmount  = invoice.vat_amount
  const subtotal   = invoice.subtotal
  const discount   = 0  // field not separate in current schema

  return (
    <>
      {payModalOpen && (
        <RecordPaymentModal
          invoice={invoice}
          onClose={() => setPayModalOpen(false)}
          onSaved={() => loadData()}
        />
      )}

      <div className="space-y-6">
        <PageHeader
          title={invoice.invoice_number}
          breadcrumb={[{ label: "Invoices", href: "/invoices" }, { label: invoice.invoice_number }]}
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline" size="sm" className="gap-2"
                onClick={() => window.open(`/print/invoices/${id}`, "_blank")}
              >
                <Download className="h-4 w-4" /> Download PDF
              </Button>
              {canPay && (
                <Button size="sm" variant="teal" className="gap-2" onClick={() => setPayModalOpen(true)}>
                  <CreditCard className="h-4 w-4" /> Record Payment
                </Button>
              )}
            </div>
          }
        />

        {isOverdue && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            This invoice is <strong className="ml-1">OVERDUE</strong>.
            {invoice.due_date && <> Due date was {formatDateLong(invoice.due_date)}.</>}
            {" "}Outstanding balance: {formatTHB(outstanding)}.
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              label: "Status",
              content: <StatusBadge type="invoice" status={invoice.status} />,
            },
            {
              label: "Grand Total",
              content: <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatTHB(grandTotal)}</p>,
            },
            {
              label: "Amount Paid",
              content: <p className="text-2xl font-bold text-green-600 tabular-nums">{formatTHB(invoice.paid_amount)}</p>,
            },
            {
              label: "Outstanding",
              content: (
                <p className={cn("text-2xl font-bold tabular-nums", outstanding > 0 ? "text-amber-600" : "text-gray-400")}>
                  {formatTHB(outstanding)}
                </p>
              ),
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

        {/* Payment progress bar */}
        <Card>
          <CardContent className="p-4">
            <StatusBar status={invoice.status} paidAmount={invoice.paid_amount} grandTotal={grandTotal} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ── Left: meta ── */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Invoice No.", value: invoice.invoice_number },
                  { label: "Issue Date",  value: formatDate(invoice.invoice_date ?? invoice.created_at) },
                  { label: "Due Date",    value: invoice.due_date ? formatDate(invoice.due_date) : "—" },
                  { label: "Tax (VAT)",   value: formatTHB(taxAmount) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className={cn(
                      "text-sm font-medium text-gray-900",
                      label === "Due Date" && isOverdue ? "text-red-600" : ""
                    )}>{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Customer */}
            <Card>
              <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
              <CardContent>
                {invoice.customer_id ? (
                  <Link
                    href={`/customers/${invoice.customer_id}`}
                    className="flex items-center gap-3 hover:bg-gray-50 -mx-2 px-2 py-2 rounded-md transition-colors"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 shrink-0">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 hover:text-teal-700">{invoice.customer_name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        View profile <ChevronRight className="h-3 w-3" />
                      </p>
                    </div>
                  </Link>
                ) : (
                  <p className="text-sm text-gray-600">{invoice.customer_name ?? "—"}</p>
                )}
              </CardContent>
            </Card>

            {/* Boat */}
            {invoice.boat_name && (
              <Card>
                <CardHeader><CardTitle>Boat</CardTitle></CardHeader>
                <CardContent>
                  {invoice.boat_id ? (
                    <Link
                      href={`/boats/${invoice.boat_id}`}
                      className="flex items-center gap-3 hover:bg-gray-50 -mx-2 px-2 py-2 rounded-md transition-colors"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 shrink-0">
                        <Ship className="h-4 w-4 text-teal-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 hover:text-teal-600">{invoice.boat_name}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          View boat <ChevronRight className="h-3 w-3" />
                        </p>
                      </div>
                    </Link>
                  ) : (
                    <p className="text-sm text-gray-600">{invoice.boat_name}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Right: tabs ── */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="items">
              <TabsList>
                <TabsTrigger value="items">Line Items</TabsTrigger>
                <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
              </TabsList>

              {/* Line items */}
              <TabsContent value="items">
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                          <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Unit</th>
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
                              {item.category && <p className="text-xs text-gray-400 mt-0.5">{item.category}</p>}
                            </td>
                            <td className="px-5 py-3 text-center text-sm text-gray-600">{item.unit ?? "—"}</td>
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
                      {discount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount</span>
                          <span className="tabular-nums">− {formatTHB(discount)}</span>
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
                      <div className="flex justify-between text-sm text-green-600 font-medium">
                        <span>Paid</span>
                        <span className="tabular-nums">− {formatTHB(invoice.paid_amount)}</span>
                      </div>
                      <div className={cn(
                        "flex justify-between border-t pt-2 text-sm font-semibold",
                        outstanding > 0 ? "text-amber-700" : "text-gray-400"
                      )}>
                        <span>Outstanding Balance</span>
                        <span className="tabular-nums">{formatTHB(outstanding)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Payments */}
              <TabsContent value="payments">
                <Card>
                  {payments.length === 0 ? (
                    <CardContent className="py-12 text-center text-sm text-gray-400">
                      <CreditCard className="h-8 w-8 mx-auto text-gray-200 mb-2" />
                      No payments recorded yet.
                      {canPay && (
                        <div className="mt-3">
                          <Button size="sm" variant="teal" onClick={() => setPayModalOpen(true)} className="gap-2">
                            <CreditCard className="h-4 w-4" /> Record First Payment
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  ) : (
                    <>
                      <div className="divide-y divide-gray-100">
                        {payments.map((p) => (
                          <div key={p.id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50">
                            <div className="flex items-start gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 shrink-0 mt-0.5">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{formatTHB(p.amount)}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {METHOD_LABELS[p.payment_method] ?? p.payment_method}
                                  {p.reference_no && (
                                    <span className="ml-2 font-mono text-gray-400">· {p.reference_no}</span>
                                  )}
                                </p>
                                {p.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{p.notes}</p>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-gray-500">{formatDate(p.payment_date)}</p>
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 mt-1">
                                {p.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-gray-100 px-5 py-3 flex justify-between items-center">
                        <p className="text-xs text-gray-500">
                          {payments.length} payment{payments.length !== 1 ? "s" : ""} recorded
                        </p>
                        {canPay && (
                          <Button size="sm" variant="outline" onClick={() => setPayModalOpen(true)} className="gap-1.5">
                            <CreditCard className="h-3.5 w-3.5" /> Add Payment
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Live indicator */}
        <p className="text-xs text-gray-400 text-center pb-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 align-middle" />
          Live database · {invoice.invoice_number} · {payments.length} payments
        </p>
      </div>
    </>
  )
}
