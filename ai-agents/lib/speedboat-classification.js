/**
 * Speedboat Engine-Group Classification (JS port for ai-agents)
 *
 * Rule: do NOT classify speedboats by engine count alone.
 * Use LOA (ft) as the primary axis, engine count as confirmation,
 * and secondary escalation from beam, draft, weight.
 *
 * Engine Group  |  LOA range      |  Risk Flag
 * ─────────────────────────────────────────────
 * 1 Engine      |  ≤ 27 ft        |  Normal
 * 2 Engines     |  > 27 – 40 ft   |  Normal / Medium
 * 3 Engines     |  > 40 – 47 ft   |  Medium / High
 * 4 Engines     |  > 47 – 55 ft   |  High / Special Handling
 *
 * LOA takes priority over declared engine count when they disagree.
 * Beam ≥ 9 ft, draft ≥ 2.5 ft, weight ≥ 4,000 kg each escalate risk one level.
 */

const RISK_ORDER = ["Normal", "Medium", "High", "Special Handling"]

function loaToEngineGroup(loaFt) {
  if (loaFt <= 27) return 1
  if (loaFt <= 40) return 2
  if (loaFt <= 47) return 3
  return 4
}

function groupToBaseRisk(group) {
  if (group === 1) return "Normal"
  if (group === 2) return "Normal"   // lower end of Normal/Medium
  if (group === 3) return "Medium"   // lower end of Medium/High
  return "High"
}

function groupToRampCode(group) {
  if (group === 1) return "RAMP_1OB"
  if (group === 2) return "RAMP_2OB"
  return "RAMP_3OB"
}

function escalateRisk(base, { beamFt, draftFt, weightKg }) {
  let idx = RISK_ORDER.indexOf(base)
  const reasons = []

  if (beamFt != null && beamFt >= 9) {
    idx = Math.min(idx + 1, RISK_ORDER.length - 1)
    reasons.push(`Wide beam (${beamFt} ft ≥ 9 ft)`)
  }
  if (draftFt != null && draftFt >= 2.5) {
    idx = Math.min(idx + 1, RISK_ORDER.length - 1)
    reasons.push(`Deep draft (${draftFt} ft ≥ 2.5 ft)`)
  }
  if (weightKg != null && weightKg >= 4000) {
    idx = Math.min(idx + 1, RISK_ORDER.length - 1)
    reasons.push(`Heavy (${Number(weightKg).toLocaleString()} kg ≥ 4,000 kg)`)
  }

  return { flag: RISK_ORDER[idx], reasons }
}

/**
 * Classify a speedboat for rate-card and ramp pricing.
 *
 * @param {{ loaFt?, engines?, beamFt?, draftFt?, weightKg? }} input
 * @returns {{ engineGroup, loaFt, primaryRiskFlag, effectiveRiskFlag,
 *             rampCode, escalationReasons, mismatchWarning, label }}
 */
export function classifySpeedboat({ loaFt = 0, engines = null, beamFt = null, draftFt = null, weightKg = null } = {}) {
  const loa = Number(loaFt) || 0
  const loaGroup = loaToEngineGroup(loa)
  const baseRisk = groupToBaseRisk(loaGroup)
  const { flag: effectiveRiskFlag, reasons: escalationReasons } = escalateRisk(baseRisk, { beamFt, draftFt, weightKg })
  const rampCode = groupToRampCode(loaGroup)

  let mismatchWarning = null
  if (engines != null && Number(engines) > 0 && Number(engines) !== loaGroup) {
    mismatchWarning =
      `Engine count (${engines}) does not match LOA-derived group (${loaGroup}). ` +
      `LOA (${loa} ft) takes priority. Verify boat data before quoting.`
  }

  const label =
    `Engine Group ${loaGroup} | LOA ${loa} ft | Risk: ${effectiveRiskFlag}` +
    (mismatchWarning ? " ⚠ LOA/engine mismatch" : "")

  return { engineGroup: loaGroup, loaFt: loa, primaryRiskFlag: baseRisk, effectiveRiskFlag, rampCode, escalationReasons, mismatchWarning, label }
}

/** Return the correct ramp code for a speedboat */
export function speedboatRampCode(input) {
  return classifySpeedboat(input).rampCode
}
