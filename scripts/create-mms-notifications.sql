create extension if not exists pgcrypto;

create table if not exists public.mms_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'info',
  title text not null,
  message text not null,
  customer_id uuid null,
  reference_id text null,
  priority text not null default 'MEDIUM'
    check (priority in ('HIGH', 'MEDIUM', 'LOW')),
  read boolean not null default false,
  link text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mms_notifications_read_created_at_idx
  on public.mms_notifications (read, created_at desc);

create index if not exists mms_notifications_customer_id_idx
  on public.mms_notifications (customer_id);
