-- Ocean Rover Marina pricing v3.8 support.
-- Additive migration: historical pricing and quotation rows are not recalculated.

CREATE TABLE IF NOT EXISTS public.rate_card_versions (
  id text PRIMARY KEY,
  version_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'ACTIVE', 'RETIRED')),
  effective_from date,
  effective_to date,
  source_file text,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.rate_card_versions (
  id, version_code, status, effective_from, source_file, approved_by, approved_at
) VALUES (
  'orm-price-2026-v3-8',
  'ORM-PRICE-2026-v3.8',
  'ACTIVE',
  DATE '2026-11-21',
  'ORM_Quote_Tidal_v3_8_OWNER_RATE_UPDATE.xlsx',
  'Owner approved',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  effective_from = EXCLUDED.effective_from,
  source_file = EXCLUDED.source_file,
  approved_by = EXCLUDED.approved_by,
  approved_at = EXCLUDED.approved_at,
  updated_at = now();

ALTER TABLE public.pricing_master
  ADD COLUMN IF NOT EXISTS rate_card_version_id text,
  ADD COLUMN IF NOT EXISTS vessel_category text,
  ADD COLUMN IF NOT EXISTS vessel_tier text,
  ADD COLUMN IF NOT EXISTS loa_min_ft numeric(8,2),
  ADD COLUMN IF NOT EXISTS loa_max_ft numeric(8,2),
  ADD COLUMN IF NOT EXISTS max_weight_t numeric(8,2),
  ADD COLUMN IF NOT EXISTS engine_min integer,
  ADD COLUMN IF NOT EXISTS engine_max integer,
  ADD COLUMN IF NOT EXISTS duration_code text,
  ADD COLUMN IF NOT EXISTS duration_days integer,
  ADD COLUMN IF NOT EXISTS rate_basis text,
  ADD COLUMN IF NOT EXISTS cap_thb numeric(12,2),
  ADD COLUMN IF NOT EXISTS is_package boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS package_inclusions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS capacity_note text,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pricing_master_rate_card_version_fk'
      AND conrelid = 'public.pricing_master'::regclass
  ) THEN
    ALTER TABLE public.pricing_master
      ADD CONSTRAINT pricing_master_rate_card_version_fk
      FOREIGN KEY (rate_card_version_id)
      REFERENCES public.rate_card_versions(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pricing_master_v38_loa_range'
      AND conrelid = 'public.pricing_master'::regclass
  ) THEN
    ALTER TABLE public.pricing_master
      ADD CONSTRAINT pricing_master_v38_loa_range
      CHECK (loa_min_ft IS NULL OR loa_max_ft IS NULL OR loa_min_ft <= loa_max_ft);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pricing_master_v38_engine_range'
      AND conrelid = 'public.pricing_master'::regclass
  ) THEN
    ALTER TABLE public.pricing_master
      ADD CONSTRAINT pricing_master_v38_engine_range
      CHECK (engine_min IS NULL OR engine_max IS NULL OR engine_min <= engine_max);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pricing_master_v38_cap_nonnegative'
      AND conrelid = 'public.pricing_master'::regclass
  ) THEN
    ALTER TABLE public.pricing_master
      ADD CONSTRAINT pricing_master_v38_cap_nonnegative
      CHECK (cap_thb IS NULL OR cap_thb >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS pricing_master_version_display_idx
  ON public.pricing_master (rate_card_version_id, display_order, code);

ALTER TABLE public.mms_quotation_items
  ADD COLUMN IF NOT EXISTS pricing_rule_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS pricing_input_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS calculated_rate_thb numeric(12,2),
  ADD COLUMN IF NOT EXISTS cap_applied_thb numeric(12,2),
  ADD COLUMN IF NOT EXISTS manual_override_thb numeric(12,2),
  ADD COLUMN IF NOT EXISTS override_reason text,
  ADD COLUMN IF NOT EXISTS override_approved_by text,
  ADD COLUMN IF NOT EXISTS override_approved_at timestamptz;

ALTER TABLE public.mms_quotations
  ADD COLUMN IF NOT EXISTS pricing_source_version text,
  ADD COLUMN IF NOT EXISTS pricing_context jsonb;

ALTER TABLE public.rate_card_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rate_card_versions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.rate_card_versions TO service_role;

COMMENT ON COLUMN public.pricing_master.service_group IS
  'DRY_STORAGE and SERVICE_YARD share the canonical STORAGE_YARD rate group.';
COMMENT ON COLUMN public.mms_quotation_items.pricing_rule_snapshot IS
  'Immutable pricing rule used when the quotation line was created.';
COMMENT ON COLUMN public.mms_quotation_items.pricing_input_snapshot IS
  'Immutable vessel and duration inputs used to calculate the quotation line.';
