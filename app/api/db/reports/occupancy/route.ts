import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: berths, error } = await supabase
      .from("mms_berths")
      .select("berth_type, status, current_boat_id")
      .neq("status", "MAINTENANCE")

    if (error) throw error

    const groups: Record<string, { type: string; total: number; occupied: number }> = {}
    for (const b of berths ?? []) {
      if (!groups[b.berth_type]) groups[b.berth_type] = { type: b.berth_type, total: 0, occupied: 0 }
      groups[b.berth_type].total++
      if (b.current_boat_id) groups[b.berth_type].occupied++
    }

    const result = Object.values(groups).map(g => ({
      ...g,
      available: g.total - g.occupied,
      pct: g.total > 0 ? Math.round((g.occupied / g.total) * 100) : 0,
    }))

    return NextResponse.json({ berths: result })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
