import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = createServerClient()
    const today = new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from("mms_invoices")
      .select("customer_id, customer_name, invoice_number, due_date, outstanding_balance, status")
      .gt("outstanding_balance", 0)
      .not("status", "in", '("PAID","CANCELLED")')
      .order("outstanding_balance", { ascending: false })

    if (error) throw error

    // Group by customer
    const customers: Record<string, {
      customer_id: string | null
      customer_name: string
      invoices: { invoice_number: string; due_date: string | null; outstanding: number; days_overdue: number }[]
      total_outstanding: number
      max_days_overdue: number
    }> = {}

    for (const inv of data ?? []) {
      const key = inv.customer_name ?? "Unknown"
      if (!customers[key]) customers[key] = {
        customer_id: inv.customer_id,
        customer_name: key,
        invoices: [],
        total_outstanding: 0,
        max_days_overdue: 0,
      }
      const daysOverdue = inv.due_date
        ? Math.max(0, Math.floor((new Date(today).getTime() - new Date(inv.due_date).getTime()) / 86400000))
        : 0
      customers[key].invoices.push({ invoice_number: inv.invoice_number, due_date: inv.due_date, outstanding: Number(inv.outstanding_balance), days_overdue: daysOverdue })
      customers[key].total_outstanding += Number(inv.outstanding_balance)
      customers[key].max_days_overdue = Math.max(customers[key].max_days_overdue, daysOverdue)
    }

    const rows = Object.values(customers).sort((a, b) => b.total_outstanding - a.total_outstanding)
    const grandTotal = rows.reduce((s, r) => s + r.total_outstanding, 0)

    return NextResponse.json({ rows, grand_total: grandTotal })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
