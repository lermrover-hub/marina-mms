import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { data: staff } = await supabase.from("mms_staff").select("*").order("full_name")

    // Work order tasks assigned to each staff
    const { data: tasks } = await supabase
      .from("mms_work_order_tasks")
      .select("assigned_to, status, created_at, completed_at")
      .not("assigned_to", "is", null)

    // Ramp bookings handled
    const { data: ramps } = await supabase
      .from("mms_ramp_bookings")
      .select("assigned_staff, status")
      .not("assigned_staff", "is", null)

    // Build KPI per staff
    const kpi: Record<string, {
      totalTasks: number; completedTasks: number; pendingTasks: number
      rampOps: number; completionRate: number
    }> = {}

    for (const s of (staff ?? [])) {
      kpi[s.id] = { totalTasks: 0, completedTasks: 0, pendingTasks: 0, rampOps: 0, completionRate: 0 }
    }

    for (const t of (tasks ?? [])) {
      const sid = t.assigned_to
      if (!kpi[sid]) kpi[sid] = { totalTasks: 0, completedTasks: 0, pendingTasks: 0, rampOps: 0, completionRate: 0 }
      kpi[sid].totalTasks++
      if (["COMPLETED", "VERIFIED"].includes(t.status)) kpi[sid].completedTasks++
      else kpi[sid].pendingTasks++
    }

    for (const r of (ramps ?? [])) {
      // assigned_staff may be a comma-separated string or array
      const ids = Array.isArray(r.assigned_staff)
        ? r.assigned_staff
        : String(r.assigned_staff).split(",").map((s: string) => s.trim())
      for (const sid of ids) {
        if (kpi[sid]) kpi[sid].rampOps++
      }
    }

    for (const sid in kpi) {
      const k = kpi[sid]
      k.completionRate = k.totalTasks > 0 ? Math.round((k.completedTasks / k.totalTasks) * 100) : 0
    }

    const result = (staff ?? []).map(s => ({
      ...s,
      kpi: kpi[s.id] ?? { totalTasks: 0, completedTasks: 0, pendingTasks: 0, rampOps: 0, completionRate: 0 },
    }))

    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
