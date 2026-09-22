import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { calculateRampCustomerCharge, deriveRampServicePlan, rampServiceLabel } from "../lib/ramp-booking-service.ts"

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8")

test("monthly boat storage creates the next calendar-month billing reminder", () => {
  assert.deepEqual(
    deriveRampServicePlan("BOAT_STORAGE", "STORAGE_MONTHLY", "2026-01-31"),
    {
      service_category: "BOAT_STORAGE",
      service_option: "STORAGE_MONTHLY",
      billing_cycle: "MONTHLY",
      recurring_billing: true,
      next_billing_date: "2026-02-28",
      pricing_adjustment_type: "NONE",
      pricing_adjustment_pct: 0,
    },
  )
})

test("hardstand commercial models use the approved default percentages", () => {
  assert.equal(deriveRampServicePlan("HARDSTAND_SERVICE", "OWNER_CONTRACTOR", "2026-09-15")?.pricing_adjustment_pct, 0)
  assert.equal(deriveRampServicePlan("HARDSTAND_SERVICE", "MARINA_SUBCONTRACTOR", "2026-09-15")?.pricing_adjustment_pct, 10)
  assert.equal(deriveRampServicePlan("HARDSTAND_SERVICE", "TURNKEY_PROJECT", "2026-09-15")?.pricing_adjustment_pct, 15)
  assert.equal(calculateRampCustomerCharge(10000, 10), 11000)
  assert.equal(calculateRampCustomerCharge(10000, 15), 11500)
  assert.equal(deriveRampServicePlan("BOAT_STORAGE", "TURNKEY_PROJECT", "2026-09-15"), null)
  assert.equal(rampServiceLabel("HARDSTAND_SERVICE", "MARINA_SUBCONTRACTOR"), "B2. Hardstand Service — Marina-arranged subcontractor")
})

test("boat creation preserves a visible normalized boat and owner name", () => {
  const boatRoute = read("../app/api/db/boats/route.ts")
  const boatForm = read("../app/(dashboard)/boats/new/page.tsx")
  const customerPage = read("../app/(dashboard)/customers/[id]/page.tsx")

  assert.match(boatRoute, /const name = typeof body\.name === "string" \? body\.name\.trim\(\) : ""/)
  assert.match(boatRoute, /owner_name: ownerName/)
  assert.match(boatForm, /Boat was not saved:/)
  assert.match(boatForm, /\/customers\/\$\{ownerId\}\?boat_created=/)
  assert.match(customerPage, /\/boats\/new\?owner_id=\$\{id\}/)
})

test("ramp booking create derives service rules on the server and migration stores reminders", () => {
  const route = read("../app/api/db/ramp-bookings/route.ts")
  const migration = read("../supabase/migrations/20260914170836_add_ramp_booking_service_plans.sql")
  const listPage = read("../app/(dashboard)/ramp-bookings/page.tsx")

  assert.match(route, /deriveRampServicePlan/)
  assert.doesNotMatch(route, /\.insert\(\{\s*\.\.\.body/)
  assert.match(migration, /recurring_billing boolean NOT NULL DEFAULT false/)
  assert.match(migration, /mms_ramp_bookings_service_plan_consistency_check/)
  assert.match(listPage, /Monthly Billing Reminders/)
})
