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

const env = parseEnv(await readFile(new URL("../.env.staging.local", import.meta.url), "utf8"))
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
let draftId
const draftTitle = `V38-PREVIEW-QA-${randomUUID()}`

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
  const boat = boats.find(row => row.boat_type === "MOTOR_YACHT" && Number(row.loa_ft) === 40 &&
    Number(row.weight_t) > 0 && Number(row.weight_t) <= 14 && row.owner_id)
  assert.ok(boat, "Missing 40 ft staging vessel")
  await page.goto("/quotations/new")
  await page.locator("#customer").selectOption(boat.owner_id)
  await page.locator("#boat").selectOption(boat.id)
  await page.locator("#title").fill(draftTitle)
  await page.getByRole("button", { name: "Rate Card", exact: true }).click()
  await page.getByPlaceholder(/Search service or code/).fill("STG-M3-M")
  await page.getByText("STG-M3-M", { exact: true }).locator("../../..").getByRole("button", { name: "+ Add" }).click()
  await page.getByPlaceholder(/Search service or code/).locator("../../..").locator("button").first().click()
  const save = page.waitForResponse(r => new URL(r.url()).pathname === "/api/db/quotations" && r.request().method() === "POST")
  await page.getByRole("button", { name: "Save Draft", exact: true }).first().click()
  const response = await save
  const quote = await response.json()
  assert.equal(response.status(), 201, quote.error)
  draftId = quote.id
  assert.equal(Number(quote.subtotal), 26000)
  assert.equal(Number(quote.total_amount), 27820)
  await page.waitForURL(`**/quotations/${draftId}`)
  const { data: line, error: lineError } = await db.from("mms_quotation_items")
    .select("qty,unit_price,unit,pricing_code,pricing_rule_snapshot")
    .eq("quotation_id", draftId).single()
  assert.ifError(lineError)
  assert.equal(Number(line.qty), 1)
  assert.equal(Number(line.unit_price), 26000)
  assert.equal(line.unit, "month")
  assert.equal(line.pricing_code, "STG-M3-M")
  assert.equal(line.pricing_rule_snapshot.rateBasis, "FIXED")
  assert.deepEqual(errors, [])
  console.log("PASS: protected Vercel Preview; 80 rates; M3 Draft stored 1 month x THB 26,000, FIXED snapshot")
} finally {
  if (browser) await browser.close()
  if (draftId) {
    const { error: draftCleanupError } = await db.from("mms_quotations").delete().eq("id", draftId).eq("title", draftTitle).eq("status", "DRAFT")
    assert.ifError(draftCleanupError)
  }
  const { error: cleanupError } = await db.from("users").delete().eq("id", user.id).eq("email", email)
  assert.ifError(cleanupError)
}
