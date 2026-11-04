-- Staging-safe berth master alignment.
-- The C-8 record was entered with a far-future end date even though it was
-- checked out on 2026-10-18. Assignment end dates are inclusive, so 2026-10-19
-- must render as the first available day. B2 is the canonical physical slot
-- used by both Berth Map and Berth Management.

update public.mms_berth_assignments
set end_date = '2026-10-18', updated_at = now()
where id = '9fe522d4-fd6f-4853-bee4-91930a6e029a'
  and status = 'COMPLETED';

insert into public.mms_berths (
  id, code, berth_type, max_loa_ft, max_loa_m, status, current_boat_id,
  monthly_rate, notes, zone, depth_m, short_period_only, location_section
)
values (
  'b-02', 'B2', 'DRY_STORAGE', 60, 18.29, 'AVAILABLE', null,
  null,
  'Physical slot B2 — dry storage / boat stands; added to keep Berth Map and Berth Management aligned.',
  'B', null, false, 'Hardstand B2'
)
on conflict (code) do update set
  berth_type = excluded.berth_type,
  max_loa_ft = excluded.max_loa_ft,
  max_loa_m = excluded.max_loa_m,
  zone = excluded.zone,
  location_section = excluded.location_section;
