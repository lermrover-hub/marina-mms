import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Monthly revenue last 6 months
    const { data: monthlyRevenue } = await supabase
      .from("mms_invoices")
      .select("invoice_date, total_amount, invoice_type, status")
      .not("status", "in", '("CANCELLED","DRAFT")')
      .gte("invoice_date", new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10))
      .order("invoice_date")

    // Build monthly totals
    const monthly: Record<string, { month: string; revenue: number; recurring: number; workOrder: number; manual: number }> = {}
    for (const inv of (monthlyRevenue ?? [])) {
      const m = (inv.invoice_date as string).slice(0, 7) // YYYY-MM
      if (!monthly[m]) monthly[m] = { month: m, revenue: 0, recurring: 0, workOrder: 0, manual: 0 }
      monthly[m].revenue   += Number(inv.total_amount ?? 0)
      if (inv.invoice_type === "RECURRING")    monthly[m].recurring  += Number(inv.total_amount ?? 0)
      else if (inv.invoice_type === "WORK_ORDER") monthly[m].workOrder += Number(inv.total_amount ?? 0)
      else monthly[m].manual += Number(inv.total_amount ?? 0)
    }
    const monthlyData = Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month))

    // Berth occupancy trend
    const { data: berths } = await supabase.from("mms_berths").select("status, berth_type")
    const totalBerths    = berths?.length ?? 0
    const occupiedBerths = berths?.filter(b => b.status === "OCCUPIED" || b.status === "RESERVED").length ?? 0
    const occupancyPct   = totalBerths > 0 ? Math.round((occupiedBerths / totalBerths) * 100) : 0

    // Revenue by category (work orders by category)
    const { data: woStats } = await supabase
      .from("mms_work_orders")
      .select("category, quoted_amount, actual_cost")
      .eq("status", "CLOSED")
      .not("quoted_amount", "is", null)

    const byCategory: Record<string, { revenue: number; cost: number; count: number }> = {}
    for (const wo of (woStats ?? [])) {
      const cat = (wo.category as string | null) ?? "Other"
      if (!byCategory[cat]) byCategory[cat] = { revenue: 0, cost: 0, count: 0 }
      byCategory[cat].revenue += Number(wo.quoted_amount ?? 0)
      byCategory[cat].cost    += Number(wo.actual_cost ?? 0)
      byCategory[cat].count++
    }

    // Top 5 customers by invoice total
    const { data: custInv } = await supabase
      .from("mms_invoices")
      .select("customer_id, customer_name, total_amount")
      .not("status", "in", '("CANCELLED","DRAFT")')

    const byCustomer: Record<string, { name: string; total: number }> = {}
    for (const inv of (custInv ?? [])) {
      const cid = (inv.customer_id as string | null) ?? "unknown"
      if (!byCustomer[cid]) byCustomer[cid] = { name: (inv.customer_name as string | null) ?? "—", total: 0 }
      byCustomer[cid].total += Number(inv.total_amount ?? 0)
    }
    const topCustomers = Object.entries(byCustomer)
      .map(([id, v]) => ({ customer_id: id, name: v.name, total: v.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    return NextResponse.json({
      monthlyRevenue: monthlyData,
      occupancy:      { total: totalBerths, occupied: occupiedBerths, pct: occupancyPct },
      byCategory:     Object.entries(byCategory)
        .map(([cat, v]) => ({ category: cat, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6),
      topCustomers,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
