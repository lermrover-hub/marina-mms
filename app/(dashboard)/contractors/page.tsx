"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, HardHat, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"

const SPECIALTY_LABELS: Record<string, string> = {
  fiberglass:    "Fiberglass",
  painting:      "Painting",
  mechanic:      "Mechanic",
  electrical:    "Electrical",
  interior:      "Interior",
  canvas:        "Canvas",
  stainless_work:"Stainless/Metal",
  other:         "Other",
}

const STATUS_STYLE: Record<string, string> = {
  active:   "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-500",
}

interface Contractor {
  id: string
  name: string
  company_name?: string
  specialty?: string
  phone?: string
  email?: string
  rate_type?: string
  daily_rate?: number
  status: string
  notes?: string
}

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [filter,      setFilter]      = useState("All")
  const [search,      setSearch]      = useState("")
  const [loading,     setLoading]     = useState(true)

  const FILTERS = ["All", "active", "inactive"]

  useEffect(() => {
    fetch("/api/db/contractors")
      .then(r => r.ok ? r.json() : [])
      .then(d => { setContractors(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setContractors([]); setLoading(false) })
  }, [])

  const visible = contractors.filter(c => {
    const matchStatus = filter === "All" || c.status === filter
    const q = search.toLowerCase()
    const matchSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      (c.company_name ?? "").toLowerCase().includes(q) ||
      (c.specialty ?? "").toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contractors"
        description="Manage subcontractors for boat yard repairs"
        actions={
          <Button size="sm" className="gap-2" asChild>
            <Link href="/contractors/new"><Plus className="h-4 w-4" />Add Contractor</Link>
          </Button>
        }
      />

      <Card><CardContent className="p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text" placeholder="Search name, company, specialty…"
            className="pl-9 pr-4 py-1.5 border rounded-md text-sm w-full"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === f ? "bg-navy-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {f === "All" ? "All Status" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </CardContent></Card>

      <Card>
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <HardHat className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No contractors found</p>
            <p className="text-xs text-gray-400 mt-1">Add your first subcontractor to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name / Company</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Specialty</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Daily Rate</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/contractors/${c.id}`} className="font-medium text-teal-700 hover:underline">
                        {c.name}
                      </Link>
                      {c.company_name && <p className="text-xs text-gray-400">{c.company_name}</p>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {c.specialty ? SPECIALTY_LABELS[c.specialty] ?? c.specialty : "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {c.phone && <div>{c.phone}</div>}
                      {c.email && <div className="text-xs text-gray-400">{c.email}</div>}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-700">
                      {c.daily_rate ? `฿${Number(c.daily_rate).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[c.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {c.status}
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
