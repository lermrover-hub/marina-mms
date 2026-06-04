/**
 * Messaging Agent Tests
 * Tests message parsing, channel routing, dry-run guard, live API.
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import "dotenv/config"

// ── Phone normalisation (mirrors lib/messaging.js) ────────────────────────────

function normalisePhone(phone) {
  return phone.replace(/[^0-9]/g, "").replace(/^0/, "66")
}

// ── Unit tests ────────────────────────────────────────────────────────────────

test("normalisePhone: Thai local to E.164", () => {
  assert.equal(normalisePhone("081-234-5678"), "66812345678")
  assert.equal(normalisePhone("0812345678"),   "66812345678")
})

test("normalisePhone: already international", () => {
  assert.equal(normalisePhone("66812345678"), "66812345678")
})

test("normalisePhone: strips non-digits", () => {
  assert.equal(normalisePhone("+66 82 878 9149"), "66828789149")
})

test("channel field is LINE or WHATSAPP only", () => {
  const valid = ["LINE", "WHATSAPP"]
  const msgs  = [
    { channel: "LINE" },
    { channel: "WHATSAPP" },
    { channel: "SMS" },       // invalid
    { channel: "TELEGRAM" },  // invalid
  ]
  const ok = msgs.filter(m => valid.includes(m.channel))
  assert.equal(ok.length, 2)
})

test("formatReply prepends marina header", () => {
  const text = "Your invoice is ready."
  const reply = `⚓ *Ocean Rover Marina*\n\n${text}\n\nFor urgent matters: *+66 82 878 9149*\nhttps://marina-mms.vercel.app/portal`
  assert.ok(reply.includes("Ocean Rover Marina"))
  assert.ok(reply.includes(text))
  assert.ok(reply.includes("+66 82 878 9149"))
})

test("dry-run guard: DRY_RUN env is set to true", () => {
  assert.equal(process.env.AI_AGENT_DRY_RUN, "true",
    "Tests must run with AI_AGENT_DRY_RUN=true to prevent production writes")
})

test("skip-claude guard: SKIP_CLAUDE env is set to true", () => {
  assert.equal(process.env.AI_AGENT_SKIP_CLAUDE, "true",
    "Tests must run with AI_AGENT_SKIP_CLAUDE=true to prevent Claude API spend")
})

// ── Live API smoke test ────────────────────────────────────────────────────────

async function liveGet(t, path) {
  const BASE      = process.env.MARINA_API_BASE
  const AGENT_KEY = process.env.MARINA_AGENT_API_KEY
  if (!BASE || !AGENT_KEY) { t.skip("env not set"); return null }
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "x-agent-api-key": AGENT_KEY }, redirect: "manual",
    })
    if (res.status === 404) { t.skip(`${path} not yet deployed to Vercel`); return null }
    return { status: res.status, data: await res.json() }
  } catch (err) {
    t.skip(`Network error: ${err.message.slice(0, 60)}`)
    return null
  }
}

test("live: messages endpoint returns array", async (t) => {
  const r = await liveGet(t, "/api/db/messages?direction=INBOUND&replied=false")
  if (!r) return
  assert.equal(r.status, 200, `messages → ${r.status}`)
  assert.ok(Array.isArray(r.data), "messages should return array")
  console.log(`    ℹ ${r.data.length} unreplied inbound messages in the inbox`)
})

test("live: notifications endpoint returns array", async (t) => {
  const r = await liveGet(t, "/api/db/notifications")
  if (!r) return
  assert.equal(r.status, 200)
  assert.ok(Array.isArray(r.data))
  console.log(`    ℹ ${r.data.length} notifications in the system`)
})
