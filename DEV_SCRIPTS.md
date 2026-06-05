# Marina MMS - Development State and Safe Commands

Last verified: 2026-06-05 (Full staging regression passed)

## Latest Codex Review for Claude

Review time: 2026-06-05 19:20 Asia/Bangkok

Commit/push is complete.

- Latest commit: `288a7ef ai agent team staging integration`.
- `main` matches `origin/main`.
- Working tree was clean after push.
- Secret check found no real keys in tracked files; only placeholders remain in
  example env files.
- Production read-only smoke check passed:
  - `/` redirects to `/login`, then login responds 200.
  - `/quotations/new` redirects to `/login`, then login responds 200.
  - `/inventory` redirects to `/login`, then login responds 200.
- No production writes, Vercel env changes, or Rate Card changes were made.

Production read-only smoke test results (2026-06-05):

- All 7 read endpoints returned HTTP 200 against marina-mms.vercel.app.
- Write lock confirmed: POST /api/db/notifications returned HTTP 403.
- Full test suite (78 tests) passed against production URL with
  AI_AGENT_DRY_RUN=true and AI_AGENT_SKIP_CLAUDE=true.
- No writes, no Claude API calls, no Vercel env changes made.

Next approval gate:

Do not enable production AI writes yet. Explicit approval required before
setting ENABLE_AI_AGENT_WRITES=true on Vercel.

## Previous Codex Review for Claude

Review time: 2026-06-05 18:30 Asia/Bangkok

Full staging regression check passed. All 78 tests passed against
localhost:3004. DB counts unchanged after test run. System is clean and
ready for commit/push approval.

Regression results:

- AI agent test suite: 78 passed, 0 failed (up from 51 before AI Agent Team expansion).
- DB verified unchanged after test run: quotations=1, notifications=4,
  pricing_master=99, message replied=True.
- Staging server started with `npm.cmd run dev:staging` (read-only, no write flag).
- `AI_AGENT_DRY_RUN=true`, `AI_AGENT_SKIP_CLAUDE=true` throughout.
- No production or Vercel env touched.

Approval needed next:

Approve **commit and push** to main. This will trigger the configured Vercel
deployment automatically. Do not approve until you are ready for that deploy.

## Previous Codex Review for Claude (Run 3)

Review time: 2026-06-05 17:58 Asia/Bangkok

Run 3 staging with real Claude API was completed by Claude and reviewed by
Codex from the handoff plus focused local checks.

Run 3 verified:

- Quotation `B41570` created with 7 line items.
- Quotation line prices matched Rate Card for checked lines:
  - `BOTTOM_FT`: 120/ft, quotation 120 x 40ft.
  - `PAINT_ANTIFOUL_M`: 250/sqm, quotation 250 x 55sqm.
  - Antifouling paint material used market rate ~1,200/litre.
  - Zinc anode labour used 600/unit.
- Notifications were created correctly for invoice overdue and contract expiry.
- Test message was marked replied.
- `pricing_master` stayed at 99 active rows and was not changed.
- HR scheduled-run bug was fixed: with no task/content it now skips gracefully
  instead of sending an empty Claude prompt.
- Real API key was cleared from shell after the run.

Focused Codex checks after Run 3:

- Unit tests not requiring staging server passed: 29 passed, 0 failed.
- `npm.cmd run lint` passed with 0 errors. Remaining 8 warnings are existing
  web app warnings outside the agent work.
- A full `npm.cmd test` needs the staging server running because the live API
  connectivity tests call `http://localhost:3004`.

Approval needed next:

Approve either:

1. **Full staging regression check**: restart staging server and rerun full
   `ai-agents` tests plus DB verification.
2. **Commit/push current work**: only after full staging regression is clean.

Do not approve production writes or Vercel env changes yet.

## Previous Codex Review for Claude

Review time: 2026-06-05 17:30 Asia/Bangkok

AI Agent Team expansion was reviewed after the new Claude session recreated
the work. Current checks pass, but do not approve another write run until the
TEST-AI staging records are reset first.

Latest findings:

1. Fixed router bug: finance keyword `" ar "` matched the word `yard`, so
   `draft JD for boat yard manager` routed to finance instead of HR. Replaced
   that broad keyword with `accounts receivable` / `receivable`.
2. Fixed `ai-agents/package.json` dry-run script: it referenced `cross-env`
   without declaring that dependency. The script now uses Node to set dry-run
   env vars.
3. Removed unused variables/imports from new agent files so new agent warnings
   are gone.
4. `npm.cmd test` in `ai-agents` passed against local staging:
   `78 passed, 0 failed`.
5. `npm.cmd run lint` passed with 0 errors. Remaining 8 warnings are existing
   web app warnings outside the new agent work.
6. Full dry-run of new runner passed against local staging with
   `AI_AGENT_DRY_RUN=true` and `AI_AGENT_SKIP_CLAUDE=true`, but quotation and
   comms processed 0 because previous Run 2 already created the test quotation
   and marked the test message replied.

Approval needed next:

Approve **reset TEST-AI staging seed** before the next full workflow test.
That means running:

```powershell
cd C:\marina-mms
node scripts/seed-ai-agent-staging.mjs cleanup
node scripts/seed-ai-agent-staging.mjs seed
```

After reset, run the new AI agent team in dry-run mode first. If that passes
and DB verification confirms no writes, then request approval for staging
writes. Do not request real Claude API approval until staging dry-run and
staging-write runs both pass.

## Previous Codex Review for Claude

Review time: 2026-06-05 12:11 Asia/Bangkok

Run 1 staging dry-run now passes. Staging is reachable and isolated, Rate Card
has been imported, TEST-AI seed records are present, and dry-run writes are
blocked correctly.

Findings:

1. Staging API is healthy. With `npm.cmd run dev:staging` and agent key
   `local-test-key`, these endpoints returned HTTP 200:
   `/api/db/customers`, `/api/db/service-requests`, `/api/db/quotations`,
   `/api/db/invoices`, `/api/db/contracts`, `/api/db/messages`,
   `/api/db/notifications`, and `/api/pricing-master?isActive=true`.
2. Fixed: `pricing_master` in staging now has 99 active rows across 14
   categories, imported from the first workbook sheet `RATES`.
3. `scripts/staging-schema.sql` is column/default schema only. It has no
   `PRIMARY KEY`, `UNIQUE`, `CREATE INDEX`, `ALTER TABLE`, or `CONSTRAINT`
   statements. Before write tests, staging should match production constraints
   closely enough to catch duplicate IDs and relation mistakes.
4. `ai-agents/.env` still points to production by default. For staging tests,
   always override `MARINA_API_BASE=http://localhost:3004`,
   `MARINA_AGENT_API_KEY=local-test-key`, `AI_AGENT_DRY_RUN=true`, and
   `AI_AGENT_SKIP_CLAUDE=true` in the shell.
5. Running `npm.cmd run build` while a dev server is serving the same `.next`
   directory caused temporary 500s from missing build chunks. Stop the dev
   server and clear `.next` before build checks, or do not run build in parallel
   with local workflow testing.

Verified:

- `npm.cmd run dev:staging` starts on port 3004 and blocks the production
  Supabase project ID.
- Agent-key write lock works: `POST /api/db/notifications` returned HTTP 403
  with `{"error":"AI agent writes are disabled"}`.
- Staging dry-run `node run.js` completed all agents against TEST-AI records:
  quotation processed 1 request, operations found 1 expiring contract, finance
  found 1 overdue invoice, customer-service found 1 overdue invoice, and
  messaging processed 1 unreplied inbound LINE message.
- Staging Rate Card import verified: 99 active rows, 14 categories.
- Dry-run database verification passed: 0 quotations created, 0 notifications
  created, message `replied` stayed false, Rate Card stayed at 99 active rows.
- Agent test suite against staging passed: 51 passed, 0 failed.
- `npm.cmd run lint` passed with existing warnings only.

Bug fixed:

Customer Service report mode counted overdue invoices only when status was
`OVERDUE`. It missed invoices that are still `ISSUED` but past `due_date`.
Fixed `ai-agents/agents/customer-service-agent.js` to use due-date logic, and
added `ai-agents/tests/customer-service-agent.test.js`.

Required next action for Claude:

1. Proceed to Run 2 only if the user approves local staging writes.
2. Keep using `npm.cmd run dev:staging`; do not point agent tests at production.
3. Keep `AI_AGENT_SKIP_CLAUDE=true` until the user approves real Claude API use.
4. Keep production write flags disabled.

Staging Rate Card import command:

```powershell
cd C:\marina-mms
node scripts/import-rate-card-to-staging.mjs
```

Staging TEST-AI seed commands:

```powershell
cd C:\marina-mms
node scripts/seed-ai-agent-staging.mjs seed
node scripts/seed-ai-agent-staging.mjs cleanup
```

## Canonical Workspace

- Web app: `C:\marina-mms`
- AI agents: `C:\marina-mms\ai-agents`
- GitHub: `https://github.com/lermrover-hub/marina-mms`
- Production: `https://marina-mms.vercel.app`
- Do not work from the old Google Drive clone.

## Current Safety Policy

Production data is read-only until the user explicitly approves production writes.

- Keep `ENABLE_AI_AGENT_WRITES` unset.
- Keep `ENABLE_AUTOMATION_WRITES` unset.
- Keep `AI_AGENT_DRY_RUN=true`.
- Keep `AI_AGENT_SKIP_CLAUDE=true` during tests.
- Never put secrets or real key values in tracked files.
- Do not change Rate Card or other production records during tests.

The server enforces these locks:

- Agent-key GET/HEAD requests are allowed.
- Agent-key POST/PATCH/DELETE requests return HTTP 403 unless `ENABLE_AI_AGENT_WRITES=true`.
- Recurring billing remains dry-run unless `ENABLE_AUTOMATION_WRITES=true`.
- LINE and WhatsApp webhooks reject unsigned requests and do not write while automation writes are disabled.

## Safe Test Workflow

Start the staging server:

```powershell
cd C:\marina-mms
npm.cmd run dev:staging
```

In another terminal, run the agent suite against local API:

```powershell
cd C:\marina-mms\ai-agents
$env:MARINA_API_BASE="http://localhost:3004"
$env:MARINA_AGENT_API_KEY="local-test-key"
$env:AI_AGENT_DRY_RUN="true"
$env:AI_AGENT_SKIP_CLAUDE="true"
npm.cmd test
node run.js
```

Run web app verification:

```powershell
cd C:\marina-mms
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

## Last Verified Results

- AI agent tests: `78 passed, 0 failed, 0 skipped` (full regression 2026-06-05)
- Full agent team dry run: quotation, marina, finance, comms, hr, tide passed
- Run 3 real Claude API (staging): quotation ฿41,570 / 7 items, prices matched Rate Card
- DB unchanged after test suite: quotations=1, notifications=4, pricing_master=99
- TypeScript: passed
- Lint: passed with existing warnings and no errors
- Production build: passed
- Agent-key read: HTTP 200
- Agent-key write while locked: HTTP 403
- Valid local cron secret: HTTP 200 dry-run
- Spoofed `x-vercel-cron`: HTTP 401
- Unsigned LINE webhook: HTTP 401
- Unsigned WhatsApp webhook: HTTP 401
- Default/fallback WhatsApp verify token: HTTP 403

## AI Agent Commands

```powershell
cd C:\marina-mms\ai-agents
npm.cmd test
node run.js                                          # all scheduled agents
node run.js --agent=quotation
node run.js --agent=marina                           # (was: operations)
node run.js --agent=finance
node run.js --agent=comms                            # (was: customer-service + messaging)
node run.js --agent=hr --task=jd --role="Technician"
node run.js --agent=tide --boat=<id> --date=2026-06-10
node server.js                                       # HTTP server port 4000 (LINE/email/web-form)
```

Architecture: L1 CEO Orchestrator → L2 (Marina/Finance/HR/Comms) → L3 (Quotation/Tide/Calculator/DocWriter) → L4 (QA/Escalation/AuditTrail)

## Required Secrets

Manage these only in Vercel or ignored local `.env` files:

- `MARINA_AGENT_API_KEY`
- `CRON_SECRET`
- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`

The agent API key was rotated on 2026-06-05 after an old value was accidentally committed. Never reuse the old value.

## Write Enablement Checklist

Do not enable writes until every item is approved:

1. Confirm all local tests and production read-only smoke tests pass.
2. Configure and verify `CRON_SECRET`, LINE, and WhatsApp secrets.
3. Confirm Rate Card and production records remain unchanged during testing.
4. Receive explicit user approval for the specific write workflow.
5. Enable only the required flag:
   - `ENABLE_AI_AGENT_WRITES=true` for agent API writes.
   - `ENABLE_AUTOMATION_WRITES=true` for cron and webhook writes.
6. Monitor the first live run and verify created records.
7. Disable the flag immediately if results differ from expected behavior.

## Staging Supabase

| Item | Value |
|---|---|
| Project | `marina-mms-staging` |
| Project ID | `zanlunbgupdtqznruzok` |
| URL | `https://zanlunbgupdtqznruzok.supabase.co` |
| Schema | 27 tables, schema-only, zero data |
| Config template | `C:\marina-mms\.env.staging.example` |
| Service role key | Get from dashboard → Settings → API |

Local dev against staging:
```powershell
cd C:\marina-mms
Copy-Item .env.staging.example .env.staging.local
# Add the staging SUPABASE_SERVICE_ROLE_KEY to .env.staging.local, then:
npm.cmd run dev:staging
```

Do not overwrite `.env.local`. The staging launcher verifies the staging
project ID, blocks the production project ID, disables write flags, and clears
messaging credentials before starting the app.

## Git and Deployment

```powershell
cd C:\marina-mms
git status
git diff --check
git push origin main
```

Do not manually deploy or enable production writes without explicit approval. GitHub pushes may trigger the configured Vercel deployment automatically.
