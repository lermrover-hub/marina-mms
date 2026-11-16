# Marina MMS Pricing Master management — QA handoff

**Checked:** 12 November 2026

**Branch:** `codex/v37-catalog-admin`

**Environment:** Staging Supabase `marina-mms-staging` (`zanlunbgupdtqznruzok`) and Vercel Preview only
**Production:** no deployment or database write

## What changed

- `/pricing-master/new` is the create state of the existing dynamic route `/pricing-master/[id]`. The earlier conclusion that this URL was missing was incorrect.
- Pricing Master now exposes Add, Edit and Retire controls. Retire is a soft delete; history and references remain. Mobile cards show Edit and Retire without horizontal scrolling.
- New rates start `INACTIVE` with `quote_allowed=NO`. After create, the user lands on the saved detail page so the draft is visible even though the list defaults to active rates.
- Category, unit and service group accept typed values and suggest existing catalog entries. This supports future categories and groups without changing code.
- The edit form preserves v3.7 `APPROVED_*` statuses and the `LOA_MULTIPLIER` / `TIER4_LOA_DYNAMIC` calculation labels. An unchanged status no longer recalculates `is_active`.
- Reactivating `LEGACY_ALIAS`, `REFERENCE_ONLY` or `BLOCKED_WET_BERTH` is rejected. Active auto-quoted or manager-review rows require a positive selling rate, and an explicit pilot override must also be positive.
- New wet-berth rates and edits that introduce wet-berth naming are rejected while the wet-berth feature remains disabled.
- Pricing Master displays the developer-selected Full/Pilot mode and the effective rate actually returned by the server. Effective gross profit and exported CSV use that selected rate.

## Staging reconciliation

Before the data correction, the database had 225 rows, including 126 active v3.7 rows. Nine `H.Wet Berth` rows were still `is_active=true` and `quote_allowed=YES`, contrary to the approved block rule, although the application hid them.

The nine rows were verified byte-for-byte against `public.pricing_master_backup_v37_reconcile_20261104` before the change. Only these nine staging rows were set to `is_active=false`, `quote_allowed=NO`, `price_status=BLOCKED_WET_BERTH`. Codes, prices, source versions and historical documents were not changed. The database audit trigger records the updates.

Read-back after correction: **225 total**, **126 canonical v3.7**, **117 active**, **9 blocked wet-berth**, **0 active PENDING/BLOCKED**.

## Verification and limits

- `npm test`: **149 passed, 0 failed**.
- `npm run agents:test` with `AI_AGENT_DRY_RUN=true` and `AI_AGENT_SKIP_CLAUDE=true`: **134 passed, 20 skipped, 0 failed**. The ordinary command without those safety environment variables fails two explicit safety-guard tests; the guarded run is the valid result.
- `npx tsc --noEmit`: passed.
- Targeted ESLint and `git diff --check`: passed.
- Local `npm run build` on Node 24.15.0 fails inside Next/Webpack `WasmHash._updateWithBuffer`; this is a local build-runtime issue previously seen on this worktree. Vercel Preview build status must be checked separately for the pushed commit.
- The Vercel project lists Preview and branch-scoped variables. `vercel env run` did not pass encrypted values to the local verification script, so that script's missing-variable result does **not** prove a deployed runtime is missing them. An authenticated Preview read/write check remains required before calling the live web workflow fully verified.
- A prior controlled staging test reached a paid invoice with zero outstanding balance, but it used a simulated payment. This does not prove a real bank settlement or statutory monthly P&L close. See `2026-11-04-phase-progress-and-decisions.md`.

## Remaining release gates

1. Sign in to the new Preview as Super Admin or Finance and create, edit, retire and read back a clearly marked **inactive test rate** through the UI. Do not enter an invented operational price.
2. Confirm Finance/Manager approval for new rate values and outstanding cost/GL mappings before enabling them for quotations.
3. Reconcile a real bank-confirmed payment and monthly P&L against the accounting ledger before production release.
4. Production deployment and production database writes still require their separate explicit approval.
