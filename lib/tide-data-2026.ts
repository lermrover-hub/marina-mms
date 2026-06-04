/**
 * Ko Samui 2026 Representative Tide Data
 * Source: Based on Thai Hydrographic Department tidal characteristics for
 * Ko Samui / Surat Thani area (Gulf of Thailand, 9.5°N 100.06°E)
 *
 * Gulf of Thailand has predominantly diurnal tides with seasonal variation:
 * - NE Monsoon (Nov–Feb): higher tidal range, up to ~2.2m
 * - SW Monsoon (May–Aug): reduced range ~1.5–1.7m
 * - Transition months: moderate range
 *
 * Chart Datum: Lowest Astronomical Tide (LAT)
 * All heights in metres above chart datum.
 *
 * Format: KO_SAMUI_2026[month][day] = number[24]
 * month = 1–12, day = 1–(days in month)
 */

// Monthly representative 24-hour patterns (meters above chart datum)
// Each array = hourly heights from 00:00 to 23:00
const MONTHLY_PATTERNS: Record<number, number[]> = {
  1:  [0.8, 0.6, 0.5, 0.6, 0.9, 1.3, 1.7, 1.9, 2.0, 1.9, 1.7, 1.5, 1.3, 1.1, 0.9, 0.8, 0.8, 0.9, 1.1, 1.4, 1.6, 1.7, 1.6, 1.3],
  2:  [0.7, 0.5, 0.4, 0.5, 0.8, 1.2, 1.6, 1.9, 2.1, 2.1, 1.9, 1.7, 1.5, 1.2, 1.0, 0.8, 0.7, 0.8, 1.0, 1.3, 1.5, 1.7, 1.6, 1.2],
  3:  [0.6, 0.4, 0.3, 0.5, 0.8, 1.2, 1.6, 1.9, 2.0, 2.0, 1.8, 1.6, 1.3, 1.1, 0.9, 0.7, 0.6, 0.7, 1.0, 1.3, 1.5, 1.6, 1.5, 1.1],
  4:  [0.6, 0.4, 0.3, 0.4, 0.7, 1.1, 1.5, 1.8, 1.9, 1.9, 1.7, 1.5, 1.2, 1.0, 0.8, 0.6, 0.5, 0.6, 0.9, 1.2, 1.5, 1.6, 1.5, 1.1],
  5:  [0.8, 0.5, 0.4, 0.5, 0.8, 1.2, 1.5, 1.7, 1.8, 1.7, 1.5, 1.3, 1.1, 0.9, 0.8, 0.7, 0.7, 0.8, 1.0, 1.2, 1.4, 1.5, 1.4, 1.1],
  6:  [0.9, 0.7, 0.5, 0.6, 0.8, 1.1, 1.4, 1.6, 1.7, 1.7, 1.5, 1.3, 1.1, 0.9, 0.8, 0.7, 0.7, 0.8, 1.0, 1.2, 1.3, 1.4, 1.3, 1.1],
  7:  [1.0, 0.8, 0.6, 0.6, 0.8, 1.1, 1.3, 1.5, 1.6, 1.6, 1.4, 1.2, 1.0, 0.9, 0.8, 0.7, 0.7, 0.8, 1.0, 1.1, 1.3, 1.3, 1.2, 1.1],
  8:  [1.0, 0.8, 0.6, 0.6, 0.8, 1.0, 1.3, 1.5, 1.5, 1.5, 1.4, 1.2, 1.0, 0.9, 0.8, 0.7, 0.7, 0.8, 0.9, 1.1, 1.2, 1.3, 1.2, 1.1],
  9:  [0.9, 0.7, 0.5, 0.6, 0.8, 1.1, 1.4, 1.6, 1.7, 1.7, 1.5, 1.3, 1.1, 0.9, 0.8, 0.7, 0.7, 0.8, 1.0, 1.2, 1.4, 1.5, 1.4, 1.1],
  10: [0.8, 0.6, 0.4, 0.5, 0.8, 1.2, 1.5, 1.8, 1.9, 1.9, 1.7, 1.5, 1.3, 1.0, 0.8, 0.7, 0.7, 0.8, 1.0, 1.3, 1.5, 1.6, 1.5, 1.1],
  11: [0.7, 0.5, 0.3, 0.4, 0.7, 1.2, 1.6, 1.9, 2.1, 2.2, 2.0, 1.8, 1.5, 1.2, 1.0, 0.8, 0.7, 0.8, 1.0, 1.3, 1.6, 1.8, 1.8, 1.4],
  12: [0.8, 0.6, 0.4, 0.5, 0.8, 1.2, 1.6, 1.9, 2.1, 2.1, 1.9, 1.7, 1.4, 1.1, 0.9, 0.8, 0.8, 0.9, 1.1, 1.4, 1.7, 1.8, 1.7, 1.3],
}

const DAYS_IN_MONTH_2026: Record<number, number> = {
  1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30,
  7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31,
}

/**
 * Slight day-to-day shift variation: Ko Samui's mixed diurnal tides shift
 * timing by roughly 30–50 minutes per day. We simulate this with a small
 * rotation of the 24-hour pattern.
 */
function shiftPattern(pattern: number[], shiftHours: number): number[] {
  const len = pattern.length
  const shift = Math.round(shiftHours) % len
  if (shift === 0) return [...pattern]
  return [...pattern.slice(shift), ...pattern.slice(0, shift)]
}

/**
 * Add slight amplitude variation to simulate spring/neap cycle (~14-day period)
 */
function applyLunarPhase(pattern: number[], dayOfMonth: number): number[] {
  // Spring tides near new/full moon (approx day 1, 8, 15, 22, 29)
  const springDays = [1, 8, 15, 22, 29]
  const nearest = springDays.reduce((a, b) =>
    Math.abs(b - dayOfMonth) < Math.abs(a - dayOfMonth) ? b : a
  )
  const dist = Math.abs(dayOfMonth - nearest)
  // Amplitude factor: 1.0 at spring, 0.85 at neap (7 days between)
  const factor = 1.0 - 0.15 * (dist / 7)
  const mean = pattern.reduce((a, b) => a + b, 0) / pattern.length
  return pattern.map((h) => +(mean + (h - mean) * factor).toFixed(2))
}

/**
 * Get 24-hour hourly tide heights for a specific date in 2026.
 * Returns array of { hour, height } objects.
 */
export function getTideData2026(month: number, day: number): { hour: number; height: number }[] {
  const base = MONTHLY_PATTERNS[month] ?? MONTHLY_PATTERNS[1]
  // Day-based shift: ~40 min shift per day within the month
  const shiftHours = Math.floor((day - 1) * 0.67) % 24
  const shifted = shiftPattern(base, shiftHours)
  const withLunar = applyLunarPhase(shifted, day)
  return withLunar.map((height, hour) => ({ hour, height }))
}

/**
 * Get tide heights as a flat 24-element array (for the calculator input).
 */
export function getTideHeights2026(month: number, day: number): number[] {
  return getTideData2026(month, day).map((s) => s.height)
}

export const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export { DAYS_IN_MONTH_2026 }
