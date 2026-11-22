# Marina MMS v3.8 staging review

Scope: Rate Management and staging rate data. This round does not edit
Service Request, Service Order, or Quotation workflow files. The isolated
review build carries forward the previous session's existing v3.8 Quotation
integration to test it, not a new workflow change. It is not a production release.

## Source and catalogue

- Owner workbook SHA-256:
  `6527061e33fb00c4f3feaf5e3eecdc470e0738d68f535183d09bb476e7b1e3ac`.
  The new attachment, local workbook, and Claude's reviewed workbook match.
- 52 v3.8 rows on the staging Supabase project `zanlunbgupdtqznruzok`:
  30 storage/yard, 15 haul/launch packages, 2 standalone components,
  5 manager-review records. No rates inferred for Ramp, Power Catamaran,
  Sail Monohull as a separate price, or additional workshop services.
- Seed records carry 14 t SB/Sport/Monohull limits and 12 t Catamaran limits
  where applicable. LOA bounds are stored with the approved rows.
  Six per-foot records use the existing `LOA_RATE_QTY` label.
  The v3.8 calculator reads `rate_basis`, not that compatibility label.
- The seed is dry-run by default. `--apply` is staging-only and insert-only;
  existing v3.8 edits are preserved, and collisions with earlier codes fail.
- Workbook-to-system aliases (no destructive rename of existing references):
  `REF-TOW-RT` = `TOW-ROUND-TRIP`, `REF-TRAILER-CYCLE` = `TRAILER-CYCLE`,
  `PENDING-PWC` = `MR-PWC`, `PENDING-DINGHY` = `MR-DINGHY`,
  `PENDING-FISH` = `MR-FISHING-15`, `PENDING-POWERCAT` = `MR-POWER-CAT`,
  `PENDING-LARGE` = `MR-LARGE-YACHT`.

## Tested quotation workflow

Chrome signed in as a staging admin through the normal login form. In the
existing New Quotation page, picked customer and vessel, added a rate through
Rate Card, clicked Save Draft, verified the detail and found exactly one
matching list entry per draft:

| Case | Saved quantity | Unit price (THB) | Subtotal (THB) | Total (THB) |
| --- | ---: | ---: | ---: | ---: |
| 28 ft SB2, daily | 1 | 700 | 700 | 749 |
| 40 ft motor monohull, monthly | 40 | 650 | 26,000 | 27,820 |

Both test drafts were removed from staging. No customer messages were sent.

## Tested Rate Management workflow

- Authenticated staging browser showed 52 v3.8 rows. Verified Storage rows
  are ordered by Tier, then Day, Week, Month.
- Created a temporary rate at 100 THB, increased to 140, reduced to 120,
  deactivated, reactivated and confirmed it after reload. The test archives
  its temporary row afterward rather than modifying an approved rate.
- Checked desktop (1440 px) and mobile (390 px). Mobile has horizontal table
  scrolling without page-level overflow.

## Review boundaries

- Do not merge the original dirty worktree or `git add -A` there. Never
  touch the separate `C:\orm-marina` project. Do not enable AI, automation,
  real-customer messaging, or production booking writes.
- Legacy rates are not silently retired. The existing quotation picker can
  still show them. Rate Management version filters are independent of that picker.
- Unknown displacement is not rejected by the existing calculator. The
  tier evaluator applies per-row minimum LOA before the higher-of rule, so
  a small boat with more engines can be incorrectly ineligible for its higher
  tier. Fractional LOA between whole-foot bands is another case to review.
  These are findings, not changes to the protected workflows.
- Claude's alternative Service Request priced workflow was found on the
  v3.7 catalogue branch, not in the current baseline. It was not ported
  or changed. Do not use these tests as evidence of a priced Service Request.
- Do not use production credentials or claim live delivery, historical
  quote edits, or production security were verified by this staging review.
- Source files for review: `lib/rate-catalog-order.ts`,
  `app/(dashboard)/pricing-master/{page.tsx,[id]/page.tsx}`,
  `scripts/seed-pricing-v38.mjs`; browser scripts are
  `tests/pricing-v38-{admin,quotation}-browser.mjs`.
