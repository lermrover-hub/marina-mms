import { randomUUID } from "crypto"
import { createServerClient } from "./supabase-server"

interface PricingMasterRow {
  id: string
  code: string
  service_name_en: string
  service_name_th: string | null
  category: string
  unit: string
  rate_thb: number | string
  full_rate_thb: number | string | null
  discount_pct: number | string | null
  source_discount_pct: number | string | null
  direct_cost_thb: number | string | null
  pilot_rate_thb: number | string | null
  pilot_notes: string | null
  revenue_gl_code: string | null
  cost_gl_code: string | null
  pnl_category: string | null
  cost_pnl_category: string | null
  cost_basis: string | null
  calc_type: string | null
  service_group: string | null
  subgroup: string | null
  provider_type: string | null
  quote_allowed: string | null
  price_status: string | null
  source_version: string | null
  effective_date: string | null
  updated_by: string | null
  approved_by: string | null
  approved_at: string | null
  description: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface PricingMasterInput {
  code: string
  serviceNameEn: string
  serviceNameTh?: string | null
  category: string
  unit: string
  rateThb: number | string
  fullRateThb?: number | string
  discountPct?: number | string
  sourceDiscountPct?: number | string
  directCostThb?: number | string | null
  revenueGlCode?: string | null
  costGlCode?: string | null
  pnlCategory?: string | null
  costPnlCategory?: string | null
  costBasis?: string | null
  calcType?: string
  serviceGroup?: string | null
  subgroup?: string | null
  providerType?: string | null
  quoteAllowed?: string
  priceStatus?: string
  sourceVersion?: string | null
  effectiveDate?: string | null
  updatedBy?: string | null
  approvedBy?: string | null
  description?: string | null
  notes?: string | null
}

interface PricingMasterUpdate {
  serviceNameEn?: string
  serviceNameTh?: string | null
  category?: string
  unit?: string
  rateThb?: number | string
  fullRateThb?: number | string
  discountPct?: number | string
  sourceDiscountPct?: number | string
  directCostThb?: number | string | null
  pilotRateThb?: number | string | null
  pilotNotes?: string | null
  revenueGlCode?: string | null
  costGlCode?: string | null
  pnlCategory?: string | null
  costPnlCategory?: string | null
  costBasis?: string | null
  calcType?: string
  serviceGroup?: string | null
  subgroup?: string | null
  providerType?: string | null
  quoteAllowed?: string
  priceStatus?: string
  sourceVersion?: string | null
  effectiveDate?: string | null
  updatedBy?: string | null
  approvedBy?: string | null
  description?: string | null
  notes?: string | null
  isActive?: boolean
}

function mapPricing(row: PricingMasterRow) {
  const rateThb = Number(row.rate_thb)
  const fullRateThb = row.full_rate_thb != null ? Number(row.full_rate_thb) : rateThb
  const discountPct = row.discount_pct != null ? Number(row.discount_pct) : 0
  const sourceDiscountPct = row.source_discount_pct != null ? Number(row.source_discount_pct) : 0
  const directCostThb = row.direct_cost_thb != null ? Number(row.direct_cost_thb) : null
  const pilotRateThb = row.pilot_rate_thb != null ? Number(row.pilot_rate_thb) : null
  const grossProfitThb = directCostThb == null ? null : rateThb - directCostThb
  const grossMarginPct = grossProfitThb == null || rateThb === 0 ? null : (grossProfitThb / rateThb) * 100
  return {
    id: row.id,
    code: row.code,
    serviceNameEn: row.service_name_en,
    serviceNameTh: row.service_name_th,
    category: row.category,
    unit: row.unit,
    rateThb,
    currentRateThb: rateThb,
    fullRateThb,
    discountPct,
    sourceDiscountPct,
    directCostThb,
    grossProfitThb,
    grossMarginPct,
    pilotRateThb,
    /** effectiveRate: use pilotRateThb when set, otherwise standard rateThb */
    effectiveRate: pilotRateThb ?? rateThb,
    pilotNotes: row.pilot_notes,
    revenueGlCode: row.revenue_gl_code,
    costGlCode: row.cost_gl_code,
    pnlCategory: row.pnl_category,
    costPnlCategory: row.cost_pnl_category,
    costBasis: row.cost_basis,
    calcType: row.calc_type ?? "FLAT_QTY",
    serviceGroup: row.service_group,
    subgroup: row.subgroup,
    providerType: row.provider_type,
    quoteAllowed: row.quote_allowed ?? "YES",
    priceStatus: row.price_status ?? (row.is_active ? "ACTIVE" : "INACTIVE"),
    sourceVersion: row.source_version,
    effectiveDate: row.effective_date,
    updatedBy: row.updated_by,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    description: row.description,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getPricingMaster(category?: string | null, activeOnly = false) {
  const supabase = createServerClient()
  let query = supabase
    .from("pricing_master")
    .select("*")
    .order("code", { ascending: true })

  if (category) query = query.ilike("category", `%${category}%`)
  if (activeOnly) query = query.eq("is_active", true)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row) => mapPricing(row as PricingMasterRow))
}

export async function getPricingMasterById(id: string) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("pricing_master")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  return data ? mapPricing(data as PricingMasterRow) : null
}

export async function createPricingMaster(input: PricingMasterInput) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("pricing_master")
    .insert({
      id: randomUUID(),
      code: input.code,
      service_name_en: input.serviceNameEn,
      service_name_th: input.serviceNameTh ?? null,
      category: input.category,
      unit: input.unit,
      rate_thb: Number(input.rateThb),
      full_rate_thb: Number(input.fullRateThb ?? input.rateThb),
      discount_pct: Number(input.discountPct ?? 0),
      source_discount_pct: Number(input.sourceDiscountPct ?? 0),
      direct_cost_thb: input.directCostThb != null ? Number(input.directCostThb) : null,
      revenue_gl_code: input.revenueGlCode ?? null,
      cost_gl_code: input.costGlCode ?? null,
      pnl_category: input.pnlCategory ?? null,
      cost_pnl_category: input.costPnlCategory ?? null,
      cost_basis: input.costBasis ?? null,
      calc_type: input.calcType ?? "FLAT_QTY",
      service_group: input.serviceGroup ?? null,
      subgroup: input.subgroup ?? null,
      provider_type: input.providerType ?? null,
      quote_allowed: input.quoteAllowed ?? "YES",
      price_status: input.priceStatus ?? "ACTIVE",
      source_version: input.sourceVersion ?? null,
      effective_date: input.effectiveDate ?? new Date().toISOString().slice(0, 10),
      updated_by: input.updatedBy ?? null,
      approved_by: input.approvedBy ?? null,
      approved_at: input.approvedBy ? new Date().toISOString() : null,
      description: input.description ?? null,
      notes: input.notes ?? null,
      is_active: (input.priceStatus ?? "ACTIVE") !== "INACTIVE",
    })
    .select("*")
    .single()

  if (error) throw error
  return mapPricing(data as PricingMasterRow)
}

export async function updatePricingMaster(id: string, input: PricingMasterUpdate) {
  const supabase = createServerClient()
  const updates: Record<string, string | number | boolean | null> = {
    updated_at: new Date().toISOString(),
  }

  if (input.serviceNameEn !== undefined) updates.service_name_en = input.serviceNameEn
  if (input.serviceNameTh !== undefined) updates.service_name_th = input.serviceNameTh
  if (input.category !== undefined) updates.category = input.category
  if (input.unit !== undefined) updates.unit = input.unit
  if (input.rateThb !== undefined) updates.rate_thb = Number(input.rateThb)
  if (input.fullRateThb !== undefined) updates.full_rate_thb = Number(input.fullRateThb)
  if (input.discountPct !== undefined) updates.discount_pct = Number(input.discountPct)
  if (input.sourceDiscountPct !== undefined) updates.source_discount_pct = Number(input.sourceDiscountPct)
  if (input.directCostThb !== undefined) updates.direct_cost_thb = input.directCostThb != null ? Number(input.directCostThb) : null
  if (input.pilotRateThb !== undefined) updates.pilot_rate_thb = input.pilotRateThb != null ? Number(input.pilotRateThb) : null
  if (input.pilotNotes !== undefined) updates.pilot_notes = input.pilotNotes
  if (input.revenueGlCode !== undefined) updates.revenue_gl_code = input.revenueGlCode
  if (input.costGlCode !== undefined) updates.cost_gl_code = input.costGlCode
  if (input.pnlCategory !== undefined) updates.pnl_category = input.pnlCategory
  if (input.costPnlCategory !== undefined) updates.cost_pnl_category = input.costPnlCategory
  if (input.costBasis !== undefined) updates.cost_basis = input.costBasis
  if (input.calcType !== undefined) updates.calc_type = input.calcType
  if (input.serviceGroup !== undefined) updates.service_group = input.serviceGroup
  if (input.subgroup !== undefined) updates.subgroup = input.subgroup
  if (input.providerType !== undefined) updates.provider_type = input.providerType
  if (input.quoteAllowed !== undefined) updates.quote_allowed = input.quoteAllowed
  if (input.priceStatus !== undefined) {
    updates.price_status = input.priceStatus
    updates.is_active = input.priceStatus !== "INACTIVE"
  }
  if (input.sourceVersion !== undefined) updates.source_version = input.sourceVersion
  if (input.effectiveDate !== undefined) updates.effective_date = input.effectiveDate
  if (input.updatedBy !== undefined) updates.updated_by = input.updatedBy
  if (input.approvedBy !== undefined) {
    updates.approved_by = input.approvedBy
    updates.approved_at = input.approvedBy ? new Date().toISOString() : null
  }
  if (input.description !== undefined) updates.description = input.description
  if (input.notes !== undefined) updates.notes = input.notes
  if (input.isActive !== undefined) updates.is_active = input.isActive

  const { data, error } = await supabase
    .from("pricing_master")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle()

  if (error) throw error
  return data ? mapPricing(data as PricingMasterRow) : null
}

export async function getPricingMasterHistory(id: string, limit = 50) {
  const supabase = createServerClient()
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  const { data, error } = await supabase
    .from("pricing_master_history")
    .select("id,pricing_master_id,action,before_data,after_data,changed_by,approved_by,source_version,created_at")
    .eq("pricing_master_id", id)
    .order("created_at", { ascending: false })
    .limit(safeLimit)

  if (error) throw error
  return data ?? []
}
