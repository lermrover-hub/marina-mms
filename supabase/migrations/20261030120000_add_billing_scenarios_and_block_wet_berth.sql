-- Business rules: repair-hold recurring billing, space-lease contracts,
-- seven-day reminders, and Wet Berth unavailable until construction is complete.

alter table if exists public.mms_service_requests
  add column if not exists billing_scenario text;

alter table if exists public.mms_service_payment_plans
  add column if not exists billing_scenario text,
  add column if not exists reminder_lead_days integer not null default 7;

alter table if exists public.mms_contracts
  add column if not exists billing_scenario text default 'SPACE_LEASE',
  add column if not exists reminder_lead_days integer not null default 7;

do $$
begin
  if to_regclass('public.mms_service_requests') is not null then
    update public.mms_service_requests
      set billing_scenario = case
        when coalesce(service_type, '') = 'STORAGE' then 'SPACE_LEASE'
        else 'REPAIR_HOLD_30D'
      end
      where billing_scenario is null;
    begin
      alter table public.mms_service_requests
        add constraint mms_service_requests_billing_scenario_ck
        check (billing_scenario in ('REPAIR_HOLD_30D', 'SPACE_LEASE'));
    exception when duplicate_object then null;
    end;
  end if;

  if to_regclass('public.mms_service_payment_plans') is not null then
    update public.mms_service_payment_plans
      set billing_scenario = 'REPAIR_HOLD_30D',
          reminder_lead_days = 7
      where billing_scenario is null;
    begin
      alter table public.mms_service_payment_plans
        add constraint mms_service_payment_plans_billing_scenario_ck
        check (billing_scenario in ('REPAIR_HOLD_30D', 'SPACE_LEASE'));
    exception when duplicate_object then null;
    end;
  end if;

  if to_regclass('public.mms_contracts') is not null then
    update public.mms_contracts
      set billing_scenario = 'SPACE_LEASE'
      where billing_scenario is null;
    begin
      alter table public.mms_contracts
        add constraint mms_contracts_billing_scenario_ck
        check (billing_scenario in ('SPACE_LEASE', 'REPAIR_HOLD_30D'));
    exception when duplicate_object then null;
    end;
  end if;
end $$;

comment on column public.mms_service_requests.billing_scenario is
  'REPAIR_HOLD_30D starts recurring billing 30 days after first yard start; SPACE_LEASE uses a storage contract.';
comment on column public.mms_service_payment_plans.reminder_lead_days is
  'Days before the first cycle due date to notify Finance; ORM rule is 7.';
comment on column public.mms_contracts.billing_scenario is
  'SPACE_LEASE is the explicit storage/space-rental contract scenario.';
