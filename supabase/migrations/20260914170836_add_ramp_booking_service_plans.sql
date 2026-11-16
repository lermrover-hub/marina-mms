BEGIN;

ALTER TABLE public.mms_ramp_bookings
  ADD COLUMN IF NOT EXISTS service_category text,
  ADD COLUMN IF NOT EXISTS service_option text,
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS recurring_billing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS next_billing_date date,
  ADD COLUMN IF NOT EXISTS pricing_adjustment_type text NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS pricing_adjustment_pct numeric(6,2) NOT NULL DEFAULT 0;

ALTER TABLE public.mms_ramp_bookings
  DROP CONSTRAINT IF EXISTS mms_ramp_bookings_service_category_check,
  ADD CONSTRAINT mms_ramp_bookings_service_category_check
    CHECK (service_category IS NULL OR service_category IN ('BOAT_STORAGE', 'HARDSTAND_SERVICE')),
  DROP CONSTRAINT IF EXISTS mms_ramp_bookings_service_option_check,
  ADD CONSTRAINT mms_ramp_bookings_service_option_check
    CHECK (service_option IS NULL OR service_option IN (
      'STORAGE_DAILY', 'STORAGE_WEEKLY', 'STORAGE_MONTHLY',
      'OWNER_CONTRACTOR', 'MARINA_SUBCONTRACTOR', 'TURNKEY_PROJECT'
    )),
  DROP CONSTRAINT IF EXISTS mms_ramp_bookings_billing_cycle_check,
  ADD CONSTRAINT mms_ramp_bookings_billing_cycle_check
    CHECK (billing_cycle IS NULL OR billing_cycle IN ('DAILY', 'WEEKLY', 'MONTHLY', 'ONE_TIME')),
  DROP CONSTRAINT IF EXISTS mms_ramp_bookings_pricing_adjustment_type_check,
  ADD CONSTRAINT mms_ramp_bookings_pricing_adjustment_type_check
    CHECK (pricing_adjustment_type IN ('NONE', 'SUBCONTRACTOR_MARKUP', 'PROJECT_OVERHEAD')),
  DROP CONSTRAINT IF EXISTS mms_ramp_bookings_pricing_adjustment_pct_check,
  ADD CONSTRAINT mms_ramp_bookings_pricing_adjustment_pct_check
    CHECK (pricing_adjustment_pct >= 0 AND pricing_adjustment_pct <= 100),
  DROP CONSTRAINT IF EXISTS mms_ramp_bookings_service_plan_consistency_check,
  ADD CONSTRAINT mms_ramp_bookings_service_plan_consistency_check
    CHECK (
      service_category IS NULL
      OR (service_category = 'BOAT_STORAGE' AND service_option IN ('STORAGE_DAILY', 'STORAGE_WEEKLY', 'STORAGE_MONTHLY'))
      OR (service_category = 'HARDSTAND_SERVICE' AND service_option IN ('OWNER_CONTRACTOR', 'MARINA_SUBCONTRACTOR', 'TURNKEY_PROJECT'))
    );

CREATE INDEX IF NOT EXISTS mms_ramp_bookings_next_billing_idx
  ON public.mms_ramp_bookings(next_billing_date)
  WHERE recurring_billing = true AND next_billing_date IS NOT NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;
