/**
 * Tide Agent — L3 Executor
 * Calls /api/tide/calculate, returns safe windows for a boat/date.
 */
import { apiFetch, getBoat } from "../lib/api-client.js"
import { getAgentConfig } from "../lib/agent-config.js"

// FORBIDDEN — this agent must NEVER:
// - Declare a launch or haul-out window SAFE without actual tide data
// - Override or suppress the operational safety warning
// - Approve a vessel launch (advisory only — dockmaster confirms on the day)
// - Change ramp offset or safety clearance values directly in code
//   (use Settings → AI Agent Rules → Tide Agent instead)

export async function run({ boatId, date, tideData, trailerHeight, safetyClearance, rampDepthOffset } = {}) {
  const cfg = await getAgentConfig("tide")
  // Existing DB may still contain the retired 0.70 m trailer setting.
  // Fail closed rather than using a height that contradicts ORM's confirmed
  // 0.60 m central-frame geometry.
  if (trailerHeight === undefined && Number(cfg.trailer_height_m) !== 0.60) {
    return {
      ok: false,
      reason: "stale_tide_agent_config",
      warning: "Update the Tide Agent trailer_height_m to 0.60 m in Settings; verify LLW datum and ramp -1.00 m offset before operation."
    }
  }
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
      const targetDate = date ?? new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10)
      const res = await apiFetch(`/api/tide/calculate?date=${targetDate}`)
      slots = Array.isArray(res?.records)
        ? res.records.map((r) => ({ hour: Number(r.hour), height: Number(r.tide_m) }))
        : null
    } catch { /* No operational tide data — fail closed. */ }
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
