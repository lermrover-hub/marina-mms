import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status     = searchParams.get("status")
    const workOrderId = searchParams.get("work_order_id")

    let query = supabase
      .from("mms_purchase_requests")
      .select("*, mms_purchase_request_items(*)")
      .order("created_at", { ascending: false })
    if (status)      query = query.eq("status", status)
    if (workOrderId) query = query.eq("work_order_id", workOrderId)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const now = new Date().toISOString()
    const { items, ...prBody } = body
    // Insert PR header
    const { data: pr, error: prErr } = await supabase
      .from("mms_purchase_requests")
      .insert({ ...prBody, created_at: now, updated_at: now })
      .select()
      .single()
    if (prErr) throw prErr
    // Insert items if provided
    if (Array.isArray(items) && items.length > 0) {
      const { error: itemErr } = await supabase
        .from("mms_purchase_request_items")
        .insert(items.map((it: Record<string, unknown>, i: number) => ({
          ...it,
          purchase_request_id: pr.id,
          sort_order: i,
        })))
      if (itemErr) throw itemErr
    }
    return NextResponse.json(pr, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
