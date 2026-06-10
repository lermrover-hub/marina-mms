/**
 * Tide Agent — L3 Executor
 * Calls /api/tide/calculate, returns safe windows for a boat/date.
 */
import { apiFetch, getBoat } from "../lib/api-client.js"
import { getAgentConfig } from "../lib/agent-config.js"

export async function run({ boatId, date, tideData, trailerHeight, safetyClearance, rampDepthOffset } = {}) {
  const cfg = await getAgentConfig("tide")
  console.log(`[TideAgent] boat=${boatId ?? "unknown"} date=${date ?? "today"}`)

  // Get boat draft
  let draftM = 0
  if (boatId) {
    try {
      const boat = await getBoat(boatId)
      // loa_ft stored in feet — draft may be in feet or metres
      const raw = boat.draft_m ?? (boat.draft_ft ? boat.draft_ft * 0.3048 : 0)
      draftM = Number(raw) || 0
    } catch (e) { console.warn("[TideAgent] boat fetch:", e.message) }
  }

  // If caller didn't pass tide data, load from API (tide-data endpoint)
  let slots = tideData
  if (!slots) {
    try {
      const targetDate = date ?? new Date().toISOString().split("T")[0]
      const res = await apiFetch(`/api/db/ramp-bookings/tide?date=${targetDate}`)
      slots = res?.slots ?? res?.data ?? null
    } catch { /* tide data not available; use stub */ }
  }

  if (!slots || slots.length === 0) {
    console.warn("[TideAgent] No tide data available — returning empty result.")
    return { ok: false, reason: "no_tide_data", draftM }
  }

  const body = {
    boatDraft:       draftM,
    trailerHeight:   trailerHeight   ?? cfg.trailer_height_m,
    safetyClearance: safetyClearance ?? cfg.safety_clearance_m,
    rampDepthOffset: rampDepthOffset ?? cfg.ramp_offset_m,
    tideData:        slots,
  }

  const result = await apiFetch("/api/tide/calculate", {
    method: "POST",
    body: JSON.stringify(body),
  })

  console.log(`[TideAgent] requiredDepth=${result.requiredActualDepth}m, safeWindows=${result.safeWindows?.length ?? 0}`)

  return {
    ok: true,
    draftM,
    requiredActualDepth: result.requiredActualDepth,
    requiredTideHeight:  result.requiredTideHeight,
    earliestSafeHour:    result.earliestSafeHour,
    safeWindows:         result.safeWindows ?? [],
    slots:               result.slots ?? [],
    warning: "Tide prediction may differ from actual sea level due to weather. Final confirmation required on the day.",
  }
}
