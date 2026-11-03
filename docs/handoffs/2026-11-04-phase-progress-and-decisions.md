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
| 1. Audit and backup | Complete for current staging snapshot | v3.7 audit and pricing backup are recorded in `docs/pricing-v3.7/`; source workbook reachability and Finance count decisions remain documented gates. |
| 2. Pricing governance | Implemented in code and tests | Wet berth fail-closed, price-status/quoteability gate, legacy calc mapping, manager-review escalation, Full/Pilot selection and v3.7 storage snapshot notes. |
| 3. Rate-card reconciliation | Staging sync recorded | 126 canonical codes and 39 retired aliases are recorded by the v3.7 staging audit. No production import. |
| 4. Quotation, recurring billing and finance | In progress / controlled preview | Calendar-month recurring path retained; monthly P&L Preview now reads invoices and completed work-order costs. Payment confirmation, account close and Work Order delivery remain Preview Safe Mode gates. |
| 5. Preview and release readiness | Not production-ready | Run tests, typecheck, build and Preview verification. Production remains out of scope until Finance/Manager sign-off and staging E2E evidence are complete. |

## Monthly P&L scope

The new `/reports/pnl` view is a **management P&L preview**, not a statutory ledger. It uses net invoiced subtotal (VAT excluded, invoice discount excluded) as revenue and completed/closed work-order labor, material and contractor totals as direct cost. Missing or unmapped costs are excluded and shown as a limitation rather than guessed. Finance must reconcile GL/P&L mappings before closing a real accounting period.

## Validation recorded in this phase

- `npm test`: 143 passed, 0 failed.
- `npx tsc --noEmit`: passed.
- No Supabase migration was executed in this phase.
- No Production data, quotation, invoice or deployment was modified.
