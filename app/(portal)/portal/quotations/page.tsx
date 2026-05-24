"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowLeft, FileText, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, Loader2, AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDate, formatTHB } from "@/lib/utils"

type QuotationItem = {
  id: string; description: string; qty: number; unit: string | null
  unit_price: number; discount_pct: number; taxable: boolean; line_total: number
}
type Quotation = {
  id: string; quotation_number: string; title: string | null
  customer_name: string | null; boat_name: string | null
  issue_date: string | null; valid_until: string | null; status: string
  subtotal: number | null; discount: number | null
  vat_amount: number | null; total_amount: number | null
  deposit_required: number | null; notes: string | null
  mms_quotation_items?: QuotationItem[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT:            { label: "Draft",       color: "bg-gray-100 text-gray-600",    icon: Clock },
  PENDING_APPROVAL: { label: "Pending",     color: "bg-yellow-100 text-yellow-700",icon: Clock },
  SENT:             { label: "Awaiting Approval", color: "bg-blue-100 text-blue-700", icon: Clock },
  ACCEPTED:         { label: "Accepted",    color: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  REJECTED:         { label: "Rejected",    color: "bg-red-100 text-red-700",      icon: XCircle },
  EXPIRED:          { label: "Expired",     color: "bg-gray-100 text-gray-500",    icon: XCircle },
  CONVERTED:        { label: "Converted",   color: "bg-teal-100 text-teal-700",    icon: CheckCircle2 },
  CANCELLED:        { label: "Cancelled",   color: "bg-red-100 text-red-600",      icon: XCircle },
}

export default function PortalQuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [expandedId, setExpanded]   = useState<string | null>(null)
  const [approving,  setApproving]  = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/db/quotations")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setQuotations(d); else setError(d?.error ?? "Failed") })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false))
  }, [])

  async function handleApprove(id: string, action: "ACCEPTED" | "REJECTED") {
    setApproving(id + action)
    try {
      const res = await fetch(`/api/db/quotations/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      })
      if (res.ok) {
        const data = await res.json()
        setQuotations(prev => prev.map(q => q.id === id ? { ...q, ...data } : q))
      }
    } catch { /* ignore */ }
    finally { setApproving(null) }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Quotations</h1>
            <p className="text-sm text-gray-500">Review and approve service quotations</p>
          </div>
          <Link href="/portal">
            <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading quotations…
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-600 py-10 justify-center text-sm">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        ) : quotations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-gray-400">
              <FileText className="h-10 w-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium">No quotations yet</p>
              <p className="text-xs mt-1">Quotations from Ocean Rover Marina will appear here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {quotations.map(q => {
              const cfg        = STATUS_CONFIG[q.status] ?? STATUS_CONFIG["DRAFT"]
              const StatusIcon = cfg.icon
              const isExpanded = expandedId === q.id
              const canApprove = q.status === "SENT"

              return (
                <Card key={q.id} className={isExpanded ? "border-teal-200" : ""}>
                  <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : q.id)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                            <StatusIcon className="h-3 w-3" /> {cfg.label}
                          </span>
                          <span className="text-xs font-mono text-gray-500">{q.quotation_number}</span>
                        </div>
                        <p className="font-semibold text-gray-900 mt-1">{q.title ?? q.quotation_number}</p>
                        <p className="text-xs text-gray-400">
                          {q.boat_name && `${q.boat_name} · `}
                          {q.issue_date && `Issued: ${formatDate(q.issue_date)}`}
                          {q.valid_until && ` · Valid until: ${formatDate(q.valid_until)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">{formatTHB(q.total_amount ?? 0)}</p>
                          {q.deposit_required != null && (
                            <p className="text-xs text-gray-400">Deposit: {formatTHB(q.deposit_required)}</p>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="border-t border-gray-100 pt-4 space-y-5">
                      {/* Line items */}
                      {q.mms_quotation_items && q.mms_quotation_items.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Line Items</p>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-gray-400 border-b">
                                <th className="text-left py-1.5">Description</th>
                                <th className="text-right py-1.5">Qty</th>
                                <th className="text-right py-1.5">Unit Price</th>
                                <th className="text-right py-1.5">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {q.mms_quotation_items.map((item) => (
                                <tr key={item.id} className="border-b border-gray-50">
                                  <td className="py-1.5 text-gray-800">{item.description}</td>
                                  <td className="py-1.5 text-right text-gray-600">{item.qty} {item.unit}</td>
                                  <td className="py-1.5 text-right text-gray-600">{formatTHB(item.unit_price)}</td>
                                  <td className="py-1.5 text-right font-medium">{formatTHB(item.line_total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Totals */}
                      <div className="rounded-lg bg-gray-50 p-3 space-y-1 text-sm">
                        {q.subtotal != null && (
                          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatTHB(q.subtotal)}</span></div>
                        )}
                        {(q.discount ?? 0) > 0 && (
                          <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatTHB(q.discount ?? 0)}</span></div>
                        )}
                        {q.vat_amount != null && (
                          <div className="flex justify-between text-gray-500"><span>VAT (7%)</span><span>{formatTHB(q.vat_amount)}</span></div>
                        )}
                        <div className="flex justify-between font-bold text-base border-t pt-1">
                          <span>Total</span><span>{formatTHB(q.total_amount ?? 0)}</span>
                        </div>
                      </div>

                      {q.notes && (
                        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                          <span className="font-medium">Note: </span>{q.notes}
                        </div>
                      )}

                      {/* Approval buttons */}
                      {canApprove && (
                        <div className="flex gap-3 pt-1">
                          <Button className="flex-1 gap-2 bg-teal-600 hover:bg-teal-700 text-white"
                            disabled={!!approving}
                            onClick={() => handleApprove(q.id, "ACCEPTED")}>
                            {approving === q.id + "ACCEPTED" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Accept Quotation
                          </Button>
                          <Button variant="outline" className="flex-1 gap-2 text-red-600 border-red-200 hover:bg-red-50"
                            disabled={!!approving}
                            onClick={() => handleApprove(q.id, "REJECTED")}>
                            {approving === q.id + "REJECTED" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                            Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
