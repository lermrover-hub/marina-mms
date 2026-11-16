BEGIN;

ALTER TABLE public.mms_service_requests
  ADD COLUMN IF NOT EXISTS tow_in_date date,
  ADD COLUMN IF NOT EXISTS tow_out_date date;

ALTER TABLE public.mms_service_requests
  DROP CONSTRAINT IF EXISTS mms_service_requests_ramp_plan_check,
  ADD CONSTRAINT mms_service_requests_ramp_plan_check CHECK (
    ramp_operation_plan IS NULL OR ramp_operation_plan IN (
      'HAUL_OUT_AND_LAUNCH_CONFIRMED',
      'HAUL_OUT_CONFIRMED_LAUNCH_OPEN',
      'HAUL_OUT_AND_TOW_OUT_CONFIRMED',
      'TOW_IN_AND_LAUNCH_CONFIRMED',
      'TOW_IN_AND_TOW_OUT_CONFIRMED',
      'TOW_IN_CONFIRMED_EXIT_OPEN'
    )
  );

COMMENT ON COLUMN public.mms_service_requests.tow_in_date IS
  'Confirmed date the vessel arrives by road tow/trailer instead of marina haul-out.';

COMMENT ON COLUMN public.mms_service_requests.tow_out_date IS
  'Confirmed date the vessel leaves by road tow/trailer instead of marina launch.';

NOTIFY pgrst, 'reload schema';

COMMIT;
