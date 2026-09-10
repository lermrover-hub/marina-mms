-- Inquiry submissions are accepted only through /api/inquiries, where the
-- application enforces validation and rate limiting with service_role.
-- Do not expose contact details through direct Data API grants or policies.

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can submit inquiry" ON public.inquiries;
DROP POLICY IF EXISTS "Staff can read inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Staff can update inquiries" ON public.inquiries;

REVOKE ALL ON TABLE public.inquiries FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS inquiries_assigned_to_idx
  ON public.inquiries (assigned_to);

COMMENT ON TABLE public.inquiries IS
  'Booking inquiries are server-only. Public submissions must use the validated, rate-limited application endpoint.';
