-- ─────────────────────────────────────────────────────────────────────────────
-- Marina MMS — Booking Inquiry Table
-- Run once in Supabase SQL editor (or via migration).
-- Stores public booking inquiry form submissions before they become CRM leads.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.inquiries (
  id                uuid        primary key default gen_random_uuid(),
  ref_number        text        not null unique,         -- e.g. INQ-260608-4821

  -- Status
  status            text        not null default 'NEW',  -- NEW | REVIEWED | CONVERTED | CLOSED | SPAM
  assigned_to       uuid        references auth.users(id),

  -- Contact
  full_name         text        not null,
  company           text,
  phone             text,
  email             text,
  preferred_contact text        not null default 'PHONE', -- PHONE | EMAIL | LINE
  line_id           text,

  -- Boat
  boat_name         text        not null,
  boat_type         text,                                 -- SPEEDBOAT | MOTOR_YACHT | SAILING_YACHT | CATAMARAN | PWC | OTHER
  boat_loa_ft       numeric(6,2),
  boat_beam_ft      numeric(6,2),
  boat_draft_ft     numeric(6,2),
  engine_count      int,
  boat_year         int,

  -- Service
  service_category  text        not null,                 -- RAMP_LAUNCH | RAMP_RETRIEVAL | WET_BERTH | DRY_STORAGE | BOAT_REPAIR | OTHER
  preferred_date    date,
  preferred_time    text,
  duration_days     int,
  message           text,

  -- Conversion tracking
  converted_to_customer_id  uuid,
  converted_to_request_id   uuid,
  converted_at              timestamptz,

  -- Meta
  source            text        not null default 'BOOKING_FORM',  -- BOOKING_FORM | PORTAL | PHONE | WALK_IN
  internal_note     text,
  submitted_at      timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Indexes
create index if not exists idx_inquiries_status       on public.inquiries (status);
create index if not exists idx_inquiries_service      on public.inquiries (service_category);
create index if not exists idx_inquiries_submitted    on public.inquiries (submitted_at desc);
create index if not exists idx_inquiries_email        on public.inquiries (email) where email is not null;

-- Auto-update updated_at
create or replace function public.set_inquiries_updated_at()
returns trigger language plpgsql as $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

drop trigger if exists trg_inquiries_updated_at on public.inquiries;
create trigger trg_inquiries_updated_at
  before update on public.inquiries
  for each row execute function public.set_inquiries_updated_at();

-- RLS: allow public insert (no auth), block public read
alter table public.inquiries enable row level security;

-- Anyone (including anonymous) can submit an inquiry
create policy "Public can submit inquiry"
  on public.inquiries for insert
  with check (true);

-- Only authenticated users (staff) can read/update inquiries
create policy "Staff can read inquiries"
  on public.inquiries for select
  using (auth.role() = 'authenticated');

create policy "Staff can update inquiries"
  on public.inquiries for update
  using (auth.role() = 'authenticated');

comment on table public.inquiries is
  'Public booking inquiry form submissions. NEW → REVIEWED → CONVERTED (linked to customer + service request).';
