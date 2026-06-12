import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const year     = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()))
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from("mms_invoices")
      .select("invoice_date, total_amount, paid_amount, status")
      .gte("invoice_date", `${year}-01-01`)
      .lte("invoice_date", `${year}-12-31`)
      .neq("status", "CANCELLED")

    if (error) throw error

    const monthly: Record<number, { month: number; total: number; paid: number; count: number }> = {}
    for (let m = 1; m <= 12; m++) monthly[m] = { month: m, total: 0, paid: 0, count: 0 }

    for (const inv of data ?? []) {
      const m = new Date(inv.invoice_date).getMonth() + 1
      monthly[m].total += Number(inv.total_amount)
      monthly[m].paid  += Number(inv.paid_amount)
      monthly[m].count += 1
    }

    const ytdTotal = Object.values(monthly).reduce((s, m) => s + m.total, 0)
    const ytdPaid  = Object.values(monthly).reduce((s, m) => s + m.paid,  0)

    return NextResponse.json({
      year,
      monthly: Object.values(monthly),
      ytdTotal,
      ytdPaid,
      collectionRate: ytdTotal > 0 ? Math.round((ytdPaid / ytdTotal) * 100) : 0,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
