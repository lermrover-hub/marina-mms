/**
 * @deprecated Use comms-agent.js for all customer communication.
 *
 * This file is kept as a compatibility shim so existing imports
 * and tests do not break. The run() logic has moved to comms-agent.js.
 * The daysOverdue / isOverdueInvoice utilities have moved to lib/date-utils.js.
 *
 * DO NOT add new logic here.
 */

// Re-export the canonical run function
export { run } from "./comms-agent.js"

// Re-export date utilities from their new home
export { daysOverdue, isOverdueInvoice } from "../lib/date-utils.js"
