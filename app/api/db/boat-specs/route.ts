import { promises as fs } from "fs"
import path from "path"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type BoatSpec = {
  id: string
  brand: string
  model: string
  model_year_ref?: string | null
  boat_category?: string | null
  boat_type?: string | null
  hull_type?: string | null
  propulsion_type?: string | null
  loa_ft?: number | null
  loa_m?: number | null
  beam_ft?: number | null
  beam_m?: number | null
  draft_min_m?: number | null
  draft_max_m?: number | null
  draft_ft?: number | null
  weight_kg?: number | null
  weight_t?: number | null
  fuel_l?: number | null
  water_l?: number | null
  ce_category?: string | null
  typical_use?: string | null
  ramp_trailer_relevance?: string | null
  beam_risk_flag?: string | null
  draft_risk_flag?: string | null
  weight_risk_flag?: string | null
  default_trailer_support_height_m?: number | null
  default_safety_clearance_m?: number | null
  default_ramp_depth_offset_m?: number | null
  required_actual_depth_m?: number | null
  required_tide_table_height_m?: number | null
  source_url?: string | null
  image_or_product_url?: string | null
  data_status?: string | null
  notes?: string | null
  source_workbook?: string | null
}

const catalogPath = path.join(process.cwd(), "app", "data", "boat-spec-catalog.json")

async function readCatalog(): Promise<BoatSpec[]> {
  const raw = await fs.readFile(catalogPath, "utf8")
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed) ? parsed : []
}

async function writeCatalog(items: BoatSpec[]) {
  const sorted = [...items].sort((a, b) =>
    (a.loa_ft ?? 0) - (b.loa_ft ?? 0) ||
    a.brand.localeCompare(b.brand) ||
    a.model.localeCompare(b.model)
  )
  await fs.writeFile(catalogPath, JSON.stringify(sorted, null, 2) + "\n", "utf8")
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text || null
}

function normalizeSpec(input: Record<string, unknown>): BoatSpec {
  const brand = toText(input.brand ?? input.Brand)
  const model = toText(input.model ?? input.Model)
  if (!brand || !model) throw new Error("brand and model are required")

  const draftMaxM = toNumber(input.draft_max_m ?? input.Draft_Max_m)
  const draftFt = toNumber(input.draft_ft ?? input.Draft_ft) ?? (draftMaxM !== null ? Number((draftMaxM * 3.28084).toFixed(2)) : null)
  const weightKg = toNumber(input.weight_kg ?? input.Weight_kg)

  return {
    id: toText(input.id ?? input.Boat_ID) ?? `SPEC-${Date.now()}`,
    brand,
    model,
    model_year_ref: toText(input.model_year_ref ?? input.Model_Year_Ref),
    boat_category: toText(input.boat_category ?? input.Boat_Category),
    boat_type: toText(input.boat_type ?? input.Boat_Type) ?? "OTHER",
    hull_type: toText(input.hull_type ?? input.Hull_Type),
    propulsion_type: toText(input.propulsion_type ?? input.Propulsion_Type),
    loa_ft: toNumber(input.loa_ft ?? input.LOA_ft),
    loa_m: toNumber(input.loa_m ?? input.LOA_m),
    beam_ft: toNumber(input.beam_ft ?? input.Beam_ft),
    beam_m: toNumber(input.beam_m ?? input.Beam_m),
    draft_min_m: toNumber(input.draft_min_m ?? input.Draft_Min_m),
    draft_max_m: draftMaxM,
    draft_ft: draftFt,
    weight_kg: weightKg,
    weight_t: toNumber(input.weight_t ?? input.Weight_t) ?? (weightKg !== null ? Number((weightKg / 1000).toFixed(2)) : null),
    fuel_l: toNumber(input.fuel_l ?? input.Fuel_L),
    water_l: toNumber(input.water_l ?? input.Water_L),
    ce_category: toText(input.ce_category ?? input.CE_Category),
    typical_use: toText(input.typical_use ?? input.Typical_Use),
    ramp_trailer_relevance: toText(input.ramp_trailer_relevance ?? input.Ramp_Trailer_Relevance),
    beam_risk_flag: toText(input.beam_risk_flag ?? input.Beam_Risk_Flag),
    draft_risk_flag: toText(input.draft_risk_flag ?? input.Draft_Risk_Flag),
    weight_risk_flag: toText(input.weight_risk_flag ?? input.Weight_Risk_Flag),
    default_trailer_support_height_m: toNumber(input.default_trailer_support_height_m ?? input.Default_Trailer_Support_Height_m),
    default_safety_clearance_m: toNumber(input.default_safety_clearance_m ?? input.Default_Safety_Clearance_m),
    default_ramp_depth_offset_m: toNumber(input.default_ramp_depth_offset_m ?? input.Default_Ramp_Depth_Offset_m),
    required_actual_depth_m: toNumber(input.required_actual_depth_m ?? input.Required_Actual_Depth_m),
    required_tide_table_height_m: toNumber(input.required_tide_table_height_m ?? input.Required_Tide_Table_Height_m),
    source_url: toText(input.source_url ?? input.Source_URL),
    image_or_product_url: toText(input.image_or_product_url ?? input.Image_or_Product_URL),
    data_status: toText(input.data_status ?? input.Data_Status),
    notes: toText(input.notes ?? input.Notes),
    source_workbook: toText(input.source_workbook ?? input.Source_Workbook) ?? "Manual entry",
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get("q") ?? "").toLowerCase()
    const category = searchParams.get("category")
    const type = searchParams.get("boat_type")
    const ramp = searchParams.get("ramp")
    const limit = Number(searchParams.get("limit") ?? "500")

    let items = await readCatalog()
    if (q) {
      items = items.filter((item) =>
        [item.brand, item.model, item.boat_category, item.typical_use, item.notes]
          .some((value) => value?.toLowerCase().includes(q))
      )
    }
    if (category && category !== "ALL") items = items.filter((item) => item.boat_category === category)
    if (type && type !== "ALL") items = items.filter((item) => item.boat_type === type)
    if (ramp && ramp !== "ALL") items = items.filter((item) => item.ramp_trailer_relevance === ramp)

    return NextResponse.json(items.slice(0, Number.isFinite(limit) ? limit : 500))
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const incoming = Array.isArray(body) ? body : Array.isArray(body.items) ? body.items : [body]
    const nextItems = incoming.map((item: unknown) => normalizeSpec(item as Record<string, unknown>))
    const existing = await readCatalog()
    const map = new Map(existing.map((item) => [item.id, item]))
    for (const item of nextItems) map.set(item.id, item)
    await writeCatalog([...map.values()])

    return NextResponse.json({ imported: nextItems.length, total: map.size })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
