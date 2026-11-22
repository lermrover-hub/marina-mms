import assert from "node:assert/strict"
import { mkdir } from "node:fs/promises"
import { randomUUID } from "node:crypto"
import { pathToFileURL } from "node:url"

// Run against the loopback server started by scripts/start-staging.ps1 only.
const base = "http://127.0.0.1:3108"
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_ENTRY).href)
const browser = await chromium.launch({ channel: "chrome", headless: true })
const page = await browser.newPage({ baseURL: base, viewport: { width: 1440, height: 950 } })
const errors = []
const written = []
page.on("pageerror", (error) => errors.push(error.message))

try {
  await page.goto("/login")
  await page.locator('input[type="email"]').fill(process.env.MMS_QA_EMAIL)
  await page.locator('input[type="password"]').fill(process.env.MMS_QA_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL("**/dashboard")
  const session = await (await page.request.get("/api/auth/session")).json()
  assert.equal(session.user?.role, "SUPER_ADMIN")

  const ratesResponse = await page.request.get("/api/pricing-master?sourceVersion=ORM-PRICE-2026-v3.8&isActive=true")
  assert.ok(ratesResponse.ok())
  assert.equal((await ratesResponse.json()).data.length, 52)
  const boats = await (await page.request.get("/api/db/boats")).json()
  const cases = [
    { code: "STG-SB2-D", boat: boats.find(b => b.boat_type.toUpperCase() === "SPEEDBOAT" && Number(b.loa_ft) === 28 && Number(b.num_engines) <= 2), subtotal: 700, qty: 1, price: 700 },
    { code: "STG-MONO-M", boat: boats.find(b => b.boat_type === "MOTOR_YACHT" && Number(b.loa_ft) === 40 && Number(b.weight_t) > 0 && Number(b.weight_t) <= 14), subtotal: 26000, qty: 40, price: 650 },
  ]
  for (const { boat, code, subtotal, qty, price } of cases) {
    assert.ok(boat?.owner_id, `No staging fixture for ${code}`)
    await page.goto("/quotations/new")
    assert.match(await page.title(), /Marina/i)
    await page.locator("#customer").selectOption(boat.owner_id)
    await page.locator("#boat").selectOption(boat.id)
    const title = `V38-BROWSER-QA-${randomUUID()}`
    await page.locator("#title").fill(title)
    await page.getByRole("button", { name: "Rate Card", exact: true }).click()
    await page.getByPlaceholder(/Search service or code/).fill(code)
    await page.getByText(code, { exact: true }).locator("../../..").getByRole("button", { name: "+ Add" }).click()
    await page.getByPlaceholder(/Search service or code/).locator("../../..").locator("button").first().click()
    const save = page.waitForResponse(r => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/db/quotations")
    await page.getByRole("button", { name: "Save Draft", exact: true }).first().click()
    const response = await save
    const result = await response.json()
    if (response.ok() && result.id) {
      written.push(result.id)
      console.log("QA_QUOTATION_ID", result.id)
    }
    assert.equal(response.status(), 201, String(result.error))
    assert.equal(Number(result.subtotal), subtotal)
    assert.equal(Number(result.total_amount), subtotal + Math.round(subtotal * 0.07))
    await page.waitForURL(`**/quotations/${result.id}`)
    const detail = await (await page.request.get(`/api/db/quotations/${result.id}`)).json()
    const line = detail.mms_quotation_items?.[0]
    assert.equal(line?.pricing_code, code)
    assert.equal(Number(line.qty), qty)
    assert.equal(Number(line.unit_price), price)
    const quotes = await (await page.request.get("/api/db/quotations")).json()
    assert.equal(quotes.filter(quote => quote.title === title).length, 1)
    console.log("PASS", code, { subtotal, qty, price, total: Number(result.total_amount) })
  }
  assert.deepEqual(errors, [])
  await mkdir("test-results/v38", { recursive: true })
  await page.screenshot({ path: "test-results/v38/quotation-detail.png" })
} finally {
  console.log("QA_IDS", JSON.stringify(written))
  await browser.close()
}
