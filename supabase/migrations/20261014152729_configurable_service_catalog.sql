-- Additive catalog only. Does not change existing boats, prices or documents.
-- Filename matches the migration version assigned by staging on application.
begin;
create table public.mms_service_catalog (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('VESSEL_TYPE','SERVICE_GROUP','SERVICE')),
  code text not null unique check (code ~ '^[A-Z][A-Z0-9_]{1,79}$'),
  name_en text not null check (length(trim(name_en)) between 1 and 160),
  name_th text not null default '' check (length(name_th) <= 160),
  description text not null default '' check (length(description) <= 2000),
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','RETIRED')),
  parent_id uuid references public.mms_service_catalog(id) on delete restrict,
  loa_min_ft numeric check (loa_min_ft between 0 and 1000),
  loa_max_ft numeric check (loa_max_ft between 0 and 1000),
  engines_min integer check (engines_min between 0 and 20),
  engines_max integer check (engines_max between 0 and 20),
  usage text not null default 'ANY' check (usage in ('ANY','PRIVATE','COMMERCIAL')),
  version integer not null default 1,
  changed_by text not null check (length(trim(changed_by)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (loa_min_ft is null or loa_max_ft is null or loa_min_ft <= loa_max_ft),
  check (engines_min is null or engines_max is null or engines_min <= engines_max),
  check ((kind = 'SERVICE') = (parent_id is not null)),
  check (kind = 'VESSEL_TYPE' or (loa_min_ft is null and loa_max_ft is null and engines_min is null and engines_max is null and usage = 'ANY'))
);
create index on public.mms_service_catalog(parent_id);
create table public.mms_service_catalog_history (
  id bigint generated always as identity primary key,
  catalog_id uuid not null references public.mms_service_catalog(id) on delete restrict,
  before_data jsonb,
  after_data jsonb not null,
  changed_by text not null,
  changed_at timestamptz not null default now()
);
alter table public.mms_service_catalog enable row level security;
alter table public.mms_service_catalog_history enable row level security;
revoke all on public.mms_service_catalog, public.mms_service_catalog_history from public, anon, authenticated;
revoke all on public.mms_service_catalog, public.mms_service_catalog_history from service_role;
grant select, insert, update on public.mms_service_catalog to service_role;
grant select, insert on public.mms_service_catalog_history to service_role;
grant usage, select on sequence public.mms_service_catalog_history_id_seq to service_role;

create function public.mms_validate_service_catalog() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare parent_kind text; parent_status text;
begin
  -- Serialize administrative writes, including cross-row retirement checks.
  perform pg_advisory_xact_lock(73137, 1);
  if TG_OP = 'UPDATE' then
    if new.code <> old.code or new.kind <> old.kind or new.id <> old.id then
      raise exception 'Catalog identity is immutable';
    end if;
    new.version := old.version + 1;
    new.created_at := old.created_at;
  else
    new.version := 1;
  end if;
  if new.parent_id is not null then
    select kind, status into parent_kind, parent_status from public.mms_service_catalog where id = new.parent_id for update;
    if parent_kind is distinct from 'SERVICE_GROUP' or (new.status = 'ACTIVE' and parent_status is distinct from 'ACTIVE') then
      raise exception 'Service requires a valid group; active service requires an active group';
    end if;
  end if;
  if new.kind = 'SERVICE_GROUP' and new.status <> 'ACTIVE' and exists (
    select 1 from public.mms_service_catalog where parent_id = new.id and status = 'ACTIVE'
  ) then raise exception 'Retire active child services first'; end if;
  new.updated_at := now();
  return new;
end $$;
create function public.mms_audit_service_catalog() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.mms_service_catalog_history(catalog_id,before_data,after_data,changed_by)
  values(new.id,case when TG_OP = 'UPDATE' then to_jsonb(old) else null end,to_jsonb(new),new.changed_by);
  return new;
end $$;
revoke all on function public.mms_validate_service_catalog(), public.mms_audit_service_catalog() from public, anon, authenticated;
grant execute on function public.mms_validate_service_catalog(), public.mms_audit_service_catalog() to service_role;
create trigger validate_catalog before insert or update on public.mms_service_catalog for each row execute function public.mms_validate_service_catalog();
create trigger audit_catalog after insert or update on public.mms_service_catalog for each row execute function public.mms_audit_service_catalog();
commit;
