/**
 * Shared constants for all AI agents.
 * Import from here instead of hardcoding strings in agent files.
 *
 * Marina identity values come from process.env where available,
 * falling back to the Ocean Rover Marina production defaults.
 */

export const MARINA_NAME     = process.env.MARINA_NAME     ?? "Ocean Rover Marina"
export const MARINA_LOCATION = process.env.MARINA_LOCATION ?? "Ko Samui, Thailand"
export const MARINA_PHONE    = process.env.MARINA_PHONE    ?? "+66 82 878 9149"
export const MARINA_SITE_URL = process.env.MARINA_API_BASE ?? "https://marina-mms.vercel.app"
export const MARINA_PORTAL_URL = `${MARINA_SITE_URL}/portal`

/** Full display string used in customer-facing messages */
export const MARINA_DISPLAY  = `${MARINA_NAME}, ${MARINA_LOCATION}`

/** Default labels */
export const DEFAULT_CURRENCY    = "THB"
export const DEFAULT_VAT_PCT     = 7
export const DEFAULT_DEPOSIT_PCT = 50
export const DEFAULT_VALID_DAYS  = 7

/** Approval roles */
export const ROLE_MANAGING_DIRECTOR = "MANAGING_DIRECTOR"
export const ROLE_FINANCE           = "FINANCE"
export const ROLE_MARINA_MANAGER    = "MARINA_MANAGER"

/** Agent IDs — must match mms_agent_config.agent_id */
export const AGENT_QUOTATION = "quotation"
export const AGENT_COMMS     = "comms"
export const AGENT_FINANCE   = "finance"
export const AGENT_TIDE      = "tide"
export const AGENT_MARINA    = "marina"
export const AGENT_HR        = "hr"
