import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyCatalogRates } from '../lib/catalog-rate-mapping.ts'
import { catalogCreate } from '../lib/catalog-validation.ts'
import { workflowSectionForRate, serviceCategoryForRate } from '../lib/service-rate-card.ts'
const rate = { id: 'rate', code: 'WASH', serviceNameEn: 'Wash', rateThb: 2500, unit: 'job', category: 'Yard', subgroup: 'Cleaning', serviceGroup: '3. Yard', directCostThb: 1000 }
const group = { id: 'g', kind: 'SERVICE_GROUP', name_en: 'Cleaning services', status: 'ACTIVE', parent_id: null, pricing_id: null }
const service = { id: 's', kind: 'SERVICE', name_en: 'Boat wash', status: 'ACTIVE', parent_id: 'g', pricing_id: 'rate' }
test('unmapped rates and empty catalog preserve existing behavior', () => {
  assert.deepEqual(applyCatalogRates([rate], []), [rate])
})
test('linked rate keeps original price code routing and accounting data', () => {
  const [mapped] = applyCatalogRates([rate], [group, service])
  for (const key of Object.keys(rate)) assert.deepEqual(mapped[key], rate[key])
  assert.equal(workflowSectionForRate(mapped), workflowSectionForRate(rate))
  assert.equal(serviceCategoryForRate(mapped), group.name_en)
  assert.equal(mapped.catalogServiceName, service.name_en)
})
test('retired draft or orphan mappings cannot be selected for a new request', () => {
  for (const status of ['DRAFT', 'RETIRED']) {
    assert.deepEqual(applyCatalogRates([rate], [group, { ...service, status }]), [])
    assert.deepEqual(applyCatalogRates([rate], [{ ...group, status }, service]), [])
  }
  assert.deepEqual(applyCatalogRates([rate], [service]), [])
})
test('only services link prices and historical input objects stay untouched', () => {
  assert.equal(catalogCreate.safeParse({ kind: 'VESSEL_TYPE', code: 'VESSEL', name_en: 'Vessel', pricing_id: '12345678-1234-4123-8123-123456789012' }).success, false)
  const snapshot = structuredClone(rate)
  applyCatalogRates([rate], [group, service])
  assert.deepEqual(rate, snapshot)
})
