import { createServerClient } from './supabase-server'
import { catalogWritesEnabled } from './catalog-validation'
import { applyCatalogRates, type CatalogRateEntry } from './catalog-rate-mapping'

export async function withCatalogRates<T extends { id: string }>(rates: T[]) {
  // Staging-only rollout; no production behavior change or silent fallback on error.
  if (!catalogWritesEnabled(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.ENABLE_CATALOG_RATE_LINKS)) return rates
  const { data, error } = await createServerClient().from('mms_service_catalog')
    .select('id,kind,status,parent_id,pricing_id,name_en,name_th')
  if (error) throw new Error('Service catalog unavailable. Reload before selecting rates.')
  return applyCatalogRates(rates, (data ?? []) as CatalogRateEntry[])
}
