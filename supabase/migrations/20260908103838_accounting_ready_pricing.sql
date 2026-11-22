-- Accounting-ready pricing foundation.
-- `rate_thb` remains the approved current selling price for backward compatibility.
-- `discount_pct` is an additional operational default and must start at 0%.

ALTER TABLE public.pricing_master
  ADD COLUMN IF NOT EXISTS full_rate_thb numeric(12,2),
  ADD COLUMN IF NOT EXISTS discount_pct numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_discount_pct numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS direct_cost_thb numeric(12,2),
  ADD COLUMN IF NOT EXISTS revenue_gl_code text,
  ADD COLUMN IF NOT EXISTS cost_gl_code text,
  ADD COLUMN IF NOT EXISTS pnl_category text,
  ADD COLUMN IF NOT EXISTS cost_pnl_category text,
  ADD COLUMN IF NOT EXISTS cost_basis text,
  ADD COLUMN IF NOT EXISTS calc_type text NOT NULL DEFAULT 'FLAT_QTY',
  ADD COLUMN IF NOT EXISTS service_group text,
  ADD COLUMN IF NOT EXISTS subgroup text,
  ADD COLUMN IF NOT EXISTS provider_type text,
  ADD COLUMN IF NOT EXISTS quote_allowed text NOT NULL DEFAULT 'YES',
  ADD COLUMN IF NOT EXISTS price_status text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS source_version text,
  ADD COLUMN IF NOT EXISTS effective_date date,
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

UPDATE public.pricing_master
SET
  full_rate_thb = COALESCE(full_rate_thb, rate_thb),
  discount_pct = COALESCE(discount_pct, 0),
  source_discount_pct = COALESCE(source_discount_pct, 0),
  price_status = CASE WHEN is_active THEN 'ACTIVE' ELSE 'INACTIVE' END,
  effective_date = COALESCE(effective_date, CURRENT_DATE)
WHERE
  full_rate_thb IS NULL
  OR discount_pct IS NULL
  OR source_discount_pct IS NULL
  OR effective_date IS NULL;

ALTER TABLE public.pricing_master
  ALTER COLUMN full_rate_thb SET NOT NULL,
  ALTER COLUMN full_rate_thb SET DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pricing_master_full_rate_nonnegative'
      AND conrelid = 'public.pricing_master'::regclass
  ) THEN
    ALTER TABLE public.pricing_master
      ADD CONSTRAINT pricing_master_full_rate_nonnegative CHECK (full_rate_thb >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pricing_master_current_rate_nonnegative'
      AND conrelid = 'public.pricing_master'::regclass
  ) THEN
    ALTER TABLE public.pricing_master
      ADD CONSTRAINT pricing_master_current_rate_nonnegative CHECK (rate_thb >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pricing_master_discount_pct_range'
      AND conrelid = 'public.pricing_master'::regclass
  ) THEN
    ALTER TABLE public.pricing_master
      ADD CONSTRAINT pricing_master_discount_pct_range CHECK (discount_pct >= 0 AND discount_pct <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pricing_master_source_discount_pct_range'
      AND conrelid = 'public.pricing_master'::regclass
  ) THEN
    ALTER TABLE public.pricing_master
      ADD CONSTRAINT pricing_master_source_discount_pct_range CHECK (source_discount_pct >= 0 AND source_discount_pct <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pricing_master_direct_cost_nonnegative'
      AND conrelid = 'public.pricing_master'::regclass
  ) THEN
    ALTER TABLE public.pricing_master
      ADD CONSTRAINT pricing_master_direct_cost_nonnegative CHECK (direct_cost_thb IS NULL OR direct_cost_thb >= 0);
  END IF;
END $$;

-- Snapshot the approved price and accounting attributes on quotation lines.
-- Historical quotations must not change when the master rate card changes.
ALTER TABLE public.mms_quotation_items
  ADD COLUMN IF NOT EXISTS pricing_code text,
  ADD COLUMN IF NOT EXISTS full_rate_snapshot_thb numeric(12,2),
  ADD COLUMN IF NOT EXISTS current_rate_snapshot_thb numeric(12,2),
  ADD COLUMN IF NOT EXISTS direct_cost_snapshot_thb numeric(12,2),
  ADD COLUMN IF NOT EXISTS revenue_gl_code text,
  ADD COLUMN IF NOT EXISTS cost_gl_code text,
  ADD COLUMN IF NOT EXISTS pnl_category text,
  ADD COLUMN IF NOT EXISTS cost_pnl_category text,
  ADD COLUMN IF NOT EXISTS pricing_source_version text,
  ADD COLUMN IF NOT EXISTS pricing_effective_date date,
  ADD COLUMN IF NOT EXISTS pricing_updated_at timestamptz;

-- Staging currently uses uuid pricing IDs while production uses text IDs.
-- Match the referenced column type so the same migration is safe in both environments.
DO $$
DECLARE
  pricing_id_type text;
BEGIN
  SELECT format_type(attribute.atttypid, attribute.atttypmod)
  INTO pricing_id_type
  FROM pg_attribute attribute
  WHERE attribute.attrelid = 'public.pricing_master'::regclass
    AND attribute.attname = 'id'
    AND NOT attribute.attisdropped;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mms_quotation_items'
      AND column_name = 'pricing_master_id'
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.mms_quotation_items ADD COLUMN pricing_master_id %s',
      pricing_id_type
    );
  END IF;
END $$;

UPDATE public.mms_quotation_items
SET discount_pct = 0
WHERE discount_pct IS NULL;

ALTER TABLE public.mms_quotation_items
  ALTER COLUMN discount_pct SET DEFAULT 0,
  ALTER COLUMN discount_pct SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mms_quotation_items_pricing_master_fk'
      AND conrelid = 'public.mms_quotation_items'::regclass
  ) THEN
    ALTER TABLE public.mms_quotation_items
      ADD CONSTRAINT mms_quotation_items_pricing_master_fk
      FOREIGN KEY (pricing_master_id) REFERENCES public.pricing_master(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mms_quotation_items_snapshot_cost_nonnegative'
      AND conrelid = 'public.mms_quotation_items'::regclass
  ) THEN
    ALTER TABLE public.mms_quotation_items
      ADD CONSTRAINT mms_quotation_items_snapshot_cost_nonnegative
      CHECK (direct_cost_snapshot_thb IS NULL OR direct_cost_snapshot_thb >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS mms_quotation_items_pricing_master_idx
  ON public.mms_quotation_items (pricing_master_id);

CREATE TABLE IF NOT EXISTS public.pricing_master_history (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  before_data jsonb,
  after_data jsonb,
  changed_by text,
  approved_by text,
  source_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE
  pricing_id_type text;
BEGIN
  SELECT format_type(attribute.atttypid, attribute.atttypmod)
  INTO pricing_id_type
  FROM pg_attribute attribute
  WHERE attribute.attrelid = 'public.pricing_master'::regclass
    AND attribute.attname = 'id'
    AND NOT attribute.attisdropped;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pricing_master_history'
      AND column_name = 'pricing_master_id'
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.pricing_master_history ADD COLUMN pricing_master_id %s NOT NULL',
      pricing_id_type
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pricing_master_history_master_fk'
      AND conrelid = 'public.pricing_master_history'::regclass
  ) THEN
    ALTER TABLE public.pricing_master_history
      ADD CONSTRAINT pricing_master_history_master_fk
      FOREIGN KEY (pricing_master_id) REFERENCES public.pricing_master(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS pricing_master_history_master_created_idx
  ON public.pricing_master_history (pricing_master_id, created_at DESC);

ALTER TABLE public.pricing_master_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pricing_master_history FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.pricing_master_history TO service_role;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.mms_log_pricing_master_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  changed_row public.pricing_master;
BEGIN
  changed_row := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;

  INSERT INTO public.pricing_master_history (
    pricing_master_id,
    action,
    before_data,
    after_data,
    changed_by,
    approved_by,
    source_version
  ) VALUES (
    changed_row.id,
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    changed_row.updated_by,
    changed_row.approved_by,
    changed_row.source_version
  );

  RETURN changed_row;
END;
$$;

REVOKE ALL ON FUNCTION private.mms_log_pricing_master_change() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.mms_log_pricing_master_change() TO postgres, service_role;

DROP TRIGGER IF EXISTS mms_pricing_master_history ON public.pricing_master;
CREATE TRIGGER mms_pricing_master_history
AFTER INSERT OR UPDATE ON public.pricing_master
FOR EACH ROW EXECUTE FUNCTION private.mms_log_pricing_master_change();
