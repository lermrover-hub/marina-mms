import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const berth_id    = searchParams.get("berth_id")
  const customer_id = searchParams.get("customer_id")
  const utility_type= searchParams.get("utility_type")
  const billed      = searchParams.get("billed")
  const from        = searchParams.get("from")
  const to          = searchParams.get("to")
  const limit       = parseInt(searchParams.get("limit") ?? "100")

  let q = supabase
    .from("mms_utility_readings")
    .select("*")
    .order("reading_date", { ascending: false })
    .limit(limit)

  if (berth_id)     q = q.eq("berth_id", berth_id)
  if (customer_id)  q = q.eq("customer_id", customer_id)
  if (utility_type) q = q.eq("utility_type", utility_type)
  if (billed !== null && billed !== "") q = q.eq("billed", billed === "true")
  if (from)         q = q.gte("reading_date", from)
  if (to)           q = q.lte("reading_date", to)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const body = await req.json()
  const {
    berth_id, berth_code, boat_id, boat_name,
    customer_id, customer_name, contract_id,
    reading_date, utility_type, meter_id,
    previous_reading, current_reading, unit_price,
    currency, notes, recorded_by,
  } = body

  if (!utility_type || current_reading == null || unit_price == null) {
    return NextResponse.json({ error: "utility_type, current_reading, unit_price are required" }, { status: 400 })
  }
  if (Number(current_reading) < Number(previous_reading ?? 0)) {
    return NextResponse.json({ error: "Current reading cannot be less than previous reading" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("mms_utility_readings")
    .insert({
      berth_id, berth_code, boat_id, boat_name,
      customer_id, customer_name, contract_id,
      reading_date: reading_date ?? new Date().toISOString().slice(0, 10),
      utility_type,
      meter_id,
      previous_reading: Number(previous_reading ?? 0),
      current_reading: Number(current_reading),
      unit_price: Number(unit_price),
      currency: currency ?? "THB",
      notes,
      recorded_by,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
