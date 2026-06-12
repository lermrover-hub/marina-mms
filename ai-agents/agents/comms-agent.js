/**
 * Comms Agent — L2 Specialist
 * Handles customer inquiries (LINE, Email, Web Form, Portal).
 * Canonical communication agent. messaging-agent.js and customer-service-agent.js
 * are compatibility shims pointing here.
 *
 * APPROVAL GATE: All outbound messages are saved as PENDING_APPROVAL drafts.
 * Staff must approve in the UI before the message is actually sent to the customer.
 */
import { getCustomer, getBoats, getQuotations, getInvoices, getMessages, markMessageReplied, createMessageDraft } from "../lib/api-client.js"
import { ask } from "../lib/claude-client.js"
import { loadPrompt } from "../lib/load-prompt.js"
import { getAgentConfig } from "../lib/agent-config.js"

const SYSTEM = loadPrompt("comms-agent-system", `You are a professional customer service representative for Ocean Rover Marina, Ko Samui, Thailand.
Tone: warm, professional, bilingual-aware (Thai/English). Address customer by name. Under 150 words unless essential.

FORBIDDEN — you must NEVER:
- Confirm a booking, berth reservation, or launch slot
- Commit to any price, rate, or discount amount
- Promise a specific completion date or timeline
- Send or reference any late-payment notice or payment demand
- Reference data belonging to a different customer
- Disclose internal cost, margin, or rate card pricing
- Cancel or modify any existing booking or reservation
- Approve any quotation, invoice, or work order on behalf of management

All replies are DRAFT only. A staff member will review and approve before the message reaches the customer.
End every reply with the marina contact: +66 82 878 9149`)

export async function run({ customerId, inquiry, source = "unknown" } = {}) {
  const cfg = await getAgentConfig("comms")
  const systemPrompt = `${SYSTEM}\nConfigured tone: ${cfg.tone}. Language: ${cfg.language}. Maximum ${cfg.max_words} words. End with: ${cfg.phone}.\n${cfg.extra_instructions || ""}`.trim()
  console.log(`[CommsAgent] source=${source} customer=${customerId ?? "unknown"}`)

  // No specific inquiry → process unreplied inbound messages
  if (!inquiry) return processInboundMessages(systemPrompt)

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

  const reply = await ask(systemPrompt, context)
  console.log(`[CommsAgent] Draft reply for ${name}: "${reply.slice(0, 80)}…"`)

  // Save as PENDING_APPROVAL draft — do NOT send directly
  let draftId = null
  try {
    const draft = await createMessageDraft({
      channel:          source,
      direction:        "OUTBOUND",
      customer_id:      customerId ?? null,
      content:          reply,
      approval_status:  "PENDING_APPROVAL",
      agent_generated:  true,
      created_at:       new Date().toISOString(),
    })
    draftId = draft?.id ?? null
    console.log(`[CommsAgent] Message draft saved: ${draftId} (awaiting staff approval)`)
  } catch (e) {
    console.warn("[CommsAgent] Could not save draft:", e.message)
  }

  return { customer: name, customerId, reply, source, draftId, status: "PENDING_APPROVAL" }
}

async function processInboundMessages(systemPrompt) {
  let raw
  try { raw = await getMessages("replied=false&direction=INBOUND&limit=20") }
  catch (e) {
    if (e.message.includes("404")) return { processed: 0, skipped: "route not deployed" }
    throw e
  }
  const messages = Array.isArray(raw) ? raw : []
  console.log(`[CommsAgent] ${messages.length} unreplied inbound messages`)
  const results = []

  for (const msg of messages) {
    try {
      const context = `Channel: ${msg.channel}\nMessage: "${msg.content}"`
      const reply = await ask(systemPrompt, context)

      // Save as PENDING_APPROVAL draft — staff approves before send
      const draft = await createMessageDraft({
        channel:         msg.channel,
        direction:       "OUTBOUND",
        customer_id:     msg.customer_id ?? null,
        content:         reply,
        approval_status: "PENDING_APPROVAL",
        agent_generated: true,
        created_at:      new Date().toISOString(),
      })

      await markMessageReplied(msg.id)
      results.push({ id: msg.id, draftId: draft?.id, status: "draft_pending_approval" })
    } catch (e) {
      results.push({ id: msg.id, status: "error", error: e.message })
    }
  }

  const ok = results.filter(r => r.status === "draft_pending_approval").length
  console.log(`[CommsAgent] ${ok}/${messages.length} drafts saved for approval`)
  return { processed: messages.length, drafted: ok }
}
