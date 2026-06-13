/**
 * Direct LINE + WhatsApp API helpers for the AI agent team.
 * Mirrors lib/line.ts and lib/whatsapp.ts in the web app but runs
 * in Node.js ESM without Next.js — no imports from the web app.
 *
 * Env vars (same as web app):
 *   LINE_CHANNEL_ACCESS_TOKEN
 *   WHATSAPP_PHONE_NUMBER_ID
 *   WHATSAPP_ACCESS_TOKEN
 */

import { MARINA_NAME, MARINA_PHONE, MARINA_PORTAL_URL } from "./constants.js"

const LINE_TOKEN   = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ""
const WA_PHONE_ID  = process.env.WHATSAPP_PHONE_NUMBER_ID  ?? ""
const WA_TOKEN     = process.env.WHATSAPP_ACCESS_TOKEN     ?? ""
const WA_VERSION   = process.env.WHATSAPP_API_VERSION      ?? "v25.0"
const DRY_RUN      = process.env.AI_AGENT_DRY_RUN === "true"
const REAL_MESSAGES_ENABLED = process.env.ENABLE_REAL_CUSTOMER_MESSAGES === "true"

// ─── LINE ─────────────────────────────────────────────────────────────────────

export async function sendLineText(lineUserId, text) {
  if (DRY_RUN) {
    console.log(`[Messaging DRY RUN] LINE → ${lineUserId}: ${text.slice(0, 80)}…`)
    return { success: true, dryRun: true }
  }
  if (!LINE_TOKEN) {
    console.log(`[Messaging - LINE not configured] Would send to ${lineUserId}`)
    return { success: true, mock: true }
  }
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LINE_TOKEN}` },
    body: JSON.stringify({ to: lineUserId, messages: [{ type: "text", text }] }),
  })
  if (!res.ok) throw new Error(`LINE push → ${res.status}: ${await res.text().catch(() => "")}`)
  return { success: true }
}

export async function replyLine(replyToken, text) {
  if (DRY_RUN) {
    console.log(`[Messaging DRY RUN] LINE reply: ${text.slice(0, 80)}…`)
    return { success: true, dryRun: true }
  }
  if (!LINE_TOKEN) return { success: true, mock: true }
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LINE_TOKEN}` },
    body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }),
  })
  if (!res.ok) throw new Error(`LINE reply → ${res.status}`)
  return { success: true }
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

function normalisePhone(phone) {
  return phone.replace(/[^0-9]/g, "").replace(/^0/, "66")
}

export async function sendWhatsAppText(to, text) {
  const phone = normalisePhone(to)
  if (DRY_RUN) {
    console.log(`[Messaging DRY RUN] WhatsApp → ${phone}: ${text.slice(0, 80)}…`)
    return { success: true, dryRun: true }
  }
  if (!REAL_MESSAGES_ENABLED) {
    return {
      success: false,
      blocked: true,
      reason: "ENABLE_REAL_CUSTOMER_MESSAGES is not enabled",
    }
  }
  if (!WA_PHONE_ID || !WA_TOKEN) {
    console.log(`[Messaging - WhatsApp not configured] Would send to ${phone}`)
    return { success: false, mock: true, reason: "WhatsApp credentials are not configured" }
  }
  const res = await fetch(`https://graph.facebook.com/${WA_VERSION}/${WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${WA_TOKEN}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone,
      type: "text",
      text: { preview_url: false, body: text },
    }),
  })
  if (!res.ok) throw new Error(`WhatsApp → ${res.status}: ${await res.text().catch(() => "")}`)
  return { success: true }
}

// ─── Shared reply formatter ────────────────────────────────────────────────────

export function formatReply(text) {
  return `⚓ *${MARINA_NAME}*\n\n${text}\n\nFor urgent matters: *${MARINA_PHONE}*\n${MARINA_PORTAL_URL}`
}
