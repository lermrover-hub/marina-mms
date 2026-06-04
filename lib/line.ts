/**
 * LINE Messaging API client for Marina MMS
 * Docs: https://developers.line.biz/en/docs/messaging-api/
 *
 * Env vars required:
 *   LINE_CHANNEL_ACCESS_TOKEN  — from LINE Developers Console
 *   LINE_CHANNEL_SECRET        — for webhook signature verification
 */

import { createHmac } from "crypto"

const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ""
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET ?? ""
const LINE_API = "https://api.line.me/v2/bot"
const SITE_URL = process.env.NEXTAUTH_URL ?? "https://marina-mms.vercel.app"

// ─── Core send ────────────────────────────────────────────────────────────────

async function linePost(path: string, body: unknown) {
  if (!ACCESS_TOKEN) {
    console.log("[LINE - not configured] Would send:", JSON.stringify(body).slice(0, 120))
    return { success: true, mock: true }
  }
  const res = await fetch(`${LINE_API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`LINE API ${path} → ${res.status}: ${text}`)
  }
  return { success: true }
}

/** Push a message to a LINE user ID */
export async function pushMessage(lineUserId: string, messages: unknown[]) {
  return linePost("/message/push", { to: lineUserId, messages })
}

/** Reply using a reply token (from webhook event) */
export async function replyMessage(replyToken: string, messages: unknown[]) {
  return linePost("/message/reply", { replyToken, messages })
}

// ─── Signature verification ───────────────────────────────────────────────────

export function verifyLineSignature(body: string, signature: string): boolean {
  if (!CHANNEL_SECRET) return true // skip in dev
  const hash = createHmac("sha256", CHANNEL_SECRET).update(body).digest("base64")
  return hash === signature
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tealButton(label: string, url: string) {
  return {
    type: "button",
    action: { type: "uri", label, uri: url },
    style: "primary",
    color: "#13988f",
    height: "sm",
  }
}

function headerBox(title: string, subtitle: string) {
  return {
    type: "box",
    layout: "vertical",
    contents: [
      { type: "text", text: "⚓ Ocean Rover Marina", size: "xs", color: "#ccf0ee", weight: "bold" },
      { type: "text", text: title, size: "lg", color: "#ffffff", weight: "bold", margin: "sm" },
      { type: "text", text: subtitle, size: "xs", color: "#ccf0ee", margin: "xs", wrap: true },
    ],
    backgroundColor: "#13988f",
    paddingAll: "20px",
  }
}

// ─── Flex Message templates ───────────────────────────────────────────────────

export type QuotationLineData = {
  customerName: string
  quotationNumber: string
  serviceDescription: string
  totalAmount: number
  validUntil: string
  quotationUrl?: string
}

export function quotationFlexMessage(data: QuotationLineData) {
  const url = data.quotationUrl ?? `${SITE_URL}/portal/quotations`
  const amount = `฿${data.totalAmount.toLocaleString("th-TH")}`
  return {
    type: "flex",
    altText: `Quotation ${data.quotationNumber} — ${amount} — Ocean Rover Marina`,
    contents: {
      type: "bubble",
      header: headerBox("Quotation Ready for Review", `${data.quotationNumber}`),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "text", text: `Dear ${data.customerName}`, size: "sm", color: "#374151" },
          { type: "text", text: "We have prepared a quotation for your requested services.", size: "sm", color: "#6b7280", wrap: true, margin: "sm" },
          { type: "separator", margin: "lg" },
          {
            type: "box", layout: "vertical", margin: "lg", spacing: "sm",
            contents: [
              { type: "box", layout: "horizontal", contents: [
                { type: "text", text: "Service", size: "sm", color: "#6b7280", flex: 2 },
                { type: "text", text: data.serviceDescription, size: "sm", color: "#1f2937", flex: 3, wrap: true, align: "end" },
              ]},
              { type: "box", layout: "horizontal", contents: [
                { type: "text", text: "Total Amount", size: "sm", color: "#6b7280", flex: 2 },
                { type: "text", text: amount, size: "sm", color: "#13988f", weight: "bold", flex: 3, align: "end" },
              ]},
              { type: "box", layout: "horizontal", contents: [
                { type: "text", text: "Valid Until", size: "sm", color: "#6b7280", flex: 2 },
                { type: "text", text: data.validUntil, size: "sm", color: "#1f2937", flex: 3, align: "end" },
              ]},
            ],
          },
        ],
      },
      footer: {
        type: "box", layout: "vertical", spacing: "sm",
        contents: [tealButton("View & Approve Quotation", url)],
      },
    },
  }
}

export type InvoiceLineData = {
  customerName: string
  invoiceNumber: string
  totalAmount: number
  dueDate: string
  invoiceUrl?: string
}

export function invoiceFlexMessage(data: InvoiceLineData) {
  const url = data.invoiceUrl ?? `${SITE_URL}/portal/invoices`
  const amount = `฿${data.totalAmount.toLocaleString("th-TH")}`
  return {
    type: "flex",
    altText: `Invoice ${data.invoiceNumber} — ${amount} due ${data.dueDate}`,
    contents: {
      type: "bubble",
      header: headerBox("Invoice Issued", data.invoiceNumber),
      body: {
        type: "box", layout: "vertical", spacing: "md",
        contents: [
          { type: "text", text: `Dear ${data.customerName}`, size: "sm", color: "#374151" },
          { type: "text", text: "An invoice has been issued. Please arrange payment before the due date.", size: "sm", color: "#6b7280", wrap: true, margin: "sm" },
          { type: "separator", margin: "lg" },
          {
            type: "box", layout: "vertical", margin: "lg", spacing: "sm",
            contents: [
              { type: "box", layout: "horizontal", contents: [
                { type: "text", text: "Amount Due", size: "sm", color: "#6b7280", flex: 2 },
                { type: "text", text: amount, size: "lg", color: "#dc2626", weight: "bold", flex: 3, align: "end" },
              ]},
              { type: "box", layout: "horizontal", contents: [
                { type: "text", text: "Due Date", size: "sm", color: "#6b7280", flex: 2 },
                { type: "text", text: data.dueDate, size: "sm", color: "#1f2937", flex: 3, align: "end" },
              ]},
            ],
          },
        ],
      },
      footer: {
        type: "box", layout: "vertical", spacing: "sm",
        contents: [tealButton("View Invoice & Pay", url)],
      },
    },
  }
}

export type WorkOrderLineData = {
  customerName: string
  workOrderRef: string
  boatName: string
  newStatus: string
  note?: string
  workOrderUrl?: string
}

export function workOrderFlexMessage(data: WorkOrderLineData) {
  const url = data.workOrderUrl ?? `${SITE_URL}/portal/requests`
  const statusColors: Record<string, string> = {
    IN_PROGRESS: "#2563eb", COMPLETED: "#059669", ON_HOLD: "#d97706",
    WAITING_PARTS: "#d97706", CANCELLED: "#dc2626",
  }
  const statusColor = statusColors[data.newStatus.toUpperCase()] ?? "#6b7280"
  return {
    type: "flex",
    altText: `Work Order ${data.workOrderRef} — ${data.newStatus}`,
    contents: {
      type: "bubble",
      header: headerBox("Work Order Update", data.workOrderRef),
      body: {
        type: "box", layout: "vertical", spacing: "md",
        contents: [
          { type: "text", text: `Dear ${data.customerName}`, size: "sm", color: "#374151" },
          { type: "separator", margin: "lg" },
          {
            type: "box", layout: "vertical", margin: "lg", spacing: "sm",
            contents: [
              { type: "box", layout: "horizontal", contents: [
                { type: "text", text: "Vessel", size: "sm", color: "#6b7280", flex: 2 },
                { type: "text", text: data.boatName, size: "sm", color: "#1f2937", flex: 3, align: "end" },
              ]},
              { type: "box", layout: "horizontal", contents: [
                { type: "text", text: "Status", size: "sm", color: "#6b7280", flex: 2 },
                { type: "text", text: data.newStatus.replace(/_/g, " "), size: "sm", color: statusColor, weight: "bold", flex: 3, align: "end" },
              ]},
              ...(data.note ? [{ type: "box", layout: "horizontal" as const, contents: [
                { type: "text", text: "Note", size: "sm", color: "#6b7280", flex: 2 },
                { type: "text", text: data.note, size: "sm", color: "#374151", flex: 3, wrap: true, align: "end" as const },
              ]}] : []),
            ],
          },
        ],
      },
      footer: {
        type: "box", layout: "vertical", spacing: "sm",
        contents: [tealButton("View Job Details", url)],
      },
    },
  }
}

export type ContractExpiryLineData = {
  customerName: string
  contractNumber: string
  contractType: string
  boatName?: string
  berthCode?: string
  expiryDate: string
  daysRemaining: number
  renewalUrl?: string
}

export function contractExpiryFlexMessage(data: ContractExpiryLineData) {
  const url = data.renewalUrl ?? `${SITE_URL}/portal`
  const urgentColor = data.daysRemaining <= 7 ? "#dc2626" : "#d97706"
  return {
    type: "flex",
    altText: `Contract Expiry Notice — ${data.daysRemaining} days remaining`,
    contents: {
      type: "bubble",
      header: {
        type: "box", layout: "vertical",
        contents: [
          { type: "text", text: "⚓ Ocean Rover Marina", size: "xs", color: "#ccf0ee", weight: "bold" },
          { type: "text", text: "Contract Expiring Soon", size: "lg", color: "#ffffff", weight: "bold", margin: "sm" },
          { type: "text", text: `${data.daysRemaining} days remaining`, size: "sm", color: "#ffe082", weight: "bold", margin: "xs" },
        ],
        backgroundColor: "#d97706", paddingAll: "20px",
      },
      body: {
        type: "box", layout: "vertical", spacing: "md",
        contents: [
          { type: "text", text: `Dear ${data.customerName}`, size: "sm", color: "#374151" },
          { type: "text", text: "Your marina contract is approaching its expiry. Please renew to avoid interruption.", size: "sm", color: "#6b7280", wrap: true, margin: "sm" },
          { type: "separator", margin: "lg" },
          {
            type: "box", layout: "vertical", margin: "lg", spacing: "sm",
            contents: [
              { type: "box", layout: "horizontal", contents: [
                { type: "text", text: "Contract", size: "sm", color: "#6b7280", flex: 2 },
                { type: "text", text: data.contractNumber, size: "sm", color: "#1f2937", flex: 3, align: "end" },
              ]},
              ...(data.boatName ? [{ type: "box", layout: "horizontal" as const, contents: [
                { type: "text", text: "Vessel", size: "sm", color: "#6b7280", flex: 2 },
                { type: "text", text: data.boatName, size: "sm", color: "#1f2937", flex: 3, align: "end" as const },
              ]}] : []),
              ...(data.berthCode ? [{ type: "box", layout: "horizontal" as const, contents: [
                { type: "text", text: "Berth", size: "sm", color: "#6b7280", flex: 2 },
                { type: "text", text: data.berthCode, size: "sm", color: "#1f2937", flex: 3, align: "end" as const },
              ]}] : []),
              { type: "box", layout: "horizontal", contents: [
                { type: "text", text: "Expires", size: "sm", color: "#6b7280", flex: 2 },
                { type: "text", text: data.expiryDate, size: "sm", color: urgentColor, weight: "bold", flex: 3, align: "end" },
              ]},
            ],
          },
        ],
      },
      footer: {
        type: "box", layout: "vertical", spacing: "sm",
        contents: [{ ...tealButton("Renew Contract", url), color: "#d97706" }],
      },
    },
  }
}

/** Simple text auto-acknowledgment for incoming messages */
export function ackMessage(customerName?: string) {
  const name = customerName ? `, ${customerName}` : ""
  return {
    type: "text",
    text: `Thank you${name} for your message! Our team has been notified and will respond shortly.\n\nFor urgent matters, please call: +66 82 878 9149\n\n⚓ Ocean Rover Marina`,
  }
}
