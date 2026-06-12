"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw, Package } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatTHB } from "@/lib/utils"

interface MaterialRow {
  id: string; item_name: string; description?: string; quantity: number; unit?: string
  unit_cost: number; total_cost: number; charge_to_customer: boolean
  work_order_id?: string; supplier?: string; created_at: string
  mms_work_orders?: { reference?: string; title?: string; customer_name?: string }
}

export default function InventoryUsagePage() {
  const [materials, setMaterials] = useState<MaterialRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState("")

  function load() {
    setLoading(true)
    fetch("/api/db/reports/inventory-usage")
      .then(r => r.ok ? r.json() : [])
      .then(d => { setMaterials(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setMaterials([]); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const visible = materials.filter(m => {
    const q = search.toLowerCase()
    return !q || m.item_name.toLowerCase().includes(q) || (m.supplier ?? "").toLowerCase().includes(q)
  })

  const totalCost   = visible.reduce((s, m) => s + (Number(m.total_cost) || 0), 0)
  const chargeTotal = visible.filter(m => m.charge_to_customer).reduce((s, m) => s + (Number(m.total_cost) || 0), 0)

  // Group by item name for top-usage summary
  const byItem = Object.entries(
    visible.reduce((acc, m) => {
      const k = m.item_name
      if (!acc[k]) acc[k] = { name: k, qty: 0, cost: 0 }
      acc[k].qty  += Number(m.quantity) || 0
      acc[k].cost += Number(m.total_cost) || 0
      return acc
    }, {} as Record<string, { name: string; qty: number; cost: number }>)
  ).sort((a, b) => b[1].cost - a[1].cost).slice(0, 10)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Usage by Work Order"
        description="Material costs issued to repair jobs"
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild><Link href="/reports"><ArrowLeft className="h-4 w-4 mr-1" />Reports</Link></Button>
            <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        }
      />

      {loading ? <div className="p-12 text-center text-sm text-gray-400">Loading…</div> : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total Issues</p>
              <p className="text-2xl font-bold mt-1">{visible.length}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total Material Cost</p>
              <p className="text-2xl font-bold mt-1">{formatTHB(totalCost)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Charged to Customer</p>
              <p className="text-2xl font-bold mt-1 text-teal-700">{formatTHB(chargeTotal)}</p>
            </CardContent></Card>
          </div>

          {/* Top items */}
          {byItem.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Top 10 Items by Cost</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {byItem.map(([, item]) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="text-sm truncate flex-1">{item.name}</span>
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full"
                          style={{ width: `${totalCost > 0 ? (item.cost/totalCost)*100 : 0}%` }} />
                      </div>
                      <span className="text-xs font-mono text-gray-600 w-24 text-right">{formatTHB(item.cost)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search + table */}
          <Card><CardContent className="p-4">
            <input type="text" placeholder="Search item name or supplier…"
              className="border rounded-md px-3 py-1.5 text-sm w-full max-w-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              value={search} onChange={e => setSearch(e.target.value)} />
          </CardContent></Card>

          <Card>
            {visible.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No material usage records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Item</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Work Order</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Qty</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Unit Cost</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Charged?</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {visible.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <div className="font-medium">{m.item_name}</div>
                          {m.description && <div className="text-xs text-gray-400">{m.description}</div>}
                        </td>
                        <td className="px-5 py-3">
                          {m.work_order_id ? (
                            <Link href={`/work-orders/${m.work_order_id}`} className="text-xs font-mono text-teal-700 hover:underline">
                              {m.mms_work_orders?.reference ?? m.work_order_id.slice(0, 8) + "…"}
                            </Link>
                          ) : "—"}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500">{m.supplier ?? "—"}</td>
                        <td className="px-5 py-3 text-center">{m.quantity} {m.unit ?? ""}</td>
                        <td className="px-5 py-3 text-right font-mono">{formatTHB(m.unit_cost)}</td>
                        <td className="px-5 py-3 text-right font-mono font-medium">{formatTHB(m.total_cost)}</td>
                        <td className="px-5 py-3 text-center text-xs">
                          {m.charge_to_customer
                            ? <span className="text-green-600">✓ Yes</span>
                            : <span className="text-gray-400">No</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 bg-gray-50">
                    <tr>
                      <td colSpan={5} className="px-5 py-3 text-sm font-bold">Total</td>
                      <td className="px-5 py-3 text-right font-mono font-bold">{formatTHB(totalCost)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
