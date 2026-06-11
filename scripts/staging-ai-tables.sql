-- Staging supplement: AI approval system tables
-- Run this in the Staging Supabase SQL Editor (zanlunbgupdtqznruzok)
-- before executing Run 2 of the write test plan.
-- Safe to re-run: all statements use IF NOT EXISTS / DO NOTHING.

-- ── ai_orders ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_orders (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_name  TEXT NOT NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  input_data  JSONB NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  approval_count INT DEFAULT 0,
  approval_required_role TEXT DEFAULT 'MANAGING_DIRECTOR',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  TEXT
);

CREATE INDEX IF NOT EXISTS ai_orders_agent_status ON public.ai_orders(agent_name, status);
CREATE INDEX IF NOT EXISTS ai_orders_entity       ON public.ai_orders(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS ai_orders_created_at   ON public.ai_orders(created_at DESC);

-- ── approval_queue ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.approval_queue (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id     TEXT NOT NULL REFERENCES public.ai_orders(id) ON DELETE CASCADE,
  approver_role TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  reason       TEXT,
  approved_by  TEXT,
  approved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS approval_queue_order_id  ON public.approval_queue(order_id);
CREATE INDEX IF NOT EXISTS approval_queue_status    ON public.approval_queue(status);
CREATE INDEX IF NOT EXISTS approval_queue_approver  ON public.approval_queue(approver_role, status);

-- ── mms_agent_audit_log ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mms_agent_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name  TEXT NOT NULL,
  action      TEXT NOT NULL,
  user_id     TEXT,
  tool_call   TEXT,
  payload     JSONB,
  result      JSONB,
  risk_level  TEXT DEFAULT 'LOW',
  error       TEXT,
  duration_ms INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mms_agent_audit_log_agent  ON public.mms_agent_audit_log(agent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS mms_agent_audit_log_risk   ON public.mms_agent_audit_log(risk_level);

-- ── mms_messages extra columns ─────────────────────────────────────────────
-- These columns are written by comms-agent for outbound PENDING_APPROVAL drafts.
ALTER TABLE public.mms_messages
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS agent_generated BOOLEAN DEFAULT FALSE;

-- ── mms_quotations: generated_by column ────────────────────────────────────
-- The execute route writes generated_by = 'ai-agent' on mms_quotations.
ALTER TABLE public.mms_quotations
  ADD COLUMN IF NOT EXISTS generated_by TEXT DEFAULT NULL;

-- ── Verify ─────────────────────────────────────────────────────────────────
-- Run each SELECT after applying; every row must return 1 or 'ai_orders' etc.
SELECT 'ai_orders'           AS t, COUNT(*) FROM public.ai_orders           UNION ALL
SELECT 'approval_queue'      AS t, COUNT(*) FROM public.approval_queue      UNION ALL
SELECT 'mms_agent_audit_log' AS t, COUNT(*) FROM public.mms_agent_audit_log;
