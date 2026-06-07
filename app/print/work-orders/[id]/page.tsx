"use client"
import React, { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import type { WorkOrder, WorkOrderTask, MaterialUsage } from "@/lib/supabase"
import { formatTHB, formatDate } from "@/lib/utils"
import { PBCompanyHeader, PBWatermark } from "@/components/print/OfficialDocumentShell"

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", borderBottom:"1px solid #f1f5f9" }}>
      <span style={{ color:"#64748b" }}>{label}</span>
      <span style={{ fontWeight: strong ? 700 : 400, color: strong ? "#1e293b" : "#374151" }}>{value}</span>
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  NEW_REQUEST:"#2563eb", INSPECTION_REQUIRED:"#d97706", APPROVED:"#0d9488",
  IN_PROGRESS:"#2563eb", COMPLETED:"#16a34a", CLOSED:"#6b7280", CANCELLED:"#dc2626",
  ON_HOLD:"#9ca3af", WAITING_PARTS:"#ea580c", WAITING_CONTRACTOR:"#7c3aed",
}

const TASK_STATUS_COLORS: Record<string, string> = {
  TODO:"#6b7280", IN_PROGRESS:"#2563eb", COMPLETED:"#16a34a",
  WAITING:"#d97706", VERIFIED:"#7c3aed",
}

export default function WorkOrderPrintPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""

  const [wo,       setWo]       = useState<WorkOrder | null>(null)
  const [tasks,    setTasks]    = useState<WorkOrderTask[]>([])
  const [materials,setMaterials]= useState<MaterialUsage[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`/api/db/work-orders/${id}`).then(r=>r.json()),
      fetch(`/api/db/work-order-tasks?work_order_id=${id}`).then(r=>r.json()),
      fetch(`/api/db/material-usage?work_order_id=${id}`).then(r=>r.json()),
    ]).then(([woData, tasksData, matsData]) => {
      if (woData?.error) { setError("Work order not found"); return }
      setWo(woData as WorkOrder)
      if (Array.isArray(tasksData)) setTasks(tasksData)
      if (Array.isArray(matsData))  setMaterials(matsData)
    }).catch(() => setError("Failed to load"))
     .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!loading && wo && !error) {
      const t = setTimeout(() => window.print(), 400)
      return () => clearTimeout(t)
    }
  }, [loading, wo, error])

  const sortedTasks = useMemo(() => [...tasks].sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)), [tasks])
  const completedTasks = tasks.filter(t=>t.status==="COMPLETED"||t.status==="VERIFIED").length

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", fontFamily:"sans-serif", color:"#6b7280" }}>
      <Loader2 style={{ width:24, height:24, marginRight:8 }} className="animate-spin" /> Loading…
    </div>
  )
  if (error || !wo) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", fontFamily:"sans-serif", color:"#dc2626" }}>
      {error ?? "Work order not found"}
    </div>
  )

  const watermark = wo.status==="COMPLETED"||wo.status==="CLOSED" ? "COMPLETED" : wo.status==="CANCELLED" ? "CANCELLED" : ""
  const statusColor = STATUS_COLORS[wo.status] ?? "#6b7280"
  const totalCost = (wo.total_labor_cost??0) + (wo.total_material_cost??0) + (wo.total_contractor_cost??0)
  const grossProfit = (wo.total_revenue??0) - totalCost
  const margin = wo.total_revenue > 0 ? ((grossProfit / wo.total_revenue)*100).toFixed(1) : "—"

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
        {watermark && <PBWatermark text={watermark} />}
        <div style={{ height:6, background:"linear-gradient(90deg,#9a7d2e,#c9a84c,#9a7d2e)" }} />

        {/* Header */}
        <div style={{ padding:"24px 32px 16px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <PBCompanyHeader />
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:26, fontWeight:700, color:"#1e293b" }}>WORK ORDER</div>
            <div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>ใบสั่งงาน / Job Report</div>
            <div style={{ marginTop:8, fontSize:14, fontWeight:700, color:"#374151" }}>{wo.reference}</div>
            <div style={{ display:"inline-block", marginTop:6, padding:"4px 12px", borderRadius:6, background:statusColor+"18", border:`1.5px solid ${statusColor}`, color:statusColor, fontSize:11, fontWeight:600 }}>
              {wo.status.replace(/_/g," ")}
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div style={{ padding:"0 32px 16px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
          <div style={{ background:"#f8fafc", borderRadius:8, padding:"12px 14px", fontSize:12 }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:1, marginBottom:6, textTransform:"uppercase" }}>Customer & Vessel</div>
            <div style={{ fontWeight:700, color:"#1e293b" }}>{wo.customer_name ?? "—"}</div>
            {wo.boat_name && <div style={{ color:"#64748b", marginTop:2 }}>🚤 {wo.boat_name}</div>}
          </div>
          <div style={{ background:"#f8fafc", borderRadius:8, padding:"12px 14px", fontSize:12 }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:1, marginBottom:6, textTransform:"uppercase" }}>Schedule</div>
            <Row label="Start Date"  value={wo.start_date ? formatDate(wo.start_date) : "—"} />
            <Row label="Est. End"    value={wo.estimated_end_date ? formatDate(wo.estimated_end_date) : "—"} />
            {wo.actual_end_date && <Row label="Actual End" value={formatDate(wo.actual_end_date)} />}
          </div>
          <div style={{ background:"#f8fafc", borderRadius:8, padding:"12px 14px", fontSize:12 }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:1, marginBottom:6, textTransform:"uppercase" }}>Assignment</div>
            {wo.assigned_to && <Row label="Assigned To" value={wo.assigned_to} />}
            {wo.contractor_name && <Row label="Contractor" value={wo.contractor_name} />}
            {wo.category && <Row label="Category" value={wo.category} />}
          </div>
        </div>

        {/* Job title & description */}
        <div style={{ padding:"0 32px 16px" }}>
          <div style={{ background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:8, padding:"12px 14px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#0369a1", letterSpacing:1, marginBottom:4, textTransform:"uppercase" }}>Scope of Work</div>
            <div style={{ fontSize:14, fontWeight:700, color:"#1e293b" }}>{wo.title}</div>
            {wo.notes && <div style={{ marginTop:6, fontSize:12, color:"#374151", lineHeight:1.6 }}>{wo.notes}</div>}
          </div>
        </div>

        {/* Progress */}
        <div style={{ padding:"0 32px 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ fontSize:11, color:"#64748b" }}>Progress: <strong style={{ color:"#1e293b" }}>{wo.progress_percent ?? 0}%</strong></div>
            <div style={{ flex:1, height:8, background:"#e2e8f0", borderRadius:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${wo.progress_percent ?? 0}%`, background: (wo.progress_percent??0)>=100?"#16a34a":(wo.progress_percent??0)>=50?"#0d9488":"#2563eb", borderRadius:4 }} />
            </div>
            <div style={{ fontSize:11, color:"#64748b" }}>{completedTasks}/{tasks.length} tasks done</div>
          </div>
        </div>

        {/* Task list */}
        {sortedTasks.length > 0 && (
          <div style={{ padding:"0 32px 16px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:1, marginBottom:8, textTransform:"uppercase" }}>Job Tasks ({sortedTasks.length})</div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <thead>
                <tr style={{ background:"#1e293b", color:"white" }}>
                  {["#","Task","Priority","Status","Est. Hrs","Actual Hrs"].map((h,i)=>(
                    <th key={h} style={{ padding:"8px 10px", textAlign:i>=3?"right":"left", borderRadius:i===0?"4px 0 0 4px":i===5?"0 4px 4px 0":0, fontSize:10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedTasks.map((task, idx) => {
                  const sc = TASK_STATUS_COLORS[task.status] ?? "#6b7280"
                  return (
                    <tr key={task.id} style={{ borderBottom:"1px solid #f1f5f9", background:idx%2===0?"white":"#f8fafc" }}>
                      <td style={{ padding:"7px 10px", color:"#94a3b8", fontSize:10 }}>{idx+1}</td>
                      <td style={{ padding:"7px 10px", color:"#1e293b" }}>
                        {task.title}
                        {task.description && <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>{task.description}</div>}
                      </td>
                      <td style={{ padding:"7px 10px", fontSize:10, color:"#374151" }}>{task.priority}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right" }}>
                        <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:4, background:sc+"18", color:sc, fontSize:10, fontWeight:600 }}>
                          {task.status.replace(/_/g," ")}
                        </span>
                      </td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#374151" }}>{task.estimated_hours ?? "—"}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#374151" }}>{task.actual_hours ?? "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Materials */}
        {materials.length > 0 && (
          <div style={{ padding:"0 32px 16px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:1, marginBottom:8, textTransform:"uppercase" }}>Materials Used ({materials.length})</div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <thead>
                <tr style={{ background:"#374151", color:"white" }}>
                  {["Item","Qty","Unit","Unit Cost","Total","Charge?"].map((h,i)=>(
                    <th key={h} style={{ padding:"7px 10px", textAlign:i>=2?"right":"left", fontSize:10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {materials.map((m, idx) => (
                  <tr key={m.id} style={{ borderBottom:"1px solid #f1f5f9", background:idx%2===0?"white":"#f8fafc" }}>
                    <td style={{ padding:"7px 10px", color:"#1e293b" }}>
                      {m.item_name}
                      {m.description && <div style={{ fontSize:10, color:"#94a3b8" }}>{m.description}</div>}
                    </td>
                    <td style={{ padding:"7px 10px", textAlign:"right" }}>{m.quantity}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", color:"#94a3b8" }}>{m.unit}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right" }}>{formatTHB(m.unit_cost)}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:600 }}>{formatTHB(m.total_cost)}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", color: m.charge_to_customer?"#16a34a":"#94a3b8", fontSize:10 }}>
                      {m.charge_to_customer ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Financials */}
        <div style={{ padding:"0 32px 20px", display:"flex", justifyContent:"flex-end" }}>
          <div style={{ minWidth:260, background:"#f8fafc", borderRadius:8, padding:"14px 16px", fontSize:12 }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:1, marginBottom:8, textTransform:"uppercase" }}>Job Financials</div>
            <Row label="Revenue"          value={formatTHB(wo.total_revenue)} />
            <Row label="Labor Cost"       value={formatTHB(wo.total_labor_cost)} />
            <Row label="Material Cost"    value={formatTHB(wo.total_material_cost)} />
            <Row label="Contractor Cost"  value={formatTHB(wo.total_contractor_cost)} />
            <div style={{ borderTop:"1px solid #e2e8f0", margin:"8px 0" }} />
            <Row label="Total Cost"       value={formatTHB(totalCost)} />
            <Row label="Gross Profit"     value={formatTHB(grossProfit)} strong />
            <Row label="Gross Margin"     value={typeof margin === "string" ? margin : `${margin}%`} />
          </div>
        </div>

        {/* Handover signature */}
        <div style={{ padding:"0 32px 20px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
          {["Boat Yard Manager","Customer / Owner","Technician Lead"].map(label => (
            <div key={label} style={{ border:"1px solid #e2e8f0", borderRadius:8, padding:"12px 14px" }}>
              <div style={{ fontSize:9, fontWeight:700, color:"#64748b", letterSpacing:1, marginBottom:20, textTransform:"uppercase" }}>{label}</div>
              <div style={{ borderTop:"1px solid #1e293b", paddingTop:4 }}>
                <div style={{ fontSize:10, color:"#374151" }}>Signature / Date</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ margin:"0 32px 16px", borderTop:"1px solid #e2e8f0", paddingTop:10, display:"flex", justifyContent:"space-between" }}>
          <div style={{ fontSize:10, color:"#94a3b8" }}>Generated: {new Date().toLocaleString("en-GB")} · {wo.reference}</div>
          <div style={{ fontSize:10, color:"#9a7d2e" }}>Palm Beach Samui Asset Co., Ltd.</div>
        </div>

        <div style={{ height:4, background:"linear-gradient(90deg,#9a7d2e,#c9a84c,#9a7d2e)" }} />
      </div>
    </div>
  )
}
