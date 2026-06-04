/**
 * LINE Webhook
 * POST /api/webhooks/line
 *
 * Receives events from LINE Messaging API.
 * - Verifies HMAC-SHA256 signature
 * - Handles follow / unfollow (links LINE user to customer record)
 * - Handles text messages (saves to mms_messages, sends ack, links customer)
 * - No auth required — LINE servers call this directly
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { verifyLineSignature, replyMessage, ackMessage } from "@/lib/line"

export const dynamic = "force-dynamic"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LineEvent = Record<string, any>

export async function POST(req: NextRequest) {
  try {
    const rawBody  = await req.text()
    const signature = req.headers.get("x-line-signature") ?? ""

    if (!verifyLineSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
    if (process.env.ENABLE_AUTOMATION_WRITES !== "true") {
      return NextResponse.json({ error: "Automation writes are disabled" }, { status: 503 })
    }

    const payload = JSON.parse(rawBody)
    const events: LineEvent[] = payload.events ?? []

    if (events.length === 0) {
      return NextResponse.json({ ok: true })
    }

    const supabase = createServerClient()

    for (const event of events) {
      const lineUserId  = event.source?.userId as string | undefined
      if (!lineUserId) continue

      // ── Look up customer by line_user_id ────────────────────────────────
      const { data: customer } = await supabase
        .from("mms_customers")
        .select("id, full_name, company_name")
        .eq("line_user_id", lineUserId)
        .maybeSingle()

      const customerId   = customer?.id ?? null
      const customerName = customer?.full_name ?? customer?.company_name ?? undefined

      // ── Handle follow event (customer added the Official Account) ────────
      if (event.type === "follow") {
        await supabase.from("mms_notifications").insert({
          type:        "line_follow",
          title:       "New LINE follower",
          message:     `LINE user ${lineUserId} followed the Official Account. Link to a customer in the customer profile.`,
          reference_id: lineUserId,
          priority:    "LOW",
        })
        // Send welcome ack
        await replyMessage(event.replyToken, [ackMessage(customerName)]).catch(() => {})
        continue
      }

      // ── Handle text messages ─────────────────────────────────────────────
      if (event.type === "message" && event.message?.type === "text") {
        const text = String(event.message.text ?? "").trim()

        // Save inbound message
        await supabase.from("mms_messages").insert({
          channel:      "LINE",
          direction:    "INBOUND",
          sender_id:    lineUserId,
          customer_id:  customerId,
          message_type: "text",
          content:      text,
          reply_token:  event.replyToken ?? null,
          raw_payload:  event,
        })

        // Create staff notification
        await supabase.from("mms_notifications").insert({
          type:        "line_message",
          title:       `LINE message${customerName ? ` from ${customerName}` : ""}`,
          message:     text.length > 120 ? text.slice(0, 117) + "…" : text,
          customer_id: customerId,
          reference_id: lineUserId,
          priority:    "MEDIUM",
        })

        // Send acknowledgment back
        await replyMessage(event.replyToken, [ackMessage(customerName)]).catch(() => {})
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[LINE webhook error]", err)
    return NextResponse.json({ error: "Webhook error" }, { status: 500 })
  }
}
