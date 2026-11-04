export type CatalogRateEntry = {
  id: string; kind: string; status: string; parent_id: string | null;
  pricing_id: string | null; name_en: string; name_th?: string;
}

/** Presentation and availability only. Never overwrite price, code, unit or routing. */
export function applyCatalogRates<T extends { id: string }>(rates: T[], catalog: CatalogRateEntry[]): (T & { catalogCategory?: string; catalogServiceName?: string })[] {
  const entries = new Map(catalog.map(row => [row.id, row]))
  const links = new Map(catalog.filter(row => row.kind === 'SERVICE' && row.pricing_id).map(row => [row.pricing_id, row]))
  return rates.flatMap(rate => {
    const service = links.get(rate.id)
    if (!service) return [rate]
    const group = entries.get(service.parent_id ?? '')
    if (service.status !== 'ACTIVE' || group?.kind !== 'SERVICE_GROUP' || group.status !== 'ACTIVE') return []
    return [{ ...rate, catalogCategory: group.name_en, catalogServiceName: service.name_en }]
  })
}
