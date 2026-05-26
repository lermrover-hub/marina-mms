import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

const supabase = createServerClient()

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { data: workOrders } = await supabase
      .from("mms_work_orders")
      .select("id,reference,title,category,status,quoted_amount,actual_cost,customer_name,boat_name,created_at")
      .in("status", ["COMPLETED","CLOSED","WAITING_INVOICE"])
      .not("quoted_amount", "is", null)
      .order("created_at", { ascending: false })
      .limit(100)

    const jobs = (workOrders ?? []).map(wo => {
      const revenue = Number(wo.quoted_amount ?? 0)
      const cost    = Number(wo.actual_cost ?? 0)
      const profit  = revenue - cost
      const margin  = revenue > 0 ? Math.round((profit / revenue) * 100) : 0
      return { ...wo, revenue, cost, profit, margin }
    })

    // By category summary
    const byCat: Record<string, { revenue: number; cost: number; count: number }> = {}
    for (const j of jobs) {
      const c = j.category ?? "Other"
      if (!byCat[c]) byCat[c] = { revenue: 0, cost: 0, count: 0 }
      byCat[c].revenue += j.revenue
      byCat[c].cost    += j.cost
      byCat[c].count++
    }
    const byCategory = Object.entries(byCat).map(([category, v]) => ({
      category, ...v,
      profit: v.revenue - v.cost,
      margin: v.revenue > 0 ? Math.round(((v.revenue - v.cost) / v.revenue) * 100) : 0,
    })).sort((a, b) => b.revenue - a.revenue)

    const totalRevenue = jobs.reduce((s, j) => s + j.revenue, 0)
    const totalCost    = jobs.reduce((s, j) => s + j.cost, 0)
    const totalProfit  = totalRevenue - totalCost
    const avgMargin    = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0

    return NextResponse.json({ jobs, byCategory, summary: { totalRevenue, totalCost, totalProfit, avgMargin, jobCount: jobs.length } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
