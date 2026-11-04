# Marina MMS — Phase Progress and Business Decisions

**Date:** 4 November 2026  
**Environment:** Staging / Vercel Preview only  
**Production:** unchanged; no production migration or deployment

## Decisions now in force

1. **Wet berth:** blocked and unavailable until the marina is operationally opened. The UI, Service Request, quotation API, AI quotation route, Pricing Master list and recurring billing must not create a chargeable wet-berth item.
2. **Recurring storage billing:** `SPACE_LEASE` uses calendar-month periods. Existing recurring invoice period keys remain `YYYY-MM`; a separate 30-day repair-hold scenario is retained only where the workflow explicitly names `REPAIR_HOLD_30D`.
3. **Legacy calculation methods:** old labels are translated explicitly (`FLAT_QTY` → per unit, `FLAT_DAYS` → per day, `LOA_RATE_QTY`/`LOA_RATE_DAYS` → per foot, `MANUAL` → manual quote). Unknown labels fail closed; they must not silently bill quantity one. Existing rows still require a measured, Finance-approved row-by-row mapping before any database migration.
4. **Tide delay:** no automatic waiver or automatic credit. If management wants relief, staff use the normal approved discount authority and record the reason; the system does not invent a tide-delay discount.
5. **Full vs Pilot:** selected by the developer-controlled `MMS_RATE_MODE` setting (or an explicit server-side `rate_mode` for a controlled test). Default remains `PILOT` during the controlled pilot. The chosen amount is snapshotted into the quotation; no second percentage discount is stacked.

## Phase status

| Phase | Status | Evidence / remaining gate |
|---|---|---|
| 1. Audit and backup | Complete for current staging snapshot | The approved workbooks are now reachable and hashed in `docs/pricing-v3.7/SOURCE_MANIFEST.md`. The v3.7 source resolves the earlier 126/132 ambiguity in favor of 126 canonical codes. |
| 2. Pricing governance | Implemented in code and tests | Wet berth fail-closed, price-status/quoteability gate, legacy calc mapping, manager-review escalation, Full/Pilot selection and v3.7 storage snapshot notes. |
| 3. Rate-card reconciliation | Complete in staging; Production untouched | A fresh backup of all 225 rows was created in `public.pricing_master_backup_v37_reconcile_20261104`. The 126 v3.7 rows remain active; the 39 non-v3.7 active legacy rows were retired with `is_active=false`, `quote_allowed=NO`, and `price_status=LEGACY_ALIAS`. Existing quotation and service-request references remain preserved. |
| 4. Quotation, recurring billing and finance | Staging E2E verified; production gate pending | Calendar-month recurring path retained; Monthly P&L Preview and CSV export are available. Synthetic payment/account close reached `PAID` with zero balance and an invoice→quotation→Work Order link. Real customer messaging/payment remains disabled. |
| 5. Preview and release readiness | Preview verified; not production-ready | Tests, typecheck and Vercel Preview are green. Production remains out of scope until Finance/Manager sign-off and rate-count reconciliation are complete. |

## Monthly P&L scope

The new `/reports/pnl` view is a **management P&L preview**, not a statutory ledger. It uses net invoiced subtotal (VAT excluded, invoice discount excluded) as revenue and completed/closed work-order labor, material and contractor totals as direct cost. Missing or unmapped costs are excluded and shown as a limitation rather than guessed. Finance must reconcile GL/P&L mappings before closing a real accounting period.

## Validation recorded in this phase

- `npm test`: 145 passed, 0 failed.
- `node --test ai-agents/tests/speedboat-classification.test.js`: 20 passed, 0 failed.
- `npx tsc --noEmit`: passed.
- `npm run build`: local Node 24.15.0 hit the existing Next/Webpack `WasmHash` runtime error; the same commit built successfully on Vercel Preview (`READY`).
- No Supabase migration was executed in this phase.
- Latest staging pricing snapshot after the approved staging-only reconciliation: 126 active v3.7 rows, 99 retired rows, 225 total. The reconciliation backup contains 225 rows. No Production data, quotation, invoice or deployment was modified.
- No Production data, quotation, invoice or deployment was modified.

## Staging E2E payment/account-close evidence — 4 November 2026

Using the existing synthetic Alex/Jaguar staging records only (no real customer, message or bank transfer):

1. The approved quotation was marked `ACCEPTED` for the controlled test, then converted through `mms_convert_accepted_quotation_to_invoice`.
2. Invoice `INV-STG-ALEX-20261104` was created for THB 36,915 including VAT.
3. The full amount was recorded through `mms_record_confirmed_payment` with reference `STAGING-E2E-ALEX-20261104` and note `SIMULATED staging payment only`.
4. Read-back verified `status=PAID`, `paid_amount=36915`, `outstanding_balance=0`.
5. The invoice is linked to quotation `DRAFT-1792256148720`, Work Order `WO-STG-145223-01` (`OPEN`) and Service Request `SR-145223`.

This proves the accounting close and traceability chain in staging. It does not represent a real bank settlement and must not be copied to Production.

## Final Preview handoff — 4 November 2026

- Branch: `codex/v37-catalog-admin`
- Code commit: `622d563` (`fix: align service storage with approved v3.7 tiers`)
- Final handoff commit: `d0455a1` (`docs: record final v3.7 preview handoff`)
- Pull Request: https://github.com/lermrover-hub/marina-mms/pull/6
- Vercel Preview: https://marina-mms-git-codex-v37-catalog-admin-lermrover-hubs-projects.vercel.app
- GitHub Vercel status for commit `d0455a1`: `success` (deployment `TZ2ZMW7G9DKU2RzgTrZRqNHjB42z`)
- HTTP smoke check: `/login` returned `200`; protected `/reports/pnl` returned `307` to `/login` when unauthenticated.
- Staging read-back: `pricing_master` = 126 active `ORM-PRICE-2026-v3.7` rows, 0 active legacy rows, 99 retired rows, 225 total; reconciliation backup = 225 rows.

The Preview is usable for authenticated browser testing. Production deployment and production database writes remain intentionally disabled.
