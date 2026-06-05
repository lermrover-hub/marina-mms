/**
 * Comms Agent — L2 Specialist
 * Handles customer inquiries (LINE, Email, Web Form, Portal).
 * Merges customer-service-agent + messaging-agent concerns at specialist level.
 */
import { getCustomer, getBoats, getQuotations, getInvoices, getMessages, markMessageReplied } from "../lib/api-client.js"
import { ask } from "../lib/claude-client.js"
import { sendLineText, sendWhatsAppText, formatReply } from "../lib/messaging.js"

const SYSTEM = `You are a professional customer service representative for Ocean Rover Marina, Ko Samui, Thailand.
Tone: warm, professional, bilingual-aware (Thai/English). Address customer by name. Under 150 words unless essential.
Never commit to prices or timelines without operations confirmation. End with: +66 82 878 9149`

export async function run({ customerId, inquiry, source = "unknown" } = {}) {
  console.log(`[CommsAgent] source=${source} customer=${customerId ?? "unknown"}`)

  // No specific inquiry → process unreplied inbound messages
  if (!inquiry) return processInboundMessages()

  // Build customer context
  const [cust, boats, quots, invs] = await Promise.all([
    customerId ? getCustomer(customerId).catch(() => null) : Promise.resolve(null),
    getBoats().catch(() => []),
    customerId ? getQuotations(`customer_id=${customerId}`).catch(() => []) : Promise.resolve([]),
    customerId ? getInvoices(`customer_id=${customerId}`).catch(() => []) : Promise.resolve([]),
  ])

  const name = cust?.company_name ?? [cust?.first_name, cust?.last_name].filter(Boolean).join(" ") ?? "Valued Customer"
  const custBoats = (Array.isArray(boats) ? boats : []).filter(b => b.owner_id === customerId)
  const openQuots = (Array.isArray(quots) ? quots : []).filter(q => !["CONVERTED","CANCELLED","REJECTED"].includes(q.status))
  const unpaidInv = (Array.isArray(invs) ? invs : []).filter(i => !["paid","PAID","CANCELLED"].includes(i.status))

  const context = [
    `Customer: ${name}`,
    `Boats: ${custBoats.map(b => `${b.name} (${b.boat_type})`).join(", ") || "none on record"}`,
    `Open quotations: ${openQuots.length}`,
    `Unpaid invoices: ${unpaidInv.length}`,
    `Channel: ${source}`,
    `Inquiry: "${inquiry}"`,
  ].join("\n")

  const reply = await ask(SYSTEM, context)
  console.log(`[CommsAgent] Draft reply for ${name}: "${reply.slice(0, 80)}…"`)
  return { customer: name, customerId, reply, source }
}

async function processInboundMessages() {
  let raw
  try { raw = await getMessages("replied=false&direction=INBOUND&limit=20") }
  catch (e) {
    if (e.message.includes("404")) return { processed: 0, skipped: "route not deployed" }
    throw e
  }
  const messages = Array.isArray(raw) ? raw : []
  console.log(`[CommsAgent] ${messages.length} unreplied messages`)
  const results = []

  for (const msg of messages) {
    try {
      const context = `Channel: ${msg.channel}\nMessage: "${msg.content}"`
      const reply = await ask(SYSTEM, context)
      const outbound = formatReply(reply)

      if (msg.channel === "LINE") await sendLineText(msg.sender_id, outbound)
      else if (msg.channel === "WHATSAPP") await sendWhatsAppText(msg.sender_id, outbound)

      await markMessageReplied(msg.id)
      results.push({ id: msg.id, status: "replied" })
    } catch (e) {
      results.push({ id: msg.id, status: "error", error: e.message })
    }
  }

  const ok = results.filter(r => r.status === "replied").length
  console.log(`[CommsAgent] ${ok}/${messages.length} replied`)
  return { processed: messages.length, replied: ok }
}
