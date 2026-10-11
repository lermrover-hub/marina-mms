import test from "node:test"
import assert from "node:assert/strict"
import { lowestStoragePackage, speedboatStorageClass, storageRateCodes, validateSb4Storage } from "../lib/storage-pricing.ts"

const w4 = [{ code: "SB4_W4_DAY", rateThb: 700 }, { code: "SB4_W4_WEEK", rateThb: 4200 }, { code: "SB4_W4_MONTH", rateThb: 18000 }]
const b1 = [{ code: "SB4_B1_DAY", rateThb: 900 }, { code: "SB4_B1_WEEK", rateThb: 5400 }, { code: "SB4_B1_MONTH", rateThb: 19500 }]

test("v3.6 speedboat storage classes stop at 60 ft", () => {
  assert.equal(speedboatStorageClass(25), "SB1")
  assert.equal(speedboatStorageClass(35), "SB2")
  assert.equal(speedboatStorageClass(45), "SB3")
  assert.equal(speedboatStorageClass(55), "SB4")
  assert.equal(speedboatStorageClass(60), "SB4")
  assert.throws(() => speedboatStorageClass(61), /outside/i)
})

test("SB4 storage routes to slot-specific canonical codes", () => {
  assert.deepEqual(storageRateCodes("SB4", "W4"), ["SB4_W4_DAY", "SB4_W4_WEEK", "SB4_W4_MONTH"])
  assert.deepEqual(storageRateCodes("SB4", "B1"), ["SB4_B1_DAY", "SB4_B1_WEEK", "SB4_B1_MONTH"])
  assert.throws(() => storageRateCodes("SB4"), /W4 or B1/i)
})

test("W4 is trailer only and B1 is boat stands only", () => {
  assert.equal(validateSb4Storage("W4", "TRAILER"), "W4")
  assert.equal(validateSb4Storage("B1", "BOAT_STANDS"), "B1")
  assert.throws(() => validateSb4Storage("W4", "BOAT_STANDS"), /trailer/i)
  assert.throws(() => validateSb4Storage("B1", "TRAILER"), /boat-stand/i)
})

test("W4 exact package totals match FINAL_MERGED", () => {
  assert.equal(lowestStoragePackage(7, w4).reduce((sum, line) => sum + line.total, 0), 4200)
  assert.equal(lowestStoragePackage(10, w4).reduce((sum, line) => sum + line.total, 0), 6300)
  assert.equal(lowestStoragePackage(30, w4).reduce((sum, line) => sum + line.total, 0), 18000)
})

test("B1 exact package totals match FINAL_MERGED", () => {
  assert.equal(lowestStoragePackage(7, b1).reduce((sum, line) => sum + line.total, 0), 5400)
  assert.equal(lowestStoragePackage(10, b1).reduce((sum, line) => sum + line.total, 0), 8100)
  assert.equal(lowestStoragePackage(30, b1).reduce((sum, line) => sum + line.total, 0), 19500)
})
