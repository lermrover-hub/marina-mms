/**
 * Messaging Agent
 *
 * Reads unreplied inbound messages from mms_messages (LINE + WhatsApp),
 * matches them to a customer, drafts a reply using Claude with full
 * customer context, then sends the reply back through the same channel.
 *
 * DRY_RUN=true  → shows draft reply, skips send + mark-replied
 * SKIP_CLAUDE   → uses placeholder reply text
 *
 * Does NOT touch the web app codebase.
 */

import { getMessages, getCustomer, getBoats, getQuotations, getInvoices, markMessageReplied } from "../lib/api-client.js"
import { ask } from "../lib/claude-client.js"
import { sendLineText, sendWhatsAppText, formatReply } from "../lib/messaging.js"

const SYSTEM_PROMPT = `You are a professional customer service representative for Ocean Rover Marina, Ko Samui, Thailand.
You reply to customer messages received via LINE and WhatsApp.

Your tone:
- Warm, professional, helpful
- Bilingual awareness (Thai / English customers)
- Address by name when known

Rules:
- Give a direct, helpful answer
- Reference the customer's boat or open jobs when relevant
- Keep reply under 150 words unless detail is essential
- Never commit to prices or timelines without operations confirmation
- End with the marina phone number: +66 82 878 9149
- Do NOT include the marina header line — it is prepended automatically`

export async function run() {
  console.log("[MessagingAgent] Starting…")

  // 1. Fetch unreplied inbound messages
  let raw
  try {
    raw = await getMessages("replied=false&direction=INBOUND&limit=20")
  } catch (err) {
    if (err.message.includes("404")) {
      console.warn("[MessagingAgent] /api/db/messages not yet deployed — skipping.")
      return { processed: 0, skipped: "route not deployed" }
    }
    throw err
  }
  const messages = Array.isArray(raw) ? raw : []
  console.log(`[MessagingAgent] ${messages.length} unreplied inbound messages`)

  if (messages.length === 0) {
    console.log("[MessagingAgent] No messages to process.")
    return { processed: 0 }
  }

  const results = []

  for (const msg of messages) {
    try {
      console.log(`[MessagingAgent] ${msg.channel} from ${msg.sender_id} — "${String(msg.content).slice(0, 60)}"`)

      // 2. Load customer context if linked
      let customerName = "Valued Customer"
      let contextLines = []

      if (msg.customer_id) {
        const [cust, boats, quots, invs] = await Promise.all([
          getCustomer(msg.customer_id).catch(() => null),
          getBoats().catch(() => []),
          getQuotations(`customer_id=${msg.customer_id}`).catch(() => []),
          getInvoices(`customer_id=${msg.customer_id}`).catch(() => []),
        ])

        if (cust) {
          customerName = cust.company_name
            ?? [cust.first_name, cust.last_name].filter(Boolean).join(" ")
            ?? customerName

          const custBoats = (Array.isArray(boats) ? boats : []).filter(b => b.owner_id === msg.customer_id)
          const openQuots = (Array.isArray(quots)  ? quots  : []).filter(q => !["CONVERTED","CANCELLED","REJECTED"].includes(q.status))
          const unpaidInv = (Array.isArray(invs)   ? invs   : []).filter(i => !["paid","PAID","CANCELLED"].includes(i.status))

          contextLines = [
            `Customer: ${customerName}`,
            `Boats: ${custBoats.map(b => `${b.name} (${b.boat_type})`).join(", ") || "none on record"}`,
            `Open quotations: ${openQuots.length}`,
            `Unpaid invoices: ${unpaidInv.length}`,
          ]
        }
      } else {
        contextLines = [`Customer: unknown (sender ${msg.sender_id} not linked to a customer record)`]
      }

      const userPrompt = [
        ...contextLines,
        "",
        `Channel: ${msg.channel}`,
        `Message: "${msg.content}"`,
        "",
        "Write a short, helpful reply.",
      ].join("\n")

      // 3. Draft reply via Claude
      const replyText = await ask(SYSTEM_PROMPT, userPrompt)

      console.log(`[MessagingAgent] Draft reply for ${customerName}:`)
      console.log(`  "${replyText.slice(0, 100)}${replyText.length > 100 ? "…" : ""}"`)

      // 4. Send reply back on the correct channel
      const outbound = formatReply(replyText)

      if (msg.channel === "LINE") {
        // Use reply_token if still valid (within 1 min), else push
        const token = msg.reply_token
        if (token) {
          await sendLineText(msg.sender_id, outbound)   // push fallback
        } else {
          await sendLineText(msg.sender_id, outbound)
        }
      } else if (msg.channel === "WHATSAPP") {
        await sendWhatsAppText(msg.sender_id, outbound)
      }

      // 5. Mark as replied
      await markMessageReplied(msg.id)

      results.push({ messageId: msg.id, channel: msg.channel, customer: customerName, status: "replied" })

    } catch (err) {
      console.error(`[MessagingAgent] ✗ Failed for message ${msg.id}: ${err.message}`)
      results.push({ messageId: msg.id, status: "error", error: err.message })
    }
  }

  const ok    = results.filter(r => r.status === "replied").length
  const failed = results.filter(r => r.status === "error").length
  console.log(`[MessagingAgent] Done. ${ok} replied, ${failed} failed.`)
  return { processed: messages.length, replied: ok, failed, results }
}
