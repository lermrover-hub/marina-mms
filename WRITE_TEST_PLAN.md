# AI Agent Write Test Plan — Revised
_Status: AWAITING APPROVAL — no seeds inserted, no runs executed._
_Last revised: 2026-06-05_

---

## ⚠️ Staging Database Report

Only **one Supabase project** exists: `orm-marina` (`csltloqbjupxqwbkunsd`, ap-south-1).
There is no staging or development Supabase project.

**Consequence:** seed records will be inserted into the production database.
Test records are isolated by UUID prefix and fully reversible via the cleanup script below,
but there is no automated point-in-time recovery on the current plan tier.

**Action required before proceeding:**
- Confirm that inserting isolated TEST-AI records into the production Supabase is acceptable, OR
- Create a new Supabase staging project and provide credentials before proceeding.

Do not insert any records until this is explicitly approved.

---

## Safety Boundaries (unchanged across all 3 runs)

| Rule | Enforcement |
|---|---|
| `pricing_master` | Read-only. Agents never write to it. |
| `AI_AGENT_DRY_RUN` in `.env` | Stays `true`. Per-run overrides are shell env only. |
| `AI_AGENT_SKIP_CLAUDE` in `.env` | Stays `true`. Per-run overrides are shell env only. |
| Vercel environment | Unchanged throughout. |
| Web app source code | Unchanged throughout. |
| Real production records | Never touched. All writes scoped to TEST-AI UUIDs. |
| LINE sends | Blocked — `LINE_CHANNEL_ACCESS_TOKEN` must NOT be set in local shell. |
| WhatsApp sends | Blocked — `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` must NOT be set. |
| Email sends | Blocked — `RESEND_API_KEY` must NOT be set in local shell. |

**Messaging send guards:** `lib/line.ts`, `lib/whatsapp.ts`, and `lib/email.ts` each check for their
respective credentials and fall back to a console log when absent. The local dev shell must have
none of the three credential variables set.

---

## Fixed UUIDs for Test Records

These UUIDs were generated once and are fixed for all 3 runs.
`mms_customers.id` is `text` type but stores a valid UUID string, which allows
`mms_notifications.customer_id` (`uuid` type) to receive the same value via implicit cast —
no schema alteration required.

| Record | UUID |
|---|---|
| Customer | `2fe7332a-4e66-42a5-b882-91293f276515` |
| Service Request | `b13c8371-20e7-417a-b494-87a290e4d8d1` |
| Invoice | `60750dac-0d8b-4f37-9d4c-6fdea73d7076` |
| Contract | `1bcc7739-c325-42b8-b5da-309c8d742a0c` |
| Message | auto-generated UUID (queried by `sender_id` after insert) |

---

## Database Backup / Recovery Confirmation

Before any seed insertion, confirm the following:

1. **Supabase dashboard backup status** — verify the most recent automatic backup timestamp
   at https://supabase.com/dashboard/project/csltloqbjupxqwbkunsd/database/backups
2. **Manual backup** — run the cleanup SQL below in the Supabase SQL editor now (dry run to confirm 0 rows)
   to verify test tables are clean before inserting
3. **Recovery path** — the cleanup script (Section: Cleanup) reverses all seed inserts.
   No schema changes are made, so a full restore is not required; the cleanup script is sufficient.

```sql
-- Pre-insert dry run: confirm 0 rows exist for test UUIDs
SELECT 'customers'        AS t, COUNT(*) FROM mms_customers        WHERE id = '2fe7332a-4e66-42a5-b882-91293f276515'
UNION ALL
SELECT 'service_requests' AS t, COUNT(*) FROM mms_service_requests WHERE id = 'b13c8371-20e7-417a-b494-87a290e4d8d1'
UNION ALL
SELECT 'invoices'         AS t, COUNT(*) FROM mms_invoices         WHERE id = '60750dac-0d8b-4f37-9d4c-6fdea73d7076'
UNION ALL
SELECT 'contracts'        AS t, COUNT(*) FROM mms_contracts        WHERE id = '1bcc7739-c325-42b8-b5da-309c8d742a0c'
UNION ALL
SELECT 'messages'         AS t, COUNT(*) FROM mms_messages         WHERE sender_id = 'Utest-ai-line-001';
-- All rows must show count = 0 before proceeding.
```

---

## Test Seed Records

### 1. mms_customers

```sql
INSERT INTO public.mms_customers (
  id,
  customer_type,
  first_name,
  last_name,
  email,
  status,
  notes
) VALUES (
  '2fe7332a-4e66-42a5-b882-91293f276515',
  'PRIVATE_OWNER',
  'AI',
  'Test Agent',
  'ai-test@marina-mms-test.local',
  'ACTIVE',
  'TEST RECORD — write test plan 2026-06-05, safe to delete'
);
```

### 2. mms_service_requests

```sql
INSERT INTO public.mms_service_requests (
  id,
  reference,
  customer_id,
  customer_name,
  title,
  description,
  category,
  status,
  notes
) VALUES (
  'b13c8371-20e7-417a-b494-87a290e4d8d1',
  'TEST-AI-SR-001',
  '2fe7332a-4e66-42a5-b882-91293f276515',
  'AI Test Agent',
  'TEST: Antifouling paint — 45ft sailing yacht',
  'TEST: Full bottom antifouling paint, hull wash, zinc anode replacement. Vessel ashore in yard.',
  'OTHER',
  'NEW_REQUEST',
  'TEST RECORD — safe to delete'
);
```

### 3. mms_invoices

Priority logic in finance-agent: `daysOverdue > 30 → HIGH | > 7 → MEDIUM | else LOW`.
At 20 days overdue: **MEDIUM**.

```sql
INSERT INTO public.mms_invoices (
  id,
  invoice_number,
  customer_id,
  customer_name,
  invoice_date,
  due_date,
  status,
  subtotal,
  vat_amount,
  total_amount,
  paid_amount,
  outstanding_balance,
  invoice_type,
  notes
) VALUES (
  '60750dac-0d8b-4f37-9d4c-6fdea73d7076',
  'TEST-AI-INV-001',
  '2fe7332a-4e66-42a5-b882-91293f276515',
  'AI Test Agent',
  CURRENT_DATE,
  CURRENT_DATE - INTERVAL '20 days',
  'ISSUED',
  5000,
  350,
  5350,
  0,
  5350,
  'MANUAL',
  'TEST RECORD — safe to delete'
);
```

### 4. mms_contracts

```sql
INSERT INTO public.mms_contracts (
  id,
  contract_number,
  contract_type,
  customer_id,
  customer_name,
  status,
  billing_cycle,
  rate_amount,
  rate_currency,
  start_date,
  end_date,
  notes
) VALUES (
  '1bcc7739-c325-42b8-b5da-309c8d742a0c',
  'TEST-AI-CONTRACT-001',
  'WET_BERTH',
  '2fe7332a-4e66-42a5-b882-91293f276515',
  'AI Test Agent',
  'ACTIVE',
  'MONTHLY',
  8000,
  'THB',
  CURRENT_DATE - INTERVAL '180 days',
  CURRENT_DATE + INTERVAL '5 days',
  'TEST RECORD — safe to delete'
);
```

### 5. mms_messages

`id` is `uuid` auto-generated. Queried by `sender_id` in verification steps.

```sql
INSERT INTO public.mms_messages (
  channel,
  direction,
  sender_id,
  customer_id,
  message_type,
  content,
  replied
) VALUES (
  'LINE',
  'INBOUND',
  'Utest-ai-line-001',
  '2fe7332a-4e66-42a5-b882-91293f276515',
  'text',
  'TEST: Hi, when will my boat be ready for launch? I need to know before this weekend.',
  false
);
```

---

## Cleanup Script

Run this after all 3 runs pass, or immediately to undo a failed run.

```sql
DELETE FROM public.mms_notifications
  WHERE customer_id::text = '2fe7332a-4e66-42a5-b882-91293f276515'
     OR reference_id IN (
       '60750dac-0d8b-4f37-9d4c-6fdea73d7076',
       '1bcc7739-c325-42b8-b5da-309c8d742a0c'
     );

DELETE FROM public.mms_quotations
  WHERE customer_id = '2fe7332a-4e66-42a5-b882-91293f276515';

DELETE FROM public.mms_messages
  WHERE sender_id = 'Utest-ai-line-001';

DELETE FROM public.mms_invoices
  WHERE id = '60750dac-0d8b-4f37-9d4c-6fdea73d7076';

DELETE FROM public.mms_contracts
  WHERE id = '1bcc7739-c325-42b8-b5da-309c8d742a0c';

DELETE FROM public.mms_service_requests
  WHERE id = 'b13c8371-20e7-417a-b494-87a290e4d8d1';

DELETE FROM public.mms_customers
  WHERE id = '2fe7332a-4e66-42a5-b882-91293f276515';
```

---

## Run 1 — Read + Validate
_DRY_RUN=true · SKIP_CLAUDE=true · ENABLE_AI_AGENT_WRITES unset (403 on writes)_
_No LINE / WhatsApp / email credentials in local shell._

### Purpose
Confirm agents correctly identify all 5 test records without creating any DB records.

### Local server setup

```powershell
cd C:\marina-mms
# Messaging credentials must NOT be set:
Remove-Item Env:RESEND_API_KEY            -ErrorAction SilentlyContinue
Remove-Item Env:LINE_CHANNEL_ACCESS_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:WHATSAPP_PHONE_NUMBER_ID  -ErrorAction SilentlyContinue
Remove-Item Env:WHATSAPP_ACCESS_TOKEN     -ErrorAction SilentlyContinue
$env:MARINA_AGENT_API_KEY = "local-test-key"
npm.cmd run dev -- --port 3004
```

### Agent run (second terminal)

```powershell
cd C:\marina-mms\ai-agents
$env:MARINA_API_BASE       = "http://localhost:3004"
$env:MARINA_AGENT_API_KEY  = "local-test-key"
$env:AI_AGENT_DRY_RUN      = "true"
$env:AI_AGENT_SKIP_CLAUDE  = "true"
# Do NOT set ENABLE_AI_AGENT_WRITES
node run.js
```

### Expected output — exact pass criteria

| Agent | Expected log line | Pass condition |
|---|---|---|
| Quotation | `1 requests need quotations` | TEST-AI-SR-001 found with status NEW_REQUEST |
| Quotation | `DRY RUN: skipped quotation write` | zero rows inserted |
| Operations | `Contract expiring in 5 days` | TEST-AI-CONTRACT-001 found |
| Operations | `DRY RUN: skipped notification write` | zero rows inserted |
| Finance | `1 overdue` | TEST-AI-INV-001 found (20 days overdue) |
| Finance | `DRY RUN: skipped notification write` | zero rows inserted |
| Messaging | `1 unreplied inbound messages` | TEST-AI-MSG-001 found |
| Messaging | `DRY RUN:` on send + mark-replied | zero writes, `replied` stays false |
| All 5 agents | exit code 0 | no crashes or unhandled errors |

### DB verification after Run 1 (all must return 0 / unchanged)

```sql
SELECT COUNT(*) AS quotations_created
FROM mms_quotations WHERE customer_id = '2fe7332a-4e66-42a5-b882-91293f276515';
-- Expected: 0

SELECT COUNT(*) AS notifications_created
FROM mms_notifications WHERE customer_id::text = '2fe7332a-4e66-42a5-b882-91293f276515';
-- Expected: 0

SELECT replied FROM mms_messages WHERE sender_id = 'Utest-ai-line-001';
-- Expected: false (unchanged)

SELECT COUNT(*) AS pricing_master_rows FROM pricing_master;
-- Expected: same count as before run (no Rate Card changes)
```

---

## Run 2 — Local Write, Mock Claude
_Awaiting Run 1 approval. Details available on request._

## Run 3 — Local Write, Real Claude
_Awaiting Run 2 approval. Details available on request._

---

## Approval Gates

| Gate | Requires | Approved | Date |
|---|---|---|---|
| Staging DB decision | User confirms production Supabase is acceptable OR provides staging credentials | pending | — |
| Backup / pre-insert dry run | Zero-count query shows clean slate | pending | — |
| Seed record insertion (5 records) | User approves this section | pending | — |
| Run 1 execution | Seed insertion confirmed | pending | — |
| Run 2 plan details | Run 1 results approved | pending | — |
| Run 2 execution | Run 2 plan approved | pending | — |
| Run 3 execution | Run 2 results approved | pending | — |
| Enable `ENABLE_AI_AGENT_WRITES` in Vercel | Run 3 results approved | pending | — |
