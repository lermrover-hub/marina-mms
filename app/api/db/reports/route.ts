import { NextResponse } from "next/server"
import { getReportStats } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const data = await getReportStats()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
