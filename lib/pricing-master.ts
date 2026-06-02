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
  description?: string | null
  notes?: string | null
}

interface PricingMasterUpdate {
  serviceNameEn?: string
  serviceNameTh?: string | null
  category?: string
  unit?: string
  rateThb?: number | string
  description?: string | null
  notes?: string | null
  isActive?: boolean
}

function mapPricing(row: PricingMasterRow) {
  return {
    id: row.id,
    code: row.code,
    serviceNameEn: row.service_name_en,
    serviceNameTh: row.service_name_th,
    category: row.category,
    unit: row.unit,
    rateThb: Number(row.rate_thb),
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
      description: input.description ?? null,
      notes: input.notes ?? null,
      is_active: true,
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
