-- Staging data correction only. Run against Supabase project zanlunbgupdtqznruzok.
-- Owner instruction 2026-11-22: HAUL_SB_* is the canonical Haul-out + Launch
-- service; copy the approved PKG-HL-SB* package prices and retire duplicate rows.
-- Preserve row IDs and history. Never run this file against production.

BEGIN;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.pricing_master WHERE code IN (
    'HAUL_SB_1ENG_15_27','HAUL_SB_2ENG_28_40','HAUL_SB_3ENG_41_47','HAUL_SB_4ENG_48_55',
    'PKG-HL-SB1','PKG-HL-SB2','PKG-HL-SB3','PKG-HL-SB4'
  )) <> 8
    OR EXISTS (SELECT 1 FROM public.pricing_master WHERE code IN ('HAUL_SB_3ENG_41_50','HAUL_SB_4ENG_51_60'))
    OR EXISTS (
      SELECT 1 FROM public.pricing_master
      WHERE code IN ('PKG-HL-SB1','PKG-HL-SB2','PKG-HL-SB3','PKG-HL-SB4')
        AND (source_version <> 'ORM-PRICE-2026-v3.8' OR NOT is_active OR quote_allowed <> 'YES'
             OR rate_basis <> 'PACKAGE' OR NOT is_package)
    )
    OR (SELECT count(*) FROM public.pricing_master WHERE source_version = 'ORM-PRICE-2026-v3.8' AND is_active) <> 80
  THEN RAISE EXCEPTION 'Unexpected staging baseline; no haul-out rates changed.'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.mms_quotation_items q
    JOIN public.pricing_master p ON q.pricing_master_id = p.id OR q.pricing_code = p.code
    WHERE p.code IN (
      'HAUL_SB_1ENG_15_27','HAUL_SB_2ENG_28_40','HAUL_SB_3ENG_41_47','HAUL_SB_4ENG_48_55',
      'PKG-HL-SB1','PKG-HL-SB2','PKG-HL-SB3','PKG-HL-SB4'
    )
  ) OR EXISTS (
    SELECT 1 FROM public.mms_service_request_items s
    JOIN public.pricing_master p ON s.pricing_master_id = p.id::text OR s.pricing_code = p.code
    WHERE p.code IN (
      'HAUL_SB_1ENG_15_27','HAUL_SB_2ENG_28_40','HAUL_SB_3ENG_41_47','HAUL_SB_4ENG_48_55',
      'PKG-HL-SB1','PKG-HL-SB2','PKG-HL-SB3','PKG-HL-SB4'
    )
  ) THEN RAISE EXCEPTION 'A target rate has a new document reference; review it before changing codes.'; END IF;

  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('PKG-HL-SB1',7000),('PKG-HL-SB2',9500),('PKG-HL-SB3',12500),('PKG-HL-SB4',16000)
    ) v(code,approved_rate)
    LEFT JOIN public.pricing_master p ON p.code = v.code
    WHERE p.rate_thb IS DISTINCT FROM v.approved_rate OR p.full_rate_thb IS DISTINCT FROM v.approved_rate
  ) THEN RAISE EXCEPTION 'Approved package prices changed; no haul-out rates changed.'; END IF;
END
$$;

WITH mapping(old_code,new_code,package_code,tier,display_name,minimum_loa) AS (
  VALUES
    ('HAUL_SB_1ENG_15_27','HAUL_SB_1ENG_15_27','PKG-HL-SB1','SB1','Speedboat Tier 1 (1 engine, 15-27 ft) haul-out + launch round trip',15.00),
    ('HAUL_SB_2ENG_28_40','HAUL_SB_2ENG_28_40','PKG-HL-SB2','SB2','Speedboat Tier 2 (2 engines, >27-40 ft) haul-out + launch round trip',27.01),
    ('HAUL_SB_3ENG_41_47','HAUL_SB_3ENG_41_50','PKG-HL-SB3','SB3','Speedboat Tier 3 (3 engines, >40-50 ft) haul-out + launch round trip',40.01),
    ('HAUL_SB_4ENG_48_55','HAUL_SB_4ENG_51_60','PKG-HL-SB4','SB4','Speedboat Tier 4 (4 engines, >50-60 ft) haul-out + launch round trip',50.01)
)
UPDATE public.pricing_master target
SET code = mapping.new_code,
    service_name_en = mapping.display_name,
    service_name_th = 'ยกเรือสปีดโบ๊ทขึ้นและลงน้ำ ' || mapping.tier || ' รวมบริการตามแพ็กเกจ',
    category = 'B.Haul-out', service_group = 'HAUL_LAUNCH_PACKAGE',
    display_category = 'Haul-out', display_vessel_group = 'Speedboat', display_vessel_subtype = mapping.tier,
    unit = package.unit, rate_thb = package.rate_thb, full_rate_thb = package.full_rate_thb,
    pilot_rate_thb = package.pilot_rate_thb, pilot_notes = package.pilot_notes,
    discount_pct = package.discount_pct, source_discount_pct = package.source_discount_pct,
    direct_cost_thb = NULL, cost_basis = 'Complete package cost requires Finance review',
    description = package.description,
    notes = 'Owner-approved v3.8 package price moved from ' || mapping.package_code ||
            '; original HAUL row ID retained; complete package cost pending review.',
    source_version = package.source_version, rate_card_version_id = package.rate_card_version_id,
    vessel_category = package.vessel_category, vessel_tier = package.vessel_tier,
    loa_min_ft = mapping.minimum_loa, loa_max_ft = package.loa_max_ft,
    max_weight_t = package.max_weight_t, engine_min = package.engine_min, engine_max = package.engine_max,
    duration_code = package.duration_code, duration_days = package.duration_days,
    rate_basis = package.rate_basis, calc_type = package.calc_type,
    cap_thb = package.cap_thb, is_package = package.is_package, package_inclusions = package.package_inclusions,
    capacity_note = package.capacity_note, display_order = package.display_order,
    quote_allowed = 'YES', price_status = 'ACTIVE', is_active = true,
    approved_by = package.approved_by, approved_at = package.approved_at, effective_date = package.effective_date,
    updated_by = 'v38-speedboat-haul-dedupe', updated_at = now()
FROM mapping
JOIN public.pricing_master package ON package.code = mapping.package_code
WHERE target.code = mapping.old_code;

WITH mapping(package_code,canonical_code) AS (
  VALUES
    ('PKG-HL-SB1','HAUL_SB_1ENG_15_27'),('PKG-HL-SB2','HAUL_SB_2ENG_28_40'),
    ('PKG-HL-SB3','HAUL_SB_3ENG_41_50'),('PKG-HL-SB4','HAUL_SB_4ENG_51_60')
)
UPDATE public.pricing_master package
SET is_active = false, quote_allowed = 'NO', price_status = 'LEGACY_ALIAS',
    notes = 'Superseded by canonical rate ' || mapping.canonical_code || '; retained for audit history.',
    updated_by = 'v38-speedboat-haul-dedupe', updated_at = now()
FROM mapping WHERE package.code = mapping.package_code;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.pricing_master WHERE code IN (
    'HAUL_SB_1ENG_15_27','HAUL_SB_2ENG_28_40','HAUL_SB_3ENG_41_50','HAUL_SB_4ENG_51_60'
  ) AND source_version = 'ORM-PRICE-2026-v3.8' AND is_active AND quote_allowed = 'YES'
    AND is_package AND rate_basis = 'PACKAGE') <> 4
    OR (SELECT count(*) FROM public.pricing_master WHERE code IN (
      'PKG-HL-SB1','PKG-HL-SB2','PKG-HL-SB3','PKG-HL-SB4'
    ) AND is_active) <> 0
    OR (SELECT count(*) FROM public.pricing_master WHERE source_version = 'ORM-PRICE-2026-v3.8' AND is_active) <> 80
  THEN RAISE EXCEPTION 'Unexpected haul-out deduplication result; transaction rolled back.'; END IF;
END
$$;

COMMIT;
