/**
 * WhatsApp Cloud API client for Marina MMS
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Env vars required:
 *   WHATSAPP_PHONE_NUMBER_ID    — from Meta Business → WhatsApp → API Setup
 *   WHATSAPP_ACCESS_TOKEN       — System user token from Meta Business
 *   WHATSAPP_WEBHOOK_VERIFY_TOKEN — any secret string you choose
 *   WHATSAPP_API_VERSION        — optional, defaults to v20.0
 */

import { createHmac, timingSafeEqual } from "crypto"

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? ""
const ACCESS_TOKEN    = process.env.WHATSAPP_ACCESS_TOKEN ?? ""
const APP_SECRET      = process.env.WHATSAPP_APP_SECRET ?? ""
const API_VERSION     = process.env.WHATSAPP_API_VERSION ?? "v20.0"
const SITE_URL        = process.env.NEXTAUTH_URL ?? "https://marina-mms.vercel.app"

export function verifyWhatsAppSignature(body: string, signature: string): boolean {
  if (!APP_SECRET || !signature.startsWith("sha256=")) return false
  const expected = createHmac("sha256", APP_SECRET).update(body).digest("hex")
  const supplied = signature.slice("sha256=".length)
  const expectedBuffer = Buffer.from(expected)
  const suppliedBuffer = Buffer.from(supplied)
  return expectedBuffer.length === suppliedBuffer.length
    && timingSafeEqual(expectedBuffer, suppliedBuffer)
}

// ─── Core send ────────────────────────────────────────────────────────────────

async function waPost(body: unknown) {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.log("[WhatsApp - not configured] Would send:", JSON.stringify(body).slice(0, 120))
    return { success: true, mock: true }
  }
  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`WhatsApp API → ${res.status}: ${text}`)
  }
  return { success: true, data: await res.json() }
}

/** Send a free-form text message (only valid within 24h customer-service window) */
export async function sendTextMessage(to: string, text: string) {
  return waPost({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalisePhone(to),
    type: "text",
    text: { preview_url: false, body: text },
  })
}

/**
 * Send a pre-approved template message.
 * Templates must be approved in Meta Business Manager before use.
 * components = array of header/body/button parameter objects.
 */
export async function sendTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  components: unknown[] = []
) {
  return waPost({
    messaging_product: "whatsapp",
    to: normalisePhone(to),
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  })
}

/** Mark a message as read */
export async function markRead(messageId: string) {
  return waPost({
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  })
}

// ─── Phone normalisation ──────────────────────────────────────────────────────

/** Ensure phone is in E.164 format without leading + */
function normalisePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "").replace(/^0/, "66")
}

// ─── High-level notification helpers ─────────────────────────────────────────
// These use text messages (session window) as fallback and are ready to be
// swapped for approved templates once registered in Meta Business Manager.

export type QuotationWaData = {
  customerName: string
  quotationNumber: string
  serviceDescription: string
  totalAmount: number
  validUntil: string
}

export async function sendQuotationNotification(to: string, data: QuotationWaData) {
  const amount = `THB ${data.totalAmount.toLocaleString("th-TH")}`
  const url = `${SITE_URL}/portal/quotations`
  const text =
    `⚓ *Ocean Rover Marina*\n\n` +
    `Dear ${data.customerName},\n\n` +
    `Your quotation *${data.quotationNumber}* is ready for review.\n\n` +
    `📋 Service: ${data.serviceDescription}\n` +
    `💰 Total: *${amount}*\n` +
    `📅 Valid Until: ${data.validUntil}\n\n` +
    `Please review and approve via the link below:\n${url}\n\n` +
    `_Work will commence only after written approval and deposit payment._`
  return sendTextMessage(to, text)
}

export type InvoiceWaData = {
  customerName: string
  invoiceNumber: string
  totalAmount: number
  dueDate: string
}

export async function sendInvoiceNotification(to: string, data: InvoiceWaData) {
  const amount = `THB ${data.totalAmount.toLocaleString("th-TH")}`
  const url = `${SITE_URL}/portal/invoices`
  const text =
    `⚓ *Ocean Rover Marina*\n\n` +
    `Dear ${data.customerName},\n\n` +
    `Invoice *${data.invoiceNumber}* has been issued.\n\n` +
    `💰 Amount Due: *${amount}*\n` +
    `📅 Due Date: *${data.dueDate}*\n\n` +
    `Please arrange payment via bank transfer or QR code.\n` +
    `Reference your invoice number in the payment description.\n\n` +
    `View invoice: ${url}`
  return sendTextMessage(to, text)
}

export type WorkOrderWaData = {
  customerName: string
  workOrderRef: string
  boatName: string
  newStatus: string
  note?: string
}

export async function sendWorkOrderUpdate(to: string, data: WorkOrderWaData) {
  const url = `${SITE_URL}/portal/requests`
  const statusLabel = data.newStatus.replace(/_/g, " ")
  const text =
    `⚓ *Ocean Rover Marina — Work Order Update*\n\n` +
    `Dear ${data.customerName},\n\n` +
    `Your vessel *${data.boatName}* work order *${data.workOrderRef}* has been updated.\n\n` +
    `🔧 Status: *${statusLabel}*` +
    (data.note ? `\n📝 Note: ${data.note}` : "") +
    `\n\nView details: ${url}`
  return sendTextMessage(to, text)
}

export type ContractExpiryWaData = {
  customerName: string
  contractNumber: string
  boatName?: string
  berthCode?: string
  expiryDate: string
  daysRemaining: number
}

export async function sendContractExpiryNotification(to: string, data: ContractExpiryWaData) {
  const url = `${SITE_URL}/portal`
  const urgency = data.daysRemaining <= 7 ? "🚨 *URGENT*" : "⚠️"
  const text =
    `⚓ *Ocean Rover Marina — Contract Expiry Notice*\n\n` +
    `Dear ${data.customerName},\n\n` +
    `${urgency} Your marina contract *${data.contractNumber}* expires in *${data.daysRemaining} days* (${data.expiryDate}).\n\n` +
    (data.boatName ? `🚢 Vessel: ${data.boatName}\n` : "") +
    (data.berthCode ? `⚓ Berth: ${data.berthCode}\n` : "") +
    `\nPlease contact us to renew and keep your current berth or slot.\n` +
    `📞 +66 82 878 9149\n${url}`
  return sendTextMessage(to, text)
}

/** Auto-acknowledgment for inbound messages */
export async function sendAck(to: string, customerName?: string) {
  const name = customerName ? `, ${customerName}` : ""
  const text =
    `⚓ *Ocean Rover Marina*\n\n` +
    `Thank you${name} for your message! Our team has been notified and will get back to you shortly.\n\n` +
    `For urgent matters please call: *+66 82 878 9149*`
  return sendTextMessage(to, text)
}
