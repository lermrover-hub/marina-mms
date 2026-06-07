/**
 * DocumentField — reusable field/row helpers for Marina MMS print pages
 *
 * Usage:
 *   import { Row, InfoRow, SectionHeader, TwoColGrid, MoneyRow }
 *     from "@/components/print/DocumentField"
 */
import React from "react"

// ─── Simple label/value row ───────────────────────────────────────────────────
export function Row({
  label, value, strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span style={{ fontWeight: strong ? 700 : 400, color: strong ? "#1e293b" : "#374151" }}>
        {value}
      </span>
    </div>
  )
}

// ─── Info row (slightly larger, optional highlight) ───────────────────────────
export function InfoRow({
  label, value, highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ color: "#64748b", fontSize: 12 }}>{label}</span>
      <span style={{ fontWeight: highlight ? 700 : 500, color: highlight ? "#0d9488" : "#1e293b", fontSize: 12 }}>
        {value}
      </span>
    </div>
  )
}

// ─── Section header (uppercase label with bottom margin) ─────────────────────
export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: "#64748b",
      letterSpacing: 1, marginBottom: 8, textTransform: "uppercase",
    }}>
      {children}
    </div>
  )
}

// ─── Card wrapper (light grey background) ────────────────────────────────────
export function InfoCard({
  children, style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      background: "#f8fafc", borderRadius: 8, padding: "14px 16px", fontSize: 12,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── Two-column grid layout ───────────────────────────────────────────────────
export function TwoColGrid({ children, gap = 16 }: { children: React.ReactNode; gap?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap }}>
      {children}
    </div>
  )
}

// ─── Money display row (right-aligned value) ──────────────────────────────────
export function MoneyRow({
  label, value, strong, highlight,
}: {
  label: string
  value: string
  strong?: boolean
  highlight?: boolean
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      padding: "4px 0", borderBottom: "1px solid #f1f5f9",
    }}>
      <span style={{ color: "#64748b", fontSize: 11 }}>{label}</span>
      <span style={{
        fontWeight: strong ? 700 : 500,
        color: highlight ? "#0d9488" : strong ? "#1e293b" : "#374151",
        fontSize: 11,
      }}>
        {value}
      </span>
    </div>
  )
}

// ─── Divider ─────────────────────────────────────────────────────────────────
export function Divider({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{ borderTop: "1px solid #e2e8f0", margin: "8px 0", ...style }} />
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────
export function StatusBadge({
  label, color,
}: {
  label: string
  color: string
}) {
  return (
    <div style={{
      display: "inline-block", marginTop: 6,
      padding: "4px 12px", borderRadius: 6,
      background: color + "18", border: `1.5px solid ${color}`,
      color, fontSize: 11, fontWeight: 600,
    }}>
      {label}
    </div>
  )
}

// ─── Warning advisory box (yellow) ───────────────────────────────────────────
export function AdvisoryBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "#fef9c3", border: "1px solid #fde047",
      borderRadius: 8, padding: "10px 14px",
      fontSize: 11, color: "#92400e",
    }}>
      {children}
    </div>
  )
}

// ─── Notes box (left gold border) ────────────────────────────────────────────
export function NotesBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, color: "#374151",
      background: "#f8fafc", borderRadius: 6,
      padding: "10px 12px",
      borderLeft: "3px solid #9a7d2e",
    }}>
      {children}
    </div>
  )
}
