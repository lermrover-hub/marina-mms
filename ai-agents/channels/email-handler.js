/**
 * Email Channel Handler
 * Parses inbound email objects (from SendGrid/Postmark webhook or manual trigger)
 * and dispatches to CEO agent.
 */
import { dispatch } from "../orchestrator/ceo-agent.js"

/**
 * @param {object} email  { from, subject, text, html, customerId? }
 */
export async function handleEmail(email = {}) {
  const text = [email.subject, email.text ?? stripHtml(email.html ?? "")]
    .filter(Boolean).join("\n")

  console.log(`[Email] from=${email.from} subject="${email.subject}"`)

  return dispatch({
    source:     "email",
    content:    text,
    customerId: email.customerId ?? null,
    params:     { from: email.from, subject: email.subject },
  })
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}
