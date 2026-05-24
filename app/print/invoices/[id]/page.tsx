"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import type { Invoice, InvoiceItem, Payment } from "@/lib/supabase"
import { formatDate, formatTHB } from "@/lib/utils"

function ORMLogo() {
  return (
    <div style={{ color: "#9a7d2e", fontFamily: "Georgia, serif", lineHeight: 1.15 }}>
      <div style={{ fontSize: 11, letterSpacing: 4 }}>*****</div>
      <div style={{ fontSize: 24 }}>Ocean Rover Marina</div>
      <div style={{ fontSize: 10, letterSpacing: 3 }}>SAMUI YACHT CLUB</div>
    </div>
  )
}

function PrintShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", padding: "24px 0", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      {children}
    </div>
  )
}

export default function InvoicePrintPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`/api/db/invoices/${id}`).then((res) => res.json()),
      fetch(`/api/db/payments?invoice_id=${id}`).then((res) => res.json()),
    ])
      .then(([invoiceData, paymentData]) => {
        if (invoiceData?.error) {
          setError("Invoice not found")
          return
        }
        const { mms_invoice_items, ...invoiceRecord } = invoiceData
        setInvoice(invoiceRecord as Invoice)
        setItems(Array.isArray(mms_invoice_items) ? mms_invoice_items : [])
        setPayments(Array.isArray(paymentData) ? paymentData : [])
      })
      .catch(() => setError("Failed to load invoice"))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!loading && invoice && !error) {
      const timer = window.setTimeout(() => window.print(), 400)
      return () => window.clearTimeout(timer)
    }
  }, [loading, invoice, error])

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [items]
  )

  if (loading) {
    return (
      <PrintShell>
        <div style={{ display: "flex", minHeight: "70vh", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
          <Loader2 className="animate-spin" style={{ width: 24, height: 24, marginRight: 8 }} />
          Loading invoice...
        </div>
      </PrintShell>
    )
  }

  if (error || !invoice) {
    return (
      <PrintShell>
        <div style={{ display: "flex", minHeight: "70vh", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
          {error ?? "Invoice not found"}
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

      <article style={{ width: "210mm", minHeight: "297mm", margin: "0 auto", overflow: "hidden", background: "white", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
        <div style={{ height: 6, background: "linear-gradient(90deg,#9a7d2e,#c9a84c,#9a7d2e)" }} />
        <header style={{ display: "flex", justifyContent: "space-between", padding: "28px 36px 20px" }}>
          <div>
            <ORMLogo />
            <p style={{ marginTop: 12, color: "#64748b", fontSize: 11, lineHeight: 1.6 }}>
              Ocean Rover Marina Co., Ltd.<br />
              Ko Samui, Surat Thani, Thailand<br />
              accounting@oceanrovermarina.com
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h1 style={{ margin: 0, color: "#1e293b", fontSize: 30 }}>INVOICE</h1>
            <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 13 }}>{invoice.invoice_number}</p>
            <span style={{ display: "inline-block", marginTop: 12, border: "1px solid #9a7d2e", borderRadius: 6, color: "#9a7d2e", padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
              {invoice.status.replace(/_/g, " ")}
            </span>
          </div>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, padding: "0 36px 20px" }}>
          <div style={{ borderRadius: 8, background: "#f8fafc", padding: 16 }}>
            <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>BILL TO</p>
            <p style={{ margin: 0, color: "#1e293b", fontSize: 15, fontWeight: 700 }}>{invoice.customer_name ?? "-"}</p>
            {invoice.boat_name && <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12 }}>Vessel: {invoice.boat_name}</p>}
          </div>
          <div style={{ borderRadius: 8, background: "#f8fafc", padding: 16, fontSize: 12 }}>
            <Row label="Invoice Date" value={formatDate(invoice.invoice_date)} />
            <Row label="Due Date" value={invoice.due_date ? formatDate(invoice.due_date) : "-"} />
            <Row label="Outstanding" value={formatTHB(invoice.outstanding_balance)} strong={invoice.outstanding_balance > 0} />
          </div>
        </section>

        <section style={{ padding: "0 36px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#1e293b", color: "white" }}>
                {["#", "Description", "Qty", "Unit", "Unit Price", "Disc%", "Amount"].map((heading) => (
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
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>{formatTHB(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ display: "flex", justifyContent: "flex-end", padding: "20px 36px" }}>
          <div style={{ minWidth: 280, fontSize: 13 }}>
            <Row label="Subtotal" value={formatTHB(invoice.subtotal)} />
            <Row label="VAT" value={formatTHB(invoice.vat_amount)} />
            <Row label="Total" value={formatTHB(invoice.total_amount)} strong />
            <Row label="Paid" value={formatTHB(invoice.paid_amount)} />
            <div style={{ marginTop: 8, borderTop: "1px solid #cbd5e1", paddingTop: 8 }}>
              <Row label="Balance Due" value={formatTHB(invoice.outstanding_balance)} strong />
            </div>
          </div>
        </section>

        {payments.length > 0 && (
          <section style={{ padding: "0 36px 20px", fontSize: 12 }}>
            <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>PAYMENTS</p>
            {payments.map((payment) => (
              <Row key={payment.id} label={`${formatDate(payment.payment_date)} ${payment.payment_method}`} value={formatTHB(payment.amount)} />
            ))}
          </section>
        )}

        {invoice.notes && (
          <section style={{ padding: "0 36px 24px" }}>
            <p style={{ margin: "0 0 6px", color: "#64748b", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>NOTES</p>
            <div style={{ borderLeft: "3px solid #9a7d2e", borderRadius: 6, background: "#f8fafc", color: "#374151", fontSize: 12, padding: 12 }}>
              {invoice.notes}
            </div>
          </section>
        )}
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
