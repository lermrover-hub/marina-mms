import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const workOrderId = searchParams.get("work_order_id")
    const supabase = createServerClient()

    let q = supabase
      .from("mms_material_usage")
      .select("*, mms_work_orders(reference, title, customer_name)")
      .order("created_at", { ascending: false })
      .limit(300)

    if (workOrderId) q = q.eq("work_order_id", workOrderId)

    const { data, error } = await q
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
