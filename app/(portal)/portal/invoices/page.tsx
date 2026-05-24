"use client"
import React, { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Download, Upload, CheckCircle2, Clock, AlertTriangle, Loader2, Receipt } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDate, formatTHB } from "@/lib/utils"
import type { Invoice } from "@/lib/supabase"

// ── Company bank info ────────────────────────────────────────────────────────
const BANK_INFO = {
  bankName:      "ธนาคารกรุงเทพ (Bangkok Bank / BBL)",
  accountName:   "บริษัท ปาล์มบีช สมุย แอสเสท จำกัด",
  accountNumber: "691-300825-3",
  branch:        "เซนทรัล หาดเฉวง",
  promptPay:     "082-878-9149",
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT:          { label: "Draft",       color: "bg-gray-100 text-gray-500",    icon: Clock         },
  ISSUED:         { label: "Outstanding", color: "bg-amber-100 text-amber-700",  icon: Clock         },
  PARTIALLY_PAID: { label: "Partial",     color: "bg-blue-100 text-blue-700",    icon: Clock         },
  PAID:           { label: "Paid",        color: "bg-green-100 text-green-700",  icon: CheckCircle2  },
  OVERDUE:        { label: "Overdue",     color: "bg-red-100 text-red-700",      icon: AlertTriangle },
  CANCELLED:      { label: "Cancelled",   color: "bg-gray-100 text-gray-400",    icon: AlertTriangle },
}

export default function PortalInvoicesPage() {
  const [invoices, setInvoices]   = useState<Invoice[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [expandedId, setExpanded] = useState<string | null>(null)
  const [slipFiles, setSlipFiles] = useState<Record<string, File>>({})

  useEffect(() => {
    async function load() {
      try {
        // Get portal session
        const sessionRes = await fetch("/api/portal/session")
        const sessionData = await sessionRes.json()
        const cid: string | null = sessionData?.customerId ?? null
        // If no customer linked, show message
        if (!cid) {
          setError("No customer portal account linked to your login.")
          setLoading(false)
          return
        }
        const r = await fetch(`/api/db/invoices?customer_id=${cid}`)
        const data = await r.json()
        if (Array.isArray(data)) {
          setInvoices(data)
          // Auto-expand first unpaid invoice
          const firstUnpaid = data.find((i: Invoice) => i.status !== "PAID" && i.status !== "CANCELLED")
          if (firstUnpaid) setExpanded(firstUnpaid.id)
        } else {
          setError(data.error ?? "Failed to load invoices")
        }
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const totalOutstanding = invoices
    .filter((i) => i.status !== "PAID" && i.status !== "CANCELLED")
    .reduce((s, i) => s + (i.outstanding_balance ?? 0), 0)

  function handleSlipUpload(invoiceId: string, file: File) {
    setSlipFiles((prev) => ({ ...prev, [invoiceId]: file }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Invoices</h1>
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <p className="text-sm text-gray-500">
              Outstanding balance: <span className="font-bold text-amber-700">{formatTHB(totalOutstanding)}</span>
            </p>
          )}
        </div>
        <Link href="/portal">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </Link>
      </div>

      {/* Bank payment info */}
      <Card className="border-blue-200 bg-blue-50/40">
        <CardContent className="py-4 px-5">
          <p className="text-sm font-bold text-blue-800 mb-2">Payment Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs text-blue-700">
            <div><span className="text-blue-500">Bank:</span> {BANK_INFO.bankName}</div>
            <div><span className="text-blue-500">Branch:</span> {BANK_INFO.branch}</div>
            <div><span className="text-blue-500">Account Name:</span> {BANK_INFO.accountName}</div>
            <div><span className="text-blue-500 font-bold">Account #:</span> <span className="font-bold text-blue-900 text-sm">{BANK_INFO.accountNumber}</span></div>
            <div className="col-span-2"><span className="text-blue-500">PromptPay:</span> <span className="font-bold text-blue-900 text-base">{BANK_INFO.promptPay}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading your invoices…</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load invoices: {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && invoices.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Receipt className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No invoices yet</p>
            <p className="text-sm text-gray-400 mt-1">Your invoices will appear here</p>
          </CardContent>
        </Card>
      )}

      {/* Invoice list */}
      {!loading && !error && invoices.length > 0 && (
        <div className="space-y-4">
          {invoices.map((inv) => {
            const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG["ISSUED"]
            const StatusIcon = cfg.icon
            const isExpanded = expandedId === inv.id
            const outstanding = inv.outstanding_balance ?? 0

            return (
              <Card key={inv.id} className={isExpanded ? "border-teal-200" : ""}>
                {/* Header row */}
                <CardHeader
                  className="pb-3 cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : inv.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" /> {cfg.label}
                        </span>
                        <span className="text-xs font-mono text-gray-500">{inv.invoice_number}</span>
                      </div>
                      <p className="font-semibold text-gray-900 mt-1">
                        {inv.boat_name ? `${inv.boat_name}` : inv.customer_name ?? "Invoice"}
                      </p>
                      <p className="text-xs text-gray-400">
                        Issued: {formatDate(inv.invoice_date)} · Due: {inv.due_date ? formatDate(inv.due_date) : "—"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-gray-900">{formatTHB(inv.total_amount)}</p>
                      {outstanding > 0 && (
                        <p className="text-xs font-medium text-amber-700">
                          Outstanding: {formatTHB(outstanding)}
                        </p>
                      )}
                      {inv.status === "PAID" && (
                        <p className="text-xs text-green-600 flex items-center justify-end gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Paid in full
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded: summary + payment section */}
                {isExpanded && (
                  <CardContent className="border-t border-gray-100 pt-4 space-y-4">

                    {/* Financial summary */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <tfoot className="border-t border-gray-200">
                          <tr>
                            <td className="pt-2 text-right text-sm text-gray-500 w-full">Subtotal</td>
                            <td className="pt-2 text-right text-sm whitespace-nowrap pl-8">{formatTHB(inv.subtotal)}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-right text-sm text-gray-500">VAT 7%</td>
                            <td className="py-0.5 text-right text-sm whitespace-nowrap pl-8">{formatTHB(inv.vat_amount)}</td>
                          </tr>
                          <tr>
                            <td className="pt-1 text-right font-bold text-gray-900">Total</td>
                            <td className="pt-1 text-right font-bold text-teal-700 whitespace-nowrap pl-8">{formatTHB(inv.total_amount)}</td>
                          </tr>
                          {inv.paid_amount > 0 && (
                            <tr>
                              <td className="py-0.5 text-right text-sm text-green-600">Paid</td>
                              <td className="py-0.5 text-right text-sm text-green-600 whitespace-nowrap pl-8">−{formatTHB(inv.paid_amount)}</td>
                            </tr>
                          )}
                          {outstanding > 0 && (
                            <tr>
                              <td className="pt-1 text-right font-bold text-amber-700">Outstanding</td>
                              <td className="pt-1 text-right font-bold text-amber-700 whitespace-nowrap pl-8">{formatTHB(outstanding)}</td>
                            </tr>
                          )}
                        </tfoot>
                      </table>
                    </div>

                    {/* Notes */}
                    {inv.notes && (
                      <p className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-3">{inv.notes}</p>
                    )}

                    {/* Payment section */}
                    {inv.status !== "PAID" && inv.status !== "CANCELLED" && (
                      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-3">
                        <p className="text-sm font-semibold text-amber-800">
                          Upload Payment Slip / Proof of Transfer
                        </p>
                        <div
                          className="rounded-lg border-2 border-dashed border-amber-300 p-4 text-center cursor-pointer hover:bg-amber-100/40 transition-colors"
                          onClick={() => document.getElementById(`slip-${inv.id}`)?.click()}
                        >
                          {slipFiles[inv.id] ? (
                            <p className="text-sm text-teal-700 font-medium">📎 {slipFiles[inv.id].name}</p>
                          ) : (
                            <>
                              <Upload className="h-6 w-6 text-amber-400 mx-auto mb-1" />
                              <p className="text-sm text-amber-700">Click to upload slip</p>
                              <p className="text-xs text-amber-500">JPEG, PNG, PDF — max 5MB</p>
                            </>
                          )}
                          <input
                            id={`slip-${inv.id}`}
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleSlipUpload(inv.id, e.target.files[0])}
                          />
                        </div>
                        {slipFiles[inv.id] && (
                          <button className="w-full rounded-md bg-teal-600 text-white text-sm font-medium py-2.5 hover:bg-teal-700 transition-colors">
                            Submit Payment Slip
                          </button>
                        )}
                      </div>
                    )}

                    {/* Download */}
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <Download className="h-3.5 w-3.5" /> Download PDF
                      </Button>
                    </div>

                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
