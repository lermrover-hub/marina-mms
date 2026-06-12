import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

interface TideSlot {
  hour: number
  height: number
}

interface TideResultSlot {
  hour: number
  time: string
  height: number
  safe: boolean
}

interface SafeWindow {
  start: number
  end: number
  startTime: string
  endTime: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const boatDraft: number = Number(body.boatDraft ?? 0)
    const trailerHeight: number = Number(body.trailerHeight ?? 0)
    const safetyClearance: number = Number(body.safetyClearance ?? 0)
    const rampDepthOffset: number = Number(body.rampDepthOffset ?? -1.0)

    // If a date is provided, load tide data from DB instead of requiring it in the body
    let tideData: TideSlot[] = Array.isArray(body.tideData) ? body.tideData : []
    if (tideData.length === 0 && body.date) {
      const supabase = createServerClient()
      const { data, error } = await supabase
        .from("mms_tide_records")
        .select("hour, tide_m")
        .eq("date", body.date)
        .order("hour")
      if (error) return NextResponse.json({ error: `Tide data error: ${error.message}` }, { status: 500 })
      if (!data || data.length === 0) {
        return NextResponse.json({ error: `No tide data found for date: ${body.date}` }, { status: 404 })
      }
      tideData = data.map((r) => ({ hour: Number(r.hour), height: Number(r.tide_m) }))
    }

    if (boatDraft < 0 || trailerHeight < 0 || safetyClearance < 0) {
      return NextResponse.json({ error: "Draft, trailer height, and safety clearance must be non-negative." }, { status: 400 })
    }

    if (tideData.length === 0) {
      return NextResponse.json({ error: "Provide either 'date' (YYYY-MM-DD) to load from DB, or 'tideData' array of { hour, height }." }, { status: 400 })
    }

    // Business formula
    const requiredActualDepth = boatDraft + trailerHeight + safetyClearance
    const requiredTideHeight = requiredActualDepth - rampDepthOffset

    // Build per-hour results
    const slots: TideResultSlot[] = tideData.map((slot) => {
      const hour = Number(slot.hour)
      const height = Number(slot.height)
      const safe = height >= requiredTideHeight
      const hh = String(hour).padStart(2, "0")
      return {
        hour,
        time: `${hh}:00`,
        height,
        safe,
      }
    })

    // Earliest safe hour
    const firstSafe = slots.find((s) => s.safe)
    const earliestSafeHour = firstSafe ? firstSafe.hour : null

    // Contiguous safe windows
    const safeWindows: SafeWindow[] = []
    let windowStart: number | null = null

    for (let i = 0; i < slots.length; i++) {
      const s = slots[i]
      if (s.safe && windowStart === null) {
        windowStart = s.hour
      }
      if (!s.safe && windowStart !== null) {
        const endHour = slots[i - 1].hour
        safeWindows.push({
          start: windowStart,
          end: endHour,
          startTime: `${String(windowStart).padStart(2, "0")}:00`,
          endTime: `${String(endHour).padStart(2, "0")}:00`,
        })
        windowStart = null
      }
    }
    // Close any open window at end of data
    if (windowStart !== null) {
      const endHour = slots[slots.length - 1].hour
      safeWindows.push({
        start: windowStart,
        end: endHour,
        startTime: `${String(windowStart).padStart(2, "0")}:00`,
        endTime: `${String(endHour).padStart(2, "0")}:00`,
      })
    }

    return NextResponse.json({
      requiredActualDepth: Math.round(requiredActualDepth * 100) / 100,
      requiredTideHeight: Math.round(requiredTideHeight * 100) / 100,
      slots,
      earliestSafeHour,
      safeWindows,
    })
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }
}

// GET /api/tide/calculate?date=2026-06-12 — returns raw hourly tide data for a date
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date")
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date query param required (YYYY-MM-DD)" }, { status: 400 })
  }
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("mms_tide_records")
    .select("hour, tide_m, source")
    .eq("date", date)
    .order("hour")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: `No tide data for ${date}` }, { status: 404 })
  return NextResponse.json({ date, records: data })
}
