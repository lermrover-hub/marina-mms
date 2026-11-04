import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

const STAGING_PROJECT = "zanlunbgupdtqznruzok"
const BLOCKED_PRODUCTION_PROJECT = "csltloqbjupxqwbkunsd"
const args = process.argv.slice(2)
const option = (name, fallback = null) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}
const apply = args.includes("--apply")
const envFile = option("--env-file", ".env.staging.local")
const workbookPath = option("--source-workbook", "C:\\Users\\asus\\Downloads\\ORM_Rate_Structure_v3_6_FINAL_MERGED.xlsx")
const outputDir = path.resolve(option("--output-dir", "artifacts/pricing-v3.6"))
const approvedBy = option("--approved-by")
const confirmedProject = option("--confirm-project")

if (!fs.existsSync(workbookPath)) throw new Error(`FINAL_MERGED workbook is unavailable: ${workbookPath}`)
const source = JSON.parse(fs.readFileSync("scripts/pricing-v3.6-final-merged.json", "utf8"))
const actualHash = crypto.createHash("sha256").update(fs.readFileSync(workbookPath)).digest("hex").toUpperCase()
if (actualHash !== source.source.sha256) throw new Error(`FINAL_MERGED workbook hash mismatch. Expected ${source.source.sha256}; received ${actualHash}.`)
if (!fs.existsSync(envFile)) throw new Error(`Staging environment file is unavailable: ${envFile}`)
dotenv.config({ path: envFile, override: true, quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceRoleKey) throw new Error("Staging Supabase URL and service-role key are required.")
const projectRef = new URL(url).hostname.split(".")[0]
if (projectRef === BLOCKED_PRODUCTION_PROJECT) throw new Error("Production project is blocked by this staging-only reconciliation script.")
if (projectRef !== STAGING_PROJECT) throw new Error(`Expected staging project ${STAGING_PROJECT}; received ${projectRef}.`)
if (apply && confirmedProject !== STAGING_PROJECT) throw new Error(`--confirm-project must equal staging project ${STAGING_PROJECT}.`)
if (apply && !approvedBy) throw new Error("--approved-by is required for --apply.")

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(60000) }) } })

async function allRows(table, columns) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) return rows
  }
}

function csv(rows) {
  if (!rows.length) return ""
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]
  const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`
  return `${columns.map(quote).join(",")}\n${rows.map((row) => columns.map((column) => quote(typeof row[column] === "object" ? JSON.stringify(row[column]) : row[column])).join(",")).join("\n")}\n`
}

function semanticKey(row) {
  const code = String(row.code ?? "")
  const canonical = source.legacy_aliases[code] ?? code
  const match = canonical.match(/^(SB[1-4])(?:_(W4|B1))?_STORAGE_(DAY|WEEK|MONTH)$|^(SB4)_(W4|B1)_(DAY|WEEK|MONTH)$/)
  if (match) return [match[1] ?? match[4], match[2] ?? match[5] ?? "ANY_APPROVED", match[3] ?? match[6]].join("|")
  return canonical
}

function canonicalPayload(rate, existing, actor) {
  const defaults = source.defaults
  const isStoragePackage = rate.period && rate.class
  const periodName = rate.period === "DAY" ? "daily" : rate.period === "WEEK" ? "weekly" : rate.period === "MONTH" ? "monthly" : null
  const slotName = rate.slot === "ANY_APPROVED" ? "approved slot" : rate.slot ? `${rate.slot} slot` : null
  const serviceNameEn = rate.service_name_en ?? (isStoragePackage ? `${rate.class} speedboat storage ${periodName} — ${slotName}` : rate.code)
  const serviceNameTh = rate.service_name_th ?? (isStoragePackage ? `${rate.class} จอดเรือสปีดโบ๊ท${periodName} — ${slotName}` : null)
  const isStorage = String(rate.service_group ?? defaults.service_group).startsWith("4.")
  return {
    ...(existing?.id ? { id: existing.id } : { id: crypto.randomUUID() }),
    code: rate.code,
    service_name_en: serviceNameEn,
    service_name_th: serviceNameTh,
    category: rate.category ?? defaults.category,
    unit: rate.unit ?? rate.period.toLowerCase(),
    rate_thb: rate.rate_thb,
    full_rate_thb: rate.full_rate_thb,
    discount_pct: 0,
    source_discount_pct: rate.source_discount_pct,
    direct_cost_thb: existing?.direct_cost_thb ?? null,
    revenue_gl_code: existing?.revenue_gl_code ?? (isStorage ? defaults.revenue_gl_code : "4110"),
    cost_gl_code: existing?.cost_gl_code ?? defaults.cost_gl_code,
    pnl_category: existing?.pnl_category ?? (isStorage ? defaults.pnl_category : "B.Haul-out"),
    cost_pnl_category: existing?.cost_pnl_category ?? defaults.cost_pnl_category,
    cost_basis: existing?.cost_basis ?? null,
    calc_type: rate.calc_type ?? "FLAT_QTY",
    service_group: rate.service_group ?? defaults.service_group,
    subgroup: rate.subgroup ?? `${rate.class} storage / ${rate.slot} / ${rate.period}`,
    provider_type: rate.provider_type ?? defaults.provider_type,
    quote_allowed: rate.quote_allowed ?? "YES",
    price_status: rate.price_status ?? (rate.full_rate_thb === 0 ? "SOFT_APPROVED_STAGING" : "ACTIVE"),
    source_version: source.source.version,
    description: rate.description ?? `${rate.class}; LOA ${rate.loa}; physical slot ${rate.slot}; ${rate.days} day package; VAT exclusive.`,
    notes: rate.notes ?? `${rate.eligibility ? `${rate.eligibility}. ` : ""}Soft opening rate is already applied. Do not apply an additional 25% source discount.`,
    is_active: true,
    updated_by: actor,
    approved_by: actor,
    approved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true })
  const existingRows = await allRows("pricing_master", "*")
  const historyRows = await allRows("pricing_master_history", "*")
  const quotationRefs = await allRows("mms_quotation_items", "id,quotation_id,pricing_master_id,pricing_code,unit_price,current_rate_snapshot_thb,pricing_source_version")
  const requestRefs = await allRows("mms_service_request_items", "id,service_request_id,pricing_master_id,pricing_code,unit_price")
  const existingByCode = new Map(existingRows.map((row) => [row.code, row]))
  const refs = [...quotationRefs.map((row) => ({ table: "mms_quotation_items", ...row })), ...requestRefs.map((row) => ({ table: "mms_service_request_items", ...row }))]
  const refCount = (row) => refs.filter((ref) => ref.pricing_master_id === row.id || ref.pricing_code === row.code).length

  const nowTag = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-")
  fs.writeFileSync(path.join(outputDir, `${nowTag}-pricing-history-before.json`), `${JSON.stringify(historyRows, null, 2)}\n`)
  fs.writeFileSync(path.join(outputDir, `${nowTag}-pricing-master-before.json`), `${JSON.stringify(existingRows, null, 2)}\n`)
  fs.writeFileSync(path.join(outputDir, `${nowTag}-pricing-master-before.csv`), csv(existingRows))
  fs.writeFileSync(path.join(outputDir, `${nowTag}-pricing-references-before.json`), `${JSON.stringify(refs, null, 2)}\n`)
  fs.writeFileSync(path.join(outputDir, `${nowTag}-pricing-references-before.csv`), csv(refs))
  fs.writeFileSync(path.join(outputDir, `${nowTag}-reference-impact.csv`), csv(existingRows.filter((row) => refCount(row) > 0).map((row) => ({ code: row.code, pricing_master_id: row.id, reference_count: refCount(row), active: row.is_active, rate_thb: row.rate_thb }))))

  const reconciliation = []
  for (const rate of source.rates) {
    const current = existingByCode.get(rate.code)
    const expected = canonicalPayload(rate, current, approvedBy)
    const differences = current ? ["rate_thb", "full_rate_thb", "source_discount_pct", "unit", "is_active", "quote_allowed", "calc_type", "source_version"].filter((field) => String(current[field] ?? "") !== String(expected[field] ?? "")) : ["missing"]
    reconciliation.push({ code: rate.code, semantic_key: semanticKey(rate), action: current ? (differences.length ? "UPDATE_CANONICAL" : "KEEP_CANONICAL") : "ADD_CANONICAL", before_rate: current?.rate_thb ?? "", after_rate: rate.rate_thb, before_full_rate: current?.full_rate_thb ?? "", after_full_rate: rate.full_rate_thb, references: current ? refCount(current) : 0, differences: differences.join("|") })
  }
  for (const [alias, replacement] of Object.entries(source.legacy_aliases)) {
    const current = existingByCode.get(alias)
    if (!current) continue
    reconciliation.push({ code: alias, semantic_key: semanticKey(current), action: current.is_active ? "RETIRE_LEGACY_ALIAS" : "KEEP_RETIRED_ALIAS", replacement, before_rate: current.rate_thb, after_rate: current.rate_thb, before_full_rate: current.full_rate_thb, after_full_rate: current.full_rate_thb, references: refCount(current), differences: current.is_active ? "is_active|quote_allowed|price_status" : "" })
  }
  for (const reference of source.reference_only) {
    const current = existingByCode.get(reference.code)
    reconciliation.push({ code: reference.code, semantic_key: semanticKey(reference), action: current ? (current.is_active ? "RETIRE_REFERENCE_ONLY" : "KEEP_REFERENCE_ONLY") : "ADD_REFERENCE_ONLY", before_rate: current?.rate_thb ?? "", after_rate: reference.rate_thb, before_full_rate: current?.full_rate_thb ?? "", after_full_rate: reference.full_rate_thb, references: current ? refCount(current) : 0, differences: current?.is_active ? "is_active|quote_allowed|price_status" : "" })
  }
  fs.writeFileSync(path.join(outputDir, `${nowTag}-reconciliation.csv`), csv(reconciliation))

  const before = { total: existingRows.length, active: existingRows.filter((row) => row.is_active).length, quoteable: existingRows.filter((row) => row.is_active && row.quote_allowed !== "NO").length }
  if (apply) {
    for (const rate of source.rates) {
      if (reconciliation.find((row) => row.code === rate.code)?.action === "KEEP_CANONICAL") continue
      const aliasCode = Object.entries(source.legacy_aliases).find(([alias, replacement]) => replacement === rate.code && existingByCode.has(alias))?.[0]
      const payload = canonicalPayload(rate, existingByCode.get(rate.code) ?? (aliasCode ? existingByCode.get(aliasCode) : null), approvedBy)
      if (!existingByCode.get(rate.code)) payload.id = crypto.randomUUID()
      const { error } = await supabase.from("pricing_master").upsert(payload, { onConflict: "code" })
      if (error) throw new Error(`${rate.code}: ${error.message}`)
    }
    const aliases = Object.keys(source.legacy_aliases).filter((code) => existingByCode.get(code)?.is_active)
    if (aliases.length) {
      const { error } = await supabase.from("pricing_master").update({ is_active: false, quote_allowed: "NO", price_status: "LEGACY_ALIAS", source_version: source.source.version, updated_by: approvedBy, approved_by: approvedBy, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).in("code", aliases)
      if (error) throw error
    }
    for (const reference of source.reference_only) {
      const existing = existingByCode.get(reference.code)
      if (existing && !existing.is_active && existing.quote_allowed === "NO") continue
      const payload = { ...canonicalPayload({ ...reference, loa: "48-60 ft", days: 1, notes: "Generic SB4 reference. Resolve W4 or B1 before quotation." }, existing, approvedBy), quote_allowed: "NO", price_status: "REFERENCE_ONLY", is_active: false }
      const { error } = await supabase.from("pricing_master").upsert(payload, { onConflict: "code" })
      if (error) throw error
    }
  }
  const afterRows = apply ? await allRows("pricing_master", "*") : existingRows
  const after = { total: afterRows.length, active: afterRows.filter((row) => row.is_active).length, quoteable: afterRows.filter((row) => row.is_active && row.quote_allowed !== "NO").length }
  const summary = { mode: apply ? "apply" : "preview", projectRef, workbook: source.source.name, workbookSha256: actualHash, before, projected: { canonicalAdds: reconciliation.filter((row) => row.action === "ADD_CANONICAL").length, canonicalUpdates: reconciliation.filter((row) => row.action === "UPDATE_CANONICAL").length, legacyRetirements: reconciliation.filter((row) => row.action === "RETIRE_LEGACY_ALIAS").length, referencedLegacyRows: reconciliation.filter((row) => row.action.includes("RETIRE") && row.references > 0).length }, after }
  fs.writeFileSync(path.join(outputDir, `${nowTag}-summary.json`), `${JSON.stringify(summary, null, 2)}\n`)
  console.log(JSON.stringify(summary, null, 2))
  console.log(`Artifacts: ${outputDir}`)
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
