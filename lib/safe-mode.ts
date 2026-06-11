/**
 * Centralized production safety flag helpers.
 *
 * All helpers FAIL CLOSED:
 *   - undefined  → blocked
 *   - ""         → blocked
 *   - "false"    → blocked
 *   - any value other than the exact string "true" → blocked
 *   - "true"     → enabled
 *
 * Never use loose truthiness checks on env vars — empty string is truthy in JS.
 */

import { NextResponse } from "next/server"

/** AI agent dry-run mode — no writes attempted, simulated responses returned. */
export const isDryRun = (): boolean =>
  process.env.AI_AGENT_DRY_RUN === "true"

/** Allow AI agent POST/PATCH/PUT/DELETE via the /api/db/* and /api/ai/* agent routes. */
export const isAgentWritesEnabled = (): boolean =>
  process.env.ENABLE_AI_AGENT_WRITES === "true"

/** Allow delivery of real messages to customers via email, LINE, and WhatsApp. */
export const isRealCustomerMessagesEnabled = (): boolean =>
  process.env.ENABLE_REAL_CUSTOMER_MESSAGES === "true"

/** Allow creation, update, confirmation, and movement of production bookings. */
export const isProductionBookingsEnabled = (): boolean =>
  process.env.ENABLE_PRODUCTION_BOOKINGS === "true"

/** Allow automation engines (recurring billing etc.) to perform DB writes. */
export const isAutomationWritesEnabled = (): boolean =>
  process.env.ENABLE_AUTOMATION_WRITES === "true"

/** Standard safe-mode response body. Use as NextResponse.json(safeModeBody(...)) */
export function safeModeBody(flag: string) {
  return {
    safe_mode:  true,
    blocked:    true,
    reason:     `${flag} is not enabled`,
    hint:       `Set ${flag}=true in environment variables to enable this operation`,
  }
}

/** Return a 200 safe-mode response — not an error, a deliberate hold. */
export function safeModeResponse(flag: string): NextResponse {
  return NextResponse.json(safeModeBody(flag), { status: 200 })
}
