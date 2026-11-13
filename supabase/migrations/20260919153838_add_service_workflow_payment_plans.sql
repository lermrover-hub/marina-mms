BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE public.mms_service_requests
  ADD COLUMN IF NOT EXISTS request_type text,
  ADD COLUMN IF NOT EXISTS ramp_operation_plan text,
  ADD COLUMN IF NOT EXISTS confirmed_haul_out_date date,
  ADD COLUMN IF NOT EXISTS confirmed_launch_date date,
  ADD COLUMN IF NOT EXISTS service_type text,
  ADD COLUMN IF NOT EXISTS storage_period text,
  ADD COLUMN IF NOT EXISTS operator_type text,
  ADD COLUMN IF NOT EXISTS insurance_status text NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN IF NOT EXISTS subcontractor_trade text,
  ADD COLUMN IF NOT EXISTS contractor_cost numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS markup_pct numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'FULL_PREPAYMENT',
  ADD COLUMN IF NOT EXISTS payment_gate_status text NOT NULL DEFAULT 'AWAITING_PAYMENT',
  ADD COLUMN IF NOT EXISTS service_order_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS quotation_id text;

ALTER TABLE public.mms_quotations
  ADD COLUMN IF NOT EXISTS required_approver_role text NOT NULL DEFAULT 'MANAGER',
  ADD COLUMN IF NOT EXISTS max_discount_pct numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_no_charge_line boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'FULL_PREPAYMENT';

ALTER TABLE public.mms_quotations
  DROP CONSTRAINT IF EXISTS mms_quotations_required_approver_check,
  ADD CONSTRAINT mms_quotations_required_approver_check CHECK (
    required_approver_role IN ('MANAGER', 'GENERAL_MANAGER')
  ),
  DROP CONSTRAINT IF EXISTS mms_quotations_payment_mode_check,
  ADD CONSTRAINT mms_quotations_payment_mode_check CHECK (
    payment_mode IN ('FULL_PREPAYMENT', 'DEPOSIT', 'CREDIT')
  );

ALTER TABLE public.mms_service_requests
  DROP CONSTRAINT IF EXISTS mms_service_requests_request_type_check,
  ADD CONSTRAINT mms_service_requests_request_type_check CHECK (
    request_type IS NULL OR request_type IN ('RAMP_SERVICE', 'SERVICE_TYPE')
  ),
  DROP CONSTRAINT IF EXISTS mms_service_requests_ramp_plan_check,
  ADD CONSTRAINT mms_service_requests_ramp_plan_check CHECK (
    ramp_operation_plan IS NULL OR ramp_operation_plan IN (
      'HAUL_OUT_AND_LAUNCH_CONFIRMED', 'HAUL_OUT_CONFIRMED_LAUNCH_OPEN'
    )
  ),
  DROP CONSTRAINT IF EXISTS mms_service_requests_service_type_check,
  ADD CONSTRAINT mms_service_requests_service_type_check CHECK (
    service_type IS NULL OR service_type IN ('STORAGE', 'YARD_SERVICE')
  ),
  DROP CONSTRAINT IF EXISTS mms_service_requests_storage_period_check,
  ADD CONSTRAINT mms_service_requests_storage_period_check CHECK (
    storage_period IS NULL OR storage_period IN ('DAILY', 'WEEKLY', 'MONTHLY')
  ),
  DROP CONSTRAINT IF EXISTS mms_service_requests_operator_type_check,
  ADD CONSTRAINT mms_service_requests_operator_type_check CHECK (
    operator_type IS NULL OR operator_type IN (
      'OCEAN_ROVER', 'BOAT_OWNER_CONTRACTOR', 'OCEAN_ROVER_SUBCONTRACTOR'
    )
  ),
  DROP CONSTRAINT IF EXISTS mms_service_requests_insurance_status_check,
  ADD CONSTRAINT mms_service_requests_insurance_status_check CHECK (
    insurance_status IN ('NOT_REQUIRED', 'REQUESTED', 'VERIFIED', 'EXPIRED')
  ),
  DROP CONSTRAINT IF EXISTS mms_service_requests_payment_mode_check,
  ADD CONSTRAINT mms_service_requests_payment_mode_check CHECK (
    payment_mode IN ('FULL_PREPAYMENT', 'DEPOSIT', 'CREDIT')
  ),
  DROP CONSTRAINT IF EXISTS mms_service_requests_payment_gate_check,
  ADD CONSTRAINT mms_service_requests_payment_gate_check CHECK (
    payment_gate_status IN (
      'AWAITING_PAYMENT', 'DEPOSIT_PAID', 'PAID', 'CREDIT_APPROVED',
      'OVERDUE', 'CREDIT_HOLD', 'CANCELLED'
    )
  ),
  DROP CONSTRAINT IF EXISTS mms_service_requests_cost_nonnegative_check,
  ADD CONSTRAINT mms_service_requests_cost_nonnegative_check CHECK (
    contractor_cost >= 0 AND markup_pct >= 0 AND markup_pct <= 100
  );

CREATE TABLE IF NOT EXISTS public.mms_service_request_items (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  service_request_id text NOT NULL REFERENCES public.mms_service_requests(id) ON DELETE CASCADE,
  pricing_master_id text,
  pricing_code text,
  description text NOT NULL,
  service_group text NOT NULL,
  operator_type text NOT NULL,
  qty numeric(14,3) NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit text NOT NULL DEFAULT 'item',
  unit_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  direct_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (direct_cost >= 0),
  markup_pct numeric(6,2) NOT NULL DEFAULT 0 CHECK (markup_pct >= 0 AND markup_pct <= 100),
  discount_pct numeric(6,2) NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100),
  insurance_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mms_service_request_items_operator_check CHECK (
    operator_type IN ('OCEAN_ROVER', 'BOAT_OWNER_CONTRACTOR', 'OCEAN_ROVER_SUBCONTRACTOR')
  ),
  CONSTRAINT mms_service_request_items_discount_scope_check CHECK (
    operator_type = 'OCEAN_ROVER' OR discount_pct = 0
  )
);

CREATE INDEX IF NOT EXISTS mms_service_request_items_request_idx
  ON public.mms_service_request_items(service_request_id, sort_order);

CREATE TABLE IF NOT EXISTS public.mms_service_payment_plans (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  service_request_id text NOT NULL UNIQUE REFERENCES public.mms_service_requests(id) ON DELETE CASCADE,
  quotation_id text REFERENCES public.mms_quotations(id) ON DELETE SET NULL,
  invoice_id text REFERENCES public.mms_invoices(id) ON DELETE SET NULL,
  customer_id text,
  boat_id text,
  payment_mode text NOT NULL,
  status text NOT NULL DEFAULT 'AWAITING_PAYMENT',
  total_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  deposit_pct numeric(6,2) NOT NULL DEFAULT 0 CHECK (deposit_pct >= 0 AND deposit_pct <= 100),
  deposit_required_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (deposit_required_amount >= 0),
  committed_cost_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (committed_cost_amount >= 0),
  paid_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  yard_start_date date,
  launch_date date,
  first_cycle_due_date date,
  next_reminder_at timestamptz,
  last_reminder_at timestamptz,
  reminder_count integer NOT NULL DEFAULT 0,
  good_credit_customer boolean NOT NULL DEFAULT false,
  credit_limit_snapshot numeric(14,2),
  credit_approved_by text,
  credit_approved_at timestamptz,
  credit_expires_at timestamptz,
  post_launch_due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mms_service_payment_plans_mode_check CHECK (
    payment_mode IN ('FULL_PREPAYMENT', 'DEPOSIT', 'CREDIT')
  ),
  CONSTRAINT mms_service_payment_plans_status_check CHECK (
    status IN ('AWAITING_PAYMENT', 'DEPOSIT_PAID', 'PAID', 'CREDIT_APPROVED',
      'OVERDUE', 'CREDIT_HOLD', 'CANCELLED')
  ),
  CONSTRAINT mms_service_payment_plans_amount_check CHECK (
    deposit_required_amount <= total_amount AND paid_amount <= total_amount
  )
);

CREATE INDEX IF NOT EXISTS mms_service_payment_plans_quotation_idx
  ON public.mms_service_payment_plans(quotation_id)
  WHERE quotation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS mms_service_payment_plans_invoice_idx
  ON public.mms_service_payment_plans(invoice_id)
  WHERE invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS mms_service_payment_plans_reminder_idx
  ON public.mms_service_payment_plans(next_reminder_at)
  WHERE next_reminder_at IS NOT NULL AND status NOT IN ('PAID', 'CANCELLED');

ALTER TABLE public.mms_service_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mms_service_request_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mms_service_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mms_service_payment_plans FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.mms_service_request_items FROM anon, authenticated;
REVOKE ALL ON public.mms_service_payment_plans FROM anon, authenticated;
GRANT ALL ON public.mms_service_request_items TO service_role;
GRANT ALL ON public.mms_service_payment_plans TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
