"use client"
import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import type { RampBooking } from "@/lib/supabase"
import { formatDate } from "@/lib/utils"

function ORMLogo() {
  return (
    <div style={{ color:"#9a7d2e", fontFamily:"Georgia, serif", lineHeight:1.15 }}>
      <div style={{ fontSize:11, letterSpacing:4 }}>★ ★ ★ ★ ★</div>
      <div style={{ fontSize:22 }}>Ocean Rover Marina</div>
      <div style={{ fontSize:10, letterSpacing:3 }}>SAMUI YACHT CLUB</div>
    </div>
  )
}

function Watermark({ text }: { text: string }) {
  return (
    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
      <span style={{ transform:"rotate(-35deg)", fontSize:"60px", fontFamily:"Georgia,serif", color:"rgba(154,125,46,0.07)", fontWeight:"bold", letterSpacing:"4px", whiteSpace:"nowrap" }}>{text}</span>
    </div>
  )
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #f1f5f9" }}>
      <span style={{ color:"#64748b", fontSize:12 }}>{label}</span>
      <span style={{ fontWeight: highlight?700:500, color: highlight?"#0d9488":"#1e293b", fontSize:12 }}>{value}</span>
    </div>
  )
}

const OP_LABELS: Record<string, string> = {
  LAUNCH:"Launch",  RETRIEVAL:"Retrieval",  MOVE_BOAT:"Move Boat",
  WASH:"Wash",      FUEL:"Fuel",            INSPECTION:"Inspection",
}

const STATUS_COLORS: Record<string, string> = {
  REQUESTED:"#6b7280", CONFIRMED:"#0d9488", IN_PROGRESS:"#2563eb",
  COMPLETED:"#16a34a", CANCELLED:"#dc2626",
}

export default function RampBookingPrintPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""

  const [booking, setBooking] = useState<RampBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/db/ramp-bookings/${id}`)
      .then(r=>r.json())
      .then(d=>{
        if (d?.error) { setError("Booking not found"); return }
        setBooking(d as RampBooking)
      })
      .catch(()=>setError("Failed to load"))
      .finally(()=>setLoading(false))
  }, [id])

  useEffect(() => {
    if (!loading && booking && !error) {
      const t = setTimeout(()=>window.print(), 400)
      return ()=>clearTimeout(t)
    }
  }, [loading, booking, error])

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", fontFamily:"sans-serif", color:"#6b7280" }}>
      <Loader2 style={{ width:24, height:24, marginRight:8 }} className="animate-spin" /> Loading…
    </div>
  )
  if (error || !booking) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", fontFamily:"sans-serif", color:"#dc2626" }}>
      {error ?? "Booking not found"}
    </div>
  )

  const watermark = booking.status==="CANCELLED"?"CANCELLED":booking.status==="COMPLETED"?"COMPLETED":""
  const statusColor = STATUS_COLORS[booking.status] ?? "#6b7280"
  const opLabel = OP_LABELS[booking.operation_type] ?? booking.operation_type

  // Tide calculation
  const ftToM = (ft: number) => ft * 0.3048
  const draft   = booking.boat_draft_ft ?? 0
  const trailer = booking.trailer_height_ft ?? 0
  const safety  = booking.safety_clearance_ft ?? 1
  const rampOffset = -1.0
  const minDepthM = ftToM(draft + trailer + safety)
  const reqTideM  = minDepthM + rampOffset

  const LAUNCH_CHECKLIST = [
    "Confirm customer identity and booking details",
    "Verify vessel dimensions match booking record",
    "Confirm tide height meets minimum requirement",
    "Inspect trailer / support frame condition",
    "Clear ramp area — no obstructions",
    "Brief all staff on safety procedures",
    "Position trailer / travel lift correctly",
    "Take before photos of vessel",
    "Execute launch operation at confirmed time",
    "Confirm vessel safely in water",
    "Take after photos",
    "Update vessel location in system",
    "Obtain customer signature for completion",
  ]

  const RETRIEVAL_CHECKLIST = [
    "Confirm customer booking and vessel details",
    "Verify tide height at time of retrieval",
    "Prepare trailer / support frame",
    "Brief staff on safe approach angle",
    "Clear storage area for vessel placement",
    "Take before photos (vessel in water)",
    "Execute retrieval operation",
    "Secure vessel on cradle / support",
    "Inspect hull condition, note any damage",
    "Take after photos",
    "Confirm storage location in system",
    "Complete operation log",
  ]

  const checklist = booking.operation_type==="RETRIEVAL" ? RETRIEVAL_CHECKLIST : LAUNCH_CHECKLIST

  return (
    <div style={{ background:"#f5f5f5", minHeight:"100vh", padding:"24px 0" }}>
      <div className="print:hidden" style={{ textAlign:"center", marginBottom:16 }}>
        <button onClick={()=>window.print()} style={{ background:"#0d9488", color:"white", border:"none", borderRadius:8, padding:"8px 24px", fontFamily:"sans-serif", fontSize:14, cursor:"pointer", marginRight:8 }}>
          Print / Save as PDF
        </button>
        <button onClick={()=>window.close()} style={{ background:"white", color:"#374151", border:"1px solid #d1d5db", borderRadius:8, padding:"8px 24px", fontFamily:"sans-serif", fontSize:14, cursor:"pointer" }}>
          Close
        </button>
      </div>

      <div style={{ width:"210mm", minHeight:"297mm", margin:"0 auto", background:"white", boxShadow:"0 4px 20px rgba(0,0,0,0.15)", position:"relative", overflow:"hidden", fontFamily:"'Segoe UI',Arial,sans-serif" }}>
        {watermark && <Watermark text={watermark} />}
        <div style={{ height:6, background:"linear-gradient(90deg,#9a7d2e,#c9a84c,#9a7d2e)" }} />

        {/* Header */}
        <div style={{ padding:"24px 32px 16px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <ORMLogo />
            <div style={{ marginTop:8, fontSize:11, color:"#6b7280", lineHeight:1.6 }}>
              <div>Ocean Rover Marina Co., Ltd.</div>
              <div>Ko Samui, Surat Thani, Thailand</div>
              <div>Tel: +66 77 XXX XXX  |  ops@oceanrovermarina.com</div>
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:24, fontWeight:700, color:"#1e293b" }}>RAMP BOOKING</div>
            <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>CONFIRMATION</div>
            <div style={{ marginTop:6, fontSize:13, fontWeight:700, color:"#374151" }}>{booking.reference}</div>
            <div style={{ display:"inline-block", marginTop:6, padding:"4px 12px", borderRadius:6, background:statusColor+"18", border:`1.5px solid ${statusColor}`, color:statusColor, fontSize:11, fontWeight:600 }}>
              {booking.status.replace(/_/g," ")}
            </div>
          </div>
        </div>

        {/* Operation type banner */}
        <div style={{ margin:"0 32px 16px", background:"#0d948818", border:"1.5px solid #0d9488", borderRadius:8, padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:24 }}>⚓</div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:"#0d9488" }}>{opLabel} Operation</div>
            <div style={{ fontSize:12, color:"#374151", marginTop:2 }}>
              {formatDate(booking.requested_date)}
              {booking.confirmed_time && ` at ${booking.confirmed_time}`}
            </div>
          </div>
        </div>

        {/* Main info grid */}
        <div style={{ padding:"0 32px 16px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          {/* Customer & Vessel */}
          <div style={{ background:"#f8fafc", borderRadius:8, padding:"14px 16px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:1, marginBottom:10, textTransform:"uppercase" }}>Customer & Vessel</div>
            <InfoRow label="Customer"    value={booking.customer_name ?? "—"} />
            <InfoRow label="Vessel"      value={booking.boat_name ?? "—"} />
            <InfoRow label="Operation"   value={opLabel} />
            <InfoRow label="Staff"       value={booking.assigned_staff ?? "TBC"} />
          </div>
          {/* Schedule */}
          <div style={{ background:"#f8fafc", borderRadius:8, padding:"14px 16px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:1, marginBottom:10, textTransform:"uppercase" }}>Schedule</div>
            <InfoRow label="Date"            value={formatDate(booking.requested_date)} />
            <InfoRow label="Requested Time"  value={booking.requested_time ?? "—"} />
            <InfoRow label="Confirmed Time"  value={booking.confirmed_time ?? "Pending confirmation"} highlight={!!booking.confirmed_time} />
          </div>
        </div>

        {/* Vessel dimensions */}
        <div style={{ padding:"0 32px 16px" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:1, marginBottom:8, textTransform:"uppercase" }}>Vessel Dimensions & Tide Safety</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr) 2fr", gap:12 }}>
            <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, padding:"10px 12px", textAlign:"center" }}>
              <div style={{ fontSize:10, color:"#64748b", marginBottom:4 }}>Boat Draft</div>
              <div style={{ fontSize:18, fontWeight:700, color:"#1e293b" }}>{draft} ft</div>
              <div style={{ fontSize:10, color:"#94a3b8" }}>({ftToM(draft).toFixed(2)} m)</div>
            </div>
            <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, padding:"10px 12px", textAlign:"center" }}>
              <div style={{ fontSize:10, color:"#64748b", marginBottom:4 }}>Trailer Height</div>
              <div style={{ fontSize:18, fontWeight:700, color:"#1e293b" }}>{trailer} ft</div>
              <div style={{ fontSize:10, color:"#94a3b8" }}>({ftToM(trailer).toFixed(2)} m)</div>
            </div>
            <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, padding:"10px 12px", textAlign:"center" }}>
              <div style={{ fontSize:10, color:"#64748b", marginBottom:4 }}>Safety Clearance</div>
              <div style={{ fontSize:18, fontWeight:700, color:"#1e293b" }}>{safety} ft</div>
              <div style={{ fontSize:10, color:"#94a3b8" }}>({ftToM(safety).toFixed(2)} m)</div>
            </div>
            <div style={{ background:"#0d948810", border:"1.5px solid #0d9488", borderRadius:8, padding:"10px 12px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#0d9488", marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>Required Tide Height</div>
              <div style={{ fontSize:22, fontWeight:800, color:"#0d9488" }}>{reqTideM.toFixed(2)} m</div>
              <div style={{ fontSize:10, color:"#374151", marginTop:4 }}>
                Min depth: {minDepthM.toFixed(2)} m + Ramp offset: {rampOffset} m
              </div>
            </div>
          </div>
        </div>

        {/* Safety warning */}
        <div style={{ margin:"0 32px 16px", background:"#fef9c3", border:"1px solid #fde047", borderRadius:8, padding:"10px 14px", fontSize:11, color:"#92400e" }}>
          ⚠️ <strong>Operational Advisory:</strong> Tide predictions may differ from actual sea level due to weather, wind direction, barometric pressure, and sea conditions. Final confirmation must be verified by the Operation Supervisor on the day.
        </div>

        {/* Checklist */}
        <div style={{ padding:"0 32px 16px" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:1, marginBottom:8, textTransform:"uppercase" }}>Operation Checklist — {opLabel}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"4px 20px" }}>
            {checklist.map((item, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:6, padding:"3px 0" }}>
                <div style={{ width:16, height:16, border:"1.5px solid #94a3b8", borderRadius:3, flexShrink:0, marginTop:1 }} />
                <span style={{ fontSize:11, color:"#374151", lineHeight:1.4 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Signatures */}
        <div style={{ padding:"0 32px 20px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
          {["Operation Supervisor","Customer / Boat Owner","Marina Manager"].map(label => (
            <div key={label} style={{ border:"1px solid #e2e8f0", borderRadius:8, padding:"10px 12px" }}>
              <div style={{ fontSize:9, fontWeight:700, color:"#64748b", letterSpacing:1, marginBottom:20, textTransform:"uppercase" }}>{label}</div>
              <div style={{ borderTop:"1px solid #1e293b", paddingTop:4 }}>
                <div style={{ fontSize:10, color:"#374151" }}>Signature</div>
                <div style={{ fontSize:10, color:"#374151", marginTop:8 }}>Date: ____________</div>
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        {booking.notes && (
          <div style={{ padding:"0 32px 16px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:1, marginBottom:6, textTransform:"uppercase" }}>Notes</div>
            <div style={{ fontSize:11, color:"#374151", background:"#f8fafc", borderRadius:6, padding:"10px 12px", borderLeft:"3px solid #9a7d2e" }}>{booking.notes}</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ margin:"0 32px 16px", borderTop:"1px solid #e2e8f0", paddingTop:10, display:"flex", justifyContent:"space-between" }}>
          <div style={{ fontSize:10, color:"#94a3b8" }}>Generated: {new Date().toLocaleString("en-GB")} · {booking.reference}</div>
          <div style={{ fontSize:10, color:"#9a7d2e" }}>oceanrovermarina.com</div>
        </div>

        <div style={{ height:4, background:"linear-gradient(90deg,#9a7d2e,#c9a84c,#9a7d2e)" }} />
      </div>
    </div>
  )
}
