BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE TABLE public.mms_customer_contacts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id text NOT NULL REFERENCES public.mms_customers(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (btrim(full_name) <> ''),
  role_title text NOT NULL DEFAULT 'CAPTAIN',
  phone text,
  email text,
  line_id text,
  whatsapp_number text,
  preferred_channel text NOT NULL DEFAULT 'PHONE',
  operational_notifications boolean NOT NULL DEFAULT false,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mms_customer_contacts_channel_check CHECK (
    preferred_channel IN ('PHONE', 'LINE', 'WHATSAPP', 'EMAIL')
  )
);

CREATE INDEX mms_customer_contacts_customer_idx
  ON public.mms_customer_contacts(customer_id, is_active, full_name);

ALTER TABLE public.mms_boats
  ADD COLUMN captain_contact_id text REFERENCES public.mms_customer_contacts(id) ON DELETE SET NULL,
  ADD COLUMN captain_effective_from date,
  ADD COLUMN captain_effective_to date,
  ADD CONSTRAINT mms_boats_captain_dates_check CHECK (
    captain_effective_to IS NULL OR captain_effective_from IS NULL OR captain_effective_to >= captain_effective_from
  );

CREATE INDEX mms_boats_captain_contact_idx
  ON public.mms_boats(captain_contact_id)
  WHERE captain_contact_id IS NOT NULL;

CREATE TABLE public.mms_boat_captain_history (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  boat_id text NOT NULL REFERENCES public.mms_boats(id) ON DELETE CASCADE,
  captain_contact_id text REFERENCES public.mms_customer_contacts(id) ON DELETE SET NULL,
  effective_from date,
  effective_to date,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mms_boat_captain_history_boat_idx
  ON public.mms_boat_captain_history(boat_id, recorded_at DESC);

CREATE OR REPLACE FUNCTION public.mms_record_boat_captain_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.captain_contact_id IS NOT NULL THEN
      INSERT INTO public.mms_boat_captain_history (
        boat_id, captain_contact_id, effective_from, effective_to
      ) VALUES (
        NEW.id, NEW.captain_contact_id, NEW.captain_effective_from, NEW.captain_effective_to
      );
    END IF;
  ELSIF NEW.captain_contact_id IS DISTINCT FROM OLD.captain_contact_id
     OR NEW.captain_effective_from IS DISTINCT FROM OLD.captain_effective_from
     OR NEW.captain_effective_to IS DISTINCT FROM OLD.captain_effective_to THEN
    INSERT INTO public.mms_boat_captain_history (
      boat_id, captain_contact_id, effective_from, effective_to
    ) VALUES (
      NEW.id, NEW.captain_contact_id, NEW.captain_effective_from, NEW.captain_effective_to
    );
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.mms_record_boat_captain_history() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mms_record_boat_captain_history() TO service_role;

CREATE TRIGGER mms_boats_record_captain_history
AFTER INSERT OR UPDATE OF captain_contact_id, captain_effective_from, captain_effective_to
ON public.mms_boats
FOR EACH ROW EXECUTE FUNCTION public.mms_record_boat_captain_history();

ALTER TABLE public.mms_service_requests
  ADD COLUMN operational_contact_id text REFERENCES public.mms_customer_contacts(id) ON DELETE SET NULL,
  ADD COLUMN operational_contact_name text,
  ADD COLUMN operational_contact_phone text,
  ADD COLUMN operational_contact_email text,
  ADD COLUMN operational_contact_preferred_channel text,
  ADD CONSTRAINT mms_service_requests_operational_channel_check CHECK (
    operational_contact_preferred_channel IS NULL OR
    operational_contact_preferred_channel IN ('PHONE', 'LINE', 'WHATSAPP', 'EMAIL')
  );

ALTER TABLE public.mms_customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mms_customer_contacts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mms_boat_captain_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mms_boat_captain_history FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.mms_customer_contacts FROM anon, authenticated;
REVOKE ALL ON public.mms_boat_captain_history FROM anon, authenticated;
GRANT ALL ON public.mms_customer_contacts TO service_role;
GRANT ALL ON public.mms_boat_captain_history TO service_role;

COMMENT ON TABLE public.mms_customer_contacts IS
  'Operational contacts for a customer. Captain contacts are independent from billing contacts.';
COMMENT ON COLUMN public.mms_boats.captain_contact_id IS
  'Current operational captain/contact for this vessel; not the invoice recipient.';
COMMENT ON COLUMN public.mms_service_requests.operational_contact_name IS
  'Immutable contact-name snapshot used for this service request.';

NOTIFY pgrst, 'reload schema';

COMMIT;
