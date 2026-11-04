-- Run ONLY on marina-mms-staging. All fixture rows/history are rolled back.
begin;
set local role anon;
do $$ begin
  begin perform 1 from public.mms_service_catalog; raise exception 'anon read unexpectedly allowed';
  exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
do $$ begin
  begin insert into public.mms_service_catalog(kind,code,name_en,changed_by) values('VESSEL_TYPE','QA_DENIED','Denied','catalog-test');
    raise exception 'authenticated write unexpectedly allowed';
  exception when insufficient_privilege then null; end;
end $$;
set local role service_role;
do $$
declare g uuid; s uuid; v uuid; n integer; rejected boolean;
begin
  insert into public.mms_service_catalog(kind,code,name_en,status,changed_by)
    values('SERVICE_GROUP','QA_CATALOG_GROUP','Test group','ACTIVE','catalog-test') returning id into g;
  insert into public.mms_service_catalog(kind,code,name_en,status,parent_id,changed_by)
    values('SERVICE','QA_CATALOG_SERVICE','Test service','ACTIVE',g,'catalog-test') returning id into s;
  insert into public.mms_service_catalog(kind,code,name_en,loa_min_ft,loa_max_ft,usage,changed_by)
    values('VESSEL_TYPE','QA_CATALOG_VESSEL','Test vessel',41,50,'COMMERCIAL','catalog-test') returning id into v;
  if (select count(*) from public.mms_service_catalog_history where catalog_id in(g,s,v)) <> 3 then raise exception 'Insert history mismatch'; end if;

  rejected := false;
  begin insert into public.mms_service_catalog(kind,code,name_en,changed_by) values('VESSEL_TYPE','QA_CATALOG_VESSEL','Duplicate','catalog-test');
  exception when unique_violation then rejected := true; end;
  if not rejected then raise exception 'Duplicate accepted'; end if;

  rejected := false;
  begin update public.mms_service_catalog set loa_max_ft=40 where id=v;
  exception when check_violation then rejected := true; end;
  if not rejected then raise exception 'Invalid range accepted'; end if;

  rejected := false;
  begin update public.mms_service_catalog set code='QA_REPLACED' where id=v;
  exception when raise_exception then rejected := true; end;
  if not rejected then raise exception 'Identity mutation accepted'; end if;

  rejected := false;
  begin update public.mms_service_catalog set status='RETIRED' where id=g;
  exception when raise_exception then rejected := true; end;
  if not rejected then raise exception 'Active children orphaned'; end if;

  rejected := false;
  begin update public.mms_service_catalog set parent_id=v where id=s;
  exception when raise_exception then rejected := true; end;
  if not rejected then raise exception 'Invalid parent accepted'; end if;

  update public.mms_service_catalog set name_en='Edited vessel' where id=v and version=1;
  get diagnostics n = row_count;
  if n <> 1 or (select version from public.mms_service_catalog where id=v) <> 2 then raise exception 'Version update failed'; end if;
  update public.mms_service_catalog set name_en='Stale edit' where id=v and version=1;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Stale edit accepted'; end if;
  if not exists(select 1 from public.mms_service_catalog_history where catalog_id=v and before_data->>'name_en'='Test vessel' and after_data->>'name_en'='Edited vessel' and changed_by='catalog-test') then raise exception 'Before-after history missing'; end if;

  update public.mms_service_catalog set status='RETIRED' where id=s;
  update public.mms_service_catalog set status='RETIRED' where id=g;
  rejected := false;
  begin update public.mms_service_catalog set status='ACTIVE' where id=s;
  exception when raise_exception then rejected := true; end;
  if not rejected then raise exception 'Active child under retired group accepted'; end if;
  if (select count(*) from public.mms_service_catalog_history where catalog_id in(g,s,v)) <> 6 then raise exception 'Failed operations leaked history'; end if;

  begin delete from public.mms_service_catalog where id=v; raise exception 'Delete unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  begin update public.mms_service_catalog_history set changed_by='tampered' where catalog_id=v; raise exception 'History mutation unexpectedly allowed';
  exception when insufficient_privilege then null; end;
end $$;
select 'PASS: catalog role, validation, lifecycle, version and audit assertions' as result;
rollback;
