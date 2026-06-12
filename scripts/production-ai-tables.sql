-- Production migration: AI approval system tables + agent columns
-- Target: Production Supabase (csltloqbjupxqwbkunsd)
-- Applied: 2026-06-11 as part of Phase 5E production go-live preparation
-- Safe to re-run: all DDL uses IF NOT EXISTS / ON CONFLICT DO NOTHING
--
-- Execution order:
--   1. Run this file in the Production Supabase SQL Editor
--   2. Then run scripts/fix-messages-approval-status-constraint.sql

-- ── ai_orders ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_orders (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name            TEXT        NOT NULL,
  action                TEXT        NOT NULL,
  entity_type           TEXT        NOT NULL,
  entity_id             UUID,
  input_data            JSONB       NOT NULL DEFAULT '{}',
  status                TEXT        NOT NULL DEFAULT 'pending',
  approval_required_role TEXT       NOT NULL DEFAULT 'MANAGING_DIRECTOR',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_orders_status_check CHECK (
    status = ANY (ARRAY['pending','approved','rejected','executed','cancelled'])
  )
);

CREATE INDEX IF NOT EXISTS ai_orders_agent_status ON public.ai_orders (agent_name, status);
CREATE INDEX IF NOT EXISTS ai_orders_entity       ON public.ai_orders (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS ai_orders_created_at   ON public.ai_orders (created_at DESC);

-- ── approval_queue ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.approval_queue (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID        NOT NULL REFERENCES public.ai_orders (id) ON DELETE CASCADE,
  approver_role TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'pending',
  approved_by   TEXT,
  approved_at   TIMESTAMPTZ,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT approval_queue_status_check CHECK (
    status = ANY (ARRAY['pending','approved','rejected'])
  )
);

CREATE INDEX IF NOT EXISTS approval_queue_order_id ON public.approval_queue (order_id);
CREATE INDEX IF NOT EXISTS approval_queue_status   ON public.approval_queue (status);
CREATE INDEX IF NOT EXISTS approval_queue_approver ON public.approval_queue (approver_role, status);

-- ── mms_agent_audit_log ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mms_agent_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name  TEXT        NOT NULL,
  action      TEXT        NOT NULL,
  user_id     TEXT,
  tool_call   TEXT,
  payload     JSONB,
  result      JSONB,
  risk_level  TEXT        NOT NULL DEFAULT 'LOW',
  error       TEXT,
  duration_ms INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mms_agent_audit_log_risk_level_check CHECK (
    risk_level = ANY (ARRAY['LOW','MEDIUM','HIGH','CRITICAL'])
  )
);

CREATE INDEX IF NOT EXISTS mms_agent_audit_log_agent ON public.mms_agent_audit_log (agent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS mms_agent_audit_log_risk  ON public.mms_agent_audit_log (risk_level);

-- ── mms_agent_config ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mms_agent_config (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   TEXT        NOT NULL UNIQUE,
  label      TEXT        NOT NULL,
  config     JSONB       NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

-- Seed default config (matches staging) — skip if already inserted
INSERT INTO public.mms_agent_config (agent_id, label, config) VALUES
  ('comms',     'Comms Agent',     '{"tone":"warm, professional","phone":"+66 82 878 9149","language":"EN/TH bilingual-aware","max_words":150,"extra_instructions":""}'),
  ('finance',   'Finance Agent',   '{"overdue_warn_days":7,"upcoming_due_days":3,"extra_instructions":"","escalation_amount_thb":50000}'),
  ('hr',        'HR Agent',        '{"default_language":"EN","max_kpis":8,"onboarding_days":30,"extra_instructions":""}'),
  ('marina',    'Marina Agent',    '{"contract_expiry_warn_days":30,"insurance_expiry_warn_days":30,"work_order_overdue_days":14}'),
  ('quotation', 'Quotation Agent', '{"vat_pct":7,"valid_days":7,"deposit_pct":50,"max_discount_pct":15,"extra_instructions":""}'),
  ('tide',      'Tide Agent',      '{"ramp_offset_m":-1,"trailer_height_m":0.7,"safety_clearance_m":0.1}')
ON CONFLICT (agent_id) DO NOTHING;

-- ── mms_messages: agent columns ────────────────────────────────────────────
ALTER TABLE public.mms_messages
  ADD COLUMN IF NOT EXISTS approval_status TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS agent_generated BOOLEAN DEFAULT FALSE;

-- ── mms_quotations: provenance column ─────────────────────────────────────
ALTER TABLE public.mms_quotations
  ADD COLUMN IF NOT EXISTS generated_by TEXT DEFAULT NULL;

-- ── Verify ─────────────────────────────────────────────────────────────────
SELECT 'ai_orders'           AS t, COUNT(*) FROM public.ai_orders           UNION ALL
SELECT 'approval_queue'      AS t, COUNT(*) FROM public.approval_queue      UNION ALL
SELECT 'mms_agent_audit_log' AS t, COUNT(*) FROM public.mms_agent_audit_log UNION ALL
SELECT 'mms_agent_config'    AS t, COUNT(*) FROM public.mms_agent_config;
