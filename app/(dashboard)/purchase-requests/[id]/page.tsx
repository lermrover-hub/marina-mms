"use client"
import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft, CheckCircle2, XCircle, ShoppingCart, Package,
  Clock, Building2, FileText, Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, formatTHB } from "@/lib/utils"

// ── types ──────────────────────────────────────────────────────────────────────
type PRItem = {
  id: string
  item_name: string
  qty: number
  unit: string | null
  estimated_cost: number
  line_total: number
  sort_order: number | null
}

type PurchaseRequestDetail = {
  id: string
  pr_number: string
  requested_by: string | null
  department: string | null
  status: string
  priority: string
  needed_by: string | null
  supplier: string | null
  notes: string | null
  total_amount: number | null
  approved_by: string | null
  approved_at: string | null
  work_order_id: string | null
  created_at: string
  updated_at: string
  mms_purchase_request_items?: PRItem[]
}

// ── status / urgency config ────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT:    { label: "Draft",           color: "bg-gray-100 text-gray-600",   icon: FileText },
  PENDING:  { label: "Pending Approval",color: "bg-amber-100 text-amber-700", icon: Clock },
  APPROVED: { label: "Approved",        color: "bg-blue-100 text-blue-700",   icon: CheckCircle2 },
  REJECTED: { label: "Rejected",        color: "bg-red-100 text-red-700",     icon: XCircle },
  ORDERED:  { label: "Ordered",         color: "bg-purple-100 text-purple-700",icon: ShoppingCart },
  RECEIVED: { label: "Received",        color: "bg-green-100 text-green-700", icon: Package },
}

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  ROUTINE:  { label: "Routine",  color: "bg-gray-100 text-gray-600" },
  URGENT:   { label: "Urgent",   color: "bg-amber-100 text-amber-700" },
  CRITICAL: { label: "Critical", color: "bg-red-100 text-red-700" },
}

// ── component ──────────────────────────────────────────────────────────────────
export default function PurchaseRequestDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""

  const [pr, setPr]                     = useState<PurchaseRequestDetail | null>(null)
  const [loading, setLoading]           = useState(true)
  const [loadError, setLoadError]       = useState<string | null>(null)

  const [approving, setApproving]       = useState(false)
  const [rejecting, setRejecting]       = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [actionNote, setActionNote]     = useState("")
  const [actionError, setActionError]   = useState<string | null>(null)

  const loadPR = useCallback(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/db/purchase-requests/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject("not found"))
      .then(d => {
        if (d?.error) setLoadError(d.error)
        else setPr(d)
      })
      .catch(() => setLoadError("Purchase Request not found"))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { loadPR() }, [loadPR])

  async function patchStatus(newStatus: string, extra: Record<string, string> = {}) {
    const res = await fetch(`/api/db/purchase-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, ...extra }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error ?? "Update failed")
    return data
  }

  async function handleApprove() {
    setApproving(true)
    setActionError(null)
    try {
      const updated = await patchStatus("APPROVED", {
        approved_by: "Manager",
        approved_at: new Date().toISOString(),
        ...(actionNote.trim() ? { notes: actionNote.trim() } : {}),
      })
      setPr((prev) => prev ? { ...prev, ...updated } : updated)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e))
    } finally {
      setApproving(false)
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return
    setRejecting(true)
    setActionError(null)
    try {
      const updated = await patchStatus("REJECTED", {
        notes: rejectReason.trim(),
      })
      setPr((prev) => prev ? { ...prev, ...updated } : updated)
      setShowRejectForm(false)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e))
    } finally {
      setRejecting(false)
    }
  }

  async function handleMarkOrdered() {
    setActionError(null)
    try {
      const updated = await patchStatus("ORDERED")
      setPr((prev) => prev ? { ...prev, ...updated } : updated)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e))
    }
  }

  async function handleMarkReceived() {
    setActionError(null)
    try {
      const updated = await patchStatus("RECEIVED")
      setPr((prev) => prev ? { ...prev, ...updated } : updated)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e))
    }
  }

  // ── loading / error states ─────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-32 gap-2 text-gray-400">
      <Loader2 className="h-6 w-6 animate-spin" /> Loading…
    </div>
  )

  if (loadError || !pr) return (
    <div className="flex flex-col items-center justify-center py-32 text-center space-y-2">
      <FileText className="h-10 w-10 text-gray-200" />
      <p className="text-gray-500">{loadError ?? "Purchase Request not found"}</p>
      <Link href="/purchase-requests" className="text-sm text-teal-600 hover:underline">← Back to list</Link>
    </div>
  )

  const items = pr.mms_purchase_request_items ?? []
  const subtotal = items.reduce((s, i) => s + (i.line_total ?? i.qty * i.estimated_cost), 0)
  const vat       = subtotal * 0.07
  const grandTotal = subtotal + vat

  const statusCfg  = STATUS_CONFIG[pr.status] ?? STATUS_CONFIG.DRAFT
  const urgencyCfg = URGENCY_CONFIG[pr.priority] ?? URGENCY_CONFIG.ROUTINE
  const StatusIcon = statusCfg.icon

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={pr.pr_number}
        description={`Purchase Request · ${pr.department ?? "—"} · ${items.length} item${items.length !== 1 ? "s" : ""}`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/purchase-requests">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Link>
          </Button>
        }
      />

      {/* Status Banner */}
      <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${statusCfg.color}`}>
        <StatusIcon className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">{statusCfg.label}</p>
          {pr.status === "APPROVED" && (
            <p className="text-xs opacity-80">
              Approved by {pr.approved_by ?? "Manager"}
              {pr.approved_at ? ` · ${formatDate(pr.approved_at)}` : ""}
            </p>
          )}
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Items table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Requested Items</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {items.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No items on this purchase request.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                      <th className="text-left py-2 pr-3">#</th>
                      <th className="text-left py-2 pr-3">Description</th>
                      <th className="text-center py-2 pr-3">Unit</th>
                      <th className="text-center py-2 pr-3">Qty</th>
                      <th className="text-right py-2 pr-3">Unit Cost</th>
                      <th className="text-right py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items
                      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                      .map((item, idx) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="py-2.5 pr-3 text-xs text-gray-400">{idx + 1}</td>
                          <td className="py-2.5 pr-3 font-medium text-gray-900">{item.item_name}</td>
                          <td className="py-2.5 pr-3 text-center text-gray-600">{item.unit ?? "—"}</td>
                          <td className="py-2.5 pr-3 text-center font-medium">{item.qty}</td>
                          <td className="py-2.5 pr-3 text-right">{formatTHB(item.estimated_cost)}</td>
                          <td className="py-2.5 text-right font-semibold">
                            {formatTHB(item.line_total ?? item.qty * item.estimated_cost)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200">
                      <td colSpan={5} className="pt-3 text-right text-sm text-gray-500">Subtotal</td>
                      <td className="pt-3 text-right font-medium">{formatTHB(subtotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="py-1 text-right text-sm text-gray-500">VAT 7%</td>
                      <td className="py-1 text-right">{formatTHB(vat)}</td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="pt-1 text-right text-sm font-bold text-gray-900">Grand Total</td>
                      <td className="pt-1 text-right text-base font-bold text-teal-700">{formatTHB(grandTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {pr.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" /> Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{pr.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Approve / Reject — only for DRAFT or PENDING */}
          {(pr.status === "DRAFT" || pr.status === "PENDING") && (
            <Card className="border-amber-200 bg-amber-50/40">
              <CardHeader>
                <CardTitle className="text-base text-amber-800">Approval Required</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Approval Note (optional)</label>
                  <textarea
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    rows={2}
                    placeholder="Add a note before approving or rejecting…"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleApprove} disabled={approving} className="bg-teal-600 hover:bg-teal-700 text-white">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {approving ? "Approving…" : "Approve PR"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowRejectForm((v) => !v)}
                    className="border-red-300 text-red-600 hover:bg-red-50">
                    <XCircle className="h-4 w-4 mr-2" /> Reject
                  </Button>
                </div>
                {showRejectForm && (
                  <div className="space-y-2 border-t border-red-200 pt-3">
                    <label className="text-sm font-medium text-red-700">Rejection Reason *</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                      placeholder="State the reason for rejection…"
                      className="w-full rounded-md border border-red-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                    />
                    <Button onClick={handleReject} disabled={rejecting || !rejectReason.trim()}
                      className="bg-red-600 hover:bg-red-700 text-white">
                      {rejecting ? "Rejecting…" : "Confirm Rejection"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Mark Ordered — only when APPROVED */}
          {pr.status === "APPROVED" && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="text-base text-blue-800">Next Action</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Button onClick={handleMarkOrdered} className="bg-purple-600 hover:bg-purple-700 text-white">
                  <ShoppingCart className="h-4 w-4 mr-2" /> Mark as Ordered
                </Button>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" /> Create Purchase Order
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Mark Received — only when ORDERED */}
          {pr.status === "ORDERED" && (
            <Card className="border-purple-200 bg-purple-50/30">
              <CardHeader>
                <CardTitle className="text-base text-purple-800">Next Action</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={handleMarkReceived} className="bg-green-600 hover:bg-green-700 text-white">
                  <Package className="h-4 w-4 mr-2" /> Mark as Received
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Activity timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" /> Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-5 space-y-4">
                <div className="absolute left-1.5 top-1 bottom-1 w-px bg-gray-200" />
                <div className="relative flex gap-3">
                  <div className="absolute -left-3.5 top-1 h-3 w-3 rounded-full border-2 border-teal-500 bg-white" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Purchase Request created</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(pr.created_at)} · {pr.requested_by ?? "—"}
                    </p>
                  </div>
                </div>
                {pr.status !== "DRAFT" && pr.status !== "PENDING" && (
                  <div className="relative flex gap-3">
                    <div className="absolute -left-3.5 top-1 h-3 w-3 rounded-full border-2 border-teal-500 bg-white" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        Status updated to {STATUS_CONFIG[pr.status]?.label ?? pr.status}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(pr.updated_at)}
                        {pr.approved_by ? ` · ${pr.approved_by}` : ""}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-600 uppercase tracking-wide">PR Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Requested by</p>
                <p className="font-medium">{pr.requested_by ?? "—"}</p>
                {pr.department && <p className="text-xs text-gray-400">{pr.department}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="font-medium">{formatDate(pr.created_at)}</p>
              </div>
              {pr.needed_by && (
                <div>
                  <p className="text-xs text-gray-500">Needed By</p>
                  <p className="font-medium text-amber-700">{formatDate(pr.needed_by)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Priority</p>
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${urgencyCfg.color}`}>
                  {urgencyCfg.label}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-500">Grand Total (incl. VAT 7%)</p>
                <p className="text-lg font-bold text-teal-700">{formatTHB(grandTotal)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Supplier */}
          {pr.supplier && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-gray-600 uppercase tracking-wide flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Supplier
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="font-semibold text-gray-900">{pr.supplier}</p>
              </CardContent>
            </Card>
          )}

          {/* Linked Work Order */}
          {pr.work_order_id && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-gray-600 uppercase tracking-wide">
                  Linked Work Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/work-orders/${pr.work_order_id}`}
                  className="text-sm font-medium text-teal-600 hover:underline flex items-center gap-1">
                  <FileText className="h-4 w-4" /> View Work Order
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Approval info */}
          {pr.status === "APPROVED" && pr.approved_by && (
            <Card className="border-green-200 bg-green-50/30">
              <CardHeader>
                <CardTitle className="text-sm text-green-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Approved
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><span className="text-gray-500">By:</span> {pr.approved_by}</p>
                {pr.approved_at && (
                  <p><span className="text-gray-500">At:</span> {formatDate(pr.approved_at)}</p>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  )
}
