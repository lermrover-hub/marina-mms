const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Validate the date portion of a berth assignment before it is persisted.
 * End dates are inclusive: a booking ending on 2026-10-18 releases the slot
 * for 2026-10-19. No artificial maximum duration is imposed because long-term
 * storage contracts are valid business cases.
 */
export function validateBerthAssignmentDates(input: {
  start_date?: unknown
  end_date?: unknown
}) {
  const start = input.start_date
  const end = input.end_date

  if (typeof start !== "string" || !ISO_DATE.test(start)) {
    return "start_date must use YYYY-MM-DD format"
  }
  if (end !== null && end !== undefined && (typeof end !== "string" || !ISO_DATE.test(end))) {
    return "end_date must use YYYY-MM-DD format or be null"
  }
  if (typeof end === "string" && end < start) {
    return "end_date cannot be before start_date"
  }
  return null
}
