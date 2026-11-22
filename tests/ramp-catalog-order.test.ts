import assert from "node:assert/strict"
import test from "node:test"
// @ts-expect-error Node's native type stripping requires the explicit .ts extension here.
import { groupRateCatalog } from "../lib/rate-catalog-order.ts"

test("Ramp groups priced vessels and tow trucks without changing accounting categories", () => {
  const rows = [
    { code: "RAMP_SB_1ENG_15_27", serviceNameEn: "Ramp - Speedboat SB1", category: "A.Access & Ramp", serviceGroup: "RAMP", vesselCategory: "COMMERCIAL_SPEEDBOAT" },
    { code: "RAMP-V38-SC1", serviceNameEn: "Ramp - Sport & Cruiser SC1", category: "Ramp Access", serviceGroup: "RAMP", vesselCategory: "SPORT_CRUISER" },
    { code: "RAMP_BIG_TRUCK", serviceNameEn: "Big truck / bulldozer ramp", category: "A.Access & Ramp", serviceGroup: "1. Ramp" },
    { code: "TRUCK_STANDALONE", serviceNameEn: "Tow truck / ramp only", category: "E.Equipment", serviceGroup: "Tow truck / ramp only" },
    { code: "TRUCK_ORM_CUSTOMER", serviceNameEn: "Tow truck / with ORM follow-on", category: "E.Equipment", serviceGroup: "Tow truck / with ORM follow-on" },
  ]
  const ramp = groupRateCatalog(rows).find(group => group.key === "RAMP")
  assert.ok(ramp)
  assert.deepEqual(ramp.sections.map(section => section.label), ["Speedboat (SB)", "Sport & Cruiser", "Tow Truck"])
  assert.deepEqual(ramp.sections[2].rows.map(row => row.code), ["RAMP_BIG_TRUCK", "TRUCK_ORM_CUSTOMER", "TRUCK_STANDALONE"])
  assert.equal(rows[3].category, "E.Equipment")
})
