import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

const supabase = createServerClient()

export const dynamic = "force-dynamic"

// PostgreSQL undefined_column error code. Staging can lag the optional
// sort_order migration, so keep task reads compatible until it is applied.
const MISSING_COLUMN = "42703"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const workOrderId = searchParams.get("work_order_id")
    let query = supabase.from("mms_work_order_tasks").select("*").order("sort_order").order("created_at")
    if (workOrderId) query = query.eq("work_order_id", workOrderId)
    const { data, error } = await query
    if (error) {
      if (error.code !== MISSING_COLUMN) throw error

      let fallback = supabase.from("mms_work_order_tasks").select("*").order("created_at")
      if (workOrderId) fallback = fallback.eq("work_order_id", workOrderId)
      const { data: fallbackData, error: fallbackError } = await fallback
      if (fallbackError) throw fallbackError
      return NextResponse.json(fallbackData ?? [])
    }
    return NextResponse.json(data ?? [])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from("mms_work_order_tasks")
      .insert({ ...body, created_at: now, updated_at: now })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
