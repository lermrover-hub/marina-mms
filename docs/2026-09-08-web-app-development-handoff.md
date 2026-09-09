# Marina MMS Web App Development Handoff

**Updated:** 2026-09-09
**Workspace:** `C:\marina-mms`
**Primary environment:** staging Supabase project `zanlunbgupdtqznruzok`
**Production project:** `csltloqbjupxqwbkunsd` — do not modify until staging sign-off

## Active goal

Complete Marina MMS in this order:

1. Finish the current V1 workflow and Full E2E covering Customer, Boat, Berth Assignment, Haul-out, Service Request, Work Order, Quotation, Invoice, Payment, Launch, and back-office accounting.
2. Complete the Accounting-ready foundation:
   - regular price, current price, and operational discount (default `0%`)
   - direct service cost
   - revenue and cost account codes
   - P&L category
   - immutable price/cost/accounting snapshots on quotation issue
   - Job Margin from labor, materials, and subcontractors
   - price editing restricted to Admin/Finance
   - price-change history and approver
   - revenue, cost, gross-profit report and accounting export
3. After V1 staging acceptance, open a controlled real-use pilot for 2–4 weeks.
4. Let Accounting review the reports and define confirmed requirements.
5. Start Accounting V2 only after V1 is proven with real-use data.

## Implemented in the current working tree

### Accounting-ready pricing

- Migration: `supabase/migrations/20260908103838_accounting_ready_pricing.sql`
  - adds normal/current price, default discount, direct cost, revenue/cost codes, and P&L category to `pricing_master`
  - adds quotation-item price/cost/accounting snapshots
  - creates pricing change history and audit trigger
  - supports the staging UUID pricing ID and production text pricing ID without hardcoding one type
- `lib/pricing-access.ts`: pricing writes restricted to `SUPER_ADMIN` and `FINANCE`.
- `lib/pricing-validation.ts`: validated numeric ranges and `default_discount_percent = 0`.
- `lib/pricing-master.ts`: maps and persists accounting fields and history.
- Pricing APIs and UI now expose accounting fields, edit controls, history, and exports.
- Quotation creation recomputes totals server-side and snapshots price, cost, revenue code, cost code, and P&L category.
- Explicit `NONE` discount is forced to `0%`.
- Job Margin includes labor, material, and subcontractor costs and supports CSV export.
- Rate-card import scripts support preview-first import and operational discount default `0%`.

### Connected service workflow fixes

- Work Order creation now persists both `reference` and required `wo_number`.
- Subcontractor sourcing keeps the selected quote visible through `SELECTED`, `COST_APPROVED`, and `PO_ISSUED`.
- Subcontractor new page is wrapped correctly for `useSearchParams`, allowing production build.
- TypeScript union handling was corrected in `app/api/db/messages/[id]/route.ts`.

## Staging database status

The Accounting-ready migration has been applied to staging only.

Verified on staging:

- new pricing columns and the `0%` discount default exist
- price-history trigger works inside a rollback transaction
- quotation snapshot columns work inside a rollback transaction
- rollback validation left no test residue

Supabase advisory note: pricing history is service-role only. The staging project also has pre-existing RLS/policy advisories on several server-only tables; review before production deployment.

## Last-known validation results

These results were valid before the most recent handoff edit and must be rerun after completing E2E/fixes:

- Accounting-focused tests: **10/10 passed**
- Full test suite: **44/44 passed**
- TypeScript: **passed**
- ESLint: **0 errors, 19 warnings**
- Production build: **passed, 65 routes**

Final gates:

```powershell
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd run lint
git diff --check
npm.cmd run build
```

## Current staging E2E record

Use this existing test chain; do not create duplicate records unless it is unusable:

| Item | Value |
| --- | --- |
| Suffix | `594296` |
| Customer | `ea1b0601-b7f5-47d2-a1d5-6fae6f94d10c` — `E2E Accounting-594296` |
| Boat | `7e246cf4-0f58-4950-b004-bf5f8fdd8921` — `E2E Vessel 594296` |
| Berth | Active assignment at `C-1`, notes `E2E workflow 594296` |
| Service Request | `d40166bd-ccf3-4d4a-8a41-d75b071aaa1d` — `SR-897437` |
| Work Order | `51a6bd2d-4e3b-4497-aec7-ed3328cefc13` — `WO-070928` |
| Subcontractor quote | `SCQ-1788867134896`, `E2E Supplier Alpha`, pre-VAT 10,000, VAT 700 |
| Contractor PO | `PO-E2E-594296`, status `PO_ISSUED` |

## Confirmed bugs fixed during E2E

1. Planning Work Order creation failed because staging requires non-null `wo_number`; API now normalizes and writes both aliases.
2. Approved contractor quote disappeared before PO issue because the UI only recognized `SELECTED`; it now recognizes the full continuation through `PO_ISSUED`.
3. Subcontractor new page initially failed production build because `useSearchParams` lacked a Suspense boundary; fixed and build retested.

## Pending work — continue from here

1. Resume staging UI at quotation creation for Service Request `d40166bd-ccf3-4d4a-8a41-d75b071aaa1d`.
2. Configure one staging pricing item with direct cost, revenue code, cost code, and P&L category through the Finance UI.
3. Create a **draft/test quotation** with discount `0%`; confirm database snapshots and server-recomputed totals.
4. Create a staging invoice without sending it to a customer.
5. Record a staging-only test payment; do not initiate or represent a real transfer.
6. Add/verify Work Order labor, material, and subcontractor costs; progress to a reportable completed/waiting-invoice state.
7. Create and execute the test ramp booking for Haul-out and Launch.
8. Verify the end-to-end Job Margin and accounting CSV export.
9. Capture UI evidence and inspect browser console errors at key stages.
10. Investigate the berth-assignment end date showing `2026-09-08` when the optional end date was left blank.
11. Rerun every final gate above and report exact failures/fixes.
12. Review intended files carefully before any commit; the working tree contains unrelated user work.

## Safety boundaries

- Staging writes are allowed only for clearly named E2E test records.
- Do not apply the Accounting-ready migration to production yet.
- Keep `ENABLE_AI_AGENT_WRITES=false` and `ENABLE_AUTOMATION_WRITES=false` until workflow-specific approval and safeguards are complete.
- Do not send real LINE/WhatsApp/email customer messages.
- Do not make or simulate a real-money transfer; any payment record must be clearly staging/test data.
- Do not clean, reset, discard, or overwrite unrelated dirty files.
- In particular, preserve existing user changes in `components/layout/Sidebar.tsx` and `lib/auth-user.ts`.
- Do not commit or push until Full E2E and all final gates pass and the commit scope has been reviewed.

## Working-tree warning

The checkout contains many staged, unstaged, and untracked files from other work, including manuals, messaging/AI work, temporary QA output, and CAD/PDF conversion output. Never use broad cleanup or a blanket commit. Use explicit path review and explicit staging only.

## Local staging server

Preferred command:

```powershell
npm.cmd run dev:staging -- --Port 3004
```

Before starting another server, confirm that port 3004 is not already in use. Do not run concurrent Next.js servers against the same `.next` directory.

## Rate-card source decision

The Google Sheet `ORM_Quote_Tidal_v3_5_Updated` has richer reference pricing details, but its 25%/30% source discount is not the operational transaction discount. Keep operational discount at `0%` by default. Treat spreadsheet expense figures as reference/master data rather than accounting transactions.

## Definition of V1 completion

V1 is not complete until the whole staging E2E chain passes, snapshot and margin figures are verified, the accounting export is usable, final tests/build pass, known bugs are documented or fixed, production deployment is separately approved, and the controlled pilot has produced enough real-use data for Accounting review.

## Continuation result — 2026-09-09

The staging technical E2E chain for suffix `594296` is complete. No production, real customer-message, real-money, commit, or push action was performed.

- Pricing `PAINT_ANTIFOUL_H`: full/current rate THB 285, default discount `0%`, direct cost THB 156.75, revenue/cost GL `4130`/`5100`, P&L `D.Repair Yard` / `Direct Service Cost (COGS)`; quotation snapshots match.
- Quotation `DRAFT-1788884792751`: `CONVERTED`, subtotal THB 14,250, discount THB 0, VAT THB 998, total THB 15,248.
- Invoice `INV-20260908-157531`: `PARTIALLY_PAID`; the staging-only THB 7,624 payment is explicitly labelled `TEST STAGING ONLY — no real money transferred`; Work Order lineage was repaired.
- Work Order `WO-070928`: `COMPLETED`, 100%; labor THB 1,200 + materials THB 800 + contractor THB 10,000 = cost THB 12,000; revenue THB 14,250; gross profit THB 2,250; Job Margin rounds to 16%.
- Ramp bookings `RB-2026-1528` Haul-out and `RB-2026-2390` Launch are `COMPLETED`, linked through Service Request, Work Order, Quotation, and Invoice, and explicitly state that no real boat movement occurred.
- Berth C-1 assignment remains active and open-ended (`end_date = NULL`); the detail page shows `Open-ended` and the two-month calendar renders the open-ended occupancy.

Verified fixes:

1. Work Order tasks fall back to `created_at` ordering when staging lacks `sort_order`.
2. Material create/delete recalculates canonical `total_material_cost`.
3. Work Order detail supports labor-cost entry and `APPROVED -> IN_PROGRESS -> COMPLETED` progression.
4. Quotation-to-invoice conversion preserves `work_order_id`.
5. Blank berth end dates remain `NULL` across create/edit screens and open-ended display/calendar logic.
6. Rate-card import now defaults to staging, exposes a connection-free `--help` path, requires an exact project confirmation for writes, and blocks production/deactivation unless their separate confirmation flags are supplied. Its default output is a compact count summary; `--verbose` prints individual codes only when needed.
7. Rate Card artifacts were regenerated from `ORM_Quote_Tidal_v3_5_Updated.xlsx`, with cost metadata supplemented by matching v3.4 codes. The result contains 127 unique codes, zero operational discount on every row, 127/127 Revenue GL and P&L mappings, and 99/127 Cost GL and Cost P&L mappings. The remaining 28 new-code cost mappings require Accounting confirmation rather than guessed values.

Final clean-worktree gates after the fixes:

- `npm.cmd test`: 53/53 passed.
- `npx.cmd tsc --noEmit`: passed.
- `npm.cmd run lint`: passed.
- `git diff --check`: passed; only existing LF-to-CRLF conversion warnings were printed.
- staging-configured `npm.cmd run build`: passed, 64 static pages generated; 15 non-blocking pre-existing warnings were printed during build. Full lint reports 18 warnings because it also checks `auth.ts`; there are no lint errors.

The reviewed workflow is isolated on local branch `codex/connected-workflow-v1` in clean worktree `C:\Users\asus\.codex\worktrees\mms-connected-v1\marina-mms`. The user's original index and unrelated dirty files remain untouched. No push has been made.

The refreshed staging Rate Card preview is read-only and reports 10 additions, 117 changes, 0 unchanged, and 0 missing codes. No import was applied.

Read-only staging verification on 2026-09-09 confirmed migration `20260908110824 accounting_ready_pricing`, 117 existing pricing rows, 117 rows at operational discount `0%`, and one pricing-history row. Security advisors report 39 informational `RLS enabled, no policy` notices across service-role-only tables; performance advisors report two `auth_rls_initplan` warnings on `inquiries`, one unindexed `inquiries.assigned_to` foreign key, and unused-index informational notices. These are recorded for production review and were not changed in staging.

Pricing-history review found that staging's `service_role` could update/delete/truncate history and its foreign key used `ON DELETE CASCADE`. Source-only migration `20260909143000_harden_pricing_history.sql` now changes the relationship to `ON DELETE RESTRICT` and grants `service_role` only `SELECT, INSERT`. It has not been applied to staging or production.

Accounting review worksheet `docs/2026-09-09-accounting-cost-mapping-review.md` lists all 28 unresolved Cost GL/P&L mappings. Those mappings and the source-only history hardening are the remaining approval gates before applying the refreshed Rate Card to staging.

Remaining completion work is outside this technical staging run: controlled real-use pilot, Accounting review from pilot data, separate production approval/deployment, and any later Accounting V2 scope.
