"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, CreditCard, Eye, Loader2 } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { HelpHint } from "@/components/shared/HelpHint"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDate, formatTHB } from "@/lib/utils"

type Reminder = { id: string; status: string; payment_mode: string; total_amount: number; deposit_required_amount: number; first_cycle_due_date: string | null; next_reminder_at: string; service_request: { id: string; reference: string; customer_name: string; boat_name: string } | null }

export default function ServicePaymentsPage() {
  const [rows, setRows] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  useEffect(() => { fetch("/api/billing/service-payment-reminders").then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data?.error ?? "Load failed"); setRows(data.reminders ?? []) }).catch((e) => setError(String(e))).finally(() => setLoading(false)) }, [])
  return <div className="space-y-6">
    <PageHeader title="Service Payment Follow-up" description="Preview of deposit, full-payment and credit reminders" />
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><Eye className="mr-2 inline h-4 w-4" />Preview is dry-run while automation writes are disabled. No customer message or database reminder is sent.</div>
    <Card><CardHeader><CardTitle>Reminders Due <HelpHint title="Reminder schedule">Credit reminders begin 5 days before the first 30-day cycle ends and repeat every 3 days when due/overdue. Good-credit post-launch terms may not exceed 7 days.</HelpHint></CardTitle></CardHeader><CardContent>
      {loading ? <p className="flex items-center text-gray-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading…</p> : error ? <p className="text-red-600">{error}</p> : !rows.length ? <p className="py-8 text-center text-gray-400">No reminders are due.</p> : <div className="space-y-2">{rows.map((row) => <div key={row.id} className="grid items-center gap-3 rounded-lg border p-3 md:grid-cols-[1fr_auto_auto]"><div><p className="font-semibold">{row.service_request?.reference ?? row.id} · {row.service_request?.boat_name ?? "Boat"}</p><p className="text-sm text-gray-500">{row.service_request?.customer_name ?? "Customer"} · {row.payment_mode.replaceAll("_", " ")}</p></div><div className="text-sm"><p>{formatTHB(row.total_amount)}</p><p className="text-xs text-gray-500">Initial {formatTHB(row.deposit_required_amount)}</p>{row.first_cycle_due_date && <p className="text-xs text-amber-700">Cycle due {formatDate(row.first_cycle_due_date)}</p>}</div><Button variant="outline" asChild><Link href={`/service-requests/${row.service_request?.id}`}><CreditCard className="mr-2 h-4 w-4" />Review</Link></Button></div>)}</div>}
    </CardContent></Card>
    {rows.some((row) => ["OVERDUE", "CREDIT_HOLD"].includes(row.status)) && <p className="flex items-center text-sm text-red-700"><AlertCircle className="mr-2 h-4 w-4" />Overdue or credit-hold requests must not create a Work Order.</p>}
  </div>
}
