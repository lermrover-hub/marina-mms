-- AI Order & Approval System
-- Tracks all AI-initiated changes, approval workflow, and tool call logging

-- AI Orders: Track what agents want to do
CREATE TABLE ai_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL, -- 'create_quotation', 'create_invoice', 'create_work_order', etc.
  entity_type TEXT NOT NULL, -- 'quotation', 'invoice', 'work_order', etc.
  entity_id TEXT, -- Set after entity is created; null if draft
  input_data JSONB NOT NULL, -- What agent proposed
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, executed, cancelled
  approval_count INT DEFAULT 0,
  approval_required_role TEXT DEFAULT 'MANAGING_DIRECTOR', -- Who must approve
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT -- System or user ID if manual
);

CREATE INDEX ai_orders_agent_status ON ai_orders(agent_name, status);
CREATE INDEX ai_orders_entity ON ai_orders(entity_type, entity_id);
CREATE INDEX ai_orders_created_at ON ai_orders(created_at DESC);

-- Approval Queue: Track approval decisions
CREATE TABLE approval_queue (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT NOT NULL REFERENCES ai_orders(id) ON DELETE CASCADE,
  approver_role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reason TEXT, -- Approval/rejection reason
  approved_by TEXT, -- User ID of approver
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX approval_queue_order_id ON approval_queue(order_id);
CREATE INDEX approval_queue_status ON approval_queue(status);
CREATE INDEX approval_queue_approver ON approval_queue(approver_role, status);

-- AI Tool Calls: Audit log of all agent API calls
CREATE TABLE ai_tool_calls (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_name TEXT NOT NULL,
  order_id TEXT REFERENCES ai_orders(id) ON DELETE SET NULL,
  api_endpoint TEXT NOT NULL, -- '/api/db/quotations', etc.
  method TEXT NOT NULL, -- GET, POST, PATCH, DELETE
  input_data JSONB, -- Request body or query params
  output_data JSONB, -- Response body
  status_code INT, -- HTTP status
  error_message TEXT, -- If failed
  duration_ms INT, -- API call duration
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ai_tool_calls_agent ON ai_tool_calls(agent_name, created_at DESC);
CREATE INDEX ai_tool_calls_order_id ON ai_tool_calls(order_id);
CREATE INDEX ai_tool_calls_endpoint ON ai_tool_calls(api_endpoint);

-- AI Permissions: Define what each agent can do
CREATE TABLE ai_permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL, -- 'create_quotation', 'create_invoice', etc.
  entity_type TEXT NOT NULL, -- 'quotation', 'invoice', 'work_order'
  requires_approval BOOLEAN DEFAULT true,
  approval_role TEXT DEFAULT 'MANAGING_DIRECTOR',
  max_amount DECIMAL(12, 2), -- null = no limit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_name, action, entity_type)
);

CREATE INDEX ai_permissions_agent_action ON ai_permissions(agent_name, action);

-- Add approval tracking to quotations
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS draft_by_agent BOOLEAN DEFAULT false;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft'; -- draft, pending_approval, approved, rejected, converted
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS ai_order_id TEXT REFERENCES ai_orders(id) ON DELETE SET NULL;

-- Add approval tracking to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS draft_by_agent BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ai_order_id TEXT REFERENCES ai_orders(id) ON DELETE SET NULL;

-- Seed default permissions for agents (read-only safe operations)
INSERT INTO ai_permissions (agent_name, action, entity_type, requires_approval, approval_role, max_amount) VALUES
  ('quotation', 'create_quotation', 'quotation', true, 'MANAGING_DIRECTOR', null),
  ('finance', 'create_invoice', 'invoice', true, 'FINANCE', null),
  ('marina', 'create_notification', 'notification', false, null, null),
  ('finance', 'create_notification', 'notification', false, null, null),
  ('customer-service', 'create_notification', 'notification', false, null, null)
ON CONFLICT (agent_name, action, entity_type) DO NOTHING;
