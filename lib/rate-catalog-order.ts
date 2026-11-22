export const RATE_SERVICE_GROUPS = [
  { key: "RAMP", label: "Ramp" },
  { key: "HAUL_OUT", label: "Haul-out / Launch" },
  { key: "STORAGE_YARD", label: "Dry Storage / Service Yard" },
  { key: "BOAT_YARD", label: "Boat Yard Services" },
  { key: "PAINT", label: "Paint & Coating" },
  { key: "SPECIALIST", label: "Mechanic & Specialist Services" },
  { key: "MANAGER_REVIEW", label: "Manager Review" },
  { key: "OTHER", label: "Other Services" },
] as const

export const RATE_VESSELS = [
  { key: "COMMERCIAL_SPEEDBOAT", label: "Speedboat (SB)" },
  { key: "SPORT_CRUISER", label: "Sport & Cruiser" },
  { key: "YACHT_MONOHULL", label: "Yacht Monohull" },
  { key: "SAIL_MONOHULL", label: "Sail Monohull" },
  { key: "POWER_CATAMARAN", label: "Power Catamaran" },
  { key: "SAIL_CATAMARAN", label: "Sail Catamaran" },
] as const

type ServiceGroup = typeof RATE_SERVICE_GROUPS[number]["key"]
type VesselGroup = typeof RATE_VESSELS[number]["key"]

interface RateCatalogRow {
  code: string
  category: string
  serviceNameEn: string
  unit?: string
  serviceGroup?: string | null
  subgroup?: string | null
  vesselCategory?: string | null
  vesselTier?: string | null
  loaMinFt?: number | null
  loaMaxFt?: number | null
  durationCode?: string | null
  durationDays?: number | null
  displayOrder?: number | null
}

const words = (value: string) => value.toLowerCase().replace(/[_-]+/g, " ").trim()

export function getRateServiceGroup(row: RateCatalogRow): ServiceGroup {
  const group = words(row.serviceGroup ?? "").replace(/^\d+\.\s*/, "")
  const category = words(row.category)
  const subgroup = words(row.subgroup ?? "")

  if (group === "manager review" || category === "manager review") return "MANAGER_REVIEW"
  if (group === "storage yard" || group === "storage" || subgroup.includes("hardstand service")) return "STORAGE_YARD"
  if (group.startsWith("haul")) return "HAUL_OUT"
  if (group.startsWith("tow truck")) return "RAMP"
  if (group.startsWith("ramp")) return "RAMP"
  if (/^(boat yard|boatyard|yard services|standalone component|service & equipment|hardstand & boat stand)/.test(group)) return "BOAT_YARD"
  if (group.includes("paint")) return "PAINT"
  if (/mechanic|specialist/.test(group)) return "SPECIALIST"
  if (group === "other") return "OTHER"

  if (/ramp/.test(category)) return "RAMP"
  if (/haul/.test(category)) return "HAUL_OUT"
  if (/storage/.test(category)) return "STORAGE_YARD"
  if (/yard|equipment|stand/.test(category)) return "BOAT_YARD"
  if (/paint|coating|antifouling/.test(category)) return "PAINT"
  if (/mechanic|specialist/.test(category)) return "SPECIALIST"
  return "OTHER"
}

export function rateVesselLabel(category?: string | null) {
  return RATE_VESSELS.find(vessel => vessel.key === category)?.label ?? (
    category === "ALL" ? "All vessels" : category === "MANAGER_REVIEW" ? "Manager review" : category?.replaceAll("_", " ") ?? ""
  )
}

export function getRateVesselGroup(row: RateCatalogRow): VesselGroup | "ALL" | "OTHER" {
  if (row.vesselCategory === "ALL") return "ALL"
  if (row.vesselCategory && row.vesselCategory !== "MANAGER_REVIEW") {
    return RATE_VESSELS.find(vessel => vessel.key === row.vesselCategory)?.key ?? "OTHER"
  }
  // Older rows may only have the vessel in the subgroup or service name.
  const name = words(`${row.subgroup ?? ""} ${row.serviceNameEn}`)
  if (/sport.*cruiser|sports? cruisers?/.test(name)) return "SPORT_CRUISER"
  if (/power catamaran|power cat\b/.test(name)) return "POWER_CATAMARAN"
  if (/sail(?:ing)? catamaran|sail cat\b/.test(name)) return "SAIL_CATAMARAN"
  if (/sail(?:ing)? monohull/.test(name)) return "SAIL_MONOHULL"
  if (/yacht monohull|motor (?:yacht|monohull)/.test(name)) return "YACHT_MONOHULL"
  if (/speed\s?boat/.test(name)) return "COMMERCIAL_SPEEDBOAT"
  return "OTHER"
}

function getYardSubgroup(row: RateCatalogRow) {
  const name = words(row.serviceNameEn)
  const subgroup = words(row.subgroup ?? "")
  if (/\btow\b/.test(name) || subgroup.includes("tow truck")) return "Tow Truck Hire"
  if (/boat stand|cradle/.test(subgroup) || /^(cradle|boat stand)/.test(name)) return "Boat Stand / Cradle"
  if (name.includes("foam wash")) return "Foam Wash"
  if (/(?:pressure|bottom) wash|pressure (?:water|cleaning)/.test(name) || subgroup.includes("high pressure")) return "High-pressure Wash"
  return "Other Yard Services"
}

function getRampSubgroup(row: RateCatalogRow) {
  const name = words(row.serviceNameEn)
  const group = words(row.serviceGroup ?? "")
  return group.startsWith("tow truck") || /\btruck\b|\bbulldozer\b/.test(name)
    ? "TOW_TRUCK"
    : getRateVesselGroup(row)
}

const YARD_ORDER = ["Tow Truck Hire", "Boat Stand / Cradle", "High-pressure Wash", "Foam Wash", "Other Yard Services"]

export function rateTierLabel(tier?: string | null) {
  const number = /^(?:SB|SC|TIER[ _-]*)?([1-4])$/i.exec(tier?.trim() ?? "")?.[1]
  return number ? `Tier ${number}` : tier?.replaceAll("_", " ") ?? ""
}

function getTierOrder(row: RateCatalogRow) {
  const tier = /^Tier ([1-4])$/.exec(rateTierLabel(row.vesselTier))
  return tier ? Number(tier[1]) : 5
}

const VESSEL_ORDER: readonly string[] = [...RATE_VESSELS.map(vessel => vessel.key), "ALL", "OTHER"]
const DURATION_ORDER = ["Daily", "Weekly", "Monthly", "One cycle", "Round trip"]

export function rateDurationLabel(row: RateCatalogRow) {
  const term = words(row.durationCode || row.unit?.split("/").at(-1) || "")
  if (["day", "daily", "d"].includes(term) || (!row.durationCode && row.durationDays === 1)) return "Daily"
  if (["week", "weekly", "w", "wk"].includes(term) || (!row.durationCode && row.durationDays === 7)) return "Weekly"
  if (["month", "monthly", "m", "mo"].includes(term) || (!row.durationCode && row.durationDays === 30)) return "Monthly"
  if (term === "one cycle" || term === "cycle") return "One cycle"
  if (term === "round trip") return "Round trip"
  return row.durationCode?.replaceAll("_", " ") ?? ""
}

function getDurationOrder(row: RateCatalogRow) {
  const index = DURATION_ORDER.indexOf(rateDurationLabel(row))
  return index < 0 ? DURATION_ORDER.length : index
}

function compareRates(a: RateCatalogRow, b: RateCatalogRow) {
  return VESSEL_ORDER.indexOf(getRateVesselGroup(a)) - VESSEL_ORDER.indexOf(getRateVesselGroup(b)) ||
    getTierOrder(a) - getTierOrder(b) ||
    rateTierLabel(a.vesselTier).localeCompare(rateTierLabel(b.vesselTier), "en", { numeric: true }) ||
    (a.loaMinFt ?? Infinity) - (b.loaMinFt ?? Infinity) ||
    (a.loaMaxFt ?? Infinity) - (b.loaMaxFt ?? Infinity) ||
    getDurationOrder(a) - getDurationOrder(b) ||
    (a.displayOrder ?? Infinity) - (b.displayOrder ?? Infinity) ||
    a.code.localeCompare(b.code, "en", { numeric: true })
}

export function groupRateCatalog<T extends RateCatalogRow>(rows: readonly T[]) {
  const groups = new Map<ServiceGroup, Map<string, T[]>>()
  for (const row of rows) {
    const group = getRateServiceGroup(row)
    const subgroup = group === "BOAT_YARD" ? getYardSubgroup(row) : group === "RAMP" ? getRampSubgroup(row) : getRateVesselGroup(row)
    const subgroups = groups.get(group) ?? new Map<string, T[]>()
    const rates = subgroups.get(subgroup) ?? []
    rates.push(row)
    subgroups.set(subgroup, rates)
    groups.set(group, subgroups)
  }

  return RATE_SERVICE_GROUPS.flatMap(group => {
    const sections = groups.get(group.key)
    if (!sections) return []
    const order = group.key === "BOAT_YARD" ? YARD_ORDER : group.key === "RAMP" ? [...VESSEL_ORDER.slice(0, 2), "TOW_TRUCK", ...VESSEL_ORDER.slice(2)] : VESSEL_ORDER
    return [{
      ...group,
      sections: order.flatMap(key => {
        const rates = sections.get(key)
        if (!rates) return []
        return [{
          key,
          label: group.key === "BOAT_YARD" ? key : key === "TOW_TRUCK" ? "Tow Truck" : key === "OTHER" ? "General / Other Vessels" : rateVesselLabel(key),
          rows: rates.sort(compareRates),
        }]
      }),
    }]
  })
}
