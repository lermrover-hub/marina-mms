-- Connect ramp operations to the service workflow and financial reporting.
-- Additive and idempotent: existing bookings, movements, and invoices are kept.

BEGIN;

ALTER TABLE public.mms_ramp_bookings
  ADD COLUMN IF NOT EXISTS service_request_id text,
  ADD COLUMN IF NOT EXISTS work_order_id text,
  ADD COLUMN IF NOT EXISTS quotation_id text,
  ADD COLUMN IF NOT EXISTS revenue_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_cost_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_account_code text DEFAULT '4100-RAMP',
  ADD COLUMN IF NOT EXISTS cost_account_code text DEFAULT '5100-RAMP',
  ADD COLUMN IF NOT EXISTS financial_status text NOT NULL DEFAULT 'ESTIMATED',
  ADD COLUMN IF NOT EXISTS invoice_id text;

ALTER TABLE public.mms_invoices
  ADD COLUMN IF NOT EXISTS ramp_booking_id text;

-- Rename the old operation code without deleting or recreating any record.
UPDATE public.mms_ramp_bookings
SET operation_type = 'HAUL_OUT'
WHERE operation_type = 'RETRIEVAL';

UPDATE public.mms_boat_movements
SET movement_type = 'HAUL_OUT'
WHERE movement_type = 'RETRIEVAL';

CREATE INDEX IF NOT EXISTS mms_ramp_bookings_service_request_idx
  ON public.mms_ramp_bookings(service_request_id);
CREATE INDEX IF NOT EXISTS mms_ramp_bookings_work_order_idx
  ON public.mms_ramp_bookings(work_order_id);
CREATE INDEX IF NOT EXISTS mms_ramp_bookings_quotation_idx
  ON public.mms_ramp_bookings(quotation_id);
CREATE INDEX IF NOT EXISTS mms_ramp_bookings_invoice_idx
  ON public.mms_ramp_bookings(invoice_id);
CREATE INDEX IF NOT EXISTS mms_invoices_ramp_booking_idx
  ON public.mms_invoices(ramp_booking_id);

NOTIFY pgrst, 'reload schema';

COMMIT;
