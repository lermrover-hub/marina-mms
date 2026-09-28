BEGIN;

ALTER TABLE public.mms_ramp_bookings
  ADD COLUMN IF NOT EXISTS service_request_id text,
  ADD COLUMN IF NOT EXISTS quotation_id text;

CREATE INDEX IF NOT EXISTS mms_ramp_bookings_service_request_idx
  ON public.mms_ramp_bookings(service_request_id)
  WHERE service_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS mms_ramp_bookings_quotation_idx
  ON public.mms_ramp_bookings(quotation_id)
  WHERE quotation_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'mms_ramp_bookings_service_request_fk'
      AND conrelid = 'public.mms_ramp_bookings'::regclass
  ) THEN
    ALTER TABLE public.mms_ramp_bookings
      ADD CONSTRAINT mms_ramp_bookings_service_request_fk
      FOREIGN KEY (service_request_id)
      REFERENCES public.mms_service_requests(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'mms_ramp_bookings_quotation_fk'
      AND conrelid = 'public.mms_ramp_bookings'::regclass
  ) THEN
    ALTER TABLE public.mms_ramp_bookings
      ADD CONSTRAINT mms_ramp_bookings_quotation_fk
      FOREIGN KEY (quotation_id)
      REFERENCES public.mms_quotations(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END
$$;

COMMENT ON COLUMN public.mms_ramp_bookings.service_request_id IS
  'Parent Service Request that scheduled this operational ramp movement.';

COMMENT ON COLUMN public.mms_ramp_bookings.quotation_id IS
  'Approved commercial quotation that owns pricing for this ramp movement.';

NOTIFY pgrst, 'reload schema';

COMMIT;
