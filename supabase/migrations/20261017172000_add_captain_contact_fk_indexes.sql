-- Supporting indexes for Captain / Operational Contact foreign-key lookups.
-- These are non-destructive and do not change the service workflow or access policy.

CREATE INDEX IF NOT EXISTS mms_boat_captain_history_contact_idx
  ON public.mms_boat_captain_history (captain_contact_id);

CREATE INDEX IF NOT EXISTS mms_service_requests_operational_contact_idx
  ON public.mms_service_requests (operational_contact_id);
