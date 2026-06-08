/**
 * Ko Samui 2026 Tide Data — re-exports from official data source
 *
 * The original simulated data has been replaced with official Ko Samui tide
 * predictions sourced from the Ko Samui tide table 2026 PDF
 * (Thai Hydrographic Department).
 *
 * All exports below are pass-through to tide-data-2026-real.ts.
 * Consumers of this module do not need to change any imports.
 */
export {
  TIDE_2026,
  getTideHeightsForDate,
  getTideDataForDate,
  getTideHeights2026,
  getTideData2026,
  MONTH_NAMES,
  DAYS_IN_MONTH_2026,
} from "./tide-data-2026-real"
