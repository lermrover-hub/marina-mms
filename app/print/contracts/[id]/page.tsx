"use client"
import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import type { Contract } from "@/lib/supabase"
import { formatDate } from "@/lib/utils"
import { ESignBlock, PBCompanyHeader, PBWatermark } from "@/components/print/OfficialDocumentShell"

const TYPE_LABELS: Record<string, string> = {
  WET_BERTH:"Wet Berth", DRY_STORAGE:"Dry Storage",
  RAMP_SERVICE:"Ramp Service", SERVICE_AGREEMENT:"Service Agreement",
}
const CYCLE_LABELS: Record<string, string> = {
  MONTHLY:"Monthly", QUARTERLY:"Quarterly", ANNUAL:"Annual", ONE_TIME:"One-time",
}
const STATUS_COLORS: Record<string, string> = {
  DRAFT:"#6b7280", ACTIVE:"#16a34a", EXPIRED:"#d97706",
  TERMINATED:"#dc2626", SUSPENDED:"#ea580c",
}

export default function ContractPrintPage() {
  const params  = useParams<{ id: string }>()
  const id      = params?.id ?? ""

  const [contract, setContract] = useState<Contract | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/db/contracts/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d?.error) { setError("Contract not found"); return }
        setContract(d as Contract)
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!loading && contract && !error) {
      const t = setTimeout(() => window.print(), 400)
      return () => clearTimeout(t)
    }
  }, [loading, contract, error])

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", fontFamily:"sans-serif", color:"#6b7280" }}>
      <Loader2 style={{ width:24, height:24, marginRight:8 }} className="animate-spin" /> Loading…
    </div>
  )
  if (error || !contract) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", fontFamily:"sans-serif", color:"#dc2626" }}>
      {error ?? "Contract not found"}
    </div>
  )

  const watermark   = contract.status === "TERMINATED" ? "TERMINATED"
                    : contract.status === "EXPIRED"    ? "EXPIRED"
                    : contract.status === "DRAFT"      ? "DRAFT"
                    : ""
  const statusColor = STATUS_COLORS[contract.status] ?? "#6b7280"
  const typeLabel   = TYPE_LABELS[contract.contract_type] ?? contract.contract_type
  const cycleLabel  = CYCLE_LABELS[contract.billing_cycle] ?? contract.billing_cycle

  return (
    <div style={{ background:"#f5f5f5", minHeight:"100vh", padding:"24px 0" }}>
      <div className="print:hidden" style={{ textAlign:"center", marginBottom:16 }}>
        <button onClick={() => window.print()}
          style={{ background:"#0d9488", color:"white", border:"none", borderRadius:8, padding:"8px 24px", fontFamily:"sans-serif", fontSize:14, cursor:"pointer", marginRight:8 }}>
          Print / Save as PDF
        </button>
        <button onClick={() => window.close()}
          style={{ background:"white", color:"#374151", border:"1px solid #d1d5db", borderRadius:8, padding:"8px 24px", fontFamily:"sans-serif", fontSize:14, cursor:"pointer" }}>
          Close
        </button>
      </div>

      <div style={{ width:"210mm", minHeight:"297mm", margin:"0 auto", background:"white", boxShadow:"0 4px 20px rgba(0,0,0,0.15)", position:"relative", overflow:"hidden", fontFamily:"'Segoe UI',Arial,sans-serif" }}>
        {watermark && <PBWatermark text={watermark} />}
        <div style={{ height:6, background:"linear-gradient(90deg,#9a7d2e,#c9a84c,#9a7d2e)" }} />

        {/* Header */}
        <div style={{ padding:"24px 32px 16px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <PBCompanyHeader />
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:24, fontWeight:700, color:"#1e293b" }}>MARINA CONTRACT</div>
            <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{typeLabel.toUpperCase()}</div>
            <div style={{ marginTop:6, fontSize:13, fontWeight:700, color:"#374151" }}>{contract.contract_number}</div>
            <div style={{ display:"inline-block", marginTop:6, padding:"4px 12px", borderRadius:6, background:statusColor+"18", border:`1.5px solid ${statusColor}`, color:statusColor, fontSize:11, fontWeight:600 }}>
              {contract.status}
            </div>
          </div>
        </div>

        {/* Type banner */}
        <div style={{ margin:"0 32px 16px", background:"#0d948818", border:"1.5px solid #0d9488", borderRadius:8, padding:"12px 16px" }}>
          <div style={{ fontSize:15, fontWeight:700, color:"#0d9488" }}>{typeLabel} Agreement</div>
          <div style={{ fontSize:12, color:"#374151", marginTop:2 }}>
            Period: {formatDate(contract.start_date)} — {contract.end_date ? formatDate(contract.end_date) : "Open-ended"}
            {contract.auto_renew && "  ·  Auto-renew"}
          </div>
        </div>

        {/* Main info grid */}
        <div style={{ padding:"0 32px 16px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {/* Customer / Vessel */}
          <div style={{ background:"#f8fafc", borderRadius:8, padding:"14px 16px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:1, marginBottom:10, textTransform:"uppercase" }}>Lessee / Boat Owner</div>
            {[
              { label:"Customer",      val: contract.customer_name ?? "—" },
              { label:"Vessel",        val: contract.boat_name ?? "—" },
              { label:"Berth / Slot",  val: contract.berth_code ?? "—" },
            ].map(({ label, val }) => (
              <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid #f1f5f9" }}>
                <span style={{ color:"#64748b", fontSize:11 }}>{label}</span>
                <span style={{ fontWeight:500, color:"#1e293b", fontSize:11 }}>{val}</span>
              </div>
            ))}
          </div>
          {/* Billing */}
          <div style={{ background:"#f8fafc", borderRadius:8, padding:"14px 16px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:1, marginBottom:10, textTransform:"uppercase" }}>Billing</div>
            {[
              { label:"Billing Cycle",    val: cycleLabel },
              { label:"Rate",             val: contract.rate_amount != null ? `${contract.rate_amount.toLocaleString()} ${contract.rate_currency}` : "—" },
              { label:"Security Deposit", val: contract.deposit_amount != null ? `${contract.deposit_amount.toLocaleString()} ${contract.rate_currency}` : "—" },
              { label:"Deposit Paid",     val: contract.deposit_paid ? `Yes${contract.deposit_paid_date ? ` (${formatDate(contract.deposit_paid_date)})` : ""}` : "No" },
            ].map(({ label, val }) => (
              <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid #f1f5f9" }}>
                <span style={{ color:"#64748b", fontSize:11 }}>{label}</span>
                <span style={{ fontWeight:500, color:"#1e293b", fontSize:11 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Terms */}
        {contract.terms_text && (
          <div style={{ padding:"0 32px 16px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:1, marginBottom:6, textTransform:"uppercase" }}>Terms &amp; Conditions</div>
            <div style={{ fontSize:11, color:"#374151", lineHeight:1.7, background:"#f8fafc", borderRadius:6, padding:"12px 14px", border:"1px solid #e2e8f0", whiteSpace:"pre-wrap" }}>
              {contract.terms_text}
            </div>
          </div>
        )}

        {/* Special conditions */}
        {contract.special_conditions && (
          <div style={{ padding:"0 32px 16px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:1, marginBottom:6, textTransform:"uppercase" }}>Special Conditions</div>
            <div style={{ fontSize:11, color:"#374151", lineHeight:1.7, background:"#fef9c3", borderRadius:6, padding:"12px 14px", border:"1px solid #fde047", whiteSpace:"pre-wrap" }}>
              {contract.special_conditions}
            </div>
          </div>
        )}

        {/* Signatures */}
        <div style={{ padding:"0 32px 20px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <ESignBlock
            label="Customer / Boat Owner"
            signed={contract.signed_by_customer}
            signedDate={contract.signed_date ? formatDate(contract.signed_date) : undefined}
          />
          <ESignBlock
            label="Marina Manager"
            signed={contract.signed_by_marina}
            signedDate={contract.signed_date ? formatDate(contract.signed_date) : undefined}
            companyDetails
          />
        </div>

        {/* Footer */}
        <div style={{ margin:"0 32px 16px", borderTop:"1px solid #e2e8f0", paddingTop:10, display:"flex", justifyContent:"space-between" }}>
          <div style={{ fontSize:10, color:"#94a3b8" }}>Generated: {new Date().toLocaleString("en-GB")} · {contract.contract_number}</div>
          <div style={{ fontSize:10, color:"#9a7d2e" }}>Palm Beach Samui Asset Co., Ltd.</div>
        </div>

        <div style={{ height:4, background:"linear-gradient(90deg,#9a7d2e,#c9a84c,#9a7d2e)" }} />
      </div>
    </div>
  )
}
