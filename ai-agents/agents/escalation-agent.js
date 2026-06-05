/**
 * Escalation Agent — L4
 * Creates HIGH-priority notification for human review when QA fails or agent errors.
 */
import { createNotification } from "../lib/api-client.js"

export async function escalate({ route, source, content, error, qaIssues, customerId } = {}) {
  const title = error
    ? `Agent error — ${route} [${source}]`
    : `QA failed — ${route} [${source}]`

  const detail = [
    error   ? `Error: ${error}` : null,
    qaIssues?.length ? `QA issues: ${qaIssues.join("; ")}` : null,
    content ? `Input: "${String(content).slice(0, 120)}"` : null,
  ].filter(Boolean).join("\n")

  console.warn(`[EscalationAgent] ${title}`)
  console.warn(`[EscalationAgent] ${detail}`)

  try {
    await createNotification({
      type:        "agent_escalation",
      title,
      message:     detail,
      customer_id: customerId ?? null,
      priority:    "HIGH",
      created_at:  new Date().toISOString(),
    })
  } catch (e) {
    console.error("[EscalationAgent] Failed to create notification:", e.message)
  }

  return { escalated: true, title }
}
