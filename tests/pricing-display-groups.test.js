import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rateDisplayPlacement } from '../lib/pricing-display-groups.ts'

const haulRate = {
  code: 'HAUL_SB_3ENG_41_47',
  category: 'A.Access & Ramp',
  serviceGroup: '2. Haul-out',
  subgroup: 'Speedboat haul-out / launch',
  serviceNameEn: 'Speedboat haul-out',
}

test('existing haul-out rate is grouped by service and vessel without changing operational fields', () => {
  const source = { ...haulRate }
  assert.deepEqual(rateDisplayPlacement(source), {
    displayCategory: 'Haul-out',
    displayVesselGroup: 'Speedboat',
    displayVesselSubtype: null,
  })
  assert.deepEqual(source, haulRate)
})

test('moving a rate changes only display placement', () => {
  const moved = { ...haulRate, displayCategory: 'Yard Services', displayVesselGroup: 'All Vessels' }
  assert.deepEqual(rateDisplayPlacement(moved), {
    displayCategory: 'Yard Services',
    displayVesselGroup: 'All Vessels',
    displayVesselSubtype: null,
  })
  assert.equal(moved.category, haulRate.category)
  assert.equal(moved.serviceGroup, haulRate.serviceGroup)
})

test('ambiguous yacht hull subtype is left unspecified', () => {
  const placement = rateDisplayPlacement({
    code: 'HAUL_YACHT_MONO_RT', category: 'Yacht', serviceGroup: 'Haul-Out & Launch • Yacht Monohull',
    subgroup: 'Yacht', serviceNameEn: 'Yacht monohull haul-out',
  })
  assert.equal(placement.displayVesselGroup, 'Yacht Monohull')
  assert.equal(placement.displayVesselSubtype, null)
})

test('explicit subtype and category survive inference', () => {
  const placement = rateDisplayPlacement({ ...haulRate, displayCategory: 'Repair Yard', displayVesselGroup: 'Yacht Catamaran', displayVesselSubtype: 'Sail Catamaran' })
  assert.deepEqual(placement, { displayCategory: 'Repair Yard', displayVesselGroup: 'Yacht Catamaran', displayVesselSubtype: 'Sail Catamaran' })
})
