import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

const supabase = createServerClient()

export const dynamic = "force-dynamic"

type StaffRow = Record<string, unknown> & {
  name?: string | null
  full_name?: string | null
  active?: boolean | null
  is_active?: boolean | null
}

function normalizeStaff(row: StaffRow) {
  return {
    ...row,
    name: row.name ?? row.full_name ?? "",
    active: row.active ?? row.is_active ?? true,
  }
}

export async function GET() {
  try {
    let { data, error } = await supabase
      .from("mms_staff")
      .select("*")
      .order("name")

    if (error && error.code === "PGRST204") {
      const fallback = await supabase
        .from("mms_staff")
        .select("*")
        .order("full_name")
      data = fallback.data
      error = fallback.error
    }

    if (error) throw error
    return NextResponse.json((data ?? []).map((row) => normalizeStaff(row as StaffRow)))
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { data, error } = await supabase
      .from("mms_staff")
      .insert(body)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
