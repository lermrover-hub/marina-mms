import { test } from "node:test"
import assert from "node:assert/strict"
import { createHmac } from "node:crypto"

test("WhatsApp delivery fails closed when real messages are disabled", async () => {
  const savedFlag = process.env.ENABLE_REAL_CUSTOMER_MESSAGES
  const savedPhone = process.env.WHATSAPP_PHONE_NUMBER_ID
  const savedToken = process.env.WHATSAPP_ACCESS_TOKEN
  delete process.env.ENABLE_REAL_CUSTOMER_MESSAGES
  process.env.WHATSAPP_PHONE_NUMBER_ID = "test-phone-id"
  process.env.WHATSAPP_ACCESS_TOKEN = "test-access-token"

  try {
    const whatsapp = await import(`../lib/whatsapp.ts?blocked=${Date.now()}`)
    const result = await whatsapp.sendTextMessage("66800000000", "safety test")
    assert.equal(result.success, false)
    assert.equal(result.blocked, true)
  } finally {
    if (savedFlag === undefined) delete process.env.ENABLE_REAL_CUSTOMER_MESSAGES
    else process.env.ENABLE_REAL_CUSTOMER_MESSAGES = savedFlag
    if (savedPhone === undefined) delete process.env.WHATSAPP_PHONE_NUMBER_ID
    else process.env.WHATSAPP_PHONE_NUMBER_ID = savedPhone
    if (savedToken === undefined) delete process.env.WHATSAPP_ACCESS_TOKEN
    else process.env.WHATSAPP_ACCESS_TOKEN = savedToken
  }
})

test("WhatsApp webhook signature accepts only the configured app secret", async () => {
  const savedSecret = process.env.WHATSAPP_APP_SECRET
  process.env.WHATSAPP_APP_SECRET = "whatsapp-test-secret"

  try {
    const whatsapp = await import(`../lib/whatsapp.ts?signature=${Date.now()}`)
    const body = JSON.stringify({ object: "whatsapp_business_account" })
    const valid = `sha256=${createHmac("sha256", "whatsapp-test-secret").update(body).digest("hex")}`
    assert.equal(whatsapp.verifyWhatsAppSignature(body, valid), true)
    assert.equal(whatsapp.verifyWhatsAppSignature(body, "sha256=invalid"), false)
    assert.equal(whatsapp.verifyWhatsAppSignature(body, ""), false)
  } finally {
    if (savedSecret === undefined) delete process.env.WHATSAPP_APP_SECRET
    else process.env.WHATSAPP_APP_SECRET = savedSecret
  }
})
