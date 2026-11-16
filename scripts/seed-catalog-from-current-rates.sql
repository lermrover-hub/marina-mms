-- STAGING ONLY. Run after verifying project zanlunbgupdtqznruzok.
-- Metadata links only. Copies existing labels; never updates pricing_master.
begin;
lock table public.mms_service_catalog in share row exclusive mode;
do $$ begin
  if exists(select 1 from public.mms_service_catalog) then
    raise exception 'Catalog is not empty; reconcile existing mappings instead of overwriting';
  end if;
  if exists(select 1 from public.pricing_master where is_active and
    (coalesce(nullif(subgroup,''),category) is null or length(coalesce(nullif(subgroup,''),category)) not between 1 and 160)) then
    raise exception 'Invalid source category';
  end if;
end $$;
insert into public.mms_service_catalog(kind,code,name_en,status,changed_by)
select 'SERVICE_GROUP','CAT_G_'||upper(md5(group_name)),group_name,'ACTIVE','catalog-rate-link-import-20261014'
from (select distinct coalesce(nullif(subgroup,''),category) as group_name from public.pricing_master where is_active) g;
insert into public.mms_service_catalog(kind,code,name_en,name_th,status,parent_id,pricing_id,changed_by)
select 'SERVICE','CAT_S_'||upper(md5(p.id::text)),p.service_name_en,coalesce(p.service_name_th,''),'ACTIVE',g.id,p.id,'catalog-rate-link-import-20261014'
from public.pricing_master p join public.mms_service_catalog g
  on g.code='CAT_G_'||upper(md5(coalesce(nullif(p.subgroup,''),p.category)))
where p.is_active;
commit;
