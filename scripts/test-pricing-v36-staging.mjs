import assert from "node:assert/strict"
import fs from "node:fs"
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"
import { lowestStoragePackage } from "../lib/storage-pricing.ts"

const STAGING_PROJECT = "zanlunbgupdtqznruzok"
const args = process.argv.slice(2)
const option = (name, fallback = null) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}
const envFile = option("--env-file", ".env.staging.local")
if (!fs.existsSync(envFile)) throw new Error(`Staging environment file is unavailable: ${envFile}`)
dotenv.config({ path: envFile, override: true, quiet: true })
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error("Staging Supabase URL and service-role key are required.")
const projectRef = new URL(url).hostname.split(".")[0]
if (projectRef !== STAGING_PROJECT) throw new Error(`Staging-only test expected ${STAGING_PROJECT}; received ${projectRef}.`)
const supabase = createClient(url, key, { auth: { persistSession: false } })
const source = JSON.parse(fs.readFileSync("scripts/pricing-v3.6-final-merged.json", "utf8"))

const codes = [...source.rates.map((row) => row.code), ...source.reference_only.map((row) => row.code), ...Object.keys(source.legacy_aliases)]
const { data: rows, error: rowsError } = await supabase.from("pricing_master").select("code,rate_thb,full_rate_thb,source_discount_pct,is_active,quote_allowed,price_status,source_version").in("code", codes)
if (rowsError) throw rowsError
const byCode = new Map(rows.map((row) => [row.code, row]))
const results = []
const check = (id, label, fn) => {
  try { fn(); results.push({ id, label, status: "PASS" }) }
  catch (error) { results.push({ id, label, status: "FAIL", error: error instanceof Error ? error.message : String(error) }) }
}

for (const rate of source.rates) {
  check(`RATE-${rate.code}`, `${rate.code} matches FINAL_MERGED`, () => {
    const actual = byCode.get(rate.code)
    assert.ok(actual, "missing")
    assert.equal(Number(actual.rate_thb), Number(rate.rate_thb))
    assert.equal(Number(actual.full_rate_thb), Number(rate.full_rate_thb))
    assert.equal(Number(actual.source_discount_pct), Number(rate.source_discount_pct))
    assert.equal(actual.is_active, true)
    assert.equal(actual.quote_allowed, "YES")
    assert.equal(actual.source_version, source.source.version)
  })
}

check("DUPLICATES", "legacy storage aliases are not quoteable", () => {
  for (const alias of Object.keys(source.legacy_aliases)) {
    const actual = byCode.get(alias)
    if (!actual) continue
    assert.equal(actual.is_active, false, alias)
    assert.equal(actual.quote_allowed, "NO", alias)
  }
})
check("SB4-REFERENCE", "generic SB4_D is reference-only", () => {
  const row = byCode.get("SB4_D")
  assert.ok(row)
  assert.equal(row.is_active, false)
  assert.equal(row.quote_allowed, "NO")
})

const storageRates = (prefix) => ["DAY", "WEEK", "MONTH"].map((period) => {
  const row = byCode.get(`${prefix}_${period}`)
  assert.ok(row)
  return { code: row.code, rateThb: Number(row.rate_thb) }
})
check("T27", "W4 10 days = THB 6,300 ex VAT", () => assert.equal(lowestStoragePackage(10, storageRates("SB4_W4")).reduce((sum, line) => sum + line.total, 0), 6300))
check("T28", "B1 10 days = THB 8,100 ex VAT", () => assert.equal(lowestStoragePackage(10, storageRates("SB4_B1")).reduce((sum, line) => sum + line.total, 0), 8100))

const { data: berths, error: berthError } = await supabase.from("mms_berths").select("code,status,current_boat_id,max_loa_ft,berth_type").in("code", ["W4", "B1"])
if (berthError) throw berthError
const berthByCode = new Map(berths.map((row) => [row.code, row]))
check("T07-T08", "W4 exists at 60 ft and its live occupancy will gate allocation", () => {
  const w4 = berthByCode.get("W4")
  assert.ok(w4)
  assert.equal(Number(w4.max_loa_ft), 60)
  assert.equal(w4.status, "OCCUPIED")
})
check("T09", "B1 exists and is available for boat-stand validation", () => {
  const b1 = berthByCode.get("B1")
  assert.ok(b1)
  assert.equal(Number(b1.max_loa_ft), 60)
  assert.equal(b1.status, "AVAILABLE")
})

console.table(results)
const failed = results.filter((row) => row.status === "FAIL")
console.log(JSON.stringify({ projectRef, passed: results.length - failed.length, failed: failed.length, results }, null, 2))
if (failed.length) process.exitCode = 1
