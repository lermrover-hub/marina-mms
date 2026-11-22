-- Staging only: owner decision 2026-11-23. Ramp catalogue is limited to
-- Speedboat and Sport & Cruiser rates plus truck ramp access. Fishing may be
-- priced later. Yacht, jet ski, fishing and dinghy Ramp rows are not offered.
-- Retain rate/history IDs and prior document snapshots. Never run in production.

BEGIN;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.pricing_master WHERE code IN (
    'RAMP-V38-MONO','RAMP-V38-POWERCAT','RAMP-V38-SAILCAT',
    'RAMP_FISH_LT15_SELF','RAMP_JETSKI','RAMP-V38-DINGHY'
  )) <> 6
  THEN RAISE EXCEPTION 'Unexpected staging Ramp baseline; no rates changed.'; END IF;

  IF (SELECT count(*) FROM public.pricing_master WHERE code IN ('RAMP_BIG_TRUCK','RAMP_SMALL_TRUCK')
      AND is_active AND quote_allowed = 'YES') <> 2
  THEN RAISE EXCEPTION 'Truck Ramp rates must remain available; no rates changed.'; END IF;
END
$$;

UPDATE public.pricing_master
SET is_active = false, quote_allowed = 'NO', price_status = 'INACTIVE',
    notes = concat_ws(' ', nullif(notes, ''),
      'Removed from active Ramp catalogue by owner decision 2026-11-23; retained for audit/history.'),
    updated_by = 'v38-ramp-scope', updated_at = now()
WHERE code IN (
  'RAMP-V38-MONO','RAMP-V38-POWERCAT','RAMP-V38-SAILCAT',
  'RAMP_FISH_LT15_SELF','RAMP_JETSKI','RAMP-V38-DINGHY'
);

DO $$
BEGIN
  IF (SELECT count(*) FROM public.pricing_master WHERE code IN (
    'RAMP-V38-MONO','RAMP-V38-POWERCAT','RAMP-V38-SAILCAT',
    'RAMP_FISH_LT15_SELF','RAMP_JETSKI','RAMP-V38-DINGHY'
  ) AND (is_active OR quote_allowed <> 'NO' OR price_status <> 'INACTIVE')) <> 0
    OR (SELECT count(*) FROM public.pricing_master WHERE code IN ('RAMP_BIG_TRUCK','RAMP_SMALL_TRUCK')
      AND is_active AND quote_allowed = 'YES') <> 2
    OR EXISTS (
      SELECT 1 FROM public.pricing_master
      WHERE is_active AND (service_group ~* '^([0-9]+[.][[:space:]]*)?ramp' OR category ILIKE '%ramp%')
        AND code NOT IN (
          'RAMP_BIG_TRUCK','RAMP_SMALL_TRUCK',
          'RAMP_SB_1ENG_15_27','RAMP_SB_2ENG_28_40','RAMP_SB_3ENG_41_47',
          'RAMP_SB_SPECIAL','RAMP-V38-SB3-GAP',
          'RAMP-V38-SC1','RAMP-V38-SC2','RAMP-V38-SC3','RAMP-V38-SC4'
        )
    )
  THEN RAISE EXCEPTION 'Unexpected active Ramp rate after scope change; transaction rolled back.'; END IF;
END
$$;

COMMIT;
