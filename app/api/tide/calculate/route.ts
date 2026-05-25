import { NextRequest, NextResponse } from "next/server"

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
    const tideData: TideSlot[] = Array.isArray(body.tideData) ? body.tideData : []

    if (boatDraft < 0 || trailerHeight < 0 || safetyClearance < 0) {
      return NextResponse.json({ error: "Draft, trailer height, and safety clearance must be non-negative." }, { status: 400 })
    }

    if (tideData.length === 0) {
      return NextResponse.json({ error: "tideData must be a non-empty array of { hour, height }." }, { status: 400 })
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
