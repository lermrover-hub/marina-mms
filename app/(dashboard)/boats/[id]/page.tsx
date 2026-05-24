"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  User, AlertCircle, Edit, Navigation, Image as ImageIcon,
  Loader2, Ship
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BoatPhotoUpload } from "@/components/shared/BoatPhotoUpload"
import type { Boat, Quotation, Invoice } from "@/lib/supabase"
import { formatDate, formatFt, formatTHB, BOAT_TYPE_LABELS, isExpired, isExpiringSoon } from "@/lib/utils"

// ─── Detail grid helper ────────────────────────────────────────────────────────
type DetailRow = { label: string; value: string | number | null | undefined }
function DetailGrid({ rows }: { rows: DetailRow[] }) {
  return (
    <dl className="space-y-3">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex items-start justify-between gap-4">
          <dt className="text-sm text-gray-500 shrink-0">{label}</dt>
          <dd className="text-sm font-medium text-gray-900 text-right">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BoatDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""

  const [boat,     setBoat]     = useState<Boat | null>(null)
  const [quotes,   setQuotes]   = useState<Quotation[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      fetch(`/api/db/boats/${id}`).then(r => r.json()),
      fetch(`/api/db/quotations?boat_id=${id}`).then(r => r.json()),
      fetch(`/api/db/invoices?boat_id=${id}`).then(r => r.json()),
    ])
      .then(([bData, qData, iData]) => {
        if (bData?.error) { setError("Boat not found"); return }
        setBoat(bData)
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

  if (error || !boat) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Ship className="h-10 w-10 text-gray-200 mb-3" />
        <p className="text-gray-500">{error ?? "Boat not found"}</p>
        <Link href="/boats" className="text-sm text-teal-600 hover:underline mt-2">← Back to Boats</Link>
      </div>
    )
  }

  const insExpired  = boat.insurance_expiry ? isExpired(boat.insurance_expiry) : false
  const insExpiring = !insExpired && boat.insurance_expiry ? isExpiringSoon(boat.insurance_expiry, 60) : false

  return (
    <div className="space-y-6">
      <PageHeader
        title={boat.name}
        description={`${BOAT_TYPE_LABELS[boat.boat_type] ?? boat.boat_type}${boat.brand ? ` · ${boat.brand}` : ""}${boat.model ? ` ${boat.model}` : ""}`}
        breadcrumb={[{ label: "Boats", href: "/boats" }, { label: boat.name }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Navigation className="h-4 w-4" /> Move Boat
            </Button>
            <Button size="sm" className="gap-2" asChild>
              <Link href={`/boats/${id}/edit`}><Edit className="h-4 w-4" /> Edit</Link>
            </Button>
          </div>
        }
      />

      {/* Alerts */}
      {(insExpired || insExpiring) && (
        <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
          insExpired ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"
        }`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          {insExpired
            ? `Insurance EXPIRED on ${formatDate(boat.insurance_expiry)}. Renewal required immediately.`
            : `Insurance expiring soon on ${formatDate(boat.insurance_expiry)}. Please arrange renewal.`}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase">Status</p>
            <div className="mt-2"><StatusBadge type="boat" status={boat.status} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase">Current Location</p>
            <p className="mt-1 text-lg font-bold text-gray-900 font-mono">
              {boat.current_location_code ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase">LOA</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{formatFt(boat.loa_ft)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase">Draft</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{formatFt(boat.draft_ft)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Left: Details ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Boat Details</CardTitle></CardHeader>
            <CardContent>
              <DetailGrid rows={[
                { label: "Type",             value: BOAT_TYPE_LABELS[boat.boat_type] ?? boat.boat_type },
                { label: "Usage",            value: boat.usage_type },
                { label: "Builder / Brand",  value: boat.brand },
                { label: "Model",            value: boat.model },
                { label: "Year Built",       value: boat.year_built },
                { label: "Registration No.", value: boat.registration_number },
                { label: "HIN",              value: boat.hin },
                { label: "Flag / Country",   value: boat.flag },
              ]} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Dimensions &amp; Weight</CardTitle></CardHeader>
            <CardContent>
              <DetailGrid rows={[
                { label: "LOA",           value: formatFt(boat.loa_ft) },
                { label: "Beam",          value: formatFt(boat.beam_ft) },
                { label: "Draft",         value: formatFt(boat.draft_ft) },
                { label: "Weight",        value: boat.weight_t != null ? `${boat.weight_t} T` : null },
                { label: "Hull Material", value: boat.hull_material },
              ]} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Engine</CardTitle></CardHeader>
            <CardContent>
              <DetailGrid rows={[
                { label: "Engine Type", value: boat.engine_type },
                { label: "Brand",       value: boat.engine_brand },
                { label: "No. Engines", value: boat.num_engines },
                { label: "Fuel Type",   value: boat.fuel_type },
              ]} />
            </CardContent>
          </Card>

          {/* Owner */}
          <Card>
            <CardHeader><CardTitle>Owner</CardTitle></CardHeader>
            <CardContent>
              {boat.owner_id ? (
                <Link
                  href={`/customers/${boat.owner_id}`}
                  className="flex items-center gap-3 hover:bg-gray-50 -mx-2 px-2 py-2 rounded-md transition-colors group"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 shrink-0">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-teal-700 transition-colors">
                      {boat.owner_name ?? "View Owner"}
                    </p>
                    <p className="text-xs text-gray-400">Click to view profile</p>
                  </div>
                </Link>
              ) : (
                <p className="text-sm text-gray-500">{boat.owner_name ?? "No owner assigned"}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Tabs ── */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="documents">
            <TabsList>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="photos" className="gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" /> Photos
              </TabsTrigger>
              <TabsTrigger value="quotations">Quotations ({quotes.length})</TabsTrigger>
              <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
              <TabsTrigger value="history">Movement Log</TabsTrigger>
            </TabsList>

            <TabsContent value="documents">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {/* Insurance */}
                    <div className={`flex items-center justify-between rounded-lg border p-4 ${
                      insExpired ? "border-red-200 bg-red-50"
                      : insExpiring ? "border-amber-200 bg-amber-50"
                      : "border-gray-200"
                    }`}>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Insurance Certificate</p>
                        <p className={`text-xs mt-0.5 ${insExpired ? "text-red-600" : insExpiring ? "text-amber-600" : "text-gray-500"}`}>
                          {boat.insurance_expiry
                            ? `Expires: ${formatDate(boat.insurance_expiry)}${insExpired ? " — EXPIRED" : insExpiring ? " — Expiring soon" : ""}`
                            : "No insurance date on record"}
                        </p>
                      </div>
                      {(insExpired || insExpiring) && (
                        <AlertCircle className={`h-5 w-5 shrink-0 ${insExpired ? "text-red-500" : "text-amber-500"}`} />
                      )}
                    </div>
                    {/* Registration */}
                    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Boat Registration</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {boat.registration_number ?? "Not registered"}
                        </p>
                      </div>
                    </div>
                    {/* Special handling */}
                    {boat.special_handling && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-amber-800">⚠ Special Handling Instructions</p>
                        <p className="text-sm text-amber-700 mt-1">{boat.special_handling}</p>
                      </div>
                    )}
                    {/* Notes */}
                    {boat.notes && (
                      <div className="rounded-lg border border-gray-200 p-4">
                        <p className="text-sm font-semibold text-gray-700">Notes</p>
                        <p className="text-sm text-gray-600 mt-1">{boat.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="photos">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-teal-600" /> Boat Photos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <BoatPhotoUpload boatId={id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quotations">
              <Card>
                <CardContent className="p-0">
                  {quotes.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-500">No quotations for this boat.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Quote #</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {quotes.map(q => (
                          <tr key={q.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 font-medium text-teal-700">
                              <Link href={`/quotations/${q.id}`} className="hover:underline">{q.quote_number}</Link>
                            </td>
                            <td className="px-6 py-3 text-right tabular-nums font-semibold">{formatTHB(q.total_amount)}</td>
                            <td className="px-6 py-3 text-gray-500">{formatDate(q.created_at)}</td>
                            <td className="px-6 py-3"><StatusBadge type="quotation" status={q.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices">
              <Card>
                <CardContent className="p-0">
                  {invoices.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-500">No invoices for this boat.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Outstanding</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {invoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 font-medium text-teal-700">
                              <Link href={`/invoices/${inv.id}`} className="hover:underline">{inv.invoice_number}</Link>
                            </td>
                            <td className="px-6 py-3 text-right tabular-nums font-semibold">{formatTHB(inv.total_amount)}</td>
                            <td className="px-6 py-3 text-right tabular-nums">
                              {inv.outstanding_balance > 0
                                ? <span className="text-amber-700 font-semibold">{formatTHB(inv.outstanding_balance)}</span>
                                : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-6 py-3"><StatusBadge type="invoice" status={inv.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-8 text-sm text-gray-500">
                    <Navigation className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                    Movement log will display here once boat movement records are available.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Live indicator */}
      <p className="text-xs text-gray-400 text-center pb-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 align-middle" />
        Live database · {quotes.length} quotes · {invoices.length} invoices
      </p>
    </div>
  )
}
