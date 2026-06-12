/**
 * Agent configuration loader.
 * Reads rules from /api/db/agent-config so agents use DB-stored settings
 * instead of hardcoded defaults. Falls back to built-in defaults if the
 * API is unreachable or the table has not been seeded yet.
 */

import { getAgentConfigAll } from "./api-client.js"
import { MARINA_PHONE } from "./constants.js"

const DEFAULTS = {
  quotation: {
    vat_pct: 7,
    deposit_pct: 50,
    valid_days: 7,
    max_discount_pct: 15,
    extra_instructions: "",
  },
  comms: {
    max_words: 150,
    language: "EN/TH bilingual-aware",
    phone: MARINA_PHONE,
    tone: "warm, professional",
    extra_instructions: "",
  },
  finance: {
    overdue_warn_days: 7,
    upcoming_due_days: 3,
    escalation_amount_thb: 50000,
    extra_instructions: "",
  },
  tide: {
    ramp_offset_m: -1.0,
    safety_clearance_m: 0.10,  // confirmed: Ko Samui 2026 operational spreadsheet
    trailer_height_m: 0.70,    // confirmed: Ko Samui 2026 operational spreadsheet
  },
  marina: {
    contract_expiry_warn_days: 30,
    insurance_expiry_warn_days: 30,
    work_order_overdue_days: 14,
  },
  hr: {
    default_language: "EN",
    max_kpis: 8,
    onboarding_days: 30,
    extra_instructions: "",
  },
}

// In-process cache — one fetch per agent process run
let _cache = null

async function loadAll() {
  if (_cache) return _cache
  try {
    const rows = await getAgentConfigAll()
    if (Array.isArray(rows)) {
      _cache = {}
      rows.forEach((row) => {
        _cache[row.agent_id] = { ...DEFAULTS[row.agent_id], ...row.config }
      })
    }
  } catch (e) {
    console.warn("[agent-config] Could not load from API, using defaults:", e.message)
    _cache = { ...DEFAULTS }
  }
  return _cache ?? DEFAULTS
}

/**
 * Get resolved config for one agent.
 * Merges DB values over built-in defaults so missing keys always have a value.
 *
 * @param {string} agentId  — e.g. "quotation", "comms", "tide"
 * @returns {Promise<Record<string, unknown>>}
 */
export async function getAgentConfig(agentId) {
  const all = await loadAll()
  return { ...(DEFAULTS[agentId] ?? {}), ...(all[agentId] ?? {}) }
}

/** Reset the in-process cache (useful for tests). */
export function resetConfigCache() {
  _cache = null
}
