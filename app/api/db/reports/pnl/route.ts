import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

type MonthRow = {
  month: number
  revenue: number
  collected: number
  directCost: number
  grossProfit: number
  margin: number
  invoiceCount: number
  workOrderCount: number
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

/**
 * Monthly management P&L preview.
 *
 * Revenue is net invoiced revenue (subtotal less invoice discount, excluding VAT).
 * Direct cost comes from completed/closed work orders. This intentionally does
 * not invent cost for storage or services that have no approved cost snapshot.
 * Finance should reconcile unmapped costs before treating this as a statutory P&L.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const year = Number(searchParams.get("year") ?? new Date().getFullYear())
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Invalid year." }, { status: 400 })
    }
    const supabase = createServerClient()
    const start = `${year}-01-01`
    const end = `${year}-12-31`

    const [{ data: invoices, error: invoiceError }, { data: workOrders, error: workOrderError }] = await Promise.all([
      supabase
        .from("mms_invoices")
        .select("invoice_date,subtotal,discount,total_amount,paid_amount,status")
        .gte("invoice_date", start)
        .lte("invoice_date", end)
        .neq("status", "CANCELLED"),
      supabase
        .from("mms_work_orders")
        .select("created_at,status,total_revenue,total_labor_cost,total_material_cost,total_contractor_cost")
        .gte("created_at", `${year}-01-01T00:00:00.000Z`)
        .lt("created_at", `${year + 1}-01-01T00:00:00.000Z`)
        .in("status", ["COMPLETED", "CLOSED", "WAITING_INVOICE"]),
    ])
    if (invoiceError) throw invoiceError
    if (workOrderError) throw workOrderError

    const monthly: MonthRow[] = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      revenue: 0,
      collected: 0,
      directCost: 0,
      grossProfit: 0,
      margin: 0,
      invoiceCount: 0,
      workOrderCount: 0,
    }))

    for (const invoice of invoices ?? []) {
      const month = new Date(`${invoice.invoice_date}T00:00:00Z`).getUTCMonth()
      const row = monthly[month]
      // Some legacy rows use `discount`, newer rows use `discount_amount`.
      const gross = Number(invoice.subtotal ?? 0)
      const discount = Number(invoice.discount ?? 0)
      row.revenue += Math.max(0, gross - discount)
      row.collected += Number(invoice.paid_amount ?? 0)
      row.invoiceCount += 1
    }

    for (const workOrder of workOrders ?? []) {
      const month = new Date(workOrder.created_at).getUTCMonth()
      const row = monthly[month]
      row.directCost += Number(workOrder.total_labor_cost ?? 0)
        + Number(workOrder.total_material_cost ?? 0)
        + Number(workOrder.total_contractor_cost ?? 0)
      row.workOrderCount += 1
    }

    for (const row of monthly) {
      row.grossProfit = row.revenue - row.directCost
      row.margin = row.revenue > 0 ? Math.round((row.grossProfit / row.revenue) * 100) : 0
    }

    const summary = monthly.reduce((result, row) => ({
      revenue: result.revenue + row.revenue,
      collected: result.collected + row.collected,
      directCost: result.directCost + row.directCost,
      grossProfit: result.grossProfit + row.grossProfit,
      invoiceCount: result.invoiceCount + row.invoiceCount,
      workOrderCount: result.workOrderCount + row.workOrderCount,
    }), { revenue: 0, collected: 0, directCost: 0, grossProfit: 0, invoiceCount: 0, workOrderCount: 0 })

    const responseBody = {
      year,
      basis: {
        revenue: "Net invoiced subtotal excluding VAT and invoice discount",
        cost: "Completed/closed work-order labor, material and contractor totals",
        limitation: "This is a management P&L preview; unmapped or unposted costs are excluded, not estimated.",
      },
      monthly,
      summary: { ...summary, margin: summary.revenue > 0 ? Math.round((summary.grossProfit / summary.revenue) * 100) : 0 },
    }

    if (searchParams.get("format") === "csv") {
      const headers = ["month", "revenue_ex_vat", "collected", "direct_cost", "gross_profit", "gross_margin_pct", "invoice_count", "work_order_count"]
      const rows = monthly.map((row) => [
        `${year}-${String(row.month).padStart(2, "0")}`,
        row.revenue,
        row.collected,
        row.directCost,
        row.grossProfit,
        row.margin,
        row.invoiceCount,
        row.workOrderCount,
      ].map(csvCell).join(","))
      return new NextResponse(`\uFEFF${[headers.join(","), ...rows].join("\r\n")}`, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="pnl-${year}.csv"`,
        },
      })
    }

    return NextResponse.json(responseBody)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
