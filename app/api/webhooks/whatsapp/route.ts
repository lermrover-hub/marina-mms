/**
 * WhatsApp Cloud API Webhook
 * GET  /api/webhooks/whatsapp  — webhook verification (Meta calls this on setup)
 * POST /api/webhooks/whatsapp  — incoming message events
 *
 * - GET verifies the hub challenge sent by Meta
 * - POST handles inbound messages, saves to mms_messages, sends ack
 * - No auth required — Meta servers call this directly
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { sendAck, markRead, verifyWhatsAppSignature } from "@/lib/whatsapp"

export const dynamic = "force-dynamic"

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? ""

// ─── GET — webhook verification ───────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get("hub.mode")
  const token     = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (VERIFY_TOKEN && mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 })
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

// ─── POST — incoming events ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get("x-hub-signature-256") ?? ""
    if (!verifyWhatsAppSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
    if (process.env.ENABLE_AUTOMATION_WRITES !== "true") {
      return NextResponse.json({ error: "Automation writes are disabled" }, { status: 503 })
    }
    const body = JSON.parse(rawBody)

    // WhatsApp Cloud API wraps everything in entry[].changes[]
    const changes = body?.entry?.[0]?.changes ?? []

    const supabase = createServerClient()

    for (const change of changes) {
      const value    = change.value ?? {}
      const messages = value.messages ?? []
      const contacts = value.contacts ?? []

      for (const msg of messages) {
        const from        = String(msg.from ?? "")
        const messageId   = String(msg.id ?? "")
        const msgType     = String(msg.type ?? "text")
        const text        = msg.text?.body ?? msg.caption ?? `[${msgType}]`
        const contactName = contacts.find((c: { wa_id: string; profile?: { name?: string } }) => c.wa_id === from)?.profile?.name

        // Mark as read
        await markRead(messageId).catch(() => {})

        // Look up customer by whatsapp_number
        const normPhone = from.replace(/^0/, "66")
        const { data: customer } = await supabase
          .from("mms_customers")
          .select("id, full_name, company_name")
          .eq("whatsapp_number", normPhone)
          .maybeSingle()

        const customerId   = customer?.id ?? null
        const customerName = customer?.full_name ?? customer?.company_name ?? contactName ?? undefined

        // Save inbound message
        await supabase.from("mms_messages").insert({
          channel:      "WHATSAPP",
          direction:    "INBOUND",
          sender_id:    from,
          customer_id:  customerId,
          message_type: msgType,
          content:      String(text),
          raw_payload:  msg,
        })

        // Create staff notification
        await supabase.from("mms_notifications").insert({
          type:        "whatsapp_message",
          title:       `WhatsApp message${customerName ? ` from ${customerName}` : ` from +${from}`}`,
          message:     String(text).length > 120 ? String(text).slice(0, 117) + "…" : String(text),
          customer_id: customerId,
          reference_id: from,
          priority:    "MEDIUM",
        })

        // Send acknowledgment
        await sendAck(from, customerName).catch(() => {})
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[WhatsApp webhook error]", err)
    // Always 200 — Meta retries on non-200 which can flood the endpoint
    return NextResponse.json({ ok: true })
  }
}
