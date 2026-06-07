"use client"
/**
 * OfficialDocumentShell — shared A4 print wrapper for Marina MMS
 *
 * Usage:
 *   import { OfficialDocumentShell, PBCompanyHeader, PBWatermark, COMPANY }
 *     from "@/components/print/OfficialDocumentShell"
 *
 * Assets must be placed at:
 *   public/document-assets/header logo 2.jpeg   (header logo)
 *   public/document-assets/watermark logo.png   (background watermark)
 */
import React, { useEffect } from "react"

// ─── Company constants ────────────────────────────────────────────────────────
export const COMPANY = {
  nameTh:  "บริษัท ปาล์มบีช สมุย แอสเสท จำกัด (สำนักงานใหญ่)",
  nameEn:  "Palm Beach Samui Asset Co., Ltd.",
  address: "26/24 ม.4 ต.แม่น้ำ อ.เกาะสมุย จ.สุราษฎร์ธานี 84330",
  taxId:   "0845558004072",
  phone:   "094-4563966",
  logoSrc: "/document-assets/header logo 2.jpeg",
  watermarkSrc: "/document-assets/watermark logo.png",
} as const

// ─── Logo image — falls back gracefully if file not uploaded yet ──────────────
export function PBLogoImg({ height = 64 }: { height?: number }) {
  return (
    <img
      src={COMPANY.logoSrc}
      alt="Palm Beach Samui Asset"
      style={{ height, objectFit: "contain", display: "block", maxWidth: 220 }}
      onError={e => {
        const img = e.currentTarget
        img.style.display = "none"
        const fallback = img.nextElementSibling as HTMLElement | null
        if (fallback) fallback.style.display = "block"
      }}
    />
  )
}

// ─── Text fallback logo (shown when image is missing) ────────────────────────
export function PBTextLogo() {
  return (
    <div style={{
      display: "none",
      color: "#9a7d2e", fontFamily: "Georgia, serif", lineHeight: 1.2,
    }}>
      <div style={{ fontSize: 11, letterSpacing: 4 }}>★ ★ ★ ★ ★</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>Palm Beach Samui Asset</div>
      <div style={{ fontSize: 9, letterSpacing: 3, textTransform: "uppercase" }}>Marina &amp; Boat Yard</div>
    </div>
  )
}

// ─── Combined logo block (image + text fallback) ──────────────────────────────
export function PBLogo({ height = 64 }: { height?: number }) {
  return (
    <div style={{ display: "inline-block" }}>
      <PBLogoImg height={height} />
      <PBTextLogo />
    </div>
  )
}

// ─── Watermark: logo image + optional status text ────────────────────────────
export function PBWatermark({ text }: { text?: string }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      pointerEvents: "none", zIndex: 0, overflow: "hidden",
    }}>
      {/* Logo watermark (background) */}
      <img
        src={COMPANY.watermarkSrc}
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "56%", opacity: 0.05,
          objectFit: "contain",
        }}
        onError={e => { e.currentTarget.style.display = "none" }}
      />
      {/* Status text overlay (DRAFT / PAID / CANCELLED / etc.) */}
      {text && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            transform: "rotate(-35deg)",
            fontSize: "60px",
            fontFamily: "Georgia, serif",
            color: "rgba(154,125,46,0.07)",
            fontWeight: "bold",
            letterSpacing: "4px",
            whiteSpace: "nowrap",
          }}>
            {text}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Company address block (left side of document header) ────────────────────
export function PBCompanyHeader({ logoHeight = 64 }: { logoHeight?: number }) {
  return (
    <div>
      <PBLogo height={logoHeight} />
      <div style={{ marginTop: 8, fontSize: 11, color: "#6b7280", lineHeight: 1.65 }}>
        <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 12 }}>{COMPANY.nameTh}</div>
        <div>{COMPANY.nameEn}</div>
        <div>{COMPANY.address}</div>
        <div>เลขประจำตัวผู้เสียภาษี {COMPANY.taxId}</div>
        <div>Tel: {COMPANY.phone}</div>
      </div>
    </div>
  )
}

// ─── E-signature block ────────────────────────────────────────────────────────
export interface ESignBlockProps {
  label: string
  signed?: boolean
  signedName?: string
  signedDate?: string
  /** If true show a printed name line under the signature line */
  showNameLine?: boolean
}

export function ESignBlock({ label, signed, signedName, signedDate, showNameLine = true }: ESignBlockProps) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 14px" }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#64748b", letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>
        {label}
      </div>
      {signed && (
        <div style={{ fontSize: 10, color: "#16a34a", marginBottom: 12 }}>&#10003; Signed</div>
      )}
      {!signed && <div style={{ height: 24 }} />}
      <div style={{ borderTop: "1px solid #1e293b", paddingTop: 4 }}>
        <div style={{ fontSize: 10, color: "#374151" }}>Signature</div>
        {showNameLine && (
          <div style={{ fontSize: 10, color: "#374151", marginTop: 6 }}>
            Name: {signedName ? signedName : "____________________________"}
          </div>
        )}
        <div style={{ fontSize: 10, color: "#374151", marginTop: 6 }}>
          Date: {signedDate ? signedDate : "____________"}
        </div>
      </div>
    </div>
  )
}

// ─── Document footer row ──────────────────────────────────────────────────────
export function PBDocFooter({ docNumber }: { docNumber?: string }) {
  return (
    <div style={{
      margin: "0 32px 16px",
      borderTop: "1px solid #e2e8f0",
      paddingTop: 10,
      display: "flex",
      justifyContent: "space-between",
    }}>
      <div style={{ fontSize: 10, color: "#94a3b8" }}>
        Generated: {new Date().toLocaleString("en-GB")}
        {docNumber ? ` · ${docNumber}` : ""}
      </div>
      <div style={{ fontSize: 10, color: "#9a7d2e" }}>{COMPANY.nameEn}</div>
    </div>
  )
}

// ─── Gold rule bar ────────────────────────────────────────────────────────────
const GOLD_BAR = "linear-gradient(90deg,#9a7d2e,#c9a84c,#9a7d2e)"
export function GoldBarTop() {
  return <div style={{ height: 6, background: GOLD_BAR }} />
}
export function GoldBarBottom() {
  return <div style={{ height: 4, background: GOLD_BAR }} />
}

// ─── Print button bar (screen-only) ──────────────────────────────────────────
export function PrintControlBar() {
  return (
    <div className="print:hidden" style={{ textAlign: "center", marginBottom: 16 }}>
      <button
        onClick={() => window.print()}
        style={{
          background: "#0d9488", color: "white", border: "none",
          borderRadius: 8, padding: "8px 24px",
          fontFamily: "sans-serif", fontSize: 14, cursor: "pointer", marginRight: 8,
        }}
      >
        Print / Save as PDF
      </button>
      <button
        onClick={() => window.close()}
        style={{
          background: "white", color: "#374151",
          border: "1px solid #d1d5db", borderRadius: 8,
          padding: "8px 24px", fontFamily: "sans-serif", fontSize: 14, cursor: "pointer",
        }}
      >
        Close
      </button>
    </div>
  )
}

// ─── Full A4 document shell ───────────────────────────────────────────────────
export interface OfficialDocumentShellProps {
  /** Large document type label e.g. "QUOTATION" */
  title: string
  /** Smaller subtitle line e.g. "ใบเสนอราคา" */
  subtitle?: string
  /** Document reference number */
  docNumber?: string
  /** Status badge rendered top-right */
  statusBadge?: React.ReactNode
  /** Status word watermark e.g. "DRAFT" — layered above logo watermark */
  watermarkText?: string
  /** Page content */
  children: React.ReactNode
  /** Auto trigger window.print() when ready === true */
  autoprint?: boolean
  ready?: boolean
}

export function OfficialDocumentShell({
  title,
  subtitle,
  docNumber,
  statusBadge,
  watermarkText,
  children,
  autoprint,
  ready,
}: OfficialDocumentShellProps) {
  useEffect(() => {
    if (autoprint && ready) {
      const t = setTimeout(() => window.print(), 400)
      return () => clearTimeout(t)
    }
  }, [autoprint, ready])

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: "24px 0" }}>
      <PrintControlBar />

      <div style={{
        width: "210mm", minHeight: "297mm",
        margin: "0 auto", background: "white",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        position: "relative", overflow: "hidden",
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}>
        <PBWatermark text={watermarkText} />
        <GoldBarTop />

        {/* Document header */}
        <div style={{
          padding: "24px 32px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          position: "relative", zIndex: 1,
        }}>
          <PBCompanyHeader />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1e293b" }}>{title}</div>
            {subtitle && (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{subtitle}</div>
            )}
            {docNumber && (
              <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: "#374151" }}>
                {docNumber}
              </div>
            )}
            {statusBadge}
          </div>
        </div>

        {/* Page body */}
        <div style={{ position: "relative", zIndex: 1 }}>
          {children}
        </div>

        <PBDocFooter docNumber={docNumber} />
        <GoldBarBottom />
      </div>
    </div>
  )
}
