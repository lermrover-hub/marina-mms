import dotenv from "dotenv"
import crypto from "crypto"
import fs from "fs"
import { createClient } from "@supabase/supabase-js"

const args = process.argv.slice(2)
const usage = `Usage: node scripts/import-rate-card-to-supabase.mjs [options]

Options:
  --environment <staging|production>  Target environment (default: staging)
  --apply                             Apply the reviewed changes
  --approved-by <user-id>             Required with --apply
  --confirm-project <project-ref>     Required with --apply
  --allow-production                  Required for a production apply
  --deactivate-missing                Deactivate codes missing from the import
  --confirm-deactivate-missing        Required with --deactivate-missing
  --verbose                           Include individual changed code lists
  -h, --help                          Show this help without connecting to Supabase`

if (args.includes("--help") || args.includes("-h")) {
  console.log(usage)
  process.exit(0)
}

async function main() {
const valueOptions = new Set(["--environment", "--approved-by", "--confirm-project"])
const booleanOptions = new Set([
  "--apply",
  "--allow-production",
  "--deactivate-missing",
  "--confirm-deactivate-missing",
  "--verbose",
])

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index]
  if (valueOptions.has(arg)) {
    if (!args[index + 1] || args[index + 1].startsWith("--")) {
      throw new Error(`${arg} requires a value`)
    }
    index += 1
  } else if (!booleanOptions.has(arg)) {
    throw new Error(`Unknown option: ${arg}\n\n${usage}`)
  }
}

function optionValue(name) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : null
}

const environment = optionValue("--environment") ?? "staging"
if (!new Set(["staging", "production"]).has(environment)) {
  throw new Error("--environment must be staging or production")
}

dotenv.config({ path: ".env", quiet: true })
dotenv.config({
  path: environment === "staging" ? ".env.staging.local" : ".env.local",
  override: true,
  quiet: true,
})

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const apply = args.includes("--apply")
const verbose = args.includes("--verbose")
const deactivateMissing = args.includes("--deactivate-missing")
const confirmDeactivateMissing = args.includes("--confirm-deactivate-missing")
const allowProduction = args.includes("--allow-production")
const approvedBy = optionValue("--approved-by")
const confirmedProject = optionValue("--confirm-project")
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const key = serviceRoleKey || anonKey

if (!url || !key) {
  throw new Error("Supabase URL/key is not configured")
}

const hostname = new URL(url).hostname
if (!hostname.endsWith(".supabase.co")) {
  throw new Error(`Unexpected Supabase hostname: ${hostname}`)
}
const projectRef = hostname.split(".")[0]

if (apply && !serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required when using --apply")
}

if (apply && !approvedBy) {
  throw new Error("--approved-by <user-id> is required when using --apply")
}

if (apply && confirmedProject !== projectRef) {
  throw new Error(`--confirm-project must exactly match target project ${projectRef}`)
}

if (apply && environment === "production" && !allowProduction) {
  throw new Error("Production apply is blocked unless --allow-production is explicitly supplied")
}

if (deactivateMissing && (!apply || !confirmDeactivateMissing)) {
  throw new Error("--deactivate-missing requires --apply and --confirm-deactivate-missing")
}

console.log(`Target: ${environment} Supabase project ${projectRef}`)

const rows = JSON.parse(fs.readFileSync("scripts/import-rate-card.json", "utf8"))
const supabase = createClient(url, key, {
  auth: { persistSession: false },
  global: {
    fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(60000) }),
  },
})

const payload = rows.map((row) => ({
  id: crypto.randomUUID(),
  code: row.code,
  service_name_en: row.service_en,
  service_name_th: row.service_th,
  category: row.category,
  unit: row.unit,
  rate_thb: Number(row.rate),
  full_rate_thb: Number(row.full_rate ?? row.rate),
  discount_pct: 0,
  source_discount_pct: Number(row.source_discount_pct ?? 0),
  direct_cost_thb: row.direct_cost == null ? null : Number(row.direct_cost),
  revenue_gl_code: row.revenue_gl_code ?? null,
  cost_gl_code: row.cost_gl_code ?? null,
  pnl_category: row.pnl_category ?? null,
  cost_pnl_category: row.cost_pnl_category ?? null,
  cost_basis: row.cost_basis ?? null,
  calc_type: row.calc_type ?? "FLAT_QTY",
  service_group: row.service_group ?? null,
  subgroup: row.subgroup ?? null,
  provider_type: row.provider_type ?? null,
  quote_allowed: row.quote_allowed ?? "YES",
  price_status: row.price_status ?? "ACTIVE",
  source_version: row.source_version ?? null,
  description: row.description,
  notes: row.notes,
  is_active: (row.price_status ?? "ACTIVE") !== "INACTIVE",
  updated_by: approvedBy ?? "rate-card-import-preview",
  approved_by: approvedBy,
  approved_at: approvedBy ? new Date().toISOString() : null,
  updated_at: new Date().toISOString(),
}))

const comparableFields = [
  "service_name_en", "service_name_th", "category", "unit", "rate_thb",
  "full_rate_thb", "discount_pct", "source_discount_pct", "direct_cost_thb",
  "revenue_gl_code", "cost_gl_code", "pnl_category", "cost_pnl_category",
  "cost_basis", "calc_type", "service_group", "subgroup", "provider_type",
  "quote_allowed", "price_status", "source_version", "is_active",
]
const numericFields = new Set([
  "rate_thb", "full_rate_thb", "discount_pct", "source_discount_pct", "direct_cost_thb",
])

function valuesMatch(field, left, right) {
  if (numericFields.has(field)) {
    if (left == null && right == null) return true
    if (left == null || right == null) return false
    return Number(left) === Number(right)
  }
  return String(left ?? "") === String(right ?? "")
}

const { data: existingRows, error: previewError } = await supabase
  .from("pricing_master")
  .select(`id,code,${comparableFields.join(",")}`)

if (previewError) throw previewError

const existingByCode = new Map((existingRows ?? []).map((row) => [row.code, row]))
for (const row of payload) {
  row.id = existingByCode.get(row.code)?.id ?? row.id
}
const incomingCodes = new Set(payload.map((row) => row.code))
const added = payload.filter((row) => !existingByCode.has(row.code)).map((row) => row.code)
const changed = payload.filter((row) => {
  const existing = existingByCode.get(row.code)
  if (!existing) return false
  return comparableFields.some((field) => !valuesMatch(field, existing[field], row[field]))
}).map((row) => row.code)
const unchanged = payload.length - added.length - changed.length
const missing = (existingRows ?? []).filter((row) => !incomingCodes.has(row.code)).map((row) => row.code)

const summary = {
  mode: apply ? "apply" : "preview",
  addedCount: added.length,
  changedCount: changed.length,
  unchangedCount: unchanged,
  missingCount: missing.length,
  deactivateMissing,
}

if (verbose) {
  Object.assign(summary, { added, changed, missing })
}

console.log(JSON.stringify(summary, null, 2))

if (!apply) {
  console.log("Preview only. Re-run with --apply --approved-by <user-id> after reviewing the diff.")
  return
}

for (let index = 0; index < payload.length; index += 25) {
  const chunk = payload.slice(index, index + 25)
  const { error: upsertError } = await supabase
    .from("pricing_master")
    .upsert(chunk, { onConflict: "code" })

  if (upsertError) {
    throw upsertError
  }
}

if (deactivateMissing) {
  const missingIds = (existingRows ?? [])
    .filter((row) => !incomingCodes.has(row.code))
    .map((row) => row.id)

  for (let index = 0; index < missingIds.length; index += 25) {
    const chunk = missingIds.slice(index, index + 25)
    const { error: deactivateMissingError } = await supabase
      .from("pricing_master")
      .update({
        is_active: false,
        price_status: "INACTIVE",
        updated_by: approvedBy,
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in("id", chunk)

    if (deactivateMissingError) throw deactivateMissingError
  }
}

const { count, error: countError } = await supabase
  .from("pricing_master")
  .select("*", { count: "exact", head: true })
  .eq("is_active", true)

if (countError) {
  throw countError
}

console.log(`Imported ${rows.length} rate-card rows. Active rows now: ${count}.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
