// These labels organise the rate-management screen only. Operational category,
// service_group and subgroup remain unchanged for quotation and billing rules.
export const RATE_CATEGORIES = [
  "Ramp", "Haul-out", "Dry Storage", "Repair Yard", "Yard Services", "Utilities", "Other Services",
] as const

export const VESSEL_GROUPS = [
  "Fishing", "Jet Ski", "Speedboat", "Sport & Cruiser", "Yacht Monohull", "Yacht Catamaran", "All Vessels", "Unclassified",
] as const

export const VESSEL_SUBTYPES: Record<string, string[]> = {
  Speedboat: ["SB1", "SB2", "SB3", "SB4"],
  "Yacht Monohull": ["Motor Monohull", "Sail Monohull"],
  "Yacht Catamaran": ["Power Catamaran", "Sail Catamaran"],
}

export interface RateDisplaySource {
  code: string
  category: string
  serviceGroup: string | null
  subgroup: string | null
  serviceNameEn: string
  displayCategory?: string | null
  displayVesselGroup?: string | null
  displayVesselSubtype?: string | null
}

export function rateDisplayPlacement(rate: RateDisplaySource) {
  const source = `${rate.category} ${rate.serviceGroup ?? ""} ${rate.subgroup ?? ""} ${rate.code} ${rate.serviceNameEn}`.toLowerCase()
  const displayCategory = rate.displayCategory || (
    /haul[ -]?out|haul[ -]?in|launch/.test(source) ? "Haul-out" :
    /ramp/.test(source) ? "Ramp" :
    /stor|hardstand|boat stand|cradle/.test(source) ? "Dry Storage" :
    /repair|service yard|yard •/.test(source) ? "Repair Yard" :
    /water|electric|utilit/.test(source) ? "Utilities" :
    /yard|washing|wash|trailer|tow|lifting|crane/.test(source) ? "Yard Services" :
    "Other Services"
  )
  const displayVesselGroup = rate.displayVesselGroup || (
    /catamaran|\bcat\b/.test(source) ? "Yacht Catamaran" :
    /monohull|\byacht\b/.test(source) ? "Yacht Monohull" :
    /sport\s*&\s*cruiser|\bsp&c\b/.test(source) ? "Sport & Cruiser" :
    /speedboat|\bsb(?:[1-4])?(?:\b|_)/.test(source) ? "Speedboat" :
    /jet\s*ski|jetski/.test(source) ? "Jet Ski" :
    /fishing/.test(source) ? "Fishing" :
    /all vessels/.test(source) ? "All Vessels" : "Unclassified"
  )
  const speedboatTier = /\bsb[_-]?([1-4])\b|\btier\s*([1-4])\b/i.exec(source)?.slice(1).find(Boolean)
  const displayVesselSubtype = rate.displayVesselSubtype != null ? rate.displayVesselSubtype : (
    displayVesselGroup === "Speedboat" ? (speedboatTier ? `SB${speedboatTier}` : null) :
    displayVesselGroup === "Yacht Catamaran" ? (/sail/.test(source) ? "Sail Catamaran" : /power|motor/.test(source) ? "Power Catamaran" : null) :
    displayVesselGroup === "Yacht Monohull" ? (/sail/.test(source) ? "Sail Monohull" : /motor|power/.test(source) ? "Motor Monohull" : null) : null
  )
  return { displayCategory, displayVesselGroup, displayVesselSubtype }
}
