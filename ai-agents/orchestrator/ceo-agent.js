/**
 * CEO Agent — L1 Orchestrator
 *
 * Receives a job from any input channel, classifies intent,
 * routes to the correct L2 specialist, then runs QA validation
 * before returning the final result.
 *
 * Usage:
 *   import { dispatch } from "./orchestrator/ceo-agent.js"
 *   await dispatch({ source: "line", content: "I need a quotation for antifouling", customerId: "abc" })
 */

import { classifyIntent } from "./router.js"
import { run as runQuotation }    from "../agents/quotation-agent.js"
import { run as runMarina }       from "../agents/marina-agent.js"
import { run as runFinance }      from "../agents/finance-agent.js"
import { run as runHr }           from "../agents/hr-agent.js"
import { run as runComms }        from "../agents/comms-agent.js"
import { run as runTide }         from "../agents/tide-agent.js"
import { run as runDocWriter }    from "../agents/doc-writer.js"
import { validate }               from "../agents/qa-agent.js"
import { escalate }               from "../agents/escalation-agent.js"
import { log as auditLog }        from "../agents/audit-trail.js"

/**
 * @param {object} job
 * @param {string} job.source      – "line" | "email" | "web-form" | "staff" | "scheduled"
 * @param {string} job.content     – free-text input / task description
 * @param {string} [job.customerId]
 * @param {string} [job.boatId]
 * @param {object} [job.params]    – additional structured params (e.g. tide inputs)
 * @param {string} [job.agentHint] – skip classification and use this route directly
 */
export async function dispatch(job) {
  const start = Date.now()
  const { source = "unknown", content = "", customerId, boatId, params = {}, agentHint } = job

  console.log(`\n[CEO] Job received from [${source}] — "${String(content).slice(0, 80)}"`)

  // ── 1. Classify intent ───────────────────────────────────────────────────
  const route = agentHint ?? await classifyIntent(content)
  console.log(`[CEO] Routed to: ${route}`)

  // ── 2. Dispatch to specialist ────────────────────────────────────────────
  let result
  try {
    switch (route) {
      case "quotation":
        result = await runQuotation({ customerId, boatId, description: content, ...params })
        break
      case "marina":
        result = await runMarina({ customerId, boatId, ...params })
        break
      case "finance":
        result = await runFinance({ customerId, ...params })
        break
      case "hr":
        result = await runHr({ content, ...params })
        break
      case "comms":
        result = await runComms({ customerId, inquiry: content, source, ...params })
        break
      case "tide":
        result = await runTide({ boatId, ...params })
        break
      case "doc-writer":
        result = await runDocWriter({ content, customerId, boatId, ...params })
        break
      default:
        result = await runComms({ customerId, inquiry: content, source })
    }
  } catch (err) {
    console.error(`[CEO] Agent ${route} threw: ${err.message}`)
    await escalate({
      route,
      source,
      content,
      error: err.message,
      customerId,
    })
    await auditLog({ action: "agent_error", route, source, content, error: err.message, customerId })
    return { ok: false, route, error: err.message }
  }

  // ── 3. QA validation ─────────────────────────────────────────────────────
  const qa = validate(route, result)
  if (!qa.ok) {
    console.warn(`[CEO] QA failed for ${route}:`, qa.issues)
    await escalate({
      route,
      source,
      content,
      qaIssues: qa.issues,
      result,
      customerId,
    })
  } else {
    console.log(`[CEO] QA passed for ${route}`)
  }

  // ── 4. Audit trail ───────────────────────────────────────────────────────
  const elapsed = Date.now() - start
  await auditLog({
    action:     "agent_dispatched",
    route,
    source,
    content,
    customerId,
    boatId,
    qaOk:       qa.ok,
    qaIssues:   qa.issues ?? [],
    durationMs: elapsed,
    resultSummary: summariseResult(result),
  })

  console.log(`[CEO] Done — ${route} in ${elapsed}ms${qa.ok ? "" : " (QA flagged)"}`)
  return { ok: qa.ok, route, result, qa, durationMs: elapsed }
}

function summariseResult(r) {
  if (!r) return "null"
  try {
    const s = JSON.stringify(r)
    return s.length > 200 ? s.slice(0, 197) + "…" : s
  } catch {
    return String(r).slice(0, 200)
  }
}
