import test from "node:test"
import assert from "node:assert/strict"
import { lowestStoragePackage, speedboatStorageClass, storageRateCodes, validateSb4Storage } from "../lib/storage-pricing.ts"

const tier4 = [{ code: "STORE_SB_T4_D", rateThb: 1750 }, { code: "STORE_SB_T4_W", rateThb: 11030 }, { code: "STORE_SB_T4_M", rateThb: 44630 }]

test("v3.7 speedboat storage classes use Tier 3 41-50 ft and Tier 4 51-60 ft", () => {
  assert.equal(speedboatStorageClass(25), "SB1")
  assert.equal(speedboatStorageClass(35), "SB2")
  assert.equal(speedboatStorageClass(45), "SB3")
  assert.equal(speedboatStorageClass(50), "SB3")
  assert.equal(speedboatStorageClass(51), "SB4")
  assert.equal(speedboatStorageClass(55), "SB4")
  assert.equal(speedboatStorageClass(60), "SB4")
  assert.throws(() => speedboatStorageClass(61), /outside/i)
})

test("v3.7 storage routes to canonical tier codes", () => {
  assert.deepEqual(storageRateCodes("SB1"), ["STORE_SB_T1_D", "STORE_SB_T1_W", "STORE_SB_T1_M"])
  assert.deepEqual(storageRateCodes("SB3"), ["STORE_SB_T3_D", "STORE_SB_T3_W", "STORE_SB_T3_M"])
  assert.deepEqual(storageRateCodes("SB4", "W4"), ["STORE_SB_T4_D", "STORE_SB_T4_W", "STORE_SB_T4_M"])
  assert.deepEqual(storageRateCodes("SB4", "B1"), ["STORE_SB_T4_D", "STORE_SB_T4_W", "STORE_SB_T4_M"])
  assert.throws(() => storageRateCodes("SB4"), /W4 or B1/i)
})

test("W4 is trailer only and B1 is boat stands only", () => {
  assert.equal(validateSb4Storage("W4", "TRAILER"), "W4")
  assert.equal(validateSb4Storage("B1", "BOAT_STANDS"), "B1")
  assert.throws(() => validateSb4Storage("W4", "BOAT_STANDS"), /trailer/i)
  assert.throws(() => validateSb4Storage("B1", "TRAILER"), /boat-stand/i)
})

test("v3.7 Tier 4 package codes support 7/10/30 day optimization", () => {
  assert.equal(lowestStoragePackage(7, tier4).reduce((sum, line) => sum + line.total, 0), 11030)
  assert.equal(lowestStoragePackage(10, tier4).reduce((sum, line) => sum + line.total, 0), 16280)
  assert.equal(lowestStoragePackage(30, tier4).reduce((sum, line) => sum + line.total, 0), 44630)
})
