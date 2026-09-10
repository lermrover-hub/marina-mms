"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Truck, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"

interface Supplier {
  id: string; code?: string; name: string; contact_name?: string
  phone?: string; email?: string; payment_terms?: string; status: string
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search,    setSearch]    = useState("")
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    fetch("/api/db/suppliers")
      .then(r => r.ok ? r.json() : [])
      .then(d => { setSuppliers(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setSuppliers([]); setLoading(false) })
  }, [])

  const visible = suppliers.filter(s => {
    const q = search.toLowerCase()
    return !q || s.name.toLowerCase().includes(q) || (s.code ?? "").toLowerCase().includes(q) || (s.contact_name ?? "").toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Parts, materials, and service suppliers"
        actions={
          <Button size="sm" className="gap-2" asChild>
            <Link href="/suppliers/new"><Plus className="h-4 w-4" />Add Supplier</Link>
          </Button>
        }
      />

      <Card><CardContent className="p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search suppliers…"
            className="pl-9 pr-4 py-1.5 border rounded-md text-sm w-full"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </CardContent></Card>

      <Card>
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No suppliers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier Name</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Terms</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{s.code ?? "—"}</td>
                    <td className="px-5 py-3">
                      <Link href={`/suppliers/${s.id}`} className="font-medium text-teal-700 hover:underline">{s.name}</Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {s.contact_name && <div>{s.contact_name}</div>}
                      {s.phone && <div className="text-xs text-gray-400">{s.phone}</div>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{s.payment_terms ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
