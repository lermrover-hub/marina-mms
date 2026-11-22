-- Explicit staging rollout. Do not run against production or as part of a deploy.
-- Source: owner-approved ORM_Rate_Card_v3_8_FIXED_TIERS.xlsx (2026-11-22).
-- Preserve IDs and snapshots; prices without owner approval remain non-quotable.

DO $$
BEGIN
  IF (SELECT count(*) FROM public.pricing_master WHERE source_version = 'ORM-PRICE-2026-v3.8' AND is_active) <> 52
    OR (SELECT count(*) FROM public.pricing_master WHERE code IN (
      'RAMP_SB_1ENG_15_27', 'RAMP_SB_2ENG_28_40', 'RAMP_SB_3ENG_41_47', 'RAMP_SB_SPECIAL'
    ) AND source_version = 'ORM-PRICE-2026-v3.7') <> 4
  THEN
    RAISE EXCEPTION 'Fixed-tier rollout requires the reviewed staging catalogue baseline; no rates changed.';
  END IF;
END
$$;

WITH tiers (vessel_category, label, tier, loa_min, loa_max, tonnes, daily, weekly, monthly, sort_order) AS (
  VALUES
    ('YACHT_MONOHULL', 'Motor / Sail Monohull', 'M1', 30, 34.99, 14, 930, 5830, 20800, 40),
    ('YACHT_MONOHULL', 'Motor / Sail Monohull', 'M2', 35, 38.99, 14, 1070, 6730, 24050, 43),
    ('YACHT_MONOHULL', 'Motor / Sail Monohull', 'M3', 39, 42.99, 14, 1160, 7280, 26000, 46),
    ('YACHT_MONOHULL', 'Motor / Sail Monohull', 'M4', 43, 45, 14, 1270, 8010, 26000, 49),
    ('SAIL_CATAMARAN', 'Sail Catamaran', 'C1', 30, 34.99, 12, 1395, 8745, 31200, 52),
    ('SAIL_CATAMARAN', 'Sail Catamaran', 'C2', 35, 38.99, 12, 1605, 10095, 36075, 55),
    ('SAIL_CATAMARAN', 'Sail Catamaran', 'C3', 39, 41, 12, 1740, 10920, 39000, 58)
)
INSERT INTO public.pricing_master (
  id, code, service_name_en, category, unit, rate_thb, full_rate_thb, service_group,
  source_version, rate_card_version_id, vessel_category, vessel_tier, loa_min_ft, loa_max_ft,
  max_weight_t, duration_code, duration_days, rate_basis, calc_type, quote_allowed,
  price_status, is_active, display_order, effective_date, approved_by, approved_at, updated_by
)
SELECT gen_random_uuid(), 'STG-' || tier || '-' || term.suffix,
  'Dry Storage / Service Yard - ' || label || ' ' || tier || ' - ' || term.duration,
  'Storage & Yard Service', term.unit, term.rate, term.rate, 'STORAGE_YARD',
  'ORM-PRICE-2026-v3.8', 'orm-price-2026-v3-8', vessel_category, tier, loa_min, loa_max,
  tonnes, term.duration, term.days, 'FIXED', 'FLAT_QTY', 'YES',
  'ACTIVE', true, sort_order + term.term_order, DATE '2026-11-22', 'Owner approved', now(), 'v38-fixed-tiers'
FROM tiers
CROSS JOIN LATERAL (VALUES
  ('D','DAILY','day',1,daily,0), ('W','WEEKLY','week',7,weekly,1), ('M','MONTHLY','month',30,monthly,2)
) AS term(suffix, duration, unit, days, rate, term_order);

UPDATE public.pricing_master
SET is_active = false, price_status = 'INACTIVE', quote_allowed = 'NO',
    updated_by = 'v38-fixed-tiers', updated_at = now()
WHERE is_active AND (
  code IN (
    'STG-MONO-D','STG-MONO-W','STG-MONO-M','STG-SAILCAT-D','STG-SAILCAT-W','STG-SAILCAT-M',
    'STORE_YACHT_MONO_DAY','STORE_YACHT_MONO_WEEK','STORE_YACHT_MONO_MONTH',
    'REPAIR_YACHT_MONO_DAY','REPAIR_YACHT_MONO_WEEK','REPAIR_YACHT_MONO_MONTH',
    'YACHT_MONO_FT','HAUL_YACHT_MONO_RT',
    'STORE_FISH_LT15_3000'
  )
  OR code ~ '^(STORE|REPAIR)_(SB|CRUISER)_T[1-4]_[DWM]$'
  OR code ~ '^SB_LARGE_(51|55|60)FT_(DAY|WEEK|MONTH)$'
  OR code ~ '^STORE_(DINGHY|JETSKI)_[DWM]$'
);

UPDATE public.pricing_master
SET loa_min_ft = CASE vessel_tier WHEN 'SB2' THEN 27.01 WHEN 'SB3' THEN 40.01 ELSE 50.01 END,
    updated_by = 'v38-fixed-tiers', updated_at = now()
WHERE source_version = 'ORM-PRICE-2026-v3.8'
  AND service_group IN ('STORAGE_YARD', 'HAUL_LAUNCH_PACKAGE')
  AND vessel_tier IN ('SB2','SB3','SB4');

WITH bands(code, label, tier, loa_min, loa_max) AS (
  VALUES
    ('PKG-HL-MONO-30-34', 'Motor / Sail Monohull M1', 'M1', 30, 34.99),
    ('PKG-HL-MONO-35-38', 'Motor / Sail Monohull M2', 'M2', 35, 38.99),
    ('PKG-HL-MONO-39-42', 'Motor / Sail Monohull M3', 'M3', 39, 42.99),
    ('PKG-HL-MONO-43-45', 'Motor / Sail Monohull M4', 'M4', 43, 45),
    ('PKG-HL-SAILCAT-30-34', 'Sail Catamaran C1', 'C1', 30, 34.99),
    ('PKG-HL-SAILCAT-35-38', 'Sail Catamaran C2', 'C2', 35, 38.99),
    ('PKG-HL-SAILCAT-39-41', 'Sail Catamaran C3', 'C3', 39, 41)
)
UPDATE public.pricing_master p
SET service_name_en = 'Haul / Launch Package - ' || b.label, vessel_tier = b.tier,
    loa_min_ft = b.loa_min, loa_max_ft = b.loa_max, updated_by = 'v38-fixed-tiers', updated_at = now()
FROM bands b WHERE p.code = b.code AND p.source_version = 'ORM-PRICE-2026-v3.8';

UPDATE public.pricing_master
SET rate_thb = 1386.67, full_rate_thb = 1386.67, updated_by = 'v38-fixed-tiers', updated_at = now()
WHERE code = 'STG-SC-SB4-D' AND source_version = 'ORM-PRICE-2026-v3.8';

WITH ramp(code, label, tier, loa_min, loa_max, review, sort_order) AS (
  VALUES
    ('RAMP_SB_1ENG_15_27','Ramp - Speedboat SB1 (15-27 ft)','SB1',15,27,false,1),
    ('RAMP_SB_2ENG_28_40','Ramp - Speedboat SB2 (>27-40 ft)','SB2',27.01,40,false,2),
    ('RAMP_SB_3ENG_41_47','Ramp - Speedboat SB3 (>40-47 ft)','SB3',40.01,47,false,3),
    ('RAMP_SB_SPECIAL','Ramp - Speedboat SB4 (>50-60 ft)','SB4',50.01,60,true,5)
)
UPDATE public.pricing_master p
SET source_version = 'ORM-PRICE-2026-v3.8', rate_card_version_id = 'orm-price-2026-v3-8',
    service_group = 'RAMP', service_name_en = r.label,
    unit = CASE WHEN r.review THEN 'review' ELSE 'trip' END, vessel_category = 'COMMERCIAL_SPEEDBOAT',
    vessel_tier = r.tier, loa_min_ft = r.loa_min, loa_max_ft = r.loa_max, max_weight_t = 14,
    duration_code = 'ONE_CYCLE', rate_basis = CASE WHEN r.review THEN 'MANAGER_REVIEW' ELSE 'FIXED' END,
    display_order = r.sort_order, effective_date = DATE '2026-11-22',
    updated_by = 'v38-fixed-tiers', updated_at = now()
FROM ramp r WHERE p.code = r.code;

WITH pending(code, label, vessel_category, tier, loa_min, loa_max, tonnes, sort_order) AS (
  VALUES
    ('RAMP-V38-SB3-GAP','Ramp - Speedboat SB3 (>47-50 ft)','COMMERCIAL_SPEEDBOAT','SB3',47.01,50,14,4),
    ('RAMP-V38-SC1','Ramp - Sport & Cruiser SC1','SPORT_CRUISER','SB1',0,27,14,6),
    ('RAMP-V38-SC2','Ramp - Sport & Cruiser SC2','SPORT_CRUISER','SB2',27.01,40,14,7),
    ('RAMP-V38-SC3','Ramp - Sport & Cruiser SC3','SPORT_CRUISER','SB3',40.01,50,14,8),
    ('RAMP-V38-SC4','Ramp - Sport & Cruiser SC4','SPORT_CRUISER','SB4',50.01,60,14,9),
    ('RAMP-V38-MONO','Ramp - Motor / Sail Monohull','YACHT_MONOHULL',NULL,30,45,14,10),
    ('RAMP-V38-POWERCAT','Ramp - Power Catamaran','POWER_CATAMARAN',NULL,NULL,41,12,11),
    ('RAMP-V38-SAILCAT','Ramp - Sail Catamaran','SAIL_CATAMARAN',NULL,NULL,41,12,12),
    ('RAMP-V38-DINGHY','Ramp - Dinghy','MANAGER_REVIEW',NULL,NULL,NULL,NULL,13)
)
INSERT INTO public.pricing_master (
  id, code, service_name_en, category, unit, rate_thb, full_rate_thb, service_group,
  source_version, rate_card_version_id, vessel_category, vessel_tier, loa_min_ft, loa_max_ft, max_weight_t,
  duration_code, rate_basis, calc_type, quote_allowed, price_status, is_active, capacity_note, display_order,
  effective_date, updated_by
)
SELECT gen_random_uuid(), code, label, 'Ramp Access', 'review', 0, 0, 'RAMP',
  'ORM-PRICE-2026-v3.8', 'orm-price-2026-v3-8', vessel_category, tier, loa_min, loa_max, tonnes,
  'ONE_CYCLE', 'MANAGER_REVIEW', 'MANUAL', 'MANAGER_REVIEW', 'PENDING', true, 'No approved fixed rate.',
  sort_order, DATE '2026-11-22', 'v38-fixed-tiers'
FROM pending;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.pricing_master WHERE source_version = 'ORM-PRICE-2026-v3.8' AND is_active AND rate_basis = 'PER_FT')
    OR (SELECT count(*) FROM public.pricing_master WHERE source_version = 'ORM-PRICE-2026-v3.8' AND is_active) <> 80
  THEN RAISE EXCEPTION 'Unexpected resulting v3.8 catalogue.'; END IF;
END
$$;
