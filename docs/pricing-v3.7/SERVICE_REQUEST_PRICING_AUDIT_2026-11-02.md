# Service Request Pricing Audit — 2026-11-02

## Scope

This audit verifies the reported v3.7/Service Request issues against the current Marina MMS source and the staging Supabase pricing rows. It is a code and staging-preview change only; no production data, quotations, invoices, or prices were modified.

## Findings

### Claude Code finding: v3.7 was not the active quotation source

Confirmed before the sync. Staging had 156 mixed v3.5/v3.6 rows and no exact-code matches for the canonical v3.7 rows. The approved v3.7 workbook is now imported into staging only: 126 unique canonical codes are present with `source_version = ORM-PRICE-2026-v3.7`; 39 confirmed legacy aliases are retired with `is_active = false` and historical records are preserved.

### Yacht monohull weekly LOA multiplication

Fixed in the application calculation path. A rate is now treated as per-LOA when either its calculation method (`PER_FOOT`, `LOA_RATE_QTY`, `LOA_RATE_DAYS`) or its unit (`ft/...` or `ft`) identifies a length-based charge. This prevents a stale or inconsistent `calc_type` from silently charging one unit instead of `LOA × rate`.

### Boat Stand weekly quantity for multiple weeks

Fixed in Service Request. `stand/wk` remains a flat stand-week charge, but the UI now accepts a direct quantity (for example, 7 stands × 3 weeks = 21 stand-weeks). Re-selecting the same repeatable weekly/monthly service merges into the existing line and increments quantity instead of creating a duplicate charge line. Non-repeatable duplicate services remain blocked.

## Staging rows verified (read-only)

| Code | Unit | Calculation | Rate | Source |
|---|---|---|---:|---|
| `REPAIR_MONO_W` | `ft/week` | `LOA_RATE_QTY` | 240 | `ORM-PRICE-2026-v3.5` |
| `REPAIR_MONO_M` | `ft/month` | `LOA_RATE_QTY` | 800 | `ORM-PRICE-2026-v3.5` |
| `STAND_WEEK` | `stand/wk` | `FLAT_QTY` | 500 | `ORM-PRICE-2026-v3.5` |
| `STAND_MONTH` | `stand/mo` | `FLAT_QTY` | 700 | `ORM-PRICE-2026-v3.5` |
| `YACHT_STORAGE_D` | `ft/day` | `PER_FOOT` | 30 | `ORM Pricing Structure v3.6 FINAL_MERGED` |
| `YACHT_STORAGE_M` | `ft/month` | `PER_FOOT` | 525 | `ORM Pricing Structure v3.6 FINAL_MERGED` |

## v3.7 staging sync (2026-11-02)

Before the write, `public.pricing_master_backup_v37_20261102` was created with 156 rows. The approved workbook `ORM_Quote_Tidal_v3_7_Tier3_41_50_Tier4_51_60_APPROVED.xlsx` contains 126 unique canonical codes; those rows are now upserted in staging. Confirmed `LEGACY_RATES` aliases are retired without deletion, and pre-existing `PENDING_*` rows are inactive so they cannot be selected automatically. Tier 4 rates retain the manager/capacity gate and are calculated from actual 51–60 ft LOA rather than treating the 51 ft display value as a fixed price.

## Validation

- `npm test`: 140 passed, 0 failed.
- `npx tsc --noEmit`: passed.
- `npm run build`: local collection reaches compilation/type checking, then fails because local shell variables do not contain Supabase URL. Vercel Preview is configured with Preview Supabase variables and is the deployment validation target.
- Supabase staging: backup, v3.7 sync and verification completed; no production rows changed.
- Vercel Preview: `https://marina-f61m23i6t-lermrover-hubs-projects.vercel.app` reached `READY`; `/login` returned the deployed Marina MMS login page.

## Remaining approval

No production release is implied. The staged database changes are reversible from `public.pricing_master_backup_v37_20261102` if a later approved rollback is required. Production promotion remains a separate approval gate.

## Follow-up reconciliation — 2026-11-04

The approved workbook and the latest rate summary were re-read locally and hashed in `SOURCE_MANIFEST.md`. They confirm 126 canonical v3.7 codes, 107 quoteable rows and 19 manager/capacity-review rows. A fresh staging backup was created as `public.pricing_master_backup_v37_reconcile_20261104` with 225 rows. The remaining 39 active non-v3.7 rows were retired without deletion (`is_active=false`, `quote_allowed=NO`, `price_status=LEGACY_ALIAS`). Existing quotation and service-request references remain intact.

The application now uses the v3.7 storage code families (`STORE_SB_T1_*` through `STORE_SB_T4_*`), Tier 3 = 41–50 ft, Tier 4 = 51–60 ft, and the actual-LOA Tier 4 storage formula. Tier 4 ramp/haul classification returns a special manager-review code rather than auto-mapping a legacy 3-engine ramp code.
