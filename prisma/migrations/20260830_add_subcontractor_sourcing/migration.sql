-- Connect external contractor sourcing to the service workflow.
-- Additive and idempotent: existing service requests, work orders, and quotes remain.

BEGIN;

ALTER TABLE public.mms_service_requests
  ADD COLUMN IF NOT EXISTS execution_type text NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN IF NOT EXISTS subcontractor_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS budget_min numeric(14,2),
  ADD COLUMN IF NOT EXISTS budget_max numeric(14,2),
  ADD COLUMN IF NOT EXISTS procurement_status text NOT NULL DEFAULT 'NOT_REQUIRED';

ALTER TABLE public.mms_work_orders
  ADD COLUMN IF NOT EXISTS service_request_id text,
  ADD COLUMN IF NOT EXISTS execution_type text NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN IF NOT EXISTS subcontractor_id text,
  ADD COLUMN IF NOT EXISTS subcontractor_quote_id text;

ALTER TABLE public.mms_quotations
  ADD COLUMN IF NOT EXISTS work_order_id text,
  ADD COLUMN IF NOT EXISTS execution_type text NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN IF NOT EXISTS contractor_cost_estimate numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contractor_markup_pct numeric(6,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.mms_subcontractors (
  id text DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  name text NOT NULL,
  tax_id text,
  specialties text,
  contact_name text,
  phone text,
  email text,
  payment_terms text,
  rating numeric(3,2),
  status text NOT NULL DEFAULT 'ACTIVE',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mms_subcontractor_quotes (
  id text DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  quote_reference text NOT NULL,
  service_request_id text NOT NULL,
  work_order_id text,
  subcontractor_id text,
  subcontractor_name text NOT NULL,
  scope text NOT NULL,
  quoted_amount numeric(14,2) NOT NULL DEFAULT 0,
  vat_amount numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  lead_time_days integer,
  warranty_months integer,
  payment_terms text,
  valid_until date,
  status text NOT NULL DEFAULT 'RECEIVED',
  cost_approved_by text,
  cost_approved_at timestamptz,
  contractor_po_number text,
  contractor_po_issued_at timestamptz,
  notes text,
  received_at timestamptz NOT NULL DEFAULT now(),
  selected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS mms_subcontractors_name_key
  ON public.mms_subcontractors (lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS mms_subcontractor_quotes_reference_key
  ON public.mms_subcontractor_quotes (quote_reference);
CREATE INDEX IF NOT EXISTS mms_subcontractor_quotes_service_request_idx
  ON public.mms_subcontractor_quotes (service_request_id, status);
CREATE INDEX IF NOT EXISTS mms_subcontractor_quotes_work_order_idx
  ON public.mms_subcontractor_quotes (work_order_id);
CREATE INDEX IF NOT EXISTS mms_work_orders_service_request_idx
  ON public.mms_work_orders (service_request_id);
CREATE INDEX IF NOT EXISTS mms_quotations_work_order_idx
  ON public.mms_quotations (work_order_id);

NOTIFY pgrst, 'reload schema';

COMMIT;
