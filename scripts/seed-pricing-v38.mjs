import fs from "node:fs"
import { randomUUID } from "node:crypto"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"

export const SOURCE_VERSION = "ORM-PRICE-2026-v3.8"
export const RATE_CARD_VERSION_ID = "orm-price-2026-v3-8"
const STAGING_HOST = "zanlunbgupdtqznruzok.supabase.co"

const STORAGE_TERMS = [
  { suffix: "D", duration_code: "DAILY", duration_days: 1, unit: "day" },
  { suffix: "W", duration_code: "WEEKLY", duration_days: 7, unit: "week" },
  { suffix: "M", duration_code: "MONTHLY", duration_days: 30, unit: "month" },
]

const SPEEDBOAT_TIERS = [
  { tier: "SB1", loa_min_ft: 0, loa_max_ft: 27, engine_min: 1, engine_max: 1, rates: [500, 3150, 11250] },
  { tier: "SB2", loa_min_ft: 28, loa_max_ft: 40, engine_min: 2, engine_max: 2, rates: [700, 4410, 15750] },
  { tier: "SB3", loa_min_ft: 41, loa_max_ft: 50, engine_min: 3, engine_max: 3, rates: [900, 5670, 20250] },
  { tier: "SB4", loa_min_ft: 51, loa_max_ft: 60, engine_min: 4, engine_max: 4, rates: [1155.56, 7280, 26000] },
]

const PACKAGE_INCLUSIONS = ["TOW-ROUND-TRIP", "TRAILER-CYCLE", "BASIC-FRESH-WATER-RINSE"]

function money(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10000) / 10000
}

function baseRecord(overrides) {
  return {
    rate_card_version_id: RATE_CARD_VERSION_ID,
    source_version: SOURCE_VERSION,
    service_group: "STORAGE_YARD",
    category: "Storage & Yard Service",
    subgroup: null,
    provider_type: "INTERNAL",
    quote_allowed: "YES",
    price_status: "ACTIVE",
    service_name_th: null,
    full_rate_thb: overrides.rate_thb ?? 0,
    discount_pct: 0,
    source_discount_pct: 0,
    calc_type: overrides.rate_basis === "PER_FT" ? "LOA_RATE_QTY" : "FLAT_QTY",
    direct_cost_thb: null,
    pilot_rate_thb: null,
    pilot_notes: null,
    revenue_gl_code: null,
    cost_gl_code: null,
    pnl_category: null,
    cost_pnl_category: null,
    cost_basis: null,
    description: null,
    notes: null,
    is_active: true,
    effective_date: "2026-11-21",
    updated_by: "seed-pricing-v38",
    approved_by: "Owner approved",
    approved_at: "2026-11-21T00:00:00.000Z",
    vessel_category: null,
    vessel_tier: null,
    loa_min_ft: null,
    loa_max_ft: null,
    max_weight_t: null,
    engine_min: null,
    engine_max: null,
    duration_code: "ONE_CYCLE",
    duration_days: null,
    rate_basis: "FIXED",
    cap_thb: null,
    is_package: false,
    package_inclusions: [],
    capacity_note: null,
    display_order: 0,
    ...overrides,
  }
}

export function generateApprovedV38Rates() {
  const rows = []
  let displayOrder = 10

  for (const vessel of SPEEDBOAT_TIERS) {
    STORAGE_TERMS.forEach((term, index) => {
      rows.push(baseRecord({
        code: `STG-${vessel.tier}-${term.suffix}`,
        service_name_en: `Dry Storage / Service Yard - Commercial Speedboat ${vessel.tier} - ${term.duration_code}`,
        unit: term.unit,
        rate_thb: vessel.rates[index],
        full_rate_thb: vessel.rates[index],
        vessel_category: "COMMERCIAL_SPEEDBOAT",
        vessel_tier: vessel.tier,
        loa_min_ft: vessel.loa_min_ft,
        loa_max_ft: vessel.loa_max_ft,
        engine_min: vessel.engine_min,
        engine_max: vessel.engine_max,
        max_weight_t: 14,
        duration_code: term.duration_code,
        duration_days: term.duration_days,
        rate_basis: "FIXED",
        display_order: displayOrder++,
        capacity_note: vessel.tier === "SB4" ? "51-60 ft / four engines; confirm capacity before approval." : null,
      }))
    })
  }

  for (const vessel of SPEEDBOAT_TIERS) {
    STORAGE_TERMS.forEach((term, index) => {
      const rate = money(vessel.rates[index] * 1.2)
      rows.push(baseRecord({
        code: `STG-SC-${vessel.tier}-${term.suffix}`,
        service_name_en: `Dry Storage / Service Yard - Sport & Cruiser ${vessel.tier} - ${term.duration_code}`,
        unit: term.unit,
        rate_thb: rate,
        full_rate_thb: rate,
        vessel_category: "SPORT_CRUISER",
        vessel_tier: vessel.tier,
        loa_min_ft: vessel.loa_min_ft,
        loa_max_ft: vessel.loa_max_ft,
        engine_min: vessel.engine_min,
        engine_max: vessel.engine_max,
        max_weight_t: 14,
        duration_code: term.duration_code,
        duration_days: term.duration_days,
        rate_basis: "FIXED",
        display_order: displayOrder++,
        notes: "Commercial Speedboat rate x 1.20.",
      }))
    })
  }

  const monohullRates = [28.8889, 182, 650]
  STORAGE_TERMS.forEach((term, index) => {
    rows.push(baseRecord({
      code: `STG-MONO-${term.suffix}`,
      service_name_en: `Dry Storage / Service Yard - Yacht Monohull - ${term.duration_code}`,
      unit: "ft",
      rate_thb: monohullRates[index],
      full_rate_thb: monohullRates[index],
      vessel_category: "YACHT_MONOHULL",
      loa_min_ft: 30,
      loa_max_ft: 45,
      max_weight_t: 14,
      duration_code: term.duration_code,
      duration_days: term.duration_days,
      rate_basis: "PER_FT",
      cap_thb: term.duration_code === "MONTHLY" ? 26000 : null,
      display_order: displayOrder++,
      capacity_note: "Maximum 45 ft and 14 tonnes.",
    }))
  })

  STORAGE_TERMS.forEach((term, index) => {
    const rate = money(monohullRates[index] * 1.5)
    rows.push(baseRecord({
      code: `STG-SAILCAT-${term.suffix}`,
      service_name_en: `Dry Storage / Service Yard - Sail Catamaran - ${term.duration_code}`,
      unit: "ft",
      rate_thb: rate,
      full_rate_thb: rate,
      vessel_category: "SAIL_CATAMARAN",
      loa_min_ft: 30,
      loa_max_ft: 41,
      max_weight_t: 12,
      duration_code: term.duration_code,
      duration_days: term.duration_days,
      rate_basis: "PER_FT",
      cap_thb: term.duration_code === "MONTHLY" ? 39000 : null,
      display_order: displayOrder++,
      notes: "Yacht Monohull rate x 1.50.",
      capacity_note: "Sail Catamaran maximum 41 ft and 12 tonnes.",
    }))
  })

  const packages = [
    { code: "HAUL_SB_1ENG_15_27", name: "Speedboat Tier 1 (1 engine, 15-27 ft) haul-out + launch round trip", category: "COMMERCIAL_SPEEDBOAT", tier: "SB1", min: 15, rate: 7000 },
    { code: "HAUL_SB_2ENG_28_40", name: "Speedboat Tier 2 (2 engines, >27-40 ft) haul-out + launch round trip", category: "COMMERCIAL_SPEEDBOAT", tier: "SB2", min: 27.01, rate: 9500 },
    { code: "HAUL_SB_3ENG_41_50", name: "Speedboat Tier 3 (3 engines, >40-50 ft) haul-out + launch round trip", category: "COMMERCIAL_SPEEDBOAT", tier: "SB3", min: 40.01, rate: 12500 },
    { code: "HAUL_SB_4ENG_51_60", name: "Speedboat Tier 4 (4 engines, >50-60 ft) haul-out + launch round trip", category: "COMMERCIAL_SPEEDBOAT", tier: "SB4", min: 50.01, rate: 16000 },
    ...[8400, 11400, 15000, 19200].map((rate, index) => ({ code: `PKG-HL-SC-SB${index + 1}`, name: `Haul / Launch Package - Sport & Cruiser SB${index + 1}`, category: "SPORT_CRUISER", tier: `SB${index + 1}`, rate })),
    { code: "PKG-HL-MONO-30-34", name: "Haul / Launch Package - Yacht Monohull 30-34 ft", category: "YACHT_MONOHULL", min: 30, max: 34, weight: 14, rate: 12500 },
    { code: "PKG-HL-MONO-35-38", name: "Haul / Launch Package - Yacht Monohull 35-38 ft", category: "YACHT_MONOHULL", min: 35, max: 38, weight: 14, rate: 14500 },
    { code: "PKG-HL-MONO-39-42", name: "Haul / Launch Package - Yacht Monohull 39-42 ft", category: "YACHT_MONOHULL", min: 39, max: 42, weight: 14, rate: 16000 },
    { code: "PKG-HL-MONO-43-45", name: "Haul / Launch Package - Yacht Monohull 43-45 ft", category: "YACHT_MONOHULL", min: 43, max: 45, weight: 14, rate: 18000 },
    { code: "PKG-HL-SAILCAT-30-34", name: "Haul / Launch Package - Sail Catamaran 30-34 ft", category: "SAIL_CATAMARAN", min: 30, max: 34, rate: 17500 },
    { code: "PKG-HL-SAILCAT-35-38", name: "Haul / Launch Package - Sail Catamaran 35-38 ft", category: "SAIL_CATAMARAN", min: 35, max: 38, rate: 20000 },
    { code: "PKG-HL-SAILCAT-39-41", name: "Haul / Launch Package - Sail Catamaran 39-41 ft", category: "SAIL_CATAMARAN", min: 39, max: 41, rate: 22500 },
  ]

  for (const item of packages) {
    const speedTier = item.tier ? SPEEDBOAT_TIERS.find((candidate) => candidate.tier === item.tier) : null
    rows.push(baseRecord({
      code: item.code,
      service_name_en: item.name,
      service_group: "HAUL_LAUNCH_PACKAGE",
      category: "Haul / Launch Package",
      unit: "package",
      rate_thb: item.rate,
      full_rate_thb: item.rate,
      vessel_category: item.category,
      vessel_tier: item.tier ?? null,
      loa_min_ft: item.min ?? speedTier?.loa_min_ft ?? null,
      loa_max_ft: item.max ?? speedTier?.loa_max_ft ?? null,
      max_weight_t: item.category === "SAIL_CATAMARAN" ? 12 : 14,
      engine_min: speedTier?.engine_min ?? null,
      engine_max: speedTier?.engine_max ?? null,
      duration_code: "ONE_CYCLE",
      rate_basis: "PACKAGE",
      is_package: true,
      package_inclusions: PACKAGE_INCLUSIONS,
      description: "Includes haul and launch, internal tow (2 trips), trailer cycle, and basic fresh-water rinse.",
      display_order: displayOrder++,
    }))
  }

  rows.push(baseRecord({
    code: "TOW-ROUND-TRIP", service_name_en: "Internal Tow - 2 Trips", service_group: "STANDALONE_COMPONENT",
    category: "Standalone Component", unit: "round trip", rate_thb: 3000, full_rate_thb: 3000,
    vessel_category: "ALL", duration_code: "ROUND_TRIP", rate_basis: "FIXED", display_order: displayOrder++,
  }))
  rows.push(baseRecord({
    code: "TRAILER-CYCLE", service_name_en: "Trailer Use - One Cycle", service_group: "STANDALONE_COMPONENT",
    category: "Standalone Component", unit: "cycle", rate_thb: 2000, full_rate_thb: 2000,
    vessel_category: "ALL", duration_code: "ONE_CYCLE", rate_basis: "FIXED", display_order: displayOrder++,
  }))

  const reviews = [
    ["MR-PWC", "Personal Watercraft - Manager Review", "PWC pricing is pending owner approval."],
    ["MR-DINGHY", "Dinghy - Manager Review", "Dinghy pricing is pending owner approval."],
    ["MR-FISHING-15", "Fishing Boat up to 15 ft - Manager Review", "Fishing boat pricing is pending owner approval."],
    ["MR-POWER-CAT", "Power Catamaran - Manager Review", "Power Catamaran requires capacity and rate review."],
    ["MR-LARGE-YACHT", "Large Yacht over 45 ft / Over Capacity - Manager Review", "Vessel exceeds the approved automatic capacity."],
  ]
  for (const [code, name, note] of reviews) {
    rows.push(baseRecord({
      code,
      service_name_en: name,
      service_group: "MANAGER_REVIEW",
      category: "Manager Review",
      unit: "review",
      rate_thb: 0,
      full_rate_thb: 0,
      vessel_category: code === "MR-POWER-CAT" ? "POWER_CATAMARAN" : "MANAGER_REVIEW",
      loa_max_ft: code === "MR-POWER-CAT" ? 41 : null,
      max_weight_t: code === "MR-POWER-CAT" ? 12 : null,
      duration_code: "ONE_CYCLE",
      rate_basis: "MANAGER_REVIEW",
      quote_allowed: "MANAGER_REVIEW",
      price_status: "PENDING",
      capacity_note: note,
      display_order: displayOrder++,
    }))
  }

  return rows
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const separator = line.indexOf("=")
    if (separator < 1) continue
    const key = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    if (process.env[key] == null) process.env[key] = value
  }
}

export async function applyApprovedV38Rates(rows = generateApprovedV38Rates()) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
  loadEnvFile(path.join(projectRoot, ".env.staging.local"))

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
  if (new URL(url).hostname !== STAGING_HOST) throw new Error("Seed writes are restricted to Marina MMS staging.")

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const codes = rows.map((row) => row.code)
  const { data: existing, error: lookupError } = await supabase
    .from("pricing_master")
    .select("code,source_version")
    .in("code", codes)
  if (lookupError) throw new Error(`Supabase lookup failed: ${lookupError.message}`)

  const collisions = (existing ?? []).filter((row) => row.source_version !== SOURCE_VERSION)
  if (collisions.length) throw new Error(`Refusing to replace existing rate codes: ${collisions.map((row) => row.code).join(", ")}`)
  const existingCodes = new Set((existing ?? []).map((row) => row.code))
  const newRows = rows.filter((row) => !existingCodes.has(row.code)).map((row) => ({
    ...row,
    id: randomUUID(),
  }))
  if (!newRows.length) return 0
  const { error } = await supabase.from("pricing_master").insert(newRows)
  if (error) throw new Error(`Supabase insert failed: ${error.message}`)
  return newRows.length
}

async function main() {
  const rows = generateApprovedV38Rates()
  const apply = process.argv.includes("--apply")
  if (!apply) {
    const counts = rows.reduce((result, row) => {
      result[row.service_group] = (result[row.service_group] ?? 0) + 1
      return result
    }, {})
    console.log(`Dry run: generated ${rows.length} approved ${SOURCE_VERSION} pricing rows.`)
    console.log(counts)
    console.log("No database changes made. Run with --apply to add only missing staging rates.")
    return
  }

  const count = await applyApprovedV38Rates(rows)
  console.log(`Applied ${count} approved ${SOURCE_VERSION} pricing rows.`)
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Pricing seed failed.")
    process.exitCode = 1
  })
}
