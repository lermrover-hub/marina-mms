/**
 * LINE OA Channel Handler
 * Called by the web app's /api/webhooks/line AFTER it saves the message.
 * The agent server also exposes /webhook/line for direct LINE → agent routing.
 */
import crypto from "crypto"
import { dispatch } from "../orchestrator/ceo-agent.js"

export function verifySignature(rawBody, signature, secret) {
  const hash = crypto.createHmac("SHA256", secret).update(rawBody).digest("base64")
  return hash === signature
}

/**
 * Process a LINE webhook payload directly (used by server.js).
 */
export async function handleLinePayload(rawBody, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET
  if (secret && !verifySignature(rawBody, signature ?? "", secret)) {
    throw new Error("Invalid LINE signature")
  }

  const payload = JSON.parse(rawBody)
  const events = payload.events ?? []
  const results = []

  for (const event of events) {
    if (event.type !== "message" || event.message?.type !== "text") continue
    const text      = String(event.message.text ?? "").trim()
    const lineUserId = event.source?.userId

    console.log(`[LINE] ${lineUserId}: "${text.slice(0, 60)}"`)

    const result = await dispatch({
      source:    "line",
      content:   text,
      params:    { lineUserId, replyToken: event.replyToken },
    })
    results.push({ lineUserId, route: result.route, ok: result.ok })
  }

  return results
}
