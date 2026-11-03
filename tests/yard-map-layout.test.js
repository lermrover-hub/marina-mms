import { test } from 'node:test'
import assert from 'node:assert/strict'
import { YARD_SLOTS, normalizedSlotCode } from '../lib/yard-map-layout.ts'
import { validateBerthAssignmentDates } from '../lib/berth-assignment-validation.ts'

test('approved image has exactly 23 unique dry-yard slots', () => {
  assert.equal(YARD_SLOTS.length, 23)
  assert.equal(new Set(YARD_SLOTS.map(s => s.code)).size, 23)
  for (const s of YARD_SLOTS) {
    assert.ok(s.x > 0 && s.x < 1448 && s.y > 0 && s.y < 1086)
    assert.ok(s.width > 0 && s.height > 0)
  }
  assert.ok(!YARD_SLOTS.some(s => s.code === 'C18' || s.code.startsWith('WB')))
})
test('presentation aliases match existing C-hyphen records without merging wet-berth codes', () => {
  for (const code of ['C-2', 'C02', 'c 2', ' C2 ']) assert.equal(normalizedSlotCode(code), 'C2')
  assert.equal(normalizedSlotCode('WB-A01'), 'WB-A01')
  assert.equal(normalizedSlotCode('W4'), 'W4')
  assert.equal(normalizedSlotCode('B1'), 'B1')
})
test('completed assignment ending on checkout date releases the slot on the next day', () => {
  assert.equal(validateBerthAssignmentDates({ start_date: '2026-09-02', end_date: '2026-10-18' }), null)
  assert.equal(validateBerthAssignmentDates({ start_date: '2026-10-19', end_date: '2026-10-18' }), 'end_date cannot be before start_date')
  assert.equal(validateBerthAssignmentDates({ start_date: '2026-09-02', end_date: '2100-10-18' }), null)
})
