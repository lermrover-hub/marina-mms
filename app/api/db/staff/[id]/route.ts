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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { data, error } = await supabase
      .from("mms_staff")
      .select("*")
      .eq("id", id)
      .single()
    if (error) throw error
    return NextResponse.json(normalizeStaff(data as StaffRow))
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { data, error } = await supabase
      .from("mms_staff")
      .update(body)
      .eq("id", id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
