import assert from "node:assert/strict"
import test from "node:test"

import { mapDatabaseRole } from "../lib/auth-user.ts"

test("database owner receives super-admin permissions", () => {
  assert.equal(mapDatabaseRole("owner"), "SUPER_ADMIN")
})

test("known operational roles are normalized", () => {
  assert.equal(mapDatabaseRole("marina_manager"), "MARINA_MANAGER")
  assert.equal(mapDatabaseRole("FINANCE"), "FINANCE")
})

test("unknown database roles fail closed to staff", () => {
  assert.equal(mapDatabaseRole("unexpected-role"), "STAFF")
})
