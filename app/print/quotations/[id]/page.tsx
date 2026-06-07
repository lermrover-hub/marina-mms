"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import type { Quotation, QuotationItem } from "@/lib/supabase"
import { formatDate, formatTHB } from "@/lib/utils"
import { ESignBlock, PBCompanyHeader, PBWatermark } from "@/components/print/OfficialDocumentShell"

function PrintShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", padding: "24px 0", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      {children}
    </div>
  )
}

export default function QuotationPrintPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""

  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [items, setItems] = useState<QuotationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/db/quotations/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) {
          setError("Quotation not found")
          return
        }
        const { mms_quotation_items, ...quotationData } = data
        setQuotation(quotationData as Quotation)
        setItems(Array.isArray(mms_quotation_items) ? mms_quotation_items : [])
      })
      .catch(() => setError("Failed to load quotation"))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!loading && quotation && !error) {
      const timer = window.setTimeout(() => window.print(), 400)
      return () => window.clearTimeout(timer)
    }
  }, [loading, quotation, error])

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [items]
  )

  if (loading) {
    return (
      <PrintShell>
        <div style={{ display: "flex", minHeight: "70vh", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
          <Loader2 className="animate-spin" style={{ width: 24, height: 24, marginRight: 8 }} />
          Loading quotation...
        </div>
      </PrintShell>
    )
  }

  if (error || !quotation) {
    return (
      <PrintShell>
        <div style={{ display: "flex", minHeight: "70vh", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
          {error ?? "Quotation not found"}
        </div>
      </PrintShell>
    )
  }

  return (
    <PrintShell>
      <div className="print:hidden" style={{ marginBottom: 16, textAlign: "center" }}>
        <button onClick={() => window.print()} style={{ marginRight: 8, border: 0, borderRadius: 8, background: "#0d9488", color: "white", padding: "8px 24px" }}>
          Print / Save as PDF
        </button>
        <button onClick={() => window.close()} style={{ border: "1px solid #d1d5db", borderRadius: 8, background: "white", color: "#374151", padding: "8px 24px" }}>
          Close
        </button>
      </div>

      <article style={{ width: "210mm", minHeight: "297mm", margin: "0 auto", overflow: "hidden", background: "white", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", position: "relative" }}>
        <PBWatermark text={quotation.status === "DRAFT" ? "DRAFT" : undefined} />
        <div style={{ height: 6, background: "linear-gradient(90deg,#9a7d2e,#c9a84c,#9a7d2e)" }} />
        <header style={{ display: "flex", justifyContent: "space-between", padding: "28px 36px 20px", position: "relative", zIndex: 1 }}>
          <div>
            <PBCompanyHeader logoHeight={56} />
          </div>
          <div style={{ textAlign: "right" }}>
            <h1 style={{ margin: 0, color: "#1e293b", fontSize: 30 }}>QUOTATION</h1>
            <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 13 }}>{quotation.quote_number}</p>
            <span style={{ display: "inline-block", marginTop: 12, border: "1px solid #9a7d2e", borderRadius: 6, color: "#9a7d2e", padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
              {quotation.status.replace(/_/g, " ")}
            </span>
          </div>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, padding: "0 36px 20px", position: "relative", zIndex: 1 }}>
          <div style={{ borderRadius: 8, background: "#f8fafc", padding: 16 }}>
            <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>QUOTED TO</p>
            <p style={{ margin: 0, color: "#1e293b", fontSize: 15, fontWeight: 700 }}>{quotation.customer_name ?? "-"}</p>
            {quotation.boat_name && <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12 }}>Vessel: {quotation.boat_name}</p>}
          </div>
          <div style={{ borderRadius: 8, background: "#f8fafc", padding: 16, fontSize: 12 }}>
            <Row label="Quote Date" value={formatDate(quotation.created_at)} />
            <Row label="Valid Until" value={quotation.valid_until ? formatDate(quotation.valid_until) : "-"} />
            <Row label="Title" value={quotation.title ?? "-"} />
          </div>
        </section>

        <section style={{ padding: "0 36px", position: "relative", zIndex: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#1e293b", color: "white" }}>
                {["#", "Description", "Qty", "Unit", "Unit Price", "Disc%", "VAT", "Amount"].map((heading) => (
                  <th key={heading} style={{ padding: "10px 12px", textAlign: heading === "Description" ? "left" : "right" }}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item, index) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "10px 12px", color: "#64748b" }}>{index + 1}</td>
                  <td style={{ padding: "10px 12px", color: "#1e293b" }}>{item.description}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{item.qty}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{item.unit ?? "-"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{formatTHB(item.unit_price)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{item.discount_pct ? `${item.discount_pct}%` : "-"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{item.taxable ? "7%" : "Exempt"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>{formatTHB(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ display: "flex", justifyContent: "flex-end", padding: "20px 36px", position: "relative", zIndex: 1 }}>
          <div style={{ minWidth: 280, fontSize: 13 }}>
            <Row label="Subtotal" value={formatTHB(quotation.subtotal)} />
            <Row label="Discount" value={formatTHB(quotation.discount)} />
            <Row label="VAT" value={formatTHB(quotation.vat_amount)} />
            <div style={{ marginTop: 8, borderTop: "1px solid #cbd5e1", paddingTop: 8 }}>
              <Row label="Total" value={formatTHB(quotation.total_amount)} strong />
            </div>
          </div>
        </section>

        {quotation.notes && (
          <section style={{ padding: "0 36px 24px", position: "relative", zIndex: 1 }}>
            <p style={{ margin: "0 0 6px", color: "#64748b", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>NOTES</p>
            <div style={{ borderLeft: "3px solid #9a7d2e", borderRadius: 6, background: "#f8fafc", color: "#374151", fontSize: 12, padding: 12 }}>
              {quotation.notes}
            </div>
          </section>
        )}

        {/* Signature section */}
        <section style={{ padding: "0 36px 36px", marginTop: 8, position: "relative", zIndex: 1 }}>
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 20 }}>
            <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>CUSTOMER ACCEPTANCE</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
              {/* Signature display or blank line */}
              <div>
                <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: 11 }}>Customer Signature:</p>
                {quotation.signature_data ? (
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, background: "#f8fafc", padding: 8, minHeight: 72, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={quotation.signature_data}
                      alt="Customer signature"
                      style={{ maxHeight: 64, maxWidth: "100%" }}
                    />
                  </div>
                ) : (
                  <div style={{ borderBottom: "1px solid #1e293b", height: 72, width: "100%" }} />
                )}
                {quotation.approved_by_name && (
                  <p style={{ margin: "6px 0 0", color: "#374151", fontSize: 11 }}>
                    {quotation.approved_by_name}
                  </p>
                )}
              </div>
              {/* Date / approved info */}
              <div>
                <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: 11 }}>Date:</p>
                {quotation.approved_at ? (
                  <p style={{ color: "#374151", fontSize: 12, fontWeight: 600 }}>
                    {new Date(quotation.approved_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                ) : (
                  <div style={{ borderBottom: "1px solid #1e293b", height: 72, width: "80%" }} />
                )}
                {!quotation.signature_data && (
                  <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: 10, fontStyle: "italic" }}>
                    Authorised signature
                  </p>
                )}
              </div>
            </div>
            <div style={{ marginTop: 20 }}>
              <ESignBlock label="Marina Authorized Signature" companyDetails />
            </div>
          </div>
        </section>
      </article>
    </PrintShell>
  )
}

function Row({ label, value, strong = false }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "3px 0", fontWeight: strong ? 800 : 400, color: strong ? "#1e293b" : "#374151" }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}
