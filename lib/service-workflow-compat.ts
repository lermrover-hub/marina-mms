const MARKER = "__MMS_WORKFLOW__="

export type LegacyWorkflowMetadata = {
  request_type?: string | null
  ramp_operation_plan?: string | null
  confirmed_haul_out_date?: string | null
  confirmed_launch_date?: string | null
  tow_in_date?: string | null
  tow_out_date?: string | null
  service_type?: string | null
  service_types?: string[]
  storage_period?: string | null
  operator_type?: string | null
  insurance_status?: string | null
  subcontractor_trade?: string | null
  contractor_cost?: number
  markup_pct?: number
  payment_mode?: string
  payment_gate_status?: string
  quotation_id?: string | null
  service_order_confirmed_at?: string | null
  payment_plan?: Record<string, unknown> | null
}

export function readLegacyWorkflowMetadata(notes: unknown): LegacyWorkflowMetadata {
  if (typeof notes !== "string") return {}
  const line = notes.split("\n").find((value) => value.startsWith(MARKER))
  if (!line) return {}
  try {
    const parsed = JSON.parse(line.slice(MARKER.length))
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export function writeLegacyWorkflowMetadata(notes: unknown, metadata: LegacyWorkflowMetadata) {
  const visible = typeof notes === "string"
    ? notes.split("\n").filter((line) => !line.startsWith(MARKER)).join("\n").trim()
    : ""
  return [visible || null, `${MARKER}${JSON.stringify(metadata)}`].filter(Boolean).join("\n")
}

/**
 * Merge workflow values from the legacy notes marker only when the canonical
 * database column is null/undefined.  The database columns are authoritative;
 * the marker remains a compatibility fallback for older staging rows.
 */
export function mergeWorkflowMetadata<T extends Record<string, unknown>>(
  row: T,
  legacy: LegacyWorkflowMetadata,
): T & LegacyWorkflowMetadata {
  const merged = { ...row } as T & LegacyWorkflowMetadata
  for (const key of Object.keys(legacy) as (keyof LegacyWorkflowMetadata)[]) {
    if (merged[key] == null && legacy[key] != null) {
      merged[key] = legacy[key] as never
    }
  }
  return merged
}

export function isMissingWorkflowSchema(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false
  return ["PGRST204", "PGRST205", "42703", "42P01"].includes(String(error.code ?? "")) ||
    /schema cache|does not exist|could not find/i.test(String(error.message ?? ""))
}
