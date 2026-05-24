"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { formatTHB } from "@/lib/utils"

const STATUS_STYLE: Record<string, string> = {
  PENDING:  "bg-amber-100 text-amber-700",
  APPROVED: "bg-blue-100 text-blue-700",
  ORDERED:  "bg-purple-100 text-purple-700",
  RECEIVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
}

interface PurchaseRequest {
  id: string
  pr_number: string
  requested_by: string
  date: string
  supplier: string
  items: number
  total: number
  status: string
  notes?: string
}

export default function PurchaseRequestsPage() {
  const [prs,    setPrs]   = useState<PurchaseRequest[]>([])
  const [filter, setFilter] = useState("All")
  const FILTERS = ["All", "PENDING", "APPROVED", "ORDERED", "RECEIVED"]

  // No mms_purchase_requests table yet — will show empty state
  useEffect(() => {
    fetch("/api/db/purchase-requests")
      .then(r => r.ok ? r.json() : [])
      .then(d => setPrs(Array.isArray(d) ? d : []))
      .catch(() => setPrs([]))
  }, [])

  const filtered = prs.filter((pr) => filter === "All" || pr.status === filter)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Requests"
        description="Manage stock reorders and supplier orders"
        actions={
          <Button size="sm" className="gap-2" asChild>
            <Link href="/purchase-requests/new"><Plus className="h-4 w-4" />New PR</Link>
          </Button>
        }
      />

      <Card><CardContent className="p-4">
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === f ? "bg-navy-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {f === "All" ? "All Status" : f}
            </button>
          ))}
        </div>
      </CardContent></Card>

      <Card><div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">PR Number</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Requested By</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="py-16 text-center">
                <ClipboardList className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No purchase requests found.</p>
              </td></tr>
            ) : filtered.map((pr) => (
              <tr key={pr.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-xs font-semibold text-teal-700">{pr.pr_number}</td>
                <td className="px-5 py-3 text-gray-700">{pr.requested_by}</td>
                <td className="px-5 py-3 text-gray-500 text-xs">{pr.date}</td>
                <td className="px-5 py-3 text-gray-700">{pr.supplier}</td>
                <td className="px-5 py-3 text-center text-gray-700">{pr.items}</td>
                <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatTHB(pr.total)}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[pr.status] ?? "bg-gray-100 text-gray-600"}`}>{pr.status}</span>
                </td>
                <td className="px-5 py-3 text-xs text-gray-500">{pr.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></Card>
    </div>
  )
}
