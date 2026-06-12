export type AgentId = "quotation" | "marina" | "finance" | "comms" | "hr" | "tide"

export type AgentConfigDefinition = {
  id: AgentId
  label: string
  description: string
  defaults: Record<string, string | number | boolean>
}

export const AGENT_CONFIG_DEFINITIONS: AgentConfigDefinition[] = [
  {
    id: "quotation",
    label: "Quotation Agent",
    description: "Find service requests that need a draft quotation and apply approved pricing rules.",
    defaults: { vat_pct: 7, deposit_pct: 50, valid_days: 7, max_discount_pct: 15, extra_instructions: "" },
  },
  {
    id: "marina",
    label: "Marina Agent",
    description: "Monitor expiring contracts, insurance, and overdue work orders.",
    defaults: { contract_expiry_warn_days: 30, insurance_expiry_warn_days: 30, work_order_overdue_days: 14 },
  },
  {
    id: "finance",
    label: "Finance Agent",
    description: "Monitor overdue and upcoming invoices and prepare finance alerts.",
    defaults: { overdue_warn_days: 7, upcoming_due_days: 3, escalation_amount_thb: 50000, extra_instructions: "" },
  },
  {
    id: "comms",
    label: "Communications Agent",
    description: "Draft replies for inbound customer messages without sending them automatically.",
    defaults: { max_words: 150, language: "EN/TH bilingual-aware", phone: "+66 82 878 9149", tone: "warm, professional", extra_instructions: "" },
  },
  {
    id: "hr",
    label: "HR Agent",
    description: "Draft job descriptions, KPI frameworks, SOPs, and onboarding plans for management review.",
    defaults: { default_language: "EN", max_kpis: 8, onboarding_days: 30, extra_instructions: "" },
  },
  {
    id: "tide",
    label: "Tide Agent",
    description: "Calculate launch and retrieval windows from vessel and tide inputs.",
    defaults: { ramp_offset_m: -1, trailer_height_m: 0.7, safety_clearance_m: 0.1 },
  },
]

const RANGE_RULES: Record<string, [number, number]> = {
  vat_pct: [0, 20],
  deposit_pct: [0, 100],
  valid_days: [1, 90],
  max_discount_pct: [0, 100],
  contract_expiry_warn_days: [1, 365],
  insurance_expiry_warn_days: [1, 365],
  work_order_overdue_days: [1, 365],
  overdue_warn_days: [0, 365],
  upcoming_due_days: [0, 90],
  escalation_amount_thb: [0, 1000000000],
  max_words: [20, 1000],
  max_kpis: [1, 20],
  onboarding_days: [1, 365],
  ramp_offset_m: [-20, 20],
  trailer_height_m: [0, 10],
  safety_clearance_m: [0, 5],
}

export function getAgentDefinition(agentId: string) {
  return AGENT_CONFIG_DEFINITIONS.find((agent) => agent.id === agentId)
}

export function mergeAgentConfig(agentId: string, config: unknown) {
  const definition = getAgentDefinition(agentId)
  if (!definition) return null
  const supplied = typeof config === "object" && config !== null && !Array.isArray(config)
    ? config as Record<string, unknown>
    : {}
  return { ...definition.defaults, ...supplied }
}

export function validateAgentConfig(agentId: string, config: unknown): string[] {
  const definition = getAgentDefinition(agentId)
  if (!definition) return ["Unknown agent"]
  if (typeof config !== "object" || config === null || Array.isArray(config)) return ["Config must be an object"]

  const errors: string[] = []
  for (const [key, value] of Object.entries(config)) {
    if (!(key in definition.defaults)) {
      errors.push(`Unsupported setting: ${key}`)
      continue
    }
    const expected = typeof definition.defaults[key]
    if (typeof value !== expected) {
      errors.push(`${key} must be ${expected}`)
      continue
    }
    const range = RANGE_RULES[key]
    if (range && typeof value === "number" && (value < range[0] || value > range[1])) {
      errors.push(`${key} must be between ${range[0]} and ${range[1]}`)
    }
  }
  return errors
}
