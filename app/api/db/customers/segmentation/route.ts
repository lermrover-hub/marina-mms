import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

const supabase = createServerClient()

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const [{ data: customers }, { data: invoices }, { data: boats }] = await Promise.all([
      supabase.from("mms_customers").select("id,first_name,last_name,company_name,customer_type,status,created_at"),
      supabase.from("mms_invoices").select("customer_id,total_amount,status,invoice_date").not("status", "in", '("CANCELLED","DRAFT")'),
      supabase.from("mms_boats").select("id,owner_id"),
    ])

    // Build customer metrics
    const revenue: Record<string, number> = {}
    const lastInvoice: Record<string, string> = {}
    const invoiceCount: Record<string, number> = {}

    for (const inv of (invoices ?? [])) {
      const cid = inv.customer_id
      if (!cid) continue
      revenue[cid] = (revenue[cid] ?? 0) + Number(inv.total_amount ?? 0)
      invoiceCount[cid] = (invoiceCount[cid] ?? 0) + 1
      if (!lastInvoice[cid] || inv.invoice_date > lastInvoice[cid]) lastInvoice[cid] = inv.invoice_date
    }

    const boatCount: Record<string, number> = {}
    for (const b of (boats ?? [])) {
      if (b.owner_id) boatCount[b.owner_id] = (boatCount[b.owner_id] ?? 0) + 1
    }

    const enriched = (customers ?? []).map(c => {
      const totalRevenue = revenue[c.id] ?? 0
      const invCount = invoiceCount[c.id] ?? 0
      const lastDate = lastInvoice[c.id] ?? null
      const daysSinceLast = lastDate
        ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000)
        : null
      const boatsOwned = boatCount[c.id] ?? 0

      // Segment logic
      let segment: "VIP" | "Active" | "At Risk" | "Dormant" | "New"
      if (totalRevenue > 500000) segment = "VIP"
      else if (invCount === 0) segment = "New"
      else if (daysSinceLast !== null && daysSinceLast < 90) segment = "Active"
      else if (daysSinceLast !== null && daysSinceLast < 180) segment = "At Risk"
      else segment = "Dormant"

      const name = c.company_name ?? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()
      return {
        id: c.id,
        name,
        customer_type: c.customer_type,
        status: c.status,
        totalRevenue,
        invCount,
        lastDate,
        daysSinceLast,
        boats: boatsOwned,
        segment,
      }
    })

    // Segment counts
    const segments: Record<string, number> = { VIP: 0, Active: 0, "At Risk": 0, Dormant: 0, New: 0 }
    for (const c of enriched) {
      segments[c.segment] = (segments[c.segment] ?? 0) + 1
    }

    const totalRevenue = Object.values(revenue).reduce((a, b) => a + b, 0)

    return NextResponse.json({ customers: enriched, segments, totalRevenue })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
