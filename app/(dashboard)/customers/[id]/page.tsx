"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  Phone, Mail, MapPin, Globe, Ship, Edit, ArrowLeft, Loader2, Users
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Customer, Boat, Quotation, Invoice } from "@/lib/supabase"
import { formatTHB, formatDate, CUSTOMER_TYPE_LABELS, BOAT_TYPE_LABELS } from "@/lib/utils"

// ─── Helpers ──────────────────────────────────────────────────────────────────
function customerDisplayName(c: Customer): string {
  if (c.company_name) return c.company_name
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unknown"
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""

  const [customer,  setCustomer]  = useState<Customer | null>(null)
  const [boats,     setBoats]     = useState<Boat[]>([])
  const [quotes,    setQuotes]    = useState<Quotation[]>([])
  const [invoices,  setInvoices]  = useState<Invoice[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      fetch(`/api/db/customers/${id}`).then(r => r.json()),
      fetch(`/api/db/boats?owner_id=${id}`).then(r => r.json()),
      fetch(`/api/db/quotations?customer_id=${id}`).then(r => r.json()),
      fetch(`/api/db/invoices?customer_id=${id}`).then(r => r.json()),
    ])
      .then(([cData, bData, qData, iData]) => {
        if (cData?.error) { setError("Customer not found"); return }
        setCustomer(cData)
        if (Array.isArray(bData)) setBoats(bData)
        if (Array.isArray(qData)) setQuotes(qData)
        if (Array.isArray(iData)) setInvoices(iData)
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Users className="h-10 w-10 text-gray-200 mb-3" />
        <p className="text-gray-500">{error ?? "Customer not found"}</p>
        <Link href="/customers" className="text-sm text-teal-600 hover:underline mt-2">← Back to Customers</Link>
      </div>
    )
  }

  const name        = customerDisplayName(customer)
  const outstanding = invoices.reduce((s, i) => s + (i.outstanding_balance ?? 0), 0)
  const openQuotes  = quotes.filter(q => q.status === "SENT" || q.status === "DRAFT").length

  return (
    <div className="space-y-6">
      <PageHeader
        title={name}
        breadcrumb={[{ label: "Customers", href: "/customers" }, { label: name }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/customers"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <Button size="sm" className="gap-2" asChild>
              <Link href={`/customers/${id}/edit`}><Edit className="h-4 w-4" /> Edit</Link>
            </Button>
          </div>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</p>
            <div className="mt-2"><StatusBadge type="customer" status={customer.status} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Boats Registered</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{boats.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Open Quotations</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{openQuotes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding Balance</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${outstanding > 0 ? "text-amber-700" : "text-gray-900"}`}>
              {formatTHB(outstanding)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Left: Profile info ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Type</span>
                <Badge variant="default">
                  {CUSTOMER_TYPE_LABELS[customer.customer_type] ?? customer.customer_type}
                </Badge>
              </div>
              {customer.nationality && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Nationality</span>
                  <span className="text-sm text-gray-900">{customer.nationality}</span>
                </div>
              )}
              {(customer.tax_id || customer.passport_id) && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{customer.tax_id ? "Tax ID" : "Passport"}</span>
                  <span className="text-sm font-mono text-gray-900">
                    {customer.tax_id ?? customer.passport_id}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Payment Terms</span>
                <span className="text-sm text-gray-900">{customer.payment_terms ?? 30} days</span>
              </div>
              {customer.credit_limit && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Credit Limit</span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">
                    {formatTHB(customer.credit_limit)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Member Since</span>
                <span className="text-sm text-gray-900">{formatDate(customer.created_at)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {customer.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700">{customer.phone}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700">{customer.email}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 leading-relaxed">{customer.address}</span>
                </div>
              )}
              {customer.preferred_language && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700">
                    {customer.preferred_language === "th" ? "Thai" : "English"}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {customer.notes && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 leading-relaxed">{customer.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right: Tabs ── */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="boats">
            <TabsList>
              <TabsTrigger value="boats">Boats ({boats.length})</TabsTrigger>
              <TabsTrigger value="quotations">Quotations ({quotes.length})</TabsTrigger>
              <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
            </TabsList>

            {/* Boats tab */}
            <TabsContent value="boats">
              <Card>
                <CardContent className="p-0">
                  {boats.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-500">No boats registered.</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {boats.map((boat) => (
                        <Link
                          key={boat.id}
                          href={`/boats/${boat.id}`}
                          className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                            <Ship className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 group-hover:text-teal-700 transition-colors">
                              {boat.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {BOAT_TYPE_LABELS[boat.boat_type] ?? boat.boat_type}
                              {boat.brand ? ` · ${boat.brand}` : ""}
                              {boat.model ? ` ${boat.model}` : ""}
                              {boat.loa_ft ? ` · LOA ${boat.loa_ft} ft` : ""}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <StatusBadge type="boat" status={boat.status} />
                            <p className="text-xs text-gray-400 mt-1">{boat.current_location_code ?? "—"}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Quotations tab */}
            <TabsContent value="quotations">
              <Card>
                <CardContent className="p-0">
                  {quotes.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-500">No quotations.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Quote #</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Boat</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {quotes.map((q) => (
                          <tr key={q.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 font-medium text-teal-700">
                              <Link href={`/quotations/${q.id}`} className="hover:underline">
                                {q.quote_number}
                              </Link>
                            </td>
                            <td className="px-6 py-3 text-gray-600">{q.boat_name ?? "—"}</td>
                            <td className="px-6 py-3 text-right font-semibold tabular-nums">
                              {formatTHB(q.total_amount)}
                            </td>
                            <td className="px-6 py-3"><StatusBadge type="quotation" status={q.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Invoices tab */}
            <TabsContent value="invoices">
              <Card>
                <CardContent className="p-0">
                  {invoices.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-500">No invoices.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Outstanding</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Due</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 font-medium text-teal-700">
                              <Link href={`/invoices/${inv.id}`} className="hover:underline">
                                {inv.invoice_number}
                              </Link>
                            </td>
                            <td className="px-6 py-3 text-right tabular-nums font-semibold">
                              {formatTHB(inv.total_amount)}
                            </td>
                            <td className="px-6 py-3 text-right tabular-nums">
                              {inv.outstanding_balance > 0
                                ? <span className="text-amber-700 font-semibold">{formatTHB(inv.outstanding_balance)}</span>
                                : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-6 py-3 text-gray-500">{inv.due_date ? formatDate(inv.due_date) : "—"}</td>
                            <td className="px-6 py-3"><StatusBadge type="invoice" status={inv.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Live indicator */}
      <p className="text-xs text-gray-400 text-center pb-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 align-middle" />
        Live database · {boats.length} boats · {quotes.length} quotes · {invoices.length} invoices
      </p>
    </div>
  )
}
