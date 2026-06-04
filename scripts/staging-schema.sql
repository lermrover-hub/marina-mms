-- Marina MMS Staging Schema
-- Generated from production information_schema (schema only, zero data)
-- Re-runnable: CREATE TABLE IF NOT EXISTS

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.mms_berth_assignments (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  berth_id text NOT NULL,
  boat_id text,
  customer_id text,
  boat_name text,
  customer_name text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'ACTIVE'::text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mms_berths (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  code text NOT NULL,
  berth_type text DEFAULT 'WET_BERTH'::text NOT NULL,
  max_loa_ft numeric,
  max_beam_ft numeric,
  status text DEFAULT 'AVAILABLE'::text NOT NULL,
  current_boat_id text,
  monthly_rate numeric,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  zone text,
  depth_m numeric,
  short_period_only boolean DEFAULT false,
  location_section text,
  max_loa_m numeric
);

CREATE TABLE IF NOT EXISTS public.mms_boat_movements (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  boat_id text NOT NULL,
  boat_name text,
  from_location text,
  to_location text,
  movement_type text DEFAULT 'MOVE'::text,
  operated_by text,
  notes text,
  moved_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mms_boats (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  owner_id text,
  owner_name text,
  name text NOT NULL,
  boat_type text DEFAULT 'MOTOR_YACHT'::text NOT NULL,
  usage_type text DEFAULT 'private'::text,
  brand text,
  model text,
  year_built integer,
  registration_number text,
  hin text,
  flag text DEFAULT 'Thailand'::text,
  loa_ft numeric,
  beam_ft numeric,
  draft_ft numeric,
  weight_t numeric,
  hull_material text,
  engine_type text,
  engine_brand text,
  num_engines integer DEFAULT 1,
  fuel_type text DEFAULT 'diesel'::text,
  trailer_required boolean DEFAULT false,
  insurance_expiry date,
  status text DEFAULT 'IN_WATER'::text NOT NULL,
  current_location_code text,
  special_handling text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mms_contracts (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  contract_number text NOT NULL,
  contract_type text NOT NULL,
  status text DEFAULT 'DRAFT'::text NOT NULL,
  customer_id text,
  customer_name text,
  boat_id text,
  boat_name text,
  berth_id text,
  berth_code text,
  start_date date NOT NULL,
  end_date date,
  auto_renew boolean DEFAULT false,
  renewal_notice_days integer DEFAULT 30,
  billing_cycle text DEFAULT 'MONTHLY'::text,
  rate_amount numeric,
  rate_currency text DEFAULT 'THB'::text,
  deposit_amount numeric,
  deposit_paid boolean DEFAULT false,
  deposit_paid_date date,
  terms_text text,
  special_conditions text,
  signed_by_customer boolean DEFAULT false,
  signed_by_marina boolean DEFAULT false,
  signed_date date,
  notes text,
  created_by text,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mms_customers (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  customer_type text DEFAULT 'PRIVATE_OWNER'::text NOT NULL,
  first_name text,
  last_name text,
  company_name text,
  nationality text,
  phone text,
  email text,
  address text,
  tax_id text,
  passport_id text,
  preferred_language text DEFAULT 'en'::text,
  payment_terms integer DEFAULT 30,
  credit_limit numeric,
  status text DEFAULT 'ACTIVE'::text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  line_user_id text,
  whatsapp_number text
);

CREATE TABLE IF NOT EXISTS public.mms_document_templates (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  template_type text NOT NULL,
  name text NOT NULL,
  language text DEFAULT 'TH/EN'::text NOT NULL,
  version text,
  file_name text,
  file_url text,
  file_size bigint,
  mime_type text,
  notes text,
  is_active boolean DEFAULT true NOT NULL,
  uploaded_by text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mms_incident_actions (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  incident_id text NOT NULL,
  action text NOT NULL,
  assigned_to text,
  due_date date,
  status text DEFAULT 'TODO'::text NOT NULL,
  notes text,
  created_by text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mms_incidents (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  incident_ref text DEFAULT ((('INC-'::text || to_char(now(), 'YYYY'::text)) || '-'::text) || lpad((floor(((random() * (9000)::double precision) + (1000)::double precision)))::text, 4, '0'::text)) NOT NULL,
  title text NOT NULL,
  incident_type text DEFAULT 'OTHER'::text NOT NULL,
  severity text DEFAULT 'LOW'::text NOT NULL,
  status text DEFAULT 'OPEN'::text NOT NULL,
  customer_id text,
  customer_name text,
  boat_id text,
  boat_name text,
  reported_by text,
  incident_date date DEFAULT CURRENT_DATE NOT NULL,
  location text,
  description text,
  action_taken text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mms_inventory_items (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  item_code text NOT NULL,
  name text NOT NULL,
  category text,
  unit text DEFAULT 'pc'::text NOT NULL,
  on_hand numeric DEFAULT 0,
  min_stock numeric DEFAULT 0,
  avg_cost numeric DEFAULT 0,
  selling_price numeric DEFAULT 0,
  supplier text,
  charge_to_customer boolean DEFAULT true,
  status text DEFAULT 'OK'::text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mms_invoice_items (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  invoice_id text NOT NULL,
  description text NOT NULL,
  category text DEFAULT 'SERVICE'::text,
  qty numeric DEFAULT 1,
  unit text DEFAULT 'job'::text,
  unit_price numeric NOT NULL,
  discount_pct numeric DEFAULT 0,
  taxable boolean DEFAULT true,
  line_total numeric,
  sort_order integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.mms_invoices (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  invoice_number text NOT NULL,
  customer_id text,
  customer_name text,
  boat_id text,
  boat_name text,
  quotation_id text,
  work_order_id text,
  invoice_date date DEFAULT CURRENT_DATE NOT NULL,
  due_date date,
  status text DEFAULT 'DRAFT'::text NOT NULL,
  subtotal numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  vat_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  outstanding_balance numeric,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  contract_id text,
  billing_period text,
  invoice_type text DEFAULT 'MANUAL'::text
);

CREATE TABLE IF NOT EXISTS public.mms_material_usage (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid NOT NULL,
  item_name text NOT NULL,
  description text,
  quantity numeric DEFAULT 1 NOT NULL,
  unit text DEFAULT 'pcs'::text,
  unit_cost numeric DEFAULT 0 NOT NULL,
  total_cost numeric DEFAULT 0 NOT NULL,
  supplier text,
  charge_to_customer boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mms_messages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  channel text NOT NULL,
  direction text NOT NULL,
  sender_id text NOT NULL,
  customer_id text,
  message_type text DEFAULT 'text'::text NOT NULL,
  content text NOT NULL,
  raw_payload jsonb,
  read boolean DEFAULT false NOT NULL,
  replied boolean DEFAULT false NOT NULL,
  reply_token text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mms_notifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  type text DEFAULT 'info'::text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  customer_id uuid,
  reference_id text,
  priority text DEFAULT 'MEDIUM'::text NOT NULL,
  read boolean DEFAULT false NOT NULL,
  link text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mms_payments (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  invoice_id text NOT NULL,
  customer_id text,
  customer_name text,
  payment_method text DEFAULT 'BANK_TRANSFER'::text NOT NULL,
  amount numeric NOT NULL,
  payment_date date DEFAULT CURRENT_DATE NOT NULL,
  reference_no text,
  slip_url text,
  status text DEFAULT 'CONFIRMED'::text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mms_purchase_request_items (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  purchase_request_id text NOT NULL,
  item_name text NOT NULL,
  description text,
  qty numeric DEFAULT 1 NOT NULL,
  unit text DEFAULT 'pcs'::text,
  estimated_cost numeric DEFAULT 0,
  line_total numeric,
  sort_order integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.mms_purchase_requests (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  pr_number text DEFAULT ((('PR-'::text || to_char(now(), 'YYYY'::text)) || '-'::text) || lpad((floor(((random() * (9000)::double precision) + (1000)::double precision)))::text, 4, '0'::text)) NOT NULL,
  requested_by text,
  department text,
  work_order_id text,
  status text DEFAULT 'DRAFT'::text NOT NULL,
  priority text DEFAULT 'NORMAL'::text NOT NULL,
  needed_by date,
  supplier text,
  notes text,
  total_amount numeric DEFAULT 0,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mms_quotation_items (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  quotation_id text NOT NULL,
  description text NOT NULL,
  qty numeric DEFAULT 1,
  unit text DEFAULT 'job'::text,
  unit_price numeric NOT NULL,
  discount_pct numeric DEFAULT 0,
  taxable boolean DEFAULT true,
  line_total numeric,
  sort_order integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.mms_quotations (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  quote_number text NOT NULL,
  customer_id text,
  customer_name text,
  boat_id text,
  boat_name text,
  sr_id text,
  title text,
  status text DEFAULT 'DRAFT'::text NOT NULL,
  subtotal numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  vat_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  deposit_amount numeric DEFAULT 0,
  valid_until date,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mms_ramp_bookings (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  reference text DEFAULT ((('RB-'::text || to_char(now(), 'YYYY'::text)) || '-'::text) || lpad((floor(((random() * (9000)::double precision) + (1000)::double precision)))::text, 4, '0'::text)) NOT NULL,
  customer_id text,
  customer_name text,
  boat_id text,
  boat_name text,
  operation_type text DEFAULT 'LAUNCH'::text NOT NULL,
  requested_date date NOT NULL,
  requested_time time without time zone,
  confirmed_time time without time zone,
  boat_draft_ft numeric,
  trailer_height_ft numeric DEFAULT 2.0,
  safety_clearance_ft numeric DEFAULT 1.0,
  required_tide_m numeric,
  assigned_staff text,
  status text DEFAULT 'REQUESTED'::text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mms_service_requests (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  reference text NOT NULL,
  customer_id text,
  customer_name text,
  boat_id text,
  boat_name text,
  category text DEFAULT 'OTHER'::text NOT NULL,
  title text NOT NULL,
  description text,
  priority text DEFAULT 'MEDIUM'::text NOT NULL,
  status text DEFAULT 'NEW_REQUEST'::text NOT NULL,
  assigned_to text,
  requested_date timestamptz,
  scheduled_date timestamptz,
  completed_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mms_staff (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  name text NOT NULL,
  role text DEFAULT 'TECHNICIAN'::text NOT NULL,
  specialty text,
  phone text,
  email text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  department text,
  hire_date date,
  phone2 text
);

CREATE TABLE IF NOT EXISTS public.mms_utility_readings (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  berth_id text,
  berth_code text,
  boat_id text,
  boat_name text,
  customer_id text,
  customer_name text,
  contract_id text,
  reading_date date DEFAULT CURRENT_DATE NOT NULL,
  utility_type text NOT NULL,
  meter_id text,
  previous_reading numeric DEFAULT 0 NOT NULL,
  current_reading numeric DEFAULT 0 NOT NULL,
  units_used numeric,
  unit_price numeric DEFAULT 0 NOT NULL,
  amount numeric,
  currency text DEFAULT 'THB'::text NOT NULL,
  billed boolean DEFAULT false NOT NULL,
  invoice_id text,
  notes text,
  recorded_by text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mms_work_order_tasks (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  work_order_id text NOT NULL,
  title text NOT NULL,
  description text,
  category text,
  assigned_to text,
  status text DEFAULT 'TODO'::text NOT NULL,
  priority text DEFAULT 'NORMAL'::text NOT NULL,
  estimated_hours numeric,
  actual_hours numeric,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mms_work_orders (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  reference text NOT NULL,
  sr_id text,
  quotation_id text,
  customer_id text,
  customer_name text,
  boat_id text,
  boat_name text,
  title text NOT NULL,
  category text DEFAULT 'OTHER'::text,
  status text DEFAULT 'NEW_REQUEST'::text NOT NULL,
  priority text DEFAULT 'MEDIUM'::text,
  start_date date,
  estimated_end_date date,
  actual_end_date date,
  assigned_to text,
  contractor_name text,
  total_revenue numeric DEFAULT 0,
  total_labor_cost numeric DEFAULT 0,
  total_material_cost numeric DEFAULT 0,
  total_contractor_cost numeric DEFAULT 0,
  progress_percent integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pricing_master (
  id text NOT NULL,
  code text NOT NULL,
  service_name_en text NOT NULL,
  service_name_th text,
  category text NOT NULL,
  unit text NOT NULL,
  rate_thb numeric NOT NULL,
  description text,
  notes text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

