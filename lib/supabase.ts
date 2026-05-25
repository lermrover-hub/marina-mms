import { createClient } from "@supabase/supabase-js"

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// ── Type helpers ──────────────────────────────────────────────────────────────
export type Customer = {
  id: string
  customer_type: string
  first_name: string | null
  last_name: string | null
  company_name: string | null
  nationality: string | null
  phone: string | null
  email: string | null
  address: string | null
  tax_id: string | null
  passport_id: string | null
  preferred_language: string | null
  payment_terms: number | null
  credit_limit: number | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type Boat = {
  id: string
  owner_id: string | null
  owner_name: string | null
  name: string
  boat_type: string
  usage_type: string | null
  brand: string | null
  model: string | null
  year_built: number | null
  registration_number: string | null
  hin: string | null
  flag: string | null
  loa_ft: number | null
  beam_ft: number | null
  draft_ft: number | null
  weight_t: number | null
  hull_material: string | null
  engine_type: string | null
  engine_brand: string | null
  num_engines: number | null
  fuel_type: string | null
  insurance_expiry: string | null
  status: string
  current_location_code: string | null
  special_handling: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Berth = {
  id: string
  code: string
  berth_type: string
  zone: string | null
  location_section: string | null
  max_loa_ft: number | null
  max_loa_m: number | null
  max_beam_ft: number | null
  depth_m: number | null
  short_period_only: boolean
  status: string
  current_boat_id: string | null
  monthly_rate: number | null
  notes: string | null
  created_at: string
}

export type ServiceRequest = {
  id: string
  reference: string
  customer_id: string | null
  customer_name: string | null
  boat_id: string | null
  boat_name: string | null
  category: string
  title: string
  description: string | null
  priority: string
  status: string
  assigned_to: string | null
  requested_date: string | null
  scheduled_date: string | null
  completed_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Quotation = {
  id: string
  quote_number: string
  customer_id: string | null
  customer_name: string | null
  boat_id: string | null
  boat_name: string | null
  title: string | null
  status: string
  subtotal: number
  discount: number
  vat_amount: number
  total_amount: number
  deposit_amount: number
  valid_until: string | null
  notes: string | null
  // Digital signature fields (optional — columns may not exist in all DB versions)
  signature_data?: string | null
  approved_by_name?: string | null
  approved_at?: string | null
  created_at: string
  updated_at: string
}

export type WorkOrder = {
  id: string
  reference: string
  customer_id: string | null
  customer_name: string | null
  boat_id: string | null
  boat_name: string | null
  title: string
  category: string | null
  status: string
  priority: string
  start_date: string | null
  estimated_end_date: string | null
  actual_end_date: string | null
  assigned_to: string | null
  contractor_name: string | null
  total_revenue: number
  total_labor_cost: number
  total_material_cost: number
  total_contractor_cost: number
  progress_percent: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type Invoice = {
  id: string
  invoice_number: string
  invoice_type: string | null
  contract_id: string | null
  billing_period: string | null
  customer_id: string | null
  customer_name: string | null
  boat_id: string | null
  boat_name: string | null
  quotation_id: string | null
  work_order_id: string | null
  invoice_date: string
  due_date: string | null
  status: string
  subtotal: number
  discount: number | null
  vat_amount: number
  total_amount: number
  paid_amount: number
  outstanding_balance: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type Payment = {
  id: string
  invoice_id: string
  customer_id: string | null
  customer_name: string | null
  payment_method: string
  amount: number
  payment_date: string
  reference_no: string | null
  status: string
  notes: string | null
  created_at: string
}

export type Staff = {
  id: string
  name: string
  role: string
  specialty: string | null
  phone: string | null
  email: string | null
  active: boolean
  department: string | null
  hire_date: string | null
  created_at: string
}

export type InventoryItem = {
  id: string
  item_code: string
  name: string
  category: string | null
  unit: string
  on_hand: number
  min_stock: number
  avg_cost: number
  selling_price: number
  supplier: string | null
  charge_to_customer: boolean
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type BerthAssignment = {
  id: string
  berth_id: string
  boat_id: string | null
  customer_id: string | null
  boat_name: string | null
  customer_name: string | null
  start_date: string
  end_date: string
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type MaterialUsage = {
  id: string
  work_order_id: string
  item_name: string
  description: string | null
  quantity: number
  unit: string
  unit_cost: number
  total_cost: number
  supplier: string | null
  charge_to_customer: boolean
  created_at: string
  updated_at: string
}

export type InvoiceItem = {
  id: string
  invoice_id: string
  description: string
  category: string | null
  qty: number
  unit: string | null
  unit_price: number
  discount_pct: number
  taxable: boolean
  line_total: number
  sort_order: number | null
}

export type QuotationItem = {
  id: string
  quotation_id: string
  description: string
  qty: number
  unit: string | null
  unit_price: number
  discount_pct: number
  taxable: boolean
  line_total: number
  sort_order: number | null
}

export type WorkOrderTask = {
  id: string
  work_order_id: string
  title: string
  description: string | null
  category: string | null
  assigned_to: string | null
  status: string
  priority: string
  estimated_hours: number | null
  actual_hours: number | null
  started_at: string | null
  completed_at: string | null
  notes: string | null
  sort_order: number | null
  created_at: string
  updated_at: string
}

export type RampBooking = {
  id: string
  reference: string
  customer_id: string | null
  customer_name: string | null
  boat_id: string | null
  boat_name: string | null
  operation_type: string
  requested_date: string
  requested_time: string | null
  confirmed_time: string | null
  boat_draft_ft: number | null
  trailer_height_ft: number | null
  safety_clearance_ft: number | null
  required_tide_m: number | null
  assigned_staff: string | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type Incident = {
  id: string
  incident_ref: string
  title: string
  incident_type: string
  severity: string
  status: string
  customer_id: string | null
  customer_name: string | null
  boat_id: string | null
  boat_name: string | null
  reported_by: string | null
  incident_date: string
  location: string | null
  description: string | null
  action_taken: string | null
  created_at: string
  updated_at: string
}

export type IncidentAction = {
  id: string
  incident_id: string
  action: string
  assigned_to: string | null
  due_date: string | null
  status: string
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type BoatMovement = {
  id: string
  boat_id: string | null
  boat_name: string | null
  from_location: string | null
  to_location: string
  movement_type: string
  operated_by: string | null
  notes: string | null
  moved_at: string
}

export type PurchaseRequest = {
  id: string
  pr_number: string
  requested_by: string | null
  department: string | null
  work_order_id: string | null
  status: string
  priority: string
  needed_by: string | null
  supplier: string | null
  notes: string | null
  total_amount: number | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export type DocumentTemplate = {
  id: string
  template_type: string
  name: string
  language: string
  version: string | null
  file_name: string | null
  file_url: string | null
  file_size: number | null
  mime_type: string | null
  notes: string | null
  is_active: boolean
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export type Contract = {
  id: string
  contract_number: string
  contract_type: string
  status: string
  customer_id: string | null
  customer_name: string | null
  boat_id: string | null
  boat_name: string | null
  berth_id: string | null
  berth_code: string | null
  start_date: string
  end_date: string | null
  auto_renew: boolean
  renewal_notice_days: number
  billing_cycle: string
  rate_amount: number | null
  rate_currency: string
  deposit_amount: number | null
  deposit_paid: boolean
  deposit_paid_date: string | null
  terms_text: string | null
  special_conditions: string | null
  signed_by_customer: boolean
  signed_by_marina: boolean
  signed_date: string | null
  notes: string | null
  created_by: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}
