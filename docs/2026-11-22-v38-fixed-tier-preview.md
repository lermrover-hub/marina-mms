# v3.8 fixed-tier staging rollout

Approved source: `ORM_Rate_Card_v3_8_FIXED_TIERS.xlsx`, owner confirmation
on 22 November 2026. Staging only; the production project was not changed.

- Preview: https://marina-mms-v38-review-ran8er765-lermrover-hubs-projects.vercel.app/pricing-master
- The staged catalogue has 80 active v3.8 rows, including 15 non-quotable
  review records. Ramp has 3 approved speedboat rows, 10 request-price rows,
  and the existing Jet Ski and self-tow fishing rates under earlier versions.
- Stored fixed rates for 21 Monohull and Sail Catamaran duration rows.
  Dry Storage and Service Yard share those records. No active v3.8 row uses
  a per-foot basis. Superseded storage rates and the old Monohull per-foot
  haul-out rates were retired, not deleted.
- For storage/haul Speedboat and Sport & Cruiser, existing length/engine
  tier selection can promote a shorter vessel with more engines. Ramp
  still honors its narrower approved length band. No unapproved prices
  were added; the 47+ to 50 ft Ramp gap stays manager review.
- Existing Quotation, Service Request, and Service Order code is unchanged.
  The pricing engine and catalogue change only the eligibility and amounts
  of affected new quote lines. Old quotation headers and rows matched
  before/after checksums (25 existing quotations).
- No real notification was sent. Unknown displacement still needs staff
  review before accepting the job; this rollout does not add a mandatory
  field or change downstream booking, service-order, or delivery steps.

## Verification results

- Vercel build and type check passed (76 generated static pages); protected
  deployment `dpl_7tsrmo5A5AtaLeRBu3whmdoKm6xG` is READY.
- Browser login and Save Draft worked against the deployed Preview. Read
  back these stored lines, each with quantity 1 and its pricing snapshot:
  - `STG-M3-M`: 26,000 THB / month (40 ft Motor Monohull).
  - `PKG-HL-MONO-39-42`: 16,000 THB / package.
  - `RAMP_SB_2ENG_28_40`: 1,200 THB / trip (28 ft Speedboat).
- Compared all 21 new storage amount values with the approved table.
- Temporary account and all three test quotes were removed. Original
  quote and item checksums still matched after cleanup.
- Pricing tests: 10/10. The plain repository Node test command reported
  40 passing tests and one loader failure in `auth-user.test.js`: the
  prior Preview auth adapter uses a Next.js-only `@/` import, which the
  bare Node runner cannot resolve. Its code did not change in this rollout.

## Reproduction

- `scripts/staging-v38-fixed-tier-rates.sql` is a one-time staged data change,
  with a baseline precondition and end-state checks. Do not run on production.
- `node --test tests/pricing-v38.test.ts`
- `tests/pricing-v38-preview-smoke.mjs` opens the protected Preview with
  a temporary authorized staging account and cleans up its test drafts.
  Provide `MMS_QA_PREVIEW_URL`, `MMS_QA_STAGING_ENV` and `PLAYWRIGHT_ENTRY`,
  then use `vercel env run` in the linked protected Preview project.
