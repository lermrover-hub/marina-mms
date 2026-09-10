"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { RefreshCw, Play, Eye, AlertCircle, CheckCircle2, ArrowLeft, CalendarDays } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatTHB } from "@/lib/utils"

const CYCLE_BADGE: Record<string, string> = {
  MONTHLY:   "bg-teal-100 text-teal-700",
  QUARTERLY: "bg-blue-100 text-blue-700",
  ANNUAL:    "bg-purple-100 text-purple-700",
  ONE_TIME:  "bg-gray-100 text-gray-600",
}

interface Contract {
  id: string; contract_number: string; contract_type: string
  customer_name?: string; boat_name?: string; berth_code?: string
  billing_cycle: string; rate_amount?: number; start_date: string; end_date?: string; status: string
}

interface DryRunResult {
  period: string; dry_run: boolean; writes_enabled: boolean
  generated: number; skipped: number
  invoices: { contract_number: string; customer_name: string; description: string; total_amount: number; due_date: string }[]
  skipped_detail: { contract_number: string; reason: string }[]
  warning?: string
}

export default function RecurringBillingPage() {
  const [contracts,  setContracts]  = useState<Contract[]>([])
  const [loading,    setLoading]    = useState(true)
  const [period,     setPeriod]     = useState(() => new Date().toISOString().slice(0, 7))
  const [result,     setResult]     = useState<DryRunResult | null>(null)
  const [running,    setRunning]    = useState(false)
  const [runError,   setRunError]   = useState("")
  const [mode,       setMode]       = useState<"dry_run" | "live">("dry_run")

  useEffect(() => {
    fetch("/api/db/contracts?status=ACTIVE")
      .then(r => r.ok ? r.json() : [])
      .then(d => { setContracts(Array.isArray(d) ? d : d?.data ?? []); setLoading(false) })
      .catch(() => { setContracts([]); setLoading(false) })
  }, [])

  async function runBilling(contractId?: string) {
    setRunning(true); setRunError(""); setResult(null)
    try {
      const params = new URLSearchParams({ period })
      if (mode === "dry_run") params.set("dry_run", "true")
      if (contractId) params.set("contract_id", contractId)

      const res = await fetch(`/api/billing/recurring?${params}`, { method: "POST" })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body)
      }
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setRunError(String(e))
    } finally {
      setRunning(false)
    }
  }

  const activeContracts = contracts.filter(c => c.status === "ACTIVE")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring Billing"
        description="Generate invoices from active marina contracts"
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/invoices"><ArrowLeft className="h-4 w-4 mr-1" />Invoices</Link>
          </Button>
        }
      />

      {/* Controls */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="h-4 w-4 text-teal-600" />Run Settings</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Billing Period (YYYY-MM)</label>
            <input type="month" className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              value={period} onChange={e => setPeriod(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mode</label>
            <div className="flex rounded-md border overflow-hidden">
              <button onClick={() => setMode("dry_run")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${mode === "dry_run" ? "bg-amber-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                <Eye className="h-3.5 w-3.5 inline mr-1.5" />Dry Run
              </button>
              <button onClick={() => setMode("live")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${mode === "live" ? "bg-teal-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                <Play className="h-3.5 w-3.5 inline mr-1.5" />Generate
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => runBilling()} disabled={running} className="gap-2"
              variant={mode === "live" ? "default" : "outline"}>
              {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : mode === "live" ? <Play className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {running ? "Running…" : mode === "dry_run" ? "Preview" : `Generate for ${period}`}
            </Button>
          </div>
        </CardContent>
        {mode === "live" && (
          <div className="mx-5 mb-4 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span><strong>Live mode:</strong> Actual invoices will be created and customers may be notified. Requires <code>ENABLE_AUTOMATION_WRITES=true</code> to be set.</span>
          </div>
        )}
      </Card>

      {runError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{runError}</div>
      )}

      {/* Run Result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              {result.dry_run ? <Eye className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
              {result.dry_run ? "Dry Run Preview" : "Generation Complete"} — {result.period}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.warning && (
              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">{result.warning}</div>
            )}
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-teal-700">{result.generated}</p>
                <p className="text-xs text-gray-500 mt-0.5">{result.dry_run ? "Would generate" : "Generated"}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-400">{result.skipped}</p>
                <p className="text-xs text-gray-500 mt-0.5">Skipped</p>
              </div>
              {result.invoices.length > 0 && (
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-800">
                    {formatTHB(result.invoices.reduce((s, i) => s + (i.total_amount ?? 0), 0))}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Total amount</p>
                </div>
              )}
            </div>

            {result.invoices.length > 0 && (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Contract</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Due</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {result.invoices.map((inv, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs">{inv.contract_number}</td>
                        <td className="px-4 py-3 font-medium">{inv.customer_name ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{inv.description}</td>
                        <td className="px-4 py-3 text-right font-mono font-medium">{formatTHB(inv.total_amount)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-GB") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {result.skipped_detail.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-400 hover:text-gray-600">
                  {result.skipped_detail.length} skipped entries
                </summary>
                <ul className="mt-2 space-y-1 pl-4">
                  {result.skipped_detail.map((s, i) => (
                    <li key={i} className="text-gray-500">
                      <span className="font-mono">{s.contract_number}</span> — {s.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active contracts table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Active Contracts ({activeContracts.length})</CardTitle>
          <Link href="/contracts" className="text-xs text-teal-600 hover:underline">View all contracts →</Link>
        </CardHeader>
        {loading ? (
          <CardContent className="py-8 text-center text-sm text-gray-400">Loading…</CardContent>
        ) : activeContracts.length === 0 ? (
          <CardContent className="py-10 text-center">
            <CalendarDays className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No active contracts</p>
            <p className="text-xs text-gray-400 mt-1">Create contracts in Marina Operations first</p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contract</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type / Berth</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cycle</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Rate</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ends</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Run</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {activeContracts.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link href={`/contracts/${c.id}`} className="font-mono text-xs text-teal-700 hover:underline">
                        {c.contract_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-medium">{c.customer_name ?? "—"}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {c.contract_type}{c.berth_code ? ` · ${c.berth_code}` : ""}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CYCLE_BADGE[c.billing_cycle] ?? "bg-gray-100 text-gray-600"}`}>
                        {c.billing_cycle}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono">{c.rate_amount ? formatTHB(c.rate_amount) : "—"}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {c.end_date ? new Date(c.end_date).toLocaleDateString("en-GB") : "∞"}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button onClick={() => runBilling(c.id)} disabled={running}
                        className="text-xs text-teal-600 hover:text-teal-800 hover:underline disabled:opacity-40">
                        Run
                      </button>
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
