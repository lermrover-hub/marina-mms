import { test } from 'node:test'
import assert from 'node:assert/strict'
import { catalogAdmin, catalogCreate, catalogUpdate, catalogWritesEnabled } from '../lib/catalog-validation.ts'
const vessel = { kind: 'VESSEL_TYPE', code: 'SB_T3', name_en: 'Commercial speedboat', loa_min_ft: 41, loa_max_ft: 50, usage: 'COMMERCIAL' }
test('catalog defaults to draft and allows independent usage', () => {
  assert.equal(catalogCreate.parse(vessel).status, 'DRAFT')
  assert.equal(catalogCreate.parse(vessel).usage, 'COMMERCIAL')
})
test('reject inverted ranges and unknown executable pricing fields', () => {
  assert.equal(catalogCreate.safeParse({ ...vessel, loa_max_ft: 40 }).success, false)
  assert.equal(catalogCreate.safeParse({ ...vessel, formula: 'eval(anything)' }).success, false)
})
test('service must have group parent; vessel cannot have parent', () => {
  const parent_id = '12345678-1234-4123-8123-123456789012'
  assert.equal(catalogCreate.safeParse({ kind: 'SERVICE', code: 'WASH', name_en: 'Wash' }).success, false)
  assert.equal(catalogCreate.safeParse({ kind: 'SERVICE', code: 'WASH', name_en: 'Wash', parent_id }).success, true)
  assert.equal(catalogCreate.safeParse({ ...vessel, parent_id }).success, false)
})
test('updates require version and cannot replace identity', () => {
  assert.equal(catalogUpdate.safeParse({ name_en: 'Updated' }).success, false)
  assert.equal(catalogUpdate.safeParse({ name_en: 'Updated', expected_version: 1, code: 'OTHER' }).success, false)
  assert.equal(catalogUpdate.safeParse({ name_en: 'Updated', expected_version: 1, status: 'RETIRED' }).success, true)
})
test('admin policy rejects staff finance and missing role', () => {
  assert.equal(catalogAdmin('SUPER_ADMIN'), true)
  for (const role of ['FINANCE','STAFF','CUSTOMER',undefined]) assert.equal(catalogAdmin(role), false)
})
test('writes require explicit switch and exact staging origin', () => {
  const staging = 'https://zanlunbgupdtqznruzok.supabase.co'
  assert.equal(catalogWritesEnabled(staging, 'true'), true)
  for (const url of [undefined,'https://production.supabase.co',staging+'.evil.test']) assert.equal(catalogWritesEnabled(url, 'true'), false)
  assert.equal(catalogWritesEnabled(staging, undefined), false)
})
