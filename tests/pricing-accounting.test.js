import { test } from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { pricingCreateSchema, pricingUpdateSchema } from "../lib/pricing-validation.ts"

const basePricing = {
  code: "TEST_RATE",
  serviceNameEn: "Test service",
  category: "Test",
  unit: "job",
  rateThb: 1_000,
}

test("pricing defaults operational discount to zero", () => {
  const parsed = pricingCreateSchema.parse(basePricing)
  assert.equal(parsed.discountPct, 0)
})

test("source discount is informational and does not change default discount", () => {
  const parsed = pricingCreateSchema.parse({ ...basePricing, sourceDiscountPct: 25 })
  assert.equal(parsed.sourceDiscountPct, 25)
  assert.equal(parsed.discountPct, 0)
  assert.equal(parsed.rateThb, 1_000)
})

test("pricing accepts complimentary zero-value services", () => {
  const parsed = pricingCreateSchema.parse({ ...basePricing, rateThb: 0, fullRateThb: 0 })
  assert.equal(parsed.rateThb, 0)
  assert.equal(parsed.fullRateThb, 0)
})

test("pricing rejects discounts outside 0 to 100 percent", () => {
  assert.equal(pricingCreateSchema.safeParse({ ...basePricing, discountPct: -1 }).success, false)
  assert.equal(pricingCreateSchema.safeParse({ ...basePricing, discountPct: 101 }).success, false)
})

test("pricing rejects negative direct cost", () => {
  assert.equal(pricingUpdateSchema.safeParse({ directCostThb: -0.01 }).success, false)
  assert.equal(pricingUpdateSchema.safeParse({ directCostThb: null }).success, true)
})

test("pricing writes are guarded by Admin and Finance roles", () => {
  const accessSource = readFileSync(new URL("../lib/pricing-access.ts", import.meta.url), "utf8")
  const collectionRoute = readFileSync(new URL("../app/api/pricing-master/route.ts", import.meta.url), "utf8")
  const itemRoute = readFileSync(new URL("../app/api/pricing-master/[id]/route.ts", import.meta.url), "utf8")

  assert.match(accessSource, /new Set\(\["SUPER_ADMIN", "FINANCE"\]\)/)
  assert.match(collectionRoute, /getPricingWriteAccess\(\)/)
  assert.match(itemRoute, /getPricingWriteAccess\(\)/)
})

test("migration backfills zero discount and quotation snapshots", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20260908103838_accounting_ready_pricing.sql", import.meta.url), "utf8")
  assert.match(migration, /discount_pct numeric\(5,2\) NOT NULL DEFAULT 0/)
  assert.match(migration, /full_rate_snapshot_thb/)
  assert.match(migration, /direct_cost_snapshot_thb/)
  assert.match(migration, /pricing_master_history/)
})

test("pricing history hardening keeps the accounting audit append-only", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20260909143000_harden_pricing_history.sql", import.meta.url), "utf8")
  assert.match(migration, /ON DELETE RESTRICT/)
  assert.match(migration, /REVOKE ALL ON TABLE public\.pricing_master_history FROM service_role/)
  assert.match(migration, /GRANT SELECT, INSERT ON TABLE public\.pricing_master_history TO service_role/)
})

test("rate-card importer help exits without selecting a Supabase target", () => {
  const importer = fileURLToPath(new URL("../scripts/import-rate-card-to-supabase.mjs", import.meta.url))
  const output = execFileSync(process.execPath, [importer, "--help"], { encoding: "utf8" })

  assert.match(output, /Usage: node scripts\/import-rate-card-to-supabase\.mjs/)
  assert.doesNotMatch(output, /Target:|Supabase project/)
})

test("rate-card importer defaults to staging and guards destructive writes", () => {
  const source = readFileSync(new URL("../scripts/import-rate-card-to-supabase.mjs", import.meta.url), "utf8")

  assert.match(source, /optionValue\("--environment"\) \?\? "staging"/)
  assert.match(source, /confirmedProject !== projectRef/)
  assert.match(source, /environment === "production" && !allowProduction/)
  assert.match(source, /deactivateMissing && \(!apply \|\| !confirmDeactivateMissing\)/)
})

test("generated rate card preserves v3.5 pricing and zero operational discount", () => {
  const rows = JSON.parse(readFileSync(new URL("../scripts/import-rate-card.json", import.meta.url), "utf8"))
  const codes = rows.map((row) => row.code)

  assert.equal(rows.length, 127)
  assert.equal(new Set(codes).size, rows.length)
  assert.deepEqual(new Set(rows.map((row) => row.source_version)), new Set(["ORM-PRICE-2026-v3.5"]))
  assert.equal(rows.every((row) => Number(row.discount_pct) === 0), true)
  assert.deepEqual(
    [...new Set(rows.map((row) => Number(row.source_discount_pct)))].sort((left, right) => left - right),
    [0, 25, 30],
  )
  assert.equal(rows.filter((row) => row.revenue_gl_code).length, 127)
  assert.equal(rows.filter((row) => row.cost_gl_code).length, 99)
})

test("generated rate-card SQL preserves missing codes unless explicitly requested", () => {
  const source = readFileSync(new URL("../scripts/import-rate-card.sql", import.meta.url), "utf8")

  assert.match(source, /Missing database codes are preserved/)
  assert.doesNotMatch(source, /SET is_active = false[\s\S]*WHERE code NOT IN/)
})

test("job margin report uses canonical cost components and supports CSV export", () => {
  const report = readFileSync(new URL("../app/api/db/reports/job-margin/route.ts", import.meta.url), "utf8")
  assert.match(report, /total_labor_cost/)
  assert.match(report, /total_material_cost/)
  assert.match(report, /total_contractor_cost/)
  assert.match(report, /searchParams\.get\("format"\) === "csv"/)
  assert.doesNotMatch(report, /quoted_amount|actual_cost/)
})

test("work-order API persists both reference aliases for staging and production", () => {
  const source = readFileSync(new URL("../app/api/db/work-orders/route.ts", import.meta.url), "utf8")
  assert.match(source, /reference,\s*\/\/ Staging retains/)
  assert.match(source, /wo_number: String\(body\.wo_number \?\? reference\)/)
})

test("subcontractor workflow keeps the selected quote visible through PO issue", () => {
  const source = readFileSync(new URL("../app/(dashboard)/subcontractor-sourcing/new/page.tsx", import.meta.url), "utf8")
  assert.match(source, /\["SELECTED", "COST_APPROVED", "PO_ISSUED"\]\.includes\(quote\.status\)/)
})

test("work-order task list falls back when staging lacks sort_order", () => {
  const source = readFileSync(new URL("../app/api/db/work-order-tasks/route.ts", import.meta.url), "utf8")
  assert.match(source, /const MISSING_COLUMN = "42703"/)
  assert.match(source, /fallback.*order\("created_at"\)/)
})

test("material mutations synchronize the canonical work-order material cost", () => {
  const source = readFileSync(new URL("../lib/db.ts", import.meta.url), "utf8")
  assert.match(source, /async function syncWorkOrderMaterialCost/)
  assert.match(source, /total_material_cost: totalMaterialCost/)
  assert.equal((source.match(/await syncWorkOrderMaterialCost\(/g) ?? []).length, 2)
})

test("quotation conversion preserves the linked work order on the invoice", () => {
  const source = readFileSync(new URL("../app/(dashboard)/quotations/[id]/page.tsx", import.meta.url), "utf8")
  assert.match(source, /work_order_id:\s+quotation\.work_order_id \?\? null/)
})

test("blank berth end dates remain open-ended across assignment screens", () => {
  const berthList = readFileSync(new URL("../app/(dashboard)/berths/page.tsx", import.meta.url), "utf8")
  const berthDetail = readFileSync(new URL("../app/(dashboard)/berths/[id]/page.tsx", import.meta.url), "utf8")
  const berthManagement = readFileSync(new URL("../app/(dashboard)/berths/management/page.tsx", import.meta.url), "utf8")
  const berthCalendar = readFileSync(new URL("../app/(dashboard)/berths/calendar/page.tsx", import.meta.url), "utf8")

  for (const source of [berthList, berthDetail, berthManagement]) {
    assert.match(source, /end_date:\s+endDate \|\| null/)
    assert.doesNotMatch(source, /end_date:\s+endDate \|\| startDate/)
  }
  assert.match(berthDetail, /!a\.end_date \|\| a\.end_date >= todayStr/)
  assert.match(berthCalendar, /a\.end_date \?\? rangeTo/)
})
