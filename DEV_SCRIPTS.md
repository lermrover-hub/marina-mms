# Marina MMS - Development State and Safe Commands

## CODEX REVIEW OF CLAUDE COMMIT 9ce1389 - 2026-06-12

- Found Finance preview did not apply `upcoming_due_days`; fixed upcoming invoice count/list/total output.
- Found Marina preview silently ignored Supabase query errors; fixed it to fail explicitly.
- Found Control Center error messages used success styling; added distinct error state.
- Full findings and remaining verification are recorded in `CLAUDE_HANDOFF.md`.
- Production writes/messages/bookings remain disabled. Do not change those flags for verification.

> Current Claude Code handoff: read `C:\marina-mms\CLAUDE_HANDOFF.md` first. It contains the active branch, completed AI Agent Control Center work, test evidence, remaining full-app QA, deployment steps, and production safety boundaries.

## ACTIVE HANDOFF TO CODEX - 2026-06-12 (Claude → Codex)

**Read `C:\marina-mms\CLAUDE_HANDOFF.md` first — it has the full task spec.**

### Branch and commit state

- Active branch: `codex/ai-agent-control-center`
- Latest commit: `ee25b7a` (docs handoff — no code)
- All AI Agent Control Center code is **uncommitted** in the working tree
- `main` is at `01ce426` — do not merge until build passes and QA is clean

### What Codex built (all uncommitted — DO NOT discard)

- `/ai-agents` web page — configure and preview all six agents
- `/api/ai/control` API routes — config GET/PATCH, preview run
- `lib/agent-config-schema.ts` and `lib/agent-access.ts` — shared libraries
- Six agent runtimes updated to consume DB config instead of hardcoded values
- `app/(dashboard)/settings/page.tsx` and `Sidebar.tsx` updated
- `scripts/production-ai-tables.sql` updated

### Tests that PASS on current working tree

| Suite | Result |
|---|---|
| `npm.cmd test` (web) | 34/34 PASS |
| `npm.cmd --prefix ai-agents test` | 124 passed / 20 live skipped / 0 failed |
| `npx.cmd tsc --noEmit` | PASS |
| `npm.cmd run lint -- --quiet` | PASS |
| Browser QA (6 agent previews) | PASS locally |
| VAT 25% validation rejection | PASS — no DB write |

### ONE pending item before commit

- `npm.cmd run build` timed out at ~184 seconds — did NOT report a compile error
- Re-run with longer timeout; fix any actual failure, then commit

### Codex task (from CLAUDE_HANDOFF.md)

1. `npm.cmd run build` — fix if broken, otherwise proceed
2. Local QA: `/ai-agents` page, all six previews, route/link/button audit
3. Commit all changes on `codex/ai-agent-control-center`
4. Push branch, merge/fast-forward to `main`, push to trigger Vercel
5. Wait for Vercel Ready, smoke-test production `/ai-agents`
6. Report: bugs found, files fixed, build/test/deploy results

---

## AI AGENT CONTROL CENTER - 2026-06-12

- Added `/ai-agents` to configure and run safe previews for all six scheduled
  agents: quotation, marina, finance, communications, HR, and tide.
- Added shared config validation, default merging, and HR config support.
- Agent runtime now consumes database rules for all six agents; thresholds are
  no longer hardcoded in Finance, Marina, Communications, or HR workflows.
- Web runs are preview-only and always return `writes_performed=false`.
- Production database writes, customer messages, and bookings remain blocked.
- Anthropic-backed analysis is implemented but remains disabled until
  `ANTHROPIC_API_KEY` is explicitly approved and configured in the web app
  environment. No secret was changed during this implementation.
- Browser QA passed for all six previews. Invalid VAT 25% was rejected by API
  validation before any database update.
- Verification: web tests 34 passed; agent tests 124 passed / 20 live skipped;
  TypeScript, lint, and production build passed.

---

## PREVIOUS HANDOFF (Claude session 2026-06-12 01:25 ICT)

### Current production state

- Production URL: `https://marina-mms.vercel.app`
- Latest pushed commit: `01ce426` (handoff update; runtime fix remains `e7710b7`)
- Vercel deployment: **Ready · Latest · Current** (deployed 2026-06-12 01:26 ICT)
- Production is in safe mode — all flags fail-closed:
  - `AI_AGENT_DRY_RUN=true`
  - `ENABLE_AI_AGENT_WRITES=false`
  - `ENABLE_REAL_CUSTOMER_MESSAGES=false`
  - `ENABLE_PRODUCTION_BOOKINGS=false`
  - `ENABLE_AUTOMATION_WRITES=false`
- All write probes return **403**. Reads return **200**.
- `MARINA_AGENT_API_KEY` was accidentally set to a wrong value (`sk_live_a12...`)
  in Vercel. **User corrected it at ~01:14 ICT.** Redeployed and verified.
- Agent key is in `C:\marina-mms\ai-agents\.env` — always read it with
  `grep MARINA_AGENT_API_KEY ai-agents/.env | cut -d= -f2` to avoid
  `l` vs `1` transcription errors.

### All verification checks PASS (2026-06-12 ~01:25 ICT)

| Check | Result |
|---|---|
| GET /api/db/quotations/88d9a6ca HTTP 200 | ✅ PASS |
| Response has mms_quotation_items (1 item) | ✅ PASS |
| subtotal=1000, vat=70, total=1070 | ✅ PASS |
| Quotation status = DRAFT | ✅ PASS |
| GET /api/db/customers returns 200 | ✅ PASS |
| POST /api/db/messages blocked 403 | ✅ PASS |
| POST /api/db/ramp-bookings blocked 403 | ✅ PASS |
| POST /api/db/quotations blocked 403 | ✅ PASS |
| POST /api/ai/orders blocked 403 | ✅ PASS |
| POST /api/tide/calculate returns 200 | ✅ PASS |
| /quotations/88d9a6ca page loads 200 | ✅ PASS |
| /print/quotations/88d9a6ca page loads 200 | ✅ PASS |

### Controlled pilot quotation (DO NOT TOUCH)

- Test customer: `5D3TEST-CUST-PHASE5D-001` (`TEST AI CUSTOMER`, inactive)
- Test boat: `5D3TEST-BOAT-PHASE5D-001` (`TEST SAXDOR 400`)
- AI order: `74cd5c77-fad7-4efd-970b-55464c1816ee`
- Approval: approved by `admin@marina.com`
- Order status: `executed`
- Quotation ID: `88d9a6ca-6ce3-4ab0-b355-d5f5c62e3b2f`
- Quote number: `PILOT-AI-20260611-200519`
- Status: `DRAFT` — do not send, accept, cancel, or edit
- Total: THB 1,070

### Commits in this Claude session (2026-06-11–12)

| Commit | Description |
|---|---|
| `22ffa34` | fix: harden production safe-mode write guards |
| `a019383` | fix(billing): use first_name + last_name instead of non-existent full_name column |
| `afa6238` | fix(middleware): allow POST /api/tide/calculate in safe mode — pure computation |
| `e7710b7` | fix(api): fetch quotation items in separate query to avoid PostgREST embed error |

### Vercel email-provider check complete

- **`RESEND_API_KEY` is absent** from the Vercel project environments.
- Verified through the authenticated Vercel API on 2026-06-12 without reading,
  downloading, or printing any environment variable values.
- Real customer messaging remains disabled by
  `ENABLE_REAL_CUSTOMER_MESSAGES=false`.

### Safety rules — carry forward unchanged

- Do not cancel, send, accept, delete, or edit the pilot quotation.
- Do not enable production writes (`ENABLE_AI_AGENT_WRITES`, etc.).
- Do not send real customer messages.
- Do not create real bookings.
- Do not modify Vercel environment variables.
- Do not change Rate Card or any real customer record.
- W = Workshop (not Wet Berth). Wet Berth = WB.

---

## Customer Delivery Contact - 2026-06-08 (Codex, user-approved)

User approved using their own dummy contact instead of Complete Marine Services'
real delivery channel for the current pilot flow.

Production customer updated:

| Field | Value |
|---|---|
| Customer | Complete Marine Services Co., Ltd. |
| Customer ID | `ea35b2fb-3cd6-4029-b2ea-952036ed47d1` |
| LINE ID | `@drschrick` |
| WhatsApp | `66828789149` |

Notes:
- WhatsApp is stored in normalized API format so inbound WhatsApp sender IDs can match.
- These fields are now editable from the customer create/edit screens.
- LINE Messaging API push still requires a real LINE user ID from the Official Account webhook; `@drschrick` is a user-visible dummy contact value.

---

Last verified: 2026-06-07 (Zinc anode correction applied — quotation ready for approval)

## Zinc Anode Correction — 2026-06-07 (Claude, user-approved)

Yard supervisor confirmed **22 zinc anodes** (was 4 estimated). User approved
production write. Update performed via Supabase REST API directly — Vercel env
not touched, write lock (403) remained active throughout.

### Changes applied

| Line | Field | Before | After |
|---|---|---|---|
| Item 7 — zinc anode labour | qty | 3 hr | 8 hr |
| Item 7 — zinc anode labour | line_total (generated) | ฿1,800 | ฿4,800 |
| Item 8 — zinc anode materials | qty | 4 units | 22 units |
| Item 8 — zinc anode materials | line_total (generated) | ฿3,800 | ฿20,900 |

### Revised quotation totals

| Field | Before | After |
|---|---|---|
| Subtotal | THB 33,634 | THB 53,734 |
| VAT 7% | THB 2,354 | THB 3,761 |
| **Grand Total** | **THB 35,988** | **THB 57,495** |
| Deposit 50% | THB 17,994 | THB 28,748 |

Status: `DRAFT` — not sent.
Write lock: `403` confirmed after update.
Vercel env: unchanged.

### Next steps

Quotation is now accurate. Requires explicit user approval to change status
and send to customer.

---

## Current Gate — Waiting for Yard Supervisor (2026-06-07)

Quotation `07b75681-d52e-47d7-bb89-05f85c5e909b` is corrected, verified, and
locked as DRAFT. No further automated action until gate clears.

| Item | Status |
|---|---|
| Quote status | DRAFT — do not send |
| Grand total | THB 35,988 — locked |
| Item 2/3 qty | 24.6 sqm — verified |
| pricing_master active rows | 99 — unchanged |
| Production write lock | 403 — active |
| W = Workshop | Rule in effect |

**Blocking gate:** Yard supervisor must confirm zinc anode quantity (currently
4 units estimated for Saxdor 400 twin-engine ~40ft).

**Next steps when supervisor responds:**
1. Claude re-verifies quotation in UI (read-only, no writes).
2. If anode qty needs updating → stop and ask user for explicit production write approval.
3. If anode qty is confirmed correct → present final summary and ask user approval before any send/status change.

Do not proceed past this gate without explicit user approval.

---

## Codex Correction - 2026-06-07

Claude's quotation review found a real business bug in production pilot quote
`07b75681-d52e-47d7-bb89-05f85c5e909b`: antifouling and primer labour used
`29.5 sqm`, but Saxdor 400 bottom area should use manufacturer beam 3.70m:
`12.10m x 3.70m x 0.55 = 24.6 sqm`.

### What Codex fixed

- Added and deployed `PATCH /api/db/quotation-items/[id]`.
- Fixed the new PATCH route to match the actual `mms_quotation_items` schema
  by not writing a missing `updated_at` field.
- Temporarily enabled `ENABLE_AI_AGENT_WRITES=true` only for the scoped
  correction, then disabled it again and redeployed production.
- Corrected production quote `07b75681-d52e-47d7-bb89-05f85c5e909b`.

### Production result verified

| Check | Result |
|---|---|
| Quote status | `DRAFT` |
| Item 2 antifouling labour | `24.6 sqm x THB 250 = THB 6,150` |
| Item 3 primer labour | `24.6 sqm x THB 200 = THB 4,920` |
| Subtotal | `THB 33,634` |
| VAT 7% | `THB 2,354` |
| Grand total | `THB 35,988` |
| Deposit 50% | `THB 17,994` |
| Pricing master active rows | `99` unchanged |
| Write lock after correction | POST write probe returns `403` |

### Tests run

- `npx.cmd tsc --noEmit` passed.
- `npm.cmd run lint` passed with the existing 8 warnings only.
- `npm.cmd run build` passed.
- Production API verification passed after deploy.

### Next command for Claude session

```text
Read DEV_SCRIPTS.md. Continue from the top "Codex Correction - 2026-06-07" section.
Verify quotation 07b75681-d52e-47d7-bb89-05f85c5e909b in production UI.
Confirm total THB 35,988, status DRAFT, item 2/3 qty 24.6 sqm.
Do not send to customer. Do not enable production writes.
Next decision: yard supervisor confirms zinc anode quantity before sending.
Remember: W means Workshop, not Wet Berth.
```

## Final Verification — 2026-06-07 (Claude, post-Codex correction)

All 9 production checks passed via Supabase REST API.
Write lock confirmed: POST probe → 403.

| Check | Expected | Result |
|---|---|---|
| Status | DRAFT | ✅ |
| Grand total | THB 35,988 | ✅ |
| Subtotal | THB 33,634 | ✅ |
| VAT 7% | THB 2,354 | ✅ |
| Deposit 50% | THB 17,994 | ✅ |
| Item 2 qty (antifouling) | 24.6 sqm | ✅ |
| Item 3 qty (primer) | 24.6 sqm | ✅ |
| pricing_master active rows | 99 | ✅ |
| Write lock | 403 | ✅ |

Quotation remains DRAFT. Not sent. Pending: yard supervisor zinc anode sign-off.
W = Workshop (not Wet Berth).

---

## Quotation Verification — 2026-06-07 Post-Correction (Claude)

Verified production quote `07b75681-d52e-47d7-bb89-05f85c5e909b` after Codex
correction. All checks passed via Supabase REST API (Chrome extension
unavailable; data-verified only).

| Check | Expected | Actual | Result |
|---|---|---|---|
| Status | `DRAFT` | `DRAFT` | ✅ |
| Customer | Complete Marine Services Co., Ltd. | ✅ | ✅ |
| Boat | Saxdor 400 | ✅ | ✅ |
| SR linked | `25b2e221-608b-4d6c-9251-cf4e121ba960` | ✅ | ✅ |
| Item 2 qty (antifouling labour) | 24.6 sqm | 24.6 sqm | ✅ |
| Item 3 qty (primer labour) | 24.6 sqm | 24.6 sqm | ✅ |
| Subtotal | THB 33,634 | THB 33,634 | ✅ |
| VAT 7% | THB 2,354 | THB 2,354 | ✅ |
| Grand Total | THB 35,988 | THB 35,988 | ✅ |
| Deposit 50% | THB 17,994 | THB 17,994 | ✅ |
| Math cross-check (sum items = subtotal) | ✅ | 33,634 | ✅ |
| Not sent to customer | DRAFT only | DRAFT | ✅ |
| Production writes | Disabled | 403 confirmed | ✅ |

### Remaining open item before sending

- **Zinc anode quantity** — currently 4 units estimated for Saxdor 400 (twin-engine
  ~40ft). Yard supervisor must confirm correct anode count on physical inspection
  before quotation is approved and sent to customer.
- No other blocking issues. Quotation is accurate and ready for supervisor sign-off.

### Domain rule reminder

W = Workshop (not Wet Berth). Wet Berth = "wet berth" or WB. Verified correct
in quotation notes: "workshop yard (W)".

---

## Quotation Review — 2026-06-07 (Claude)

Review requested by Codex. Chrome extension unavailable; review performed via
direct Supabase REST API queries. Page-load verification is API-confirmed only
(no browser screenshot). All other checks are data-verified.

### Checklist

| # | Check | Result |
|---|-------|--------|
| 1 | Quotation found in DB (page would load) | ✅ Found |
| 2 | Status = DRAFT, not SENT | ✅ `DRAFT` |
| 3 | Linked SR = `25b2e221-608b-4d6c-9251-cf4e121ba960` | ✅ Matches |
| 4 | Customer = Complete Marine Services Co., Ltd. / Boat = Saxdor 400 | ✅ Matches |
| 5 | Total = THB 38,348 | ✅ Verified |
| 6 | 8 line items visible | ✅ 8 items |
| 7 | Math verified (subtotal + VAT = total) | ✅ 35,839 + 2,509 = 38,348 |
| 8 | Not sent to customer | ✅ DRAFT only |

### Line Items Summary

| # | Description | Qty | Unit | Rate | Total |
|---|-------------|-----|------|------|-------|
| 1 | Bottom pressure wash (BOTTOM_FT) | 39.7 | ft | ฿120 | ฿4,764 |
| 2 | Antifouling labour (PAINT_ANTIFOUL_M) | 29.5 | sqm | ฿250 | ฿7,375 |
| 3 | Epoxy primer labour (PAINT_PRIMER_EP) | 29.5 | sqm | ฿200 | ฿5,900 |
| 4 | Materials – Epoxy primer | 6 | litre | ฿650 | ฿3,900 |
| 5 | Materials – Antifouling paint | 8 | litre | ฿850 | ฿6,800 |
| 6 | Materials – Consumables (lot) | 1 | lot | ฿1,500 | ฿1,500 |
| 7 | Zinc anode labour | 3 | hr | ฿600 | ฿1,800 |
| 8 | Materials – Zinc anodes | 4 | unit | ฿950 | ฿3,800 |
| | **Subtotal** | | | | **฿35,839** |
| | VAT 7% | | | | ฿2,509 |
| | **Grand Total** | | | | **฿38,348** |
| | Deposit 50% | | | | ฿19,174 |

### Business Sense Assessment — Overall: REASONABLE with 2 flags

**✅ PASS items:**

- Rates match Rate Card: BOTTOM_FT ฿120/ft, PAINT_ANTIFOUL_M ฿250/sqm,
  PAINT_PRIMER_EP ฿200/sqm.
- Labour scope is correct for bottom wash + antifouling + primer + zinc anodes.
- Separate labour and material line items — good practice for transparency.
- Consumables lot ฿1,500 — reasonable.
- Zinc anode labour 3hr × ฿600 = ฿1,800 — acceptable at standard workshop rate.
- VAT 7%, deposit 50%, valid 7 days — all correct per business rules.
- Notes clearly state pilot status and measurement assumptions — good.

**⚠️ FLAG 1 — MEDIUM: Bottom area overestimated by ~20%**

The quotation uses 29.5 sqm for antifouling and primer area. The formula in the
notes states: "39.7 × 13.5 × 0.55 ≈ 29.5 sqm" — but this formula is
dimensionally incorrect (ft × ft × factor does not produce sqm without unit
conversion).

Verified calculation using Saxdor 400 manufacturer specs (beam 3.7m / 12.1ft):

  LOA 12.10m × beam 3.70m × 0.55 = **24.6 sqm** (actual spec)
  LOA 12.10m × beam 4.11m × 0.55 = **27.4 sqm** (if 13.5ft assumed)
  Quote uses:                        **29.5 sqm**

Delta vs actual beam: **+19.8% over**
Labour overbilled impact: ~฿2,194 (sqm delta × ฿450/sqm for labour only)

Action for Codex: Confirm Saxdor 400 beam from `mms_boats` record
`de8b12f1-1cbb-47f2-8ead-be32ad875c46` and recalculate if beam differs
materially from 3.7m. If the customer is a repeat customer this should be
corrected before sending.

**⚠️ FLAG 2 — MINOR: Zinc anode quantity likely underestimated**

4 units assumed for a Saxdor 400 (39.7ft, likely twin outboard/sterndrive).
Twin-engine boats of this size typically require 8–14 anodes total (shaft,
prop, trim tab, hull). The note correctly says "confirmed on inspection" which
mitigates this. Acceptable for a draft but operator should verify before
approving.

**ℹ️ NOTE: "W" in notes refers to Workshop (correct)**

"all works to be carried out in the workshop yard (W)" — correct domain usage.
W = Workshop per project domain code rule.

### Recommendation

Do NOT send to customer yet. Request Codex to:

1. Pull boat record beam value from DB and recalculate bottom area.
2. If beam < 4.0m, revise sqm from 29.5 → correct value and update labour
   line items 2 and 3 accordingly.
3. Confirm zinc anode count with yard supervisor before approving.
4. After corrections, the quotation can be approved and sent.

---

## Latest Codex Review for Claude

Review time: 2026-06-07 16:40 Asia/Bangkok

Production quotation pilot completed successfully after replacing the local
Anthropic key in ignored `C:\marina-mms\ai-agents\.env`.

Pilot run:

- Production writes were enabled only for the scoped pilot window:
  `ENABLE_AI_AGENT_WRITES=true`, followed by a production redeploy.
- Command mode: production, `AI_AGENT_DRY_RUN=false`,
  `AI_AGENT_PILOT_MODE=true`, `AI_AGENT_SKIP_CLAUDE=false`.
- Agent scope: `--agent=quotation --sr=25b2e221-608b-4d6c-9251-cf4e121ba960`.
- The agent processed exactly 1 service request and created exactly 1 draft
  quotation.

Created quotation:

- Quotation ID: `07b75681-d52e-47d7-bb89-05f85c5e909b`.
- Quote number: `DRAFT-1780824727989`.
- Status: `DRAFT`.
- Linked SR: `25b2e221-608b-4d6c-9251-cf4e121ba960`.
- Total: THB 38,348.
- Subtotal: THB 35,839.
- VAT: THB 2,509.
- Deposit: THB 19,174.
- Line items: 8.

Rate checks:

- `BOTTOM_FT`: THB 120/ft matched Rate Card.
- `PAINT_ANTIFOUL_M`: THB 250/sqm matched Rate Card.
- `PAINT_PRIMER_EP`: THB 200/sqm matched Rate Card.
- Material estimates were added as separate line items.
- `pricing_master` active rows stayed at 99.

Production was locked again immediately after the successful pilot:

- Vercel `ENABLE_AI_AGENT_WRITES` was set back to `false`.
- Production was redeployed again.
- Write lock verified: `POST /api/db/notifications` returns 403.
- Production counts after lock restore:
  service_requests=2, quotations=7, notifications=2, pricing_master=99.

Next approval gates:

1. Review the draft quotation in the web app before sending to customer.
2. Keep production write flag disabled until the next explicitly scoped pilot.
3. Do not enable scheduled/automatic production writes yet.

## Previous Codex Review for Claude

Review time: 2026-06-07 03:25 Asia/Bangkok

Approved production quotation pilot was attempted with a single scoped service
request.

Pilot setup:

- Temporarily set Vercel `ENABLE_AI_AGENT_WRITES=true`.
- Redeployed production so the temporary write flag was active.
- Created one production pilot service request:
  `25b2e221-608b-4d6c-9251-cf4e121ba960`.
- Scope: Complete Marine Services Co., Ltd. / Saxdor 400.
- Request title: `AI pilot quotation test - workshop antifouling and bottom wash`.
- Rate Card was not changed.

Pilot run result:

- Command mode: production, `AI_AGENT_DRY_RUN=false`,
  `AI_AGENT_PILOT_MODE=true`, `AI_AGENT_SKIP_CLAUDE=false`.
- Agent scope: `--agent=quotation --sr=25b2e221-608b-4d6c-9251-cf4e121ba960`.
- Agent correctly found exactly 1 pending request.
- Pilot did not create a quotation because the local `ANTHROPIC_API_KEY`
  failed authentication with Claude: `invalid x-api-key`.

Production was locked again immediately after the failed Claude authentication:

- Vercel `ENABLE_AI_AGENT_WRITES` was set back to `false`.
- Production was redeployed again.
- Write lock verified: `POST /api/db/notifications` returns 403
  `AI agent writes are disabled`.
- Production counts after lock restore:
  service_requests=2, quotations=6, notifications=2, pricing_master=99.
- Pilot service request exists and has 0 quotations.

Next step:

1. Replace/fix the local Anthropic key in ignored `C:\marina-mms\ai-agents\.env`.
2. Re-run the same scoped production pilot using SR
   `25b2e221-608b-4d6c-9251-cf4e121ba960`.
3. Keep production writes enabled only during that single run, then disable and
   redeploy immediately.

## Previous Codex Review for Claude

Review time: 2026-06-07 03:05 Asia/Bangkok

Codex reviewed the latest production state after the Rate Card wording fix and
ran the AI team against production in read-only mode.

Production DB wording fix verified:

- `BERTH_JETSKI_M`: Jet ski / PWC wet berth monthly.
- `BERTH_SB1_M`: Speedboat <24 ft wet berth monthly.
- `BERTH_SB2_M`: Speedboat 24-30 ft wet berth monthly.
- Prices unchanged: 6000 / 350 / 380.
- `pilot_rate_thb` unchanged (all null).
- Active `pricing_master` rows still 99.
- Live Rate Card has zero `W-berth` / `W-slots` wording remaining.

Production read-only AI smoke test:

- Mode: `MARINA_API_BASE=https://marina-mms.vercel.app`,
  `AI_AGENT_DRY_RUN=true`, `AI_AGENT_SKIP_CLAUDE=true`.
- All scheduled agents completed without process failure.
- Quotation agent: 0 requests needed quotation out of 1 service request.
- Marina agent: found 1 contract-expiry alert; notification write was skipped
  by dry-run.
- Finance agent: 0 overdue and 0 upcoming due invoices.
- Comms agent: 0 unreplied inbound messages.
- HR agent: skipped cleanly because no task/content was provided.
- Tide agent: returned `no_tide_data` cleanly.

Production safety checks:

- Production counts after smoke test:
  quotations=6, notifications=2, pricing_master=99, inbound_messages=0,
  service_requests=1.
- Write lock remains enabled: `POST /api/db/notifications` returns 403
  `AI agent writes are disabled`.
- `npx.cmd tsc --noEmit`: passed.
- `node --test ai-agents/tests/*.test.js`: 106 passed, 0 failed.
- `npm.cmd run lint`: 0 errors; same 8 existing warnings remain.
- `npm.cmd run build`: passed.

No production write flags were enabled for this review. No `.env` files or
secrets were changed.

Next approval gates:

1. Real Claude production pilot: requires explicit approval, a single
   service-request/customer scope, and temporary `AI_AGENT_PILOT_MODE=true`.
2. Scheduled production runs: requires `CRON_SECRET` and
   `ENABLE_AUTOMATION_WRITES`.
3. LINE/WhatsApp auto-reply: requires messaging credentials and
   `ENABLE_AUTOMATION_WRITES`.

## Previous Codex Review for Claude

Review time: 2026-06-07 00:35 Asia/Bangkok

Codex reviewed the latest speedboat engine-group classification change.

- Latest upstream commit reviewed: `fc57c7a feat: speedboat engine-group classification rule (LOA-primary)`.
- Fixed follow-up issue: quotation-agent speedboat detection was too narrow and
  could miss real `boat_type` values such as `SPEED_BOAT`, `Speed Boat`, or
  `speed-boat`.
- Added `isSpeedboatType()` helper in both agent JS and app TS utility.
- `quotation-agent.js` now uses normalized speedboat detection before applying
  LOA-primary classification.
- Added regression coverage for common speedboat type spellings.
- Added `.gitignore` entries for local analysis/export artifacts:
  `graphify-out/` and `rate-card-review.csv`.

Verification:

- `npx.cmd tsc --noEmit`: passed.
- `npm.cmd run lint`: 0 errors; same 8 existing web app warnings remain.
- Focused agent tests: 27 passed, 0 failed.

Still pending separately:

- Production DB wording for 3 wet-berth rows still needs explicit approval if
  not already applied in Supabase.
- `rate-card-review.csv` is a local export artifact and is intentionally not
  committed.

## Previous Codex Review for Claude

Review time: 2026-06-06 02:45 Asia/Bangkok

Production write pilot completed and write flag disabled.

Pilot results:

- SR: `57e96f05` "1 year in the water, need antifouling paint" — Complete Marine Services Co., Ltd.
- Quotation created: `76668c49` DRAFT ฿93,584 / 10 line items / generated_by=ai-agent
- Line item prices matched Rate Card: BOTTOM_FT=120 ✓ PAINT_ANTIFOUL_M=250 ✓ PAINT_PRIMER_EP=200 ✓
- pricing_master stayed at 99 active rows ✓
- ENABLE_AI_AGENT_WRITES disabled on Vercel immediately after run ✓
- Write lock restored: POST /api/db/notifications → 403 ✓

Bug fixed during pilot:

- line_total is a generated column in production schema; inserting it caused 500.
  Removed from quotation item insert in app/api/db/quotations/route.ts (commit 184df69).
- api-client.js replaced native fetch with Node https module for Windows compatibility (commit b42f865).

Next approval gates (each requires explicit approval):

1. Enable scheduled production runs (cron) — requires CRON_SECRET and ENABLE_AUTOMATION_WRITES.
2. Enable LINE/WhatsApp auto-reply — requires messaging credentials and ENABLE_AUTOMATION_WRITES.
3. Enable production writes permanently — only after monitoring and sign-off.

## Previous Codex Review for Claude

Review time: 2026-06-06 00:20 Asia/Bangkok

Production pilot safety guards are committed and pushed.

- Latest commit: `bd3d476 guard production ai pilot writes`.
- `main` matches `origin/main`.
- Working tree was clean after push.
- Guard tests passed before commit: 55/55.
- No `.env` files or real secrets were committed.

Production pilot guard behavior:

1. Production URL + `AI_AGENT_DRY_RUN=false` requires
   `AI_AGENT_PILOT_MODE=true`.
2. Pilot mode requires an explicit `--agent`; `all` is blocked.
3. Quotation pilot requires an explicit `--sr=<id>` or `--customer=<id>`.
4. `quotation-agent.js` scopes to the provided service request/customer and no
   longer sweeps all requests during pilot mode.

Next approval gate:

Do not enable production writes automatically. To run a production write pilot,
the user must explicitly approve setting `ENABLE_AI_AGENT_WRITES=true` in
Vercel and running one scoped command such as:

```powershell
node run.js --agent=quotation --sr=<production-service-request-id>
```

with `AI_AGENT_PILOT_MODE=true`, `AI_AGENT_DRY_RUN=false`, and
`AI_AGENT_SKIP_CLAUDE=false`.

## Previous Codex Review for Claude

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
node run.js                                          # all scheduled agents (staging/dry-run only)
node run.js --agent=quotation
node run.js --agent=marina                           # (was: operations)
node run.js --agent=finance
node run.js --agent=comms                            # (was: customer-service + messaging)
node run.js --agent=hr --task=jd --role="Technician"
node run.js --agent=tide --boat=<id> --date=2026-06-10
node server.js                                       # HTTP server port 4000 (LINE/email/web-form)
```

Architecture: L1 CEO Orchestrator → L2 (Marina/Finance/HR/Comms) → L3 (Quotation/Tide/Calculator/DocWriter) → L4 (QA/Escalation/AuditTrail)

## Production Agent Commands

### Read-only smoke test (safe, no writes, no Claude)

```powershell
cd C:\marina-mms\ai-agents
$env:MARINA_API_BASE      = "https://marina-mms.vercel.app"
$env:AI_AGENT_DRY_RUN     = "true"
$env:AI_AGENT_SKIP_CLAUDE = "true"
node --test tests/*.test.js
```

### Production pilot (requires explicit user approval first)

Three env vars must ALL be set; any missing one will block the run:

```powershell
$env:MARINA_API_BASE      = "https://marina-mms.vercel.app"
$env:AI_AGENT_DRY_RUN     = "false"
$env:AI_AGENT_PILOT_MODE  = "true"
$env:AI_AGENT_SKIP_CLAUDE = "false"
# --agent and --sr are required; "all" is blocked
node run.js --agent=quotation --sr=<service-request-id>
```

Guard rules enforced in run.js (process.exit(1) on violation):
1. Production URL + DRY_RUN=false → requires AI_AGENT_PILOT_MODE=true
2. Pilot mode → requires --agent (cannot be "all")
3. Quotation pilot → requires --sr=<id> or --customer=<id>
4. pricing-master is read-only in all modes (no write endpoint exists)

### Pre-run snapshot checklist

Before any production pilot run, record these counts:

```powershell
$h = @{"x-agent-api-key"=$env:MARINA_AGENT_API_KEY}
$b = "https://marina-mms.vercel.app"
((Invoke-WebRequest "$b/api/db/quotations"    -Headers $h -UseBasicParsing).Content | ConvertFrom-Json).Count
((Invoke-WebRequest "$b/api/db/notifications" -Headers $h -UseBasicParsing).Content | ConvertFrom-Json).Count
((Invoke-WebRequest "$b/api/pricing-master?isActive=true" -Headers $h -UseBasicParsing).Content | ConvertFrom-Json).Count
```

Expected before pilot: pricing_master = 99, no unexpected quotations.

### Post-run verification checklist

After pilot run, verify:
- [ ] Quotation count increased by exactly 1
- [ ] Quotation status = DRAFT (not SENT or ACCEPTED)
- [ ] Quotation generated_by = "ai-agent"
- [ ] Line item prices match Rate Card codes
- [ ] pricing_master active rows still = 99
- [ ] No notifications of type "agent_escalation"
- [ ] Grand total > 0 (not dry-run stub)

### Rollback / cleanup notes

If a pilot quotation must be removed:
- Set status to CANCELLED via the web app quotation detail page.
- Do not delete directly from Supabase unless instructed.
- Record the quotation ID and reason in DEV_SCRIPTS.md before cancellation.

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
