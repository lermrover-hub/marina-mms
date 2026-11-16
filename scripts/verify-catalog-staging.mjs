// Read-only integration check. Load staging env before running; never prints secrets.
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { applyCatalogRates } from '../lib/catalog-rate-mapping.ts'
import { workflowSectionForRate } from '../lib/service-rate-card.ts'
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin, 'https://zanlunbgupdtqznruzok.supabase.co')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const [{data:prices,error:pError},{data:catalog,error:cError}] = await Promise.all([
  db.from('pricing_master').select('*').eq('is_active',true),
  db.from('mms_service_catalog').select('*'),
])
assert.ifError(pError); assert.ifError(cError)
const mapped=applyCatalogRates(prices,catalog)
assert.equal(mapped.length, prices.length)
for (const p of prices) {
  const m=mapped.find(r=>r.id===p.id)
  for(const key of Object.keys(p)) assert.deepEqual(m[key],p[key],`${p.code}: ${key}`)
  assert.equal(m.catalogCategory, p.subgroup || p.category)
  const routing=r=>workflowSectionForRate({code:r.code,serviceNameEn:r.service_name_en,serviceGroup:r.service_group,subgroup:r.subgroup,category:r.category,unit:r.unit,rateThb:r.rate_thb,directCostThb:r.direct_cost_thb})
  assert.equal(routing(m),routing(p))
}
console.log(`PASS: ${prices.length} live staging rates retain every original field, category and workflow section`)
