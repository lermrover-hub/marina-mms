# Claude Code Handoff - AI Agent Control Center and Full App QA

Date: 2026-06-12
Workspace: `C:\marina-mms`
Branch: `codex/ai-agent-control-center`

## Objective

Finish the current AI Agent Control Center implementation, run a complete non-destructive application QA pass, fix every reproducible frontend/backend bug found, then commit, push, deploy to Vercel, and verify production.

## Current Working Tree

The uncommitted work in the AI agent pages, API routes, shared agent config/access libraries, sidebar, settings, agent runtime, SQL seed, and `DEV_SCRIPTS.md` belongs to this task. Do not discard or overwrite it. Run `git status` and review the current diff before editing.

## Implemented Behavior

- Six configurable agents: quotation, marina, finance, communications, HR, tide.
- Web control center at `/ai-agents` with readiness, safety state, configuration editing, validation, and read-only preview runs.
- Configuration GET/PATCH is protected by agent key or authorized management session as appropriate.
- Preview runs query real data but return `writes_performed=false`.
- Optional Anthropic generation requires `ANTHROPIC_API_KEY`; absence is shown as Not configured.
- Production writes, customer messages, bookings, and AI writes remain disabled.

## Verification Already Completed

- `npx.cmd tsc --noEmit` passed after access-control changes.
- `npm.cmd run lint -- --quiet` passed after access-control changes.
- `npm.cmd test` passed: 34/34.
- `npm.cmd --prefix ai-agents test` passed: 124 passed, 20 live tests skipped, 0 failed.
- Browser previews passed locally for all six agents.
- Validation correctly rejected quotation VAT 25 with `vat_pct must be between 0 and 20`; no database write occurred.
- Quotation preview found 99 active pricing rows.
- UI showed writes/messages/bookings Blocked and AI model Not configured.
- `git diff --check` passed.

## Interrupted Check

The final `npm.cmd run build` was terminated by command timeout after about 184 seconds. It did not report a compile error. Run it again with a longer timeout and treat build as pending until it completes.

## Required Next Steps

1. Read this file and the current diff. Do not reimplement completed work.
2. Run `npm.cmd run build` with enough time to finish and fix any actual failure.
3. Start the production build locally on port 3003 and verify `/ai-agents` with a management-role login.
4. Re-run previews for all six agents and verify no writes occurred.
5. Audit all static application routes and internal links. Each route must load without 404/500, broken navigation, or uncaught browser errors.
6. Test every non-destructive button: navigation, tabs, filters, dialogs, close/cancel, view switches, exports, and form validation.
7. For create/update/delete/send/approve/payment/booking actions, verify wiring and validation without submitting real production data.
8. Fix every reproducible bug and rerun the affected page/session, then lint, typecheck, tests, and build.
9. Commit on `codex/ai-agent-control-center`, push it, merge or fast-forward to `main` only when clean, and push `main` to trigger Vercel.
10. Wait for Vercel Ready, then smoke-test `https://marina-mms.vercel.app/ai-agents` and representative critical routes.

## Safety Boundaries

- Do not enable `ENABLE_AI_AGENT_WRITES` or `ENABLE_AUTOMATION_WRITES`.
- Do not send real email, LINE, WhatsApp, or customer messages.
- Do not create real production bookings or financial documents.
- Do not change pricing/rate-card rows.
- Do not add or change production secrets without explicit user approval.
- Do not manually transcribe agent keys; read them from environment/files only.
- Keep pilot quotation `88d9a6ca` untouched.

## Final Report Required

- Overall progress percent and remaining phases.
- Bugs found and files fixed.
- Route/link/button audit coverage and exclusions for destructive actions.
- Typecheck, lint, app tests, agent tests, and build results.
- Commit SHA, branch, Vercel deployment status, and final production URLs.
- Remaining risks, especially model generation unavailable until `ANTHROPIC_API_KEY` is explicitly configured.

## Codex Review After Claude Commit - 2026-06-12

Claude committed and pushed the feature as `9ce1389`. Codex review found and fixed these issues after that commit:

1. Finance web preview ignored `upcoming_due_days` and returned overdue invoices only. The preview now returns upcoming invoices, counts, and totals as configured.
2. Marina web preview ignored Supabase errors and could report empty successful results when a query failed. Query errors now fail the preview explicitly.
3. Control Center displayed API/validation failures using the same success styling as completed previews. Error messages now use a distinct red error state.

Verification required after these fixes: typecheck, lint, web tests, agent tests, production build, local browser previews, then commit/push/deploy verification. Production write flags must remain disabled.

Claude concurrently added tide commits `bb7c786` and `2bee980`. Codex found a critical regression in `2bee980`: New Ramp Booking displayed and persisted `draft + trailer + safety - 1.0`, while the approved formula is `requiredActualDepth - rampDepthOffset` with offset `-1.0`, therefore the correct result adds 1.0 m. This understated required tide by 2.0 m. The page now uses one `requiredTideHeight()` helper for the live request, fallback display, and persisted value. Tide Calculator also now falls back to `-1.0` when the ramp-offset input is blank/invalid instead of serializing `NaN` as `null` and calculating with zero offset.

The same booking page also treated the default 0.3 m safety clearance as if vessel dimensions were complete, so it could display a tide window for zero draft and zero trailer height. Launch/Retrieval now require positive draft and trailer values, and formula/live results stay hidden until both are provided.

Claude then added receipt commit `f78c2fb`. Codex found that receipt links and the receipt API accepted every payment status, which could produce an official-looking receipt for `PENDING`, `REJECTED`, or `REFUNDED` payments. Receipt access is now limited to `CONFIRMED` payments in both UI and API. The payment-detail API also now propagates linked-invoice query errors instead of silently returning an incomplete receipt.

Production smoke testing then exposed that Supabase could not resolve the embedded `mms_invoices -> mms_invoice_items` relationship, causing both receipt and invoice detail APIs to return HTTP 500 while local testing passed. Both routes now query invoice items explicitly by `invoice_id`, preserve the existing response shape, and return the actual Supabase error message instead of `[object Object]`.

## Pause Handoff to Claude Code - 2026-06-13

- Current branch/HEAD: `main` at `5096e75` (also on `origin/main`).
- Claude added `611bc28` and `5096e75` after the receipt review. These commits include contractors, suppliers, purchase orders, stock movements, timesheets, audit log, report pages, recurring billing UI, quotation conversion, inventory usage reports, and Work Order labor UI.
- Codex verification on current HEAD passed: TypeScript, ESLint `--quiet`, web tests `34/34`, AI-agent tests `124 passed / 20 skipped`, and Next production build with `77/77` static pages.
- Build still reports non-blocking warnings, including an `no-unused-expressions` warning in `app/(dashboard)/reports/aging/page.tsx`; review this first.
- Production deployment is Ready, but Codex was paused before completing current-HEAD browser/API smoke tests. Re-test `/api/db/payments/[confirmed-id]`, `/print/receipts/[confirmed-id]`, invoice detail, and the new pages/routes before claiming production completion.
- Keep all production writes, real messages, and production bookings disabled. Do not create test financial records.
- User preference going forward: Claude Code implements new functions; Codex performs review, debugging, and tests afterward.

## Codex Verification - 2026-06-13

- Reviewed Claude fix commit `2c7e284`; working tree was clean and `main` matched `origin/main` before this verification note.
- PASS: `npx tsc --noEmit`.
- PASS: `npm run lint -- --quiet`.
- PASS: web tests `34/34`.
- PASS: AI-agent tests `124 passed / 20 skipped / 0 failed`.
- PASS: Next.js production build, `77/77` static pages generated. Remaining lint output is warning-only technical debt outside the reviewed aging fix.
- PASS production authenticated read-only smoke test: Contractors, Suppliers, Purchase Orders, Timesheets, Audit Log, Recurring Billing, Aging, Occupancy, Revenue, Inventory Usage, and Quotation Conversion pages all returned HTTP 200 without login redirects or application errors.
- PASS production receipt/invoice regression test: payments list returned HTTP 200 with 12 rows; a confirmed payment detail/receipt API returned HTTP 200 with 5 invoice items; linked invoice detail returned HTTP 200 with the same 5 items.
- No production writes, messages, bookings, or financial records were created during verification.

## Claude QA Pass - 2026-06-13

**Fixed:** `no-unused-expressions` ESLint warning in `app/(dashboard)/reports/aging/page.tsx`.
Replaced the ternary-for-side-effects pattern `n.has(name) ? n.delete(name) : n.add(name)` with an explicit `if/else` block.

**Verification results (HEAD after fix):**

| Check | Result |
|---|---|
| `npx.cmd tsc --noEmit` | ✅ PASS — exit 0 |
| `npm.cmd run lint -- --quiet` | ✅ PASS — exit 0, no errors or warnings |
| `npm.cmd run build` | ✅ PASS — exit 0, 77/77 static pages |

Remaining non-blocking build warnings (pre-existing, unchanged):
- Unused imports in several dashboard pages (HardHat, Plus, Save, ArrowRight, FileText, TrendingUp, Users, Clock, Anchor)
- `no-unused-vars` for `rejected` variable in `/reports/quotations/page.tsx`
- `no-explicit-any` in `lib/agent-tools.ts` and AI order execute route

**Next required step for Codex:** run `npm.cmd test` (web 34/34) and `npm.cmd --prefix ai-agents test` (124/20 skip), then browser/API smoke tests for receipt, invoice detail, and all new modules from `611bc28`/`5096e75`. Production write flags must remain disabled.

**Commit to be created:** `fix: resolve no-unused-expressions warning in aging report toggle`

## Codex Operations Module Production Fix - 2026-06-13

- Root cause: the operations tables already existed in production with text IDs and restrictive RLS, while the new routes expected Supabase REST access and a partially different schema. The affected APIs returned HTTP 500.
- Added an idempotent compatibility migration for contractors, suppliers, purchase orders/items, stock movements, timesheets, audit log, and material usage. Existing rows are preserved; no tables or customer data are deleted.
- Operations routes now use parameterized server-side PostgreSQL queries through `DATABASE_URL`. Browser clients do not receive database credentials, and RLS remains enabled with anon/authenticated access revoked for these tables.
- Fixed supplier payment-term compatibility, contractor defaults, PO-item timestamps/totals, material-usage work-order ID type, audit-log changes, stock issue inventory updates, and timesheet total recalculation/default date.
- Production schema migration was applied successfully and reapplied successfully to verify idempotence.
- Rollback-only database contract test passed for all operations modules; no test records remain.
- PASS: TypeScript, ESLint quiet, web tests 34/34, agent tests 124 passed / 20 skipped, production build 77/77 pages.
- PASS local production smoke: all seven operations APIs returned HTTP 200 arrays; Contractors, Suppliers, Purchase Orders, Stock Movements, Timesheets, Audit Log, and Inventory Usage pages returned HTTP 200 without application errors.
- Safety flags remain unchanged and disabled. No customer messages, bookings, pricing rows, financial documents, or pilot quotation were modified.

## Digital Signature Feature — 2026-06-13 (commit 228f622)

Feature: Upload company authorized signature → auto-stamp on all printed official documents.

### What was built

- **`app/api/settings/signature/route.ts`** — GET/POST/DELETE backed by `mms_system_settings` key-value table (key = `signature_url`).
- **`components/print/OfficialDocumentShell.tsx`** — `ESignBlock` now self-fetches the uploaded signature URL via `/api/settings/signature` when `companyDetails={true}`; falls back to the static `/document-assets/e-sign.png` if not uploaded yet. No changes needed to any print page.
- **`app/(dashboard)/settings/page.tsx`** — Settings > Company section has a new "Authorized Digital Signature" card. Upload/replace (PNG, JPG, WebP) goes to `mms-templates` Supabase Storage at path `signatures/company-esign.<ext>` (upsert), stores the public URL via the API. Remove clears it from the DB.
- **`scripts/create-system-settings.sql`** — Idempotent migration to create `mms_system_settings` table.

### Required production step

Run `scripts/create-system-settings.sql` in the Supabase SQL editor ONCE before using the signature feature. Without it, `/api/settings/signature` will return a 500 error because the table doesn't exist yet.

### Print pages that auto-use the signature (via ESignBlock companyDetails)

- `/print/quotations/[id]` — Marina Authorized Signature
- `/print/invoices/[id]` — Marina Authorized Signature
- `/print/contracts/[id]` — both contract parties block
- `/print/work-orders/[id]` — Boat Yard Manager block
- `/print/receipts/[id]` — ลายเซ็นผู้รับเงิน / Authorized Signature block
- `/print/ramp-bookings/[id]` — Marina Manager block

### Verification results (pre-push)

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ PASS |
| `npm run lint -- --quiet` | ✅ PASS — 0 new warnings |
| `npm run build` | ✅ PASS — 77/77 pages, `/api/settings/signature` in manifest |

## Claude Verification of Codex Quotation Agent Hardening — 2026-06-16

**Request to Codex: please re-check the items under "Open question for Codex" below — flag if any of these are bugs rather than expected behavior.**

Verifying commits `69b1d41` (harden quotation dry-run safety), `93f006f` (allow dry-run replay for scoped requests), `72fdbf0` (allow approved zero-rate pricing policies). All 4 phases requested in the handoff were run.

### Phase 1 — Confirm deploy
PASS. Vercel deployment `dpl_5LKe43pmZWsQZjjrzjrGkNaWF7zW` (aliased to `marina-mms.vercel.app`) was created at `2026-06-16 14:38:23 +0700`, 6 seconds after commit `72fdbf0` (`14:38:17 +0700`) — confirms the live alias is serving this exact commit. Status: Ready. No Vercel env changes made.

### Phase 2 — Full live read smoke
PASS. Ran with `AI_AGENT_DRY_RUN=true AI_AGENT_SKIP_CLAUDE=true AI_AGENT_PILOT_MODE=true ENABLE_AI_AGENT_WRITES=false ENABLE_REAL_CUSTOMER_MESSAGES=false ENABLE_PRODUCTION_BOOKINGS=false ENABLE_LIVE_AGENT_API_TESTS=true npm --prefix ai-agents test`.
Result: `tests 150 / pass 150 / fail 0 / skipped 0`. Live endpoint tests (contracts, work-orders, service-requests, pricing-master) executed against production and returned real data — confirmed they ran rather than were skipped.

### Phase 3 — Production dry-run replay
PASS for both target service requests:
- `60b7a44e-35ca-4bcf-be36-d82534f18398` ("UAT Engine Service Request") → `processed:1`, `orderId:"dry-run-ai-order"`
- `57e96f05-d698-4ffa-9c71-d0bc808324ec` ("1 year in the water, need antifauling paint") → `processed:1`, `orderId:"dry-run-ai-order"`

Both runs logged the full required audit sequence (`AGENT_START`, `REQUEST_SELECTED`, `PRICING_MATCH_RESULT`, `DRAFT_GENERATED`, `APPROVAL_ORDER_RESULT`) to `.ai-audit-log.jsonl`, all with `dry_run:true`. `[ApiClient] DRY RUN: skipped ai-order write` confirmed in console output for both — no `POST /api/ai/orders` reached production.

### Phase 4 — Anthropic real AI dry-run
Ran with `AI_AGENT_SKIP_CLAUDE=false AI_AGENT_DRY_RUN=true` against `60b7a44e-35ca-4bcf-be36-d82534f18398` only (per instruction to test one request first).

Result: Claude produced a complete, well-reasoned 9-item draft quotation ("Full Engine Service – UAT TestVessel", labour + materials breakdown, professional payment-terms notes). The deterministic validator then caught that 8 of 9 generated `pricingCode` values (`LABOUR_ENGINE_SERVICE`, `LABOUR_IMPELLER_REPLACE`, `MAT_ENGINE_OIL`, `MAT_OIL_FILTER`, `MAT_FUEL_FILTER`, `MAT_IMPELLER`, `MAT_IMPELLER_GASKET`, `MAT_CONSUMABLES`) don't exist in `pricing_master` — only `RAMP_2OB` matched. Sequence logged: `VALIDATION_ERROR` (risk_level HIGH, full draft + error list in payload) → `REQUEST_FAILED`. No `PRICING_MATCH_RESULT`/`DRAFT_GENERATED`/`APPROVAL_ORDER_RESULT` events fired for this run since validation failed before reaching those steps. No production write attempted at any point.

**This was treated as expected fail-closed behavior, not a bug** — pricing_master genuinely has no rate codes for engine-service labour/materials yet, so blocking is correct. `pricing_master` was NOT modified per instructions.

### Open question for Codex
1. Confirm whether blocking all 8 unmatched items (rather than partially accepting `RAMP_2OB` and flagging only the rest for approval) is the intended validator behavior for mixed match/no-match drafts, or whether partial acceptance should be supported.
2. Confirm whether `PRICING_MATCH_RESULT`/`DRAFT_GENERATED` are expected to be skipped entirely on the real-AI path when validation fails immediately after `REQUEST_SELECTED` — Claude's session observed no audit gap/bug here, but flagging for your review since the dry-run-stub path (Phase 3) logs these same events even when nothing is being matched against a real Claude draft.
3. No bugs found requiring a fix in this session. Recommend Codex spot-check the validator's per-item rejection logic in `lib/validate-quotation-draft.js` (or equivalent) against the mixed-match scenario above to confirm intended design.

### Outcome
- Controlled Quotation Agent dry-run pilot: **may continue.**
- Production write pilot: **NOT started, NOT approved.** Requires explicit separate approval.
- No Vercel env vars changed. No pricing_master rows changed. No production service requests created. No real customer messages sent. No invoices/bookings created. HR/Communications/Operations agents were not enabled.

## Codex Follow-up on Claude Open Questions - 2026-06-16

Codex reviewed Claude's two open questions from commit `589fb7e`.

Decision:
- Mixed matched/unmatched quotation drafts must remain fail-closed during the controlled pilot. Partial acceptance of matched items such as `RAMP_2OB` is useful for review/audit only, but must not create an approval order while any non-custom item is unmatched against `pricing_master`.
- The skipped audit events on real-AI validation failure were treated as an observability gap and fixed. The agent now records `PRICING_MATCH_RESULT` for both pass and fail cases, and records `DRAFT_GENERATED` with `validation_status:"failed"` before `VALIDATION_ERROR` when Claude generates a draft that fails deterministic validation.

Files changed:
- `ai-agents/agents/quotation-agent.js`
- `ai-agents/tests/quotation-safety.test.js`

Verification:
- `npm.cmd --prefix ai-agents test` PASS: `tests 151 / pass 131 / fail 0 / skipped 20`
- `npm.cmd test` PASS: `tests 43 / pass 43 / fail 0 / skipped 0`
- `npm.cmd run build` PASS: Next.js production build completed. Existing unrelated lint warnings remain.

Safety:
- No Vercel env vars changed.
- No pricing rows changed.
- No production writes, messages, bookings, invoices, or customer-facing actions were enabled.

## Codex Follow-up: Manager Escalation Pricing Policy - 2026-06-16

User confirmed:
- Engine/mechanic repair is outsourced. Manager must contact the customer and specialist directly.
- Paint, polishing, antifouling, and gelcoat prices may change later and must wait for subcontractor/painting team pricing.
- Anything missing from the rate card, unclear, out-of-policy, contact-only, or manual-quote must be escalated to manager review. AI must not contact customers directly.

Implementation:
- Added quotation agent runtime escalation policy for engine/mechanic keywords and paint/polish/antifouling/gelcoat keywords.
- When matched, Quotation Agent logs `MANAGER_ESCALATION_REQUIRED`, creates a manager escalation notification through the existing escalation agent path, skips Claude draft generation, and does not create an approval order.
- Draft validation failures still create manager escalation notifications before failing closed.
- Updated quotation system prompt and `PRICING_RULES.md` to document that AI must not invent outsourced/subcontractor prices.

Verification:
- `npm.cmd --prefix ai-agents test` PASS: `tests 152 / pass 132 / fail 0 / skipped 20`
- `npm.cmd test` PASS: `tests 43 / pass 43 / fail 0 / skipped 0`
- `npm.cmd run build` PASS: Next.js production build completed. Existing unrelated lint warnings remain.

Safety:
- No Vercel env vars changed.
- No pricing rows imported or modified.
- No production customer messages sent.
