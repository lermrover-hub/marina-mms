import assert from "node:assert/strict"
import { randomBytes, randomUUID } from "node:crypto"
import { readFile } from "node:fs/promises"
import { parseEnv } from "node:util"
import { pathToFileURL } from "node:url"
import bcrypt from "bcryptjs"
import { createClient } from "@supabase/supabase-js"

const origin = new URL(process.env.MMS_QA_PREVIEW_URL).origin
assert.match(origin, /^https:\/\/marina-mms-v38-review-[a-z0-9]+-lermrover-hubs-projects\.vercel\.app$/)
const token = process.env.VERCEL_OIDC_TOKEN
assert.ok(token, "Run with vercel env run from the linked Preview project")
const unauth = await fetch(`${origin}/pricing-master`, { redirect: "manual" })
assert.ok(unauth.status === 401 || (
  unauth.status === 302 && new URL(unauth.headers.get("location"), origin).hostname === "vercel.com"
), "Deployment must require Vercel authentication")

const env = parseEnv(await readFile(
  process.env.MMS_QA_STAGING_ENV ?? new URL("../.env.staging.local", import.meta.url), "utf8"
))
assert.equal(new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname, "zanlunbgupdtqznruzok.supabase.co")
assert.ok(env.SUPABASE_SERVICE_ROLE_KEY)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const email = `v38-qa-${randomUUID()}@example.invalid`
const password = randomBytes(32).toString("base64url")
const { data: user, error } = await db.from("users").insert({
  name: "v3.8 Preview QA",
  email,
  password_hash: await bcrypt.hash(password, 10),
  role: "finance",
  is_active: true,
}).select("id").single()
assert.ifError(error)
let browser
const drafts = []

try {
  const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_ENTRY).href)
  browser = await chromium.launch({ channel: "chrome", headless: true })
  const page = await browser.newPage({ baseURL: origin, viewport: { width: 1440, height: 950 } })
  const errors = []
  page.on("pageerror", error => errors.push(error.message))
  await page.route(url => url.origin === origin, route => route.continue({
    headers: { ...route.request().headers(), "x-vercel-trusted-oidc-idp-token": token },
  }))
  assert.equal((await page.goto("/login")).status(), 200)
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL("**/dashboard")
  const session = await page.evaluate(async () => (await fetch("/api/auth/session")).json())
  assert.equal(session.user?.role, "FINANCE")

  await page.goto("/pricing-master")
  await page.getByText("80 active v3.8 rates", { exact: true }).waitFor()
  await page.getByLabel("Rate card version").selectOption("current")
  await page.getByRole("region", { name: "Dry Storage / Service Yard rates" }).getByText("STG-M3-M", { exact: true }).waitFor()
  await page.getByRole("region", { name: "Ramp rates" }).getByText("RAMP_SB_3ENG_41_47", { exact: true }).waitFor()
  assert.equal(await page.getByText("STG-MONO-M", { exact: true }).count(), 0)
  const boats = await page.evaluate(async () => (await fetch("/api/db/boats")).json())
  const monohull = boats.find(row => row.boat_type === "MOTOR_YACHT" && Number(row.loa_ft) === 40 &&
    Number(row.weight_t) > 0 && Number(row.weight_t) <= 14 && row.owner_id)
  const speedboat = boats.find(row => row.boat_type?.toUpperCase() === "SPEEDBOAT" && Number(row.loa_ft) === 28 &&
    Number(row.num_engines) <= 2 && row.owner_id)
  for (const { boat, code, rate, unit, basis } of [
    { boat: monohull, code: "STG-M3-M", rate: 26000, unit: "month", basis: "FIXED" },
    { boat: monohull, code: "PKG-HL-MONO-39-42", rate: 16000, unit: "package", basis: "PACKAGE" },
    { boat: speedboat, code: "RAMP_SB_2ENG_28_40", rate: 1200, unit: "trip", basis: "FIXED" },
  ]) {
    assert.ok(boat, `Missing staging vessel for ${code}`)
    const title = `V38-PREVIEW-QA-${randomUUID()}`
    await page.goto("/quotations/new")
    await page.locator("#customer").selectOption(boat.owner_id)
    await page.locator("#boat").selectOption(boat.id)
    await page.locator("#title").fill(title)
    await page.getByRole("button", { name: "Rate Card", exact: true }).click()
    await page.getByPlaceholder(/Search service or code/).fill(code)
    await page.getByText(code, { exact: true }).locator("../../..").getByRole("button", { name: "+ Add" }).click()
    await page.getByPlaceholder(/Search service or code/).locator("../../..").locator("button").first().click()
    const save = page.waitForResponse(r => new URL(r.url()).pathname === "/api/db/quotations" && r.request().method() === "POST")
    await page.getByRole("button", { name: "Save Draft", exact: true }).first().click()
    const response = await save
    const quote = await response.json()
    assert.equal(response.status(), 201, quote.error)
    drafts.push({ id: quote.id, title })
    assert.equal(Number(quote.subtotal), rate)
    assert.equal(Number(quote.total_amount), rate + Math.round(rate * 0.07))
    await page.waitForURL(`**/quotations/${quote.id}`)
    const { data: line, error: lineError } = await db.from("mms_quotation_items")
      .select("qty,unit_price,unit,pricing_code,pricing_rule_snapshot")
      .eq("quotation_id", quote.id).single()
    assert.ifError(lineError)
    assert.equal(Number(line.qty), 1)
    assert.equal(Number(line.unit_price), rate)
    assert.equal(line.unit, unit)
    assert.equal(line.pricing_code, code)
    assert.equal(line.pricing_rule_snapshot.rateBasis, basis)
    console.log("PASS", code, "1", unit, rate)
  }
  assert.deepEqual(errors, [])
  console.log("PASS: protected Vercel Preview; 80 rates; fixed-tier drafts saved with original workflow")
} finally {
  if (browser) await browser.close()
  for (const { id, title } of drafts) {
    const { error: draftCleanupError } = await db.from("mms_quotations").delete().eq("id", id).eq("title", title).eq("status", "DRAFT")
    assert.ifError(draftCleanupError)
  }
  const { error: cleanupError } = await db.from("users").delete().eq("id", user.id).eq("email", email)
  assert.ifError(cleanupError)
}
