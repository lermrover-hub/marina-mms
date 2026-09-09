import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

const supabase = createServerClient()

export const dynamic = "force-dynamic"

function csvCell(value: unknown) {
  const text = String(value ?? "")
  return `"${text.replace(/"/g, '""')}"`
}

export async function GET(req: Request) {
  try {
    const { data: workOrders } = await supabase
      .from("mms_work_orders")
      .select("id,reference,title,category,status,total_revenue,total_labor_cost,total_material_cost,total_contractor_cost,customer_name,boat_name,created_at")
      .in("status", ["COMPLETED","CLOSED","WAITING_INVOICE"])
      .not("total_revenue", "is", null)
      .order("created_at", { ascending: false })
      .limit(100)

    const jobs = (workOrders ?? []).map(wo => {
      const revenue = Number(wo.total_revenue ?? 0)
      const laborCost = Number(wo.total_labor_cost ?? 0)
      const materialCost = Number(wo.total_material_cost ?? 0)
      const contractorCost = Number(wo.total_contractor_cost ?? 0)
      const cost = laborCost + materialCost + contractorCost
      const profit  = revenue - cost
      const margin  = revenue > 0 ? Math.round((profit / revenue) * 100) : 0
      return { ...wo, revenue, laborCost, materialCost, contractorCost, cost, profit, margin }
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

    if (new URL(req.url).searchParams.get("format") === "csv") {
      const headers = ["reference", "customer", "boat", "category", "status", "revenue", "labor_cost", "material_cost", "contractor_cost", "total_cost", "gross_profit", "gross_margin_pct"]
      const rows = jobs.map((job) => [
        job.reference, job.customer_name, job.boat_name, job.category, job.status,
        job.revenue, job.laborCost, job.materialCost, job.contractorCost,
        job.cost, job.profit, job.margin,
      ].map(csvCell).join(","))
      return new NextResponse(`\uFEFF${[headers.join(","), ...rows].join("\r\n")}`, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="job-margin-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    return NextResponse.json({ jobs, byCategory, summary: { totalRevenue, totalCost, totalProfit, avgMargin, jobCount: jobs.length } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
