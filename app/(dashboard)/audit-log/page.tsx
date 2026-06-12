"use client"
import React, { useState, useEffect } from "react"
import { Shield, Search, RefreshCw } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const ACTION_STYLE: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  APPROVE:"bg-purple-100 text-purple-700",
  CANCEL: "bg-orange-100 text-orange-700",
  PAYMENT:"bg-teal-100 text-teal-700",
}

interface AuditEntry {
  id: string; action: string; entity_type?: string; entity_id?: string; entity_ref?: string
  user_name?: string; user_role?: string; notes?: string; created_at: string
}

export default function AuditLogPage() {
  const [entries,    setEntries]    = useState<AuditEntry[]>([])
  const [search,     setSearch]     = useState("")
  const [filterType, setFilterType] = useState("")
  const [loading,    setLoading]    = useState(true)

  function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterType) params.set("entity_type", filterType)
    fetch(`/api/db/audit-log${params.toString() ? "?" + params : ""}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setEntries(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setEntries([]); setLoading(false) })
  }

  useEffect(() => { load() }, [filterType]) // eslint-disable-line react-hooks/exhaustive-deps

  const ENTITY_TYPES = ["quotation", "invoice", "payment", "work_order", "boat", "user"]

  const visible = entries.filter(e => {
    const q = search.toLowerCase()
    return !q || (e.entity_ref ?? "").toLowerCase().includes(q) || (e.user_name ?? "").toLowerCase().includes(q) || (e.action ?? "").toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Security and activity log for sensitive operations"
        actions={<Button size="sm" variant="outline" className="gap-2" onClick={load}><RefreshCw className="h-4 w-4" />Refresh</Button>}
      />

      <Card><CardContent className="p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search action, entity, user…"
            className="pl-9 pr-4 py-1.5 border rounded-md text-sm w-full"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border rounded-md px-3 py-1.5 text-sm"
          value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Entity Types</option>
          {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </CardContent></Card>

      <Card>
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No audit entries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Entity</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reference</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_STYLE[e.action] ?? "bg-gray-100 text-gray-600"}`}>
                        {e.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 font-mono">{e.entity_type ?? "—"}</td>
                    <td className="px-5 py-3 text-xs font-mono">{e.entity_ref ?? (e.entity_id ? e.entity_id.slice(0, 8) + "…" : "—")}</td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-gray-700">{e.user_name ?? "—"}</span>
                      {e.user_role && <span className="ml-1 text-xs text-gray-400">({e.user_role})</span>}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400 max-w-xs truncate">{e.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-5 py-3 text-xs text-gray-400 border-t">Showing {visible.length} most recent entries (max 300)</p>
          </div>
        )}
      </Card>
    </div>
  )
}
