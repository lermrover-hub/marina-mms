# AI Agent Write Test Plan — Revised
_Status: RUN 1 PASSED — staging seeded, dry-run completed, no writes created._
_Last revised: 2026-06-05_

---

## Staging Database — Ready

| Item | Value |
|---|---|
| Project name | `marina-mms-staging` |
| Project ID | `zanlunbgupdtqznruzok` |
| Region | `ap-south-1` (same as production) |
| URL | `https://zanlunbgupdtqznruzok.supabase.co` |
| Plan | Free ($0/month) |
| Schema | 27 tables applied — schema-only, zero data |
| Production | **completely isolated** — no data copied |

Local dev config template: `C:\marina-mms\.env.staging.example`
Copy to `.env.staging.local` and add `SUPABASE_SERVICE_ROLE_KEY` from:
https://supabase.com/dashboard/project/zanlunbgupdtqznruzok/settings/api

Start the staging web app with `npm.cmd run dev:staging`.
The launcher blocks the production project ID, disables agent and automation
writes, and removes messaging credentials from the process. Do not overwrite
the existing `.env.local`.

All seed records, agent writes, and test runs will use staging only.
Production Supabase (`csltloqbjupxqwbkunsd`) is untouched.

Before Run 1, verify that staging has the required primary keys and unique
constraints. The current schema-only export contains columns and defaults but
does not reproduce those constraints.

Apply staging constraints in the staging Supabase SQL Editor:

```sql
-- paste and run scripts/staging-constraints.sql
```

Import the read-only staging Rate Card copy with:

```powershell
node scripts/import-rate-card-to-staging.mjs
```

Current status: imported and verified on 2026-06-05 with 99 active rows across
14 categories.

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

Seed records go into **staging** (`zanlunbgupdtqznruzok`), not production.
Production is read-only throughout.

Before any seed insertion, confirm the following:

1. **Staging is empty** — run the pre-insert dry-run query below; all counts must be 0
2. **Recovery path** — the cleanup script reverses all inserts; staging can also be
   dropped and recreated from `scripts/staging-schema.sql` at any time
3. **Production unchanged** — no action needed on production backup

```sql
-- Run against STAGING (zanlunbgupdtqznruzok) — all must return 0:
SELECT 'customers'        AS t, COUNT(*) FROM mms_customers        WHERE id = '2fe7332a-4e66-42a5-b882-91293f276515'
UNION ALL
SELECT 'service_requests' AS t, COUNT(*) FROM mms_service_requests WHERE id = 'b13c8371-20e7-417a-b494-87a290e4d8d1'
UNION ALL
SELECT 'invoices'         AS t, COUNT(*) FROM mms_invoices         WHERE id = '60750dac-0d8b-4f37-9d4c-6fdea73d7076'
UNION ALL
SELECT 'contracts'        AS t, COUNT(*) FROM mms_contracts        WHERE id = '1bcc7739-c325-42b8-b5da-309c8d742a0c'
UNION ALL
SELECT 'messages'         AS t, COUNT(*) FROM mms_messages         WHERE sender_id = 'Utest-ai-line-001';
```

---

## Test Seed Records

The executable staging seed helper is:

```powershell
node scripts/seed-ai-agent-staging.mjs seed
```

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
npm.cmd run dev:staging
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
_Awaiting user approval. Run 1 passed on staging with dry-run writes._

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
