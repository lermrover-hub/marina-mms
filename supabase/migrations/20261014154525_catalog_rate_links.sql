begin;
-- Version aligned with the staging migration ledger.
-- Link only: pricing_master remains the sole authority for prices and routing.
alter table public.mms_service_catalog
  add column pricing_id uuid references public.pricing_master(id) on delete restrict,
  add constraint catalog_rate_service_only check (pricing_id is null or kind = 'SERVICE');
create unique index mms_catalog_one_service_per_rate on public.mms_service_catalog(pricing_id) where pricing_id is not null;
commit;
