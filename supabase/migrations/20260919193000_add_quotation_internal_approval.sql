BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE public.mms_quotations
  ADD COLUMN IF NOT EXISTS internal_approval_status text NOT NULL DEFAULT 'NOT_SUBMITTED',
  ADD COLUMN IF NOT EXISTS internal_approved_by text,
  ADD COLUMN IF NOT EXISTS internal_approval_role text,
  ADD COLUMN IF NOT EXISTS internal_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_sent_at timestamptz;

ALTER TABLE public.mms_quotations
  DROP CONSTRAINT IF EXISTS mms_quotations_internal_approval_status_check,
  ADD CONSTRAINT mms_quotations_internal_approval_status_check CHECK (
    internal_approval_status IN ('NOT_SUBMITTED', 'PENDING', 'APPROVED')
  );

CREATE INDEX IF NOT EXISTS mms_quotations_internal_approval_status_idx
  ON public.mms_quotations (internal_approval_status, updated_at DESC);

COMMENT ON COLUMN public.mms_quotations.internal_approval_status IS
  'Internal quotation gate: NOT_SUBMITTED, PENDING, or APPROVED. Customer acceptance remains in status.';

ALTER TABLE IF EXISTS public.mms_notifications
  ADD COLUMN IF NOT EXISTS target_role text;

CREATE INDEX IF NOT EXISTS mms_notifications_target_role_read_idx
  ON public.mms_notifications (target_role, read, created_at DESC);

NOTIFY pgrst, 'reload schema';
COMMIT;
