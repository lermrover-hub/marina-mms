"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import {
  COMPANY,
  PBCompanyHeader,
  PBWatermark,
  ESignBlock,
  GoldBarTop,
  GoldBarBottom,
  PrintControlBar,
} from "@/components/print/OfficialDocumentShell"
import { formatDate, formatTHB } from "@/lib/utils"
import type { Payment, Invoice } from "@/lib/supabase"

interface InvoiceItem {
  id: string
  description: string
  qty: number
  unit?: string
  unit_price: number
  line_total: number
}

interface ReceiptData extends Payment {
  invoice: Invoice | null
  invoice_items: InvoiceItem[]
}

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash / เงินสด",
  BANK_TRANSFER: "Bank Transfer / โอนเงิน",
  CREDIT_CARD: "Credit Card / บัตรเครดิต",
  QR_PAYMENT: "QR Payment / QR โค้ด",
  CHEQUE: "Cheque / เช็ค",
  Cash: "Cash / เงินสด",
  "Bank Transfer": "Bank Transfer / โอนเงิน",
  "Credit Card": "Credit Card / บัตรเครดิต",
  "QR Payment": "QR Payment / QR โค้ด",
  Cheque: "Cheque / เช็ค",
}

function receiptNumber(payment: Payment): string {
  if (payment.reference_no) return `RCT-${payment.reference_no}`
  const shortId = payment.id.replace(/-/g, "").slice(0, 8).toUpperCase()
  const year = new Date(payment.payment_date || payment.created_at).getFullYear()
  return `RCT-${year}-${shortId}`
}

function Row({
  label,
  value,
  strong,
  large,
}: {
  label: string
  value: React.ReactNode
  strong?: boolean
  large?: boolean
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
        padding: "4px 0",
        fontWeight: strong ? 700 : 400,
        fontSize: large ? 15 : 12,
        color: strong ? "#1e293b" : "#374151",
        borderBottom: strong ? "none" : "none",
      }}
    >
      <span style={{ color: strong ? "#64748b" : "#64748b", minWidth: 140 }}>{label}</span>
      <span style={{ textAlign: "right" }}>{value}</span>
    </div>
  )
}

export default function ReceiptPrintPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""

  const [data, setData] = useState<ReceiptData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/db/payments/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) { setError(d.error); return }
        setData(d as ReceiptData)
      })
      .catch(() => setError("Failed to load receipt"))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!loading && data && !error) {
      const t = setTimeout(() => window.print(), 400)
      return () => clearTimeout(t)
    }
  }, [loading, data, error])

  const bg = "#f5f5f5"
  const shell: React.CSSProperties = {
    minHeight: "100vh",
    background: bg,
    padding: "24px 0",
    fontFamily: "'Segoe UI', Arial, sans-serif",
  }

  if (loading) {
    return (
      <div style={shell}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "#64748b", gap: 8 }}>
          <Loader2 className="animate-spin" style={{ width: 22, height: 22 }} />
          กำลังโหลดใบเสร็จ…
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={shell}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "#dc2626" }}>
          {error ?? "Receipt not found"}
        </div>
      </div>
    )
  }

  const rctNo = receiptNumber(data)
  const isConfirmed = data.status?.toLowerCase() === "confirmed"
  const inv = data.invoice
  const items = data.invoice_items ?? []

  return (
    <div style={shell}>
      <PrintControlBar />

      {/* A4 page */}
      <div
        style={{
          width: "210mm",
          minHeight: "297mm",
          margin: "0 auto",
          background: "white",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <PBWatermark text={isConfirmed ? "RECEIVED" : undefined} />
        <GoldBarTop />

        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "24px 36px 16px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <PBCompanyHeader logoHeight={52} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>
              ใบเสร็จรับเงิน
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1e293b", lineHeight: 1 }}>RECEIPT</div>
            <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: "#374151", fontFamily: "monospace" }}>
              {rctNo}
            </div>
            <div
              style={{
                display: "inline-block",
                marginTop: 8,
                padding: "3px 12px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                border: `1px solid ${isConfirmed ? "#16a34a" : "#d97706"}`,
                color: isConfirmed ? "#16a34a" : "#d97706",
              }}
            >
              {isConfirmed ? "CONFIRMED / ยืนยันแล้ว" : data.status.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Divider */}
        <div style={{ height: 1, background: "#e2e8f0", margin: "0 36px" }} />

        {/* Received-from block */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            padding: "16px 36px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: "#64748b", marginBottom: 6, textTransform: "uppercase" }}>
              ได้รับเงินจาก / Received From
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
              {data.customer_name ?? "—"}
            </div>
            {inv?.boat_name && (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                Vessel: {inv.boat_name}
              </div>
            )}
          </div>

          <div style={{ background: "#f8fafc", borderRadius: 8, padding: 14, fontSize: 12 }}>
            <Row label="วันที่รับชำระ / Date" value={formatDate(data.payment_date)} />
            <Row label="วิธีชำระ / Method" value={METHOD_LABEL[data.payment_method] ?? data.payment_method} />
            {data.reference_no && <Row label="เลขอ้างอิง / Reference" value={data.reference_no} />}
            {inv && (
              <Row label="เลขที่ Invoice" value={inv.invoice_number ?? data.invoice_id?.slice(0, 8)} />
            )}
          </div>
        </section>

        {/* Amount banner */}
        <section style={{ padding: "0 36px 20px", position: "relative", zIndex: 1 }}>
          <div
            style={{
              background: "linear-gradient(90deg, #f0fdf4, #dcfce7)",
              border: "1.5px solid #86efac",
              borderRadius: 10,
              padding: "16px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#166534", marginBottom: 4 }}>
                จำนวนเงินที่รับ / AMOUNT RECEIVED
              </div>
              <div style={{ fontSize: 34, fontWeight: 800, color: "#166534", lineHeight: 1 }}>
                {formatTHB(data.amount)}
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: 11, color: "#15803d" }}>
              <div style={{ fontSize: 9, letterSpacing: 1, marginBottom: 3, textTransform: "uppercase" }}>Payment Method</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                {METHOD_LABEL[data.payment_method] ?? data.payment_method}
              </div>
            </div>
          </div>
        </section>

        {/* Invoice items */}
        {items.length > 0 && (
          <section style={{ padding: "0 36px 16px", position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: "#64748b", marginBottom: 8, textTransform: "uppercase" }}>
              รายละเอียดบริการ / Service Details
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#1e293b", color: "white" }}>
                  {["#", "รายการ / Description", "Qty", "Unit Price", "Amount"].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: h === "รายการ / Description" ? "left" : "right", fontSize: 11 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{i + 1}</td>
                    <td style={{ padding: "8px 10px", color: "#1e293b" }}>{item.description}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{item.qty}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{formatTHB(item.unit_price)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>{formatTHB(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            {inv && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <div style={{ minWidth: 260, fontSize: 12 }}>
                  <Row label="ยอดรวม / Subtotal" value={formatTHB(inv.subtotal)} />
                  <Row label="VAT 7%" value={formatTHB(inv.vat_amount)} />
                  <div style={{ borderTop: "1.5px solid #1e293b", marginTop: 6, paddingTop: 6 }}>
                    <Row label="ยอดรวมสุทธิ / Grand Total" value={formatTHB(inv.total_amount)} strong />
                  </div>
                  <Row label="ชำระครั้งนี้ / Paid Now" value={<span style={{ color: "#16a34a", fontWeight: 700 }}>{formatTHB(data.amount)}</span>} />
                  {inv.outstanding_balance > 0 && (
                    <Row
                      label="ยอดค้างชำระ / Balance Due"
                      value={<span style={{ color: "#dc2626", fontWeight: 700 }}>{formatTHB(inv.outstanding_balance)}</span>}
                    />
                  )}
                  {inv.outstanding_balance <= 0 && (
                    <div style={{ marginTop: 6, textAlign: "right" }}>
                      <span style={{ background: "#dcfce7", color: "#166534", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 4, letterSpacing: 1 }}>
                        ชำระครบแล้ว / FULLY PAID
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Notes */}
        {data.notes && (
          <section style={{ padding: "0 36px 16px", position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: "#64748b", marginBottom: 6, textTransform: "uppercase" }}>
              หมายเหตุ / Notes
            </div>
            <div style={{ borderLeft: "3px solid #9a7d2e", background: "#f8fafc", padding: "8px 12px", fontSize: 12, color: "#374151", borderRadius: 4 }}>
              {data.notes}
            </div>
          </section>
        )}

        {/* Signatures */}
        <section style={{ padding: "16px 36px 24px", position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <ESignBlock label="ลายเซ็นผู้ชำระ / Customer Signature" showNameLine />
            <ESignBlock label="ลายเซ็นผู้รับเงิน / Authorized Signature" companyDetails />
          </div>
        </section>

        {/* Footer */}
        <div
          style={{
            margin: "0 32px 12px",
            borderTop: "1px solid #e2e8f0",
            paddingTop: 10,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9,
            color: "#94a3b8",
          }}
        >
          <span>Generated: {new Date().toLocaleString("en-GB")} · {rctNo}</span>
          <span style={{ color: "#9a7d2e" }}>{COMPANY.nameEn}</span>
        </div>

        <GoldBarBottom />
      </div>
    </div>
  )
}
