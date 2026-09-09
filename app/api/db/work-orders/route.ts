import { NextResponse } from "next/server"
import { getWorkOrders } from "@/lib/db"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const data = await getWorkOrders()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const supabase = createServerClient()
    const reference = String(body.reference ?? body.wo_number ?? `WO-${Date.now().toString().slice(-6)}`).trim()
    if (!reference) {
      return NextResponse.json({ error: "Work order reference is required" }, { status: 400 })
    }
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from("mms_work_orders")
      .insert({
        ...body,
        reference,
        // Staging retains the legacy NOT NULL wo_number column; production uses reference.
        // Persist both to keep one API contract across the two schemas.
        wo_number: String(body.wo_number ?? reference),
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
