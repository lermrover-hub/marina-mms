# Service Request Pricing Audit — 2026-11-02

## Scope

This audit verifies the reported v3.7/Service Request issues against the current Marina MMS source and the staging Supabase pricing rows. It is a code and staging-preview change only; no production data, quotations, invoices, or prices were modified.

## Findings

### Claude Code finding: v3.7 is not the active quotation source

Confirmed. The existing comparison report records that the staging Pricing Master has no exact-code matches for the approved v3.7 workbook rows and still contains mixed v3.5/v3.6 source versions. The current staging rows used by Service Request include `REPAIR_MONO_W`/`REPAIR_MONO_M` from v3.5 and `YACHT_STORAGE_D`/`YACHT_STORAGE_M` from v3.6. This remains a management decision for a future approved rate import, not an automatic import.

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

## Validation

- `npm test`: 140 passed, 0 failed.
- `npx tsc --noEmit`: passed.
- `npm run build`: local collection reaches compilation/type checking, then fails because local shell variables do not contain Supabase URL. Vercel Preview is configured with Preview Supabase variables and is the deployment validation target.
- Supabase staging: read-only verification completed; no pricing rows changed.

## Remaining approval

The approved v3.7 workbook must be present and explicitly approved before importing/replacing v3.7 rates. No new prices or discounts are inferred from screenshots or legacy rows.
