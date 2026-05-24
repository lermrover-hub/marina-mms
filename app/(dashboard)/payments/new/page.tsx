"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, CreditCard, Building2, Smartphone, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTHB, formatDate } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────
type InvoiceOption = {
  id: string
  invoice_number: string
  customer_id: string | null
  customer_name: string | null
  total_amount: number
  paid_amount: number
  outstanding_balance: number
  due_date: string | null
  status: string
}

// ── Payment method config ─────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  {
    value: "BANK_TRANSFER",
    label: "Bank Transfer",
    labelTH: "โอนเงินธนาคาร",
    icon: Building2,
    color: "border-blue-300 bg-blue-50 text-blue-700",
  },
  {
    value: "QR_PAYMENT",
    label: "QR / PromptPay",
    labelTH: "QR / พร้อมเพย์",
    icon: Smartphone,
    color: "border-teal-300 bg-teal-50 text-teal-700",
  },
  {
    value: "CREDIT_CARD",
    label: "Credit / Debit Card",
    labelTH: "บัตรเครดิต / เดบิต",
    icon: CreditCard,
    color: "border-purple-300 bg-purple-50 text-purple-700",
  },
  {
    value: "CASH",
    label: "Cash",
    labelTH: "เงินสด",
    icon: CreditCard,
    color: "border-green-300 bg-green-50 text-green-700",
  },
]

// ── Company bank info ─────────────────────────────────────────────────────────
const BANK_INFO = {
  bankName:      "ธนาคารกรุงเทพ (Bangkok Bank / BBL)",
  accountName:   "บริษัท ปาล์มบีช สมุย แอสเสท จำกัด",
  accountNumber: "691-300825-3",
  branch:        "เซนทรัล หาดเฉวง",
  promptPay:     "082-878-9149",
}

// ── component ─────────────────────────────────────────────────────────────────
export default function NewPaymentPage() {
  const router = useRouter()
  const [saving, setSaving]       = useState(false)
  const [success, setSuccess]     = useState(false)
  const [apiError, setApiError]   = useState<string | null>(null)

  // ── invoice data from API ─────────────────────────────────────────────
  const [invoices, setInvoices]   = useState<InvoiceOption[]>([])
  const [loadingInv, setLoadingInv] = useState(true)

  useEffect(() => {
    fetch("/api/db/invoices")
      .then((r) => r.json())
      .then((data: InvoiceOption[]) => {
        // Only show invoices that still have an outstanding balance
        const unpaid = Array.isArray(data)
          ? data.filter((inv) =>
              ["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(inv.status)
            )
          : []
        setInvoices(unpaid)
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoadingInv(false))
  }, [])

  // ── form state ───────────────────────────────────────────────────────
  const [selectedInvoiceId, setInvoiceId] = useState("")
  const [method, setMethod]               = useState("BANK_TRANSFER")
  const [paymentDate, setPaymentDate]     = useState(new Date().toISOString().split("T")[0])
  const [amount, setAmount]               = useState("")
  const [referenceNumber, setRefNum]      = useState("")
  const [bankFrom, setBankFrom]           = useState("")
  const [cardLast4, setCardLast4]         = useState("")
  const [note, setNote]                   = useState("")
  const [slipFile, setSlipFile]           = useState<File | null>(null)

  // ── derived ──────────────────────────────────────────────────────────
  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId)
  const paymentAmount   = parseFloat(amount) || 0
  const remainingAfter  = selectedInvoice
    ? selectedInvoice.outstanding_balance - paymentAmount
    : 0

  const isFullPayment = selectedInvoice && paymentAmount >= selectedInvoice.outstanding_balance
  const isPartial     = selectedInvoice && paymentAmount > 0 && paymentAmount < selectedInvoice.outstanding_balance

  function handleInvoiceSelect(id: string) {
    setInvoiceId(id)
    const inv = invoices.find((i) => i.id === id)
    if (inv) setAmount(String(inv.outstanding_balance))
    setApiError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedInvoice) return
    setSaving(true)
    setApiError(null)

    try {
      const payload = {
        invoice_id:     selectedInvoice.id,
        customer_id:    selectedInvoice.customer_id ?? null,
        customer_name:  selectedInvoice.customer_name ?? null,
        payment_method: method,
        amount:         paymentAmount,
        payment_date:   paymentDate,
        reference_no:   referenceNumber.trim() || null,
        status:         "CONFIRMED",
        notes: [
          note.trim(),
          bankFrom.trim() ? `From bank: ${bankFrom.trim()}` : "",
          cardLast4.trim() ? `Card last 4: ${cardLast4.trim()}` : "",
        ]
          .filter(Boolean)
          .join(" | ") || null,
      }

      const res = await fetch("/api/db/payments", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to save payment")
      }

      await res.json()
      setSuccess(true)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const isValid = selectedInvoiceId && paymentAmount > 0 && referenceNumber.trim()

  // ── success screen ────────────────────────────────────────────────────
  if (success && selectedInvoice) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <PageHeader
          title="Payment Recorded"
          description="The payment has been saved and the invoice has been updated."
        />
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="py-10 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <div>
              <p className="text-lg font-semibold text-green-800">
                {formatTHB(paymentAmount)} recorded successfully
              </p>
              <p className="text-sm text-green-700 mt-1">
                Invoice <span className="font-mono font-medium">{selectedInvoice.invoice_number}</span>
                {" "}has been updated to{" "}
                <span className="font-semibold">
                  {isFullPayment ? "PAID" : "PARTIALLY PAID"}
                </span>
              </p>
              {referenceNumber && (
                <p className="text-xs text-gray-500 mt-2">Ref: {referenceNumber}</p>
              )}
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" onClick={() => router.push("/invoices")}>
                View Invoices
              </Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white"
                onClick={() => router.push("/payments")}
              >
                View All Payments
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Record Payment"
        description="Record a payment received from a customer"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/payments">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Link>
          </Button>
        }
      />

      {apiError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Error:</strong> {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Invoice Selection ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Invoice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            <div className="space-y-1.5">
              <Label>Invoice to Receive Payment For <span className="text-red-500">*</span></Label>
              {loadingInv ? (
                <p className="text-sm text-gray-400 py-2">Loading invoices…</p>
              ) : (
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => handleInvoiceSelect(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                >
                  <option value="">— Select invoice —</option>
                  {invoices.length === 0 ? (
                    <option disabled>No unpaid invoices found</option>
                  ) : (
                    invoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} · {inv.customer_name ?? "Unknown"} · Outstanding:{" "}
                        {formatTHB(inv.outstanding_balance)}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>

            {/* Invoice summary card */}
            {selectedInvoice && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Invoice #</p>
                    <p className="font-semibold text-sm">{selectedInvoice.invoice_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Customer</p>
                    <p className="font-medium text-sm">{selectedInvoice.customer_name ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Amount</p>
                    <p className="font-medium text-sm">{formatTHB(selectedInvoice.total_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Outstanding</p>
                    <p className="font-bold text-sm text-amber-700">
                      {formatTHB(selectedInvoice.outstanding_balance)}
                    </p>
                  </div>
                </div>
                {selectedInvoice.due_date && (
                  <div className="mt-2 flex items-center gap-2">
                    <p className="text-xs text-gray-500">Due:</p>
                    <p className="text-xs font-medium">{formatDate(selectedInvoice.due_date)}</p>
                    {selectedInvoice.status === "OVERDUE" && (
                      <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">
                        OVERDUE
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

          </CardContent>
        </Card>

        {/* ── Payment Method ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Method selector */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                      method === m.value
                        ? m.color + " ring-2 ring-offset-1 ring-current"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="h-5 w-5 mb-1" />
                    <p className="text-xs font-semibold">{m.label}</p>
                    <p className="text-xs opacity-70">{m.labelTH}</p>
                  </button>
                )
              })}
            </div>

            {/* Bank info box — show for transfer / QR */}
            {(method === "BANK_TRANSFER" || method === "QR_PAYMENT") && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
                <p className="font-semibold text-blue-800 mb-2">Payment Destination</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  <div>
                    <span className="text-blue-600">Bank:</span>
                    <p className="font-medium text-blue-900">{BANK_INFO.bankName}</p>
                  </div>
                  <div>
                    <span className="text-blue-600">Branch:</span>
                    <p className="font-medium text-blue-900">{BANK_INFO.branch}</p>
                  </div>
                  <div>
                    <span className="text-blue-600">Account Name:</span>
                    <p className="font-medium text-blue-900">{BANK_INFO.accountName}</p>
                  </div>
                  <div>
                    <span className="text-blue-600">Account #:</span>
                    <p className="font-bold text-blue-900 text-sm">{BANK_INFO.accountNumber}</p>
                  </div>
                  {method === "QR_PAYMENT" && (
                    <div className="col-span-2">
                      <span className="text-blue-600">PromptPay:</span>
                      <p className="font-bold text-blue-900 text-base">{BANK_INFO.promptPay}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VISA / MASTER label */}
            {method === "CREDIT_CARD" && (
              <div className="flex gap-2">
                <span className="rounded border border-gray-300 px-3 py-1 text-xs font-bold text-blue-700">VISA</span>
                <span className="rounded border border-gray-300 px-3 py-1 text-xs font-bold text-red-600">MASTER</span>
                <span className="text-xs text-gray-400 self-center">Accepted</span>
              </div>
            )}

          </CardContent>
        </Card>

        {/* ── Payment Details ────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              {/* Amount */}
              <div className="space-y-1.5">
                <Label>Amount Received (THB) <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pr-10 text-right font-medium"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">THB</span>
                </div>

                {selectedInvoice && paymentAmount > 0 && (
                  <div
                    className={`rounded text-xs px-2 py-1 ${
                      isFullPayment
                        ? "bg-green-100 text-green-700"
                        : isPartial
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {isFullPayment
                      ? "Full payment — invoice will be marked PAID"
                      : isPartial
                      ? `Partial — ${formatTHB(remainingAfter)} still outstanding`
                      : ""}
                  </div>
                )}
              </div>

              {/* Payment Date */}
              <div className="space-y-1.5">
                <Label>Payment Date <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>

              {/* Reference Number */}
              <div className="space-y-1.5">
                <Label>Reference / Slip No. <span className="text-red-500">*</span></Label>
                <Input
                  value={referenceNumber}
                  onChange={(e) => setRefNum(e.target.value)}
                  placeholder="e.g. BBL-20260520-001"
                  required
                />
                <p className="text-xs text-gray-400">Bank ref, QR ref, or card approval code</p>
              </div>
            </div>

            {/* Bank From (for transfers) */}
            {method === "BANK_TRANSFER" && (
              <div className="space-y-1.5">
                <Label>From Bank / Account (Customer)</Label>
                <Input
                  value={bankFrom}
                  onChange={(e) => setBankFrom(e.target.value)}
                  placeholder="e.g. Kasikorn Bank — 0xx-x-xxxxx-x"
                />
              </div>
            )}

            {/* Card last 4 */}
            {method === "CREDIT_CARD" && (
              <div className="space-y-1.5 max-w-xs">
                <Label>Card Last 4 Digits</Label>
                <Input
                  value={cardLast4}
                  onChange={(e) => setCardLast4(e.target.value.slice(0, 4))}
                  placeholder="xxxx"
                  maxLength={4}
                />
              </div>
            )}

            {/* Note */}
            <div className="space-y-1.5">
              <Label>Note</Label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Additional notes about this payment…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            {/* Slip upload */}
            <div className="space-y-1.5">
              <Label>Payment Slip / Proof</Label>
              <div
                className="rounded-lg border-2 border-dashed border-gray-300 p-5 text-center cursor-pointer hover:border-teal-400 transition-colors"
                onClick={() => document.getElementById("slip-upload")?.click()}
              >
                {slipFile ? (
                  <p className="text-sm text-teal-700 font-medium">📎 {slipFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">Click to upload payment slip</p>
                    <p className="text-xs text-gray-400 mt-1">JPEG, PNG, PDF — max 5 MB</p>
                  </>
                )}
                <input
                  id="slip-upload"
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => setSlipFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

          </CardContent>
        </Card>

        {/* ── Payment summary ────────────────────────────────────────────── */}
        {selectedInvoice && paymentAmount > 0 && (
          <Card
            className={`border-2 ${
              isFullPayment ? "border-green-300 bg-green-50/30" : "border-amber-200 bg-amber-50/20"
            }`}
          >
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-600">
                    Recording payment of{" "}
                    <span className="font-bold text-gray-900">{formatTHB(paymentAmount)}</span>
                    {" "}against{" "}
                    <span className="font-semibold">{selectedInvoice.invoice_number}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Via {PAYMENT_METHODS.find((m) => m.value === method)?.label} · {paymentDate}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Remaining after</p>
                  <p
                    className={`text-lg font-bold ${
                      remainingAfter <= 0 ? "text-green-700" : "text-amber-700"
                    }`}
                  >
                    {formatTHB(Math.max(0, remainingAfter))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pb-8">
          <Link href="/payments">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button
            type="submit"
            disabled={!isValid || saving}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Recording…" : "Confirm Payment"}
          </Button>
        </div>

      </form>
    </div>
  )
}
