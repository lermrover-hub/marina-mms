# AI Agent Write Test Plan
_Status: AWAITING APPROVAL — do not execute until user signs off each run._

---

## Safety Boundaries

- Rate Card (`pricing_master`) → READ-ONLY in all 3 runs, never touched by agents
- Production Vercel → untouched; no deployment changes
- `AI_AGENT_DRY_RUN` and `AI_AGENT_SKIP_CLAUDE` → only changed in local shell env per run
- All writes go to **local dev server** (`http://localhost:3004`) backed by production Supabase
- All test records use `TEST-AI-` prefix and are safe to delete after each run
- `ENABLE_AI_AGENT_WRITES` set **only in local PowerShell session**, never in Vercel

---

## Pre-flight: Bug Fix Required Before Run 2

**Bug:** `mms_notifications.customer_id` is `uuid` type, but all agent tables use `text`.  
Agents call `createNotification({ customer_id: "test-ai-cust-001" })` → Postgres type cast error.

**Fix (Supabase SQL):**
```sql
ALTER TABLE public.mms_notifications
  ALTER COLUMN customer_id TYPE text USING customer_id::text;
```
_Must be run and confirmed before Run 2. Requires user approval._

---

## Test Seed Records

Six records to be inserted via Supabase MCP before any run.  
**None of these are production business records. All have TEST-AI- prefix.**

### 1. mms_customers — TEST-AI-CUSTOMER-001
```sql
INSERT INTO public.mms_customers (
  id, customer_type, first_name, last_name,
  email, status, notes
) VALUES (
  'test-ai-cust-001',
  'PRIVATE_OWNER',
  'AI', 'Test Agent',
  'ai-test@marina-mms-test.local',
  'ACTIVE',
  'TEST RECORD — created by write test plan, safe to delete'
);
```

### 2. mms_service_requests — TEST-AI-SR-001
```sql
INSERT INTO public.mms_service_requests (
  reference, customer_id, customer_name,
  title, description, category, status, notes
) VALUES (
  'TEST-AI-SR-001',
  'test-ai-cust-001',
  'AI Test Agent',
  'TEST: Antifouling paint — 45ft sailing yacht',
  'TEST: Full bottom antifouling paint, hull wash, zinc anode replacement. Vessel ashore in yard.',
  'OTHER',
  'NEW_REQUEST',
  'TEST RECORD — safe to delete'
);
```

### 3. mms_invoices — TEST-AI-INV-001
```sql
INSERT INTO public.mms_invoices (
  invoice_number, customer_id, customer_name,
  invoice_date, due_date, status,
  subtotal, vat_amount, total_amount,
  paid_amount, outstanding_balance, notes
) VALUES (
  'TEST-AI-INV-001',
  'test-ai-cust-001',
  'AI Test Agent',
  CURRENT_DATE,
  CURRENT_DATE - INTERVAL '20 days',   -- 20 days overdue
  'ISSUED',
  5000, 350, 5350,
  0, 5350,
  'TEST RECORD — safe to delete'
);
```

### 4. mms_contracts — TEST-AI-CONTRACT-001
```sql
INSERT INTO public.mms_contracts (
  contract_number, contract_type,
  customer_id, customer_name,
  status, billing_cycle, rate_amount,
  start_date, end_date, notes
) VALUES (
  'TEST-AI-CONTRACT-001',
  'WET_BERTH',
  'test-ai-cust-001',
  'AI Test Agent',
  'ACTIVE',
  'MONTHLY',
  8000,
  CURRENT_DATE - INTERVAL '180 days',
  CURRENT_DATE + INTERVAL '5 days',    -- expiring in 5 days → HIGH priority
  'TEST RECORD — safe to delete'
);
```

### 5. mms_messages — TEST-AI-MSG-001
```sql
INSERT INTO public.mms_messages (
  channel, direction, sender_id,
  customer_id, message_type, content, replied
) VALUES (
  'LINE',
  'INBOUND',
  'Utest-ai-line-sender-001',
  'test-ai-cust-001',
  'text',
  'TEST: Hi, when will my boat be ready for launch? I need to know before this weekend.',
  false
);
```

### 6. Cleanup script (run after all 3 runs pass)
```sql
DELETE FROM public.mms_notifications WHERE reference_id LIKE 'test-ai-%' OR customer_id = 'test-ai-cust-001';
DELETE FROM public.mms_messages     WHERE customer_id = 'test-ai-cust-001';
DELETE FROM public.mms_quotations   WHERE customer_id = 'test-ai-cust-001';
DELETE FROM public.mms_invoices     WHERE customer_id = 'test-ai-cust-001';
DELETE FROM public.mms_contracts    WHERE customer_id = 'test-ai-cust-001';
DELETE FROM public.mms_service_requests WHERE customer_id = 'test-ai-cust-001';
DELETE FROM public.mms_customers    WHERE id = 'test-ai-cust-001';
```

---

## Run 1 — Read + Validate (DRY_RUN=true, SKIP_CLAUDE=true)

**Purpose:** Confirm agents correctly identify all 5 test records as needing action.  
**Writes:** None. All writes blocked by DRY_RUN and middleware 403.

### Commands
```powershell
cd C:\marina-mms
$env:MARINA_AGENT_API_KEY="local-test-key"
npm.cmd run dev -- --port 3004
# (in second terminal)
cd C:\marina-mms\ai-agents
$env:MARINA_API_BASE="http://localhost:3004"
$env:MARINA_AGENT_API_KEY="local-test-key"
$env:AI_AGENT_DRY_RUN="true"
$env:AI_AGENT_SKIP_CLAUDE="true"
node run.js
```

### Expected output — exact pass criteria
| Agent | Expected log | Pass if |
|---|---|---|
| Quotation | `1 requests need quotations` | finds TEST-AI-SR-001 |
| Quotation | `DRY RUN: skipped quotation write` | no DB write |
| Operations | `Contract expiring in 5 days` | finds TEST-AI-CONTRACT-001 |
| Operations | `DRY RUN: skipped notification write` | no DB write |
| Finance | `1 overdue` | finds TEST-AI-INV-001 (20d overdue) |
| Finance | `DRY RUN: skipped notification write` | no DB write |
| Messaging | `1 unreplied inbound messages` | finds TEST-AI-MSG-001 |
| Messaging | `DRY RUN:` lines for send + mark-replied | no DB write |
| All 5 agents | exit code 0 | no crashes |

### DB verification after Run 1
```sql
-- All must return 0 rows:
SELECT COUNT(*) FROM mms_quotations   WHERE customer_id = 'test-ai-cust-001';
SELECT COUNT(*) FROM mms_notifications WHERE customer_id = 'test-ai-cust-001';
SELECT replied  FROM mms_messages     WHERE customer_id = 'test-ai-cust-001';
-- replied must still be false
```

---

## Run 2 — Local Write with Mock Claude (DRY_RUN=false, SKIP_CLAUDE=true)

**Purpose:** Confirm agents create correctly structured records. Claude calls return mock data.  
**Prerequisite:** Bug fix (`mms_notifications.customer_id` → text) approved and applied.  
**Writes:** Local server → production Supabase (TEST-AI-* records only).

### Commands
```powershell
# Same local server from Run 1 (still running)
cd C:\marina-mms\ai-agents
$env:MARINA_API_BASE="http://localhost:3004"
$env:MARINA_AGENT_API_KEY="local-test-key"
$env:ENABLE_AI_AGENT_WRITES="true"   # local shell only — NOT in Vercel
$env:AI_AGENT_DRY_RUN="false"
$env:AI_AGENT_SKIP_CLAUDE="true"
node run.js
```

### Expected records created
| Table | Expected record | Key fields to verify |
|---|---|---|
| `mms_quotations` | 1 new DRAFT quotation | `customer_id=test-ai-cust-001`, `status=DRAFT`, `generated_by=ai-agent`, `title` contains "TEST-AI-SR-001" or service description |
| `mms_notifications` | 1 contract_expiry notification | `type=contract_expiry`, `priority=HIGH`, `customer_id=test-ai-cust-001` |
| `mms_notifications` | 1 invoice_overdue notification | `type=invoice_overdue`, `priority=HIGH` (>14d), `customer_id=test-ai-cust-001` |
| `mms_messages` | TEST-AI-MSG-001 `replied=true` | messaging agent marks it replied |

### DB verification after Run 2
```sql
-- Quotation created:
SELECT id, status, generated_by, title, grand_total
FROM mms_quotations WHERE customer_id = 'test-ai-cust-001';
-- Expected: 1 row, status=DRAFT, generated_by=ai-agent

-- Notifications created:
SELECT type, priority, title
FROM mms_notifications WHERE customer_id = 'test-ai-cust-001'
ORDER BY created_at;
-- Expected: 2 rows — contract_expiry (HIGH) and invoice_overdue (HIGH)

-- Message marked replied:
SELECT replied FROM mms_messages WHERE customer_id = 'test-ai-cust-001';
-- Expected: replied = true

-- Rate Card unchanged (MUST be verified):
SELECT COUNT(*) FROM pricing_master;
-- Expected: same count as before
SELECT updated_at FROM pricing_master ORDER BY updated_at DESC LIMIT 1;
-- Expected: no updates after test start time
```

---

## Run 3 — Local Write with Real Claude (DRY_RUN=false, SKIP_CLAUDE=false)

**Purpose:** End-to-end test with real Claude API. Verify quotation items are realistic  
and customer service reply is contextual. Rate Card used as read-only context.  
**Prerequisite:** Run 2 pass confirmed. Cleanup script run first to reset test records.

### Pre-run reset
```sql
-- Reset TEST-AI records before Run 3:
DELETE FROM mms_notifications WHERE customer_id = 'test-ai-cust-001';
DELETE FROM mms_quotations    WHERE customer_id = 'test-ai-cust-001';
UPDATE mms_messages SET replied = false WHERE customer_id = 'test-ai-cust-001';
```

### Commands
```powershell
cd C:\marina-mms\ai-agents
$env:MARINA_API_BASE="http://localhost:3004"
$env:MARINA_AGENT_API_KEY="local-test-key"
$env:ENABLE_AI_AGENT_WRITES="true"
$env:AI_AGENT_DRY_RUN="false"
$env:AI_AGENT_SKIP_CLAUDE="false"
$env:ANTHROPIC_API_KEY="sk-ant-..."   # real key required
node run.js
```

### Expected results — additional checks vs Run 2
| Check | Pass criteria |
|---|---|
| Quotation items | `items` array has 2–8 entries, each with description, category, unitPrice > 0 |
| Quotation items | At least one item references antifouling, haul-out, or wash (from service description) |
| Quotation totals | `grand_total > 0`, `deposit_req = round(grand_total * 0.5)`, `tax_amount = round(subtotal * 0.07)` |
| Messaging reply | Reply text > 20 chars, references boat or service context, ends with phone number |
| Rate Card unchanged | Same row count + no updated_at change (identical to Run 2 check) |
| No other production records touched | Spot check 3 random real customers — no changes |

### DB verification after Run 3
```sql
-- Quotation items populated:
SELECT qi.description, qi.qty, qi.unit_price, qi.line_total
FROM mms_quotation_items qi
JOIN mms_quotations q ON qi.quotation_id = q.id
WHERE q.customer_id = 'test-ai-cust-001';
-- Expected: 2-8 rows with non-zero unit_price

-- Rate Card integrity:
SELECT code, rate_thb, updated_at FROM pricing_master
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;
-- Expected: 0 rows (no recent updates)
```

---

## Approval Gates

| Gate | Approved by | Date |
|---|---|---|
| Seed records insertion | pending | — |
| Bug fix (notifications type) | pending | — |
| Run 1 results | pending | — |
| Run 2 results | pending | — |
| Run 3 results | pending | — |
| Enable Vercel `ENABLE_AI_AGENT_WRITES` | pending | — |

---

## What Does NOT Change in Any Run
- `pricing_master` table — read-only throughout
- All real `mms_customers` records other than `test-ai-cust-001`
- All real `mms_boats`, `mms_contracts`, `mms_invoices`, `mms_quotations` records
- Vercel environment variables
- `AI_AGENT_DRY_RUN` or `AI_AGENT_SKIP_CLAUDE` in `.env` file
- Any web app source code
