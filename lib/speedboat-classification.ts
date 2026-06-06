/**
 * Speedboat Engine-Group Classification
 *
 * Rule: do NOT use engine count alone to classify speedboats.
 * Use LOA (ft) as the primary axis, engine count as confirmation,
 * and derive risk_flag from the combination.
 *
 * Engine Group  |  LOA range      |  Risk Flag
 * ─────────────────────────────────────────────
 * 1 Engine      |  ≤ 27 ft        |  Normal
 * 2 Engines     |  > 27 – 40 ft   |  Normal / Medium
 * 3 Engines     |  > 40 – 47 ft   |  Medium / High
 * 4 Engines     |  > 47 – 55 ft   |  High / Special Handling
 *
 * When LOA and engine count disagree, LOA takes priority and a
 * mismatch warning is returned.  Beam, draft, and weight act as
 * secondary risk escalators (see riskEscalation below).
 */

export type EngineGroup = 1 | 2 | 3 | 4

export type RiskFlag =
  | "Normal"
  | "Medium"
  | "High"
  | "Special Handling"

export interface SpeedboadInput {
  loaFt?: number | null
  engines?: number | null        // number of engines
  beamFt?: number | null
  draftFt?: number | null
  weightKg?: number | null
}

export interface SpeedboatClassification {
  engineGroup: EngineGroup
  loaFt: number
  primaryRiskFlag: RiskFlag
  effectiveRiskFlag: RiskFlag    // after beam/draft/weight escalation
  rampCode: "RAMP_1OB" | "RAMP_2OB" | "RAMP_3OB"
  escalationReasons: string[]
  mismatchWarning: string | null
  label: string                  // human-readable summary
}

export function isSpeedboatType(value: unknown): boolean {
  const normalized = String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")
  return normalized === "speedboat"
}

/** LOA → engine group (primary axis) */
function loaToEngineGroup(loaFt: number): EngineGroup {
  if (loaFt <= 27) return 1
  if (loaFt <= 40) return 2
  if (loaFt <= 47) return 3
  return 4
}

/** Engine group → base risk flag */
function groupToBaseRisk(group: EngineGroup): RiskFlag {
  switch (group) {
    case 1: return "Normal"
    case 2: return "Normal"   // lower end of Normal/Medium range
    case 3: return "Medium"   // lower end of Medium/High range
    case 4: return "High"
  }
}

/** Engine group → ramp code */
function groupToRampCode(
  group: EngineGroup,
): SpeedboatClassification["rampCode"] {
  if (group === 1) return "RAMP_1OB"
  if (group === 2) return "RAMP_2OB"
  return "RAMP_3OB"
}

/** Secondary risk escalation from physical dimensions */
function escalateRisk(
  base: RiskFlag,
  input: SpeedboadInput,
): { flag: RiskFlag; reasons: string[] } {
  const riskOrder: RiskFlag[] = ["Normal", "Medium", "High", "Special Handling"]
  let idx = riskOrder.indexOf(base)
  const reasons: string[] = []

  // Beam ≥ 9 ft → escalate one level
  if (input.beamFt != null && input.beamFt >= 9) {
    idx = Math.min(idx + 1, riskOrder.length - 1)
    reasons.push(`Wide beam (${input.beamFt} ft ≥ 9 ft)`)
  }

  // Draft ≥ 2.5 ft → escalate one level
  if (input.draftFt != null && input.draftFt >= 2.5) {
    idx = Math.min(idx + 1, riskOrder.length - 1)
    reasons.push(`Deep draft (${input.draftFt} ft ≥ 2.5 ft)`)
  }

  // Weight ≥ 4,000 kg → escalate one level
  if (input.weightKg != null && input.weightKg >= 4000) {
    idx = Math.min(idx + 1, riskOrder.length - 1)
    reasons.push(`Heavy (${input.weightKg.toLocaleString()} kg ≥ 4,000 kg)`)
  }

  return { flag: riskOrder[idx], reasons }
}

/**
 * Classify a speedboat for rate-card and ramp pricing decisions.
 *
 * @example
 * classifySpeedboat({ loaFt: 32, engines: 2, beamFt: 8.5 })
 * // → { engineGroup: 2, rampCode: "RAMP_2OB", effectiveRiskFlag: "Normal", … }
 */
export function classifySpeedboat(
  input: SpeedboadInput,
): SpeedboatClassification {
  const loaFt = input.loaFt ?? 0
  const engines = input.engines ?? null

  const loaGroup = loaToEngineGroup(loaFt)
  const baseRisk = groupToBaseRisk(loaGroup)
  const { flag: effectiveRiskFlag, reasons: escalationReasons } =
    escalateRisk(baseRisk, input)

  // Mismatch: declared engine count disagrees with LOA-derived group
  let mismatchWarning: string | null = null
  if (engines !== null && engines !== loaGroup) {
    mismatchWarning =
      `Engine count (${engines}) does not match LOA-derived group (${loaGroup}). ` +
      `LOA (${loaFt} ft) takes priority. Verify boat data.`
  }

  const rampCode = groupToRampCode(loaGroup)

  const label =
    `Engine Group ${loaGroup} | LOA ${loaFt} ft | ` +
    `Risk: ${effectiveRiskFlag}` +
    (mismatchWarning ? " ⚠ LOA/engine mismatch" : "")

  return {
    engineGroup:      loaGroup,
    loaFt,
    primaryRiskFlag:  baseRisk,
    effectiveRiskFlag,
    rampCode,
    escalationReasons,
    mismatchWarning,
    label,
  }
}

/** Convenience: return the correct ramp code for a speedboat */
export function speedboatRampCode(
  input: SpeedboadInput,
): SpeedboatClassification["rampCode"] {
  return classifySpeedboat(input).rampCode
}
