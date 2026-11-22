import assert from "node:assert/strict"
import { mkdir } from "node:fs/promises"
import { randomUUID } from "node:crypto"
import { pathToFileURL } from "node:url"

// Run against the loopback server started by scripts/start-staging.ps1 only.
const base = "http://127.0.0.1:3108"
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_ENTRY).href)
const browser = await chromium.launch({ channel: "chrome", headless: true })
const page = await browser.newPage({ baseURL: base, viewport: { width: 1440, height: 900 } })
const code = `V38-QA-${randomUUID().slice(0, 8).toUpperCase()}`
let id
const errors = []
page.on("pageerror", error => errors.push(error.message))
page.on("dialog", dialog => dialog.accept())

try {
  await page.goto("/login")
  await page.locator('input[type="email"]').fill(process.env.MMS_QA_EMAIL)
  await page.locator('input[type="password"]').fill(process.env.MMS_QA_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL("**/dashboard")
  assert.equal((await (await page.request.get("/api/auth/session")).json()).user?.role, "SUPER_ADMIN")
  await page.goto("/pricing-master")
  await page.getByText("52 active v3.8 rates", { exact: true }).waitFor()
  await page.getByLabel("Rate card version").selectOption("current")
  const storage = page.getByRole("region", { name: "Dry Storage / Service Yard rates" })
  const codes = await storage.locator('th[scope="row"]').allTextContents()
  assert.deepEqual(codes.slice(0, 6), ["STG-SB1-D", "STG-SB1-W", "STG-SB1-M", "STG-SB2-D", "STG-SB2-W", "STG-SB2-M"])
  await mkdir("test-results/v38", { recursive: true })
  await page.screenshot({ path: "test-results/v38/rate-management-desktop.png" })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.ok(await storage.evaluate(el => el.scrollWidth > el.clientWidth))
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await page.screenshot({ path: "test-results/v38/rate-management-mobile.png" })
  await page.setViewportSize({ width: 1440, height: 900 })

  const responseFor = method => page.waitForResponse(r => r.request().method() === method &&
    new URL(r.url()).pathname.startsWith("/api/pricing-master"))
  const dataOf = async pending => {
    const response = await pending
    const result = await response.json()
    assert.ok(response.ok(), result.error)
    return result.data
  }
  await page.getByRole("link", { name: "Add rate", exact: true }).click()
  await page.locator('[name="code"]').fill(code)
  await page.locator('[name="serviceNameEn"]').fill("Staging QA - Temporary rate")
  await page.locator('[name="category"]').fill("Yard Services")
  await page.locator('[name="unit"]').fill("trip")
  await page.locator('[name="rateThb"]').fill("100")
  let response = responseFor("POST")
  await page.locator('button[type="submit"]').click()
  const created = await dataOf(response)
  id = created.id
  console.log("QA_RATE_ID", id, code)
  assert.equal(created.rateThb, 100)
  await page.waitForURL("**/pricing-master")

  for (const amount of [140, 120]) {
    await page.getByLabel("Search rates").fill(code)
    await page.getByRole("link", { name: `Edit ${code}` }).click()
    await page.locator('[name="rateThb"]').fill(String(amount))
    response = responseFor("PATCH")
    await page.locator('button[type="submit"]').click()
    assert.equal((await dataOf(response)).rateThb, amount)
    await page.waitForURL("**/pricing-master")
  }

  await page.getByLabel("Search rates").fill(code)
  response = responseFor("PATCH")
  await page.getByRole("button", { name: `Deactivate ${code}` }).click()
  assert.equal((await dataOf(response)).isActive, false)
  await page.getByLabel("Rate status").selectOption("inactive")
  response = responseFor("PATCH")
  await page.getByRole("button", { name: `Reactivate ${code}` }).click()
  assert.equal((await dataOf(response)).isActive, true)
  await page.reload()
  await page.getByLabel("Search rates").fill(code)
  await page.getByRole("link", { name: `Edit ${code}` }).waitFor()
  assert.deepEqual(errors, [])
  console.log("PASS: group ordering, mobile scroll, create 100, increase 140, reduce 120, deactivate, reactivate")
} finally {
  if (id) {
    const response = await page.request.delete(`/api/pricing-master/${id}`)
    console.log("QA_RATE_ARCHIVED", response.ok())
  }
  await browser.close()
}
