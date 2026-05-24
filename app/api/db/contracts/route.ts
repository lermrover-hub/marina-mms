import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

// Auto-generate contract number: CTR-YYYYMM-XXXX
async function nextContractNumber(): Promise<string> {
  const prefix = `CTR-${new Date().toISOString().slice(0,7).replace("-","")}-`
  const { data } = await supabase
    .from("mms_contracts")
    .select("contract_number")
    .ilike("contract_number", `${prefix}%`)
    .order("contract_number", { ascending: false })
    .limit(1)
  if (data && data.length > 0) {
    const last = parseInt(data[0].contract_number.split("-").at(-1) ?? "0") || 0
    return `${prefix}${String(last + 1).padStart(4, "0")}`
  }
  return `${prefix}0001`
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status      = searchParams.get("status")
    const customerId  = searchParams.get("customer_id")
    const contractType = searchParams.get("contract_type")
    const berthId     = searchParams.get("berth_id")

    let query = supabase
      .from("mms_contracts")
      .select("*")
      .order("created_at", { ascending: false })

    if (status)       query = query.eq("status", status)
    if (customerId)   query = query.eq("customer_id", customerId)
    if (contractType) query = query.eq("contract_type", contractType)
    if (berthId)      query = query.eq("berth_id", berthId)

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
    if (!body.contract_number) {
      body.contract_number = await nextContractNumber()
    }
    const { data, error } = await supabase
      .from("mms_contracts")
      .insert(body)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
