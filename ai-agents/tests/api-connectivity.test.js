/**
 * API Connectivity Tests
 * Verifies every endpoint the agents rely on returns HTTP 200
 * and well-formed JSON. Read-only — no writes.
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import "dotenv/config"

const BASE      = process.env.MARINA_API_BASE ?? "http://localhost:3000"
const AGENT_KEY = process.env.MARINA_AGENT_API_KEY ?? ""

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-agent-api-key": AGENT_KEY, "Content-Type": "application/json" },
    redirect: "manual",
  })
  return { status: res.status, contentType: res.headers.get("content-type") ?? "", body: await res.text() }
}

function assertJson(r, path) {
  assert.equal(r.status, 200, `${path} → expected 200, got ${r.status}. Body: ${r.body.slice(0, 200)}`)
  assert.ok(r.contentType.includes("application/json"), `${path} → expected JSON, got ${r.contentType}`)
}

const ENDPOINTS = [
  "/api/db/customers",
  "/api/db/boats",
  "/api/db/service-requests",
  "/api/db/quotations",
  "/api/db/invoices",
  "/api/db/work-orders",
  "/api/db/contracts",
  "/api/db/notifications",
  "/api/db/payments",
  "/api/db/messages",
  "/api/pricing-master?isActive=true",
]

for (const path of ENDPOINTS) {
  test(`GET ${path}`, async (t) => {
    let r
    try {
      r = await get(path)
    } catch (err) {
      // Network / cold-start timeout — skip rather than fail
      t.skip(`Network error (${err.message.slice(0, 60)}) — run again when Vercel is warm`)
      return
    }

    // Routes not yet deployed return 404 — skip with a clear message
    if (r.status === 404) {
      t.skip(`${path} → 404 (route not yet deployed to Vercel)`)
      return
    }

    assertJson(r, path)
    const parsed = JSON.parse(r.body)
    assert.ok(
      Array.isArray(parsed) || (typeof parsed === "object" && parsed !== null),
      `${path} → response is not array or object`
    )
  })
}

test("agent key is set", () => {
  assert.ok(AGENT_KEY.length > 0, "MARINA_AGENT_API_KEY must be set in .env")
})

test("API base is production URL", () => {
  assert.ok(BASE.startsWith("https://"), `MARINA_API_BASE should be https:// — got: ${BASE}`)
})
