# Pricing v3.6 Test Matrix

## Status legend

- **PASS** — behavior was executed against current source and matches the stated result
- **FAIL** — behavior was executed/inspected and current source contradicts the result
- **NOT IMPLEMENTED** — independent workbook/manual simulation succeeds, but no equivalent application rule exists
- **BLOCKED** — cannot evaluate because a required input/system is unavailable
- **SPECIFIED / NOT EXECUTED** — acceptance case added for audit approval; implementation and executable verification are intentionally deferred

This matrix is source-level only. No staging database writes, authenticated browser E2E, real W4/B1 availability checks, or production tests were performed.

`W4` and `B1` in this matrix are physical boat-storage slot/area codes. They are not service categories or vessel classes. The proposed `SB4_W4_*` and `SB4_B1_*` identifiers are rate-card item codes whose applicability is constrained by those physical slots.

Reference input is `ORM_Rate_Structure_v3_6_FINAL_MERGED.xlsx` with SHA-256 `AAA63443ABD839508D063B5029159B0E1A05A31A7621A73D5B8D6073C6243203`. The latest direct instruction requires approved prices to remain unchanged and prohibits automatic creation of a rate or discount for 56–60 ft.

## Summary

| Status | Count |
|---|---:|
| PASS | 4 |
| FAIL | 9 |
| NOT IMPLEMENTED | 16 |
| BLOCKED | 0 |
| Total | 29 |

The executed/source-inspection summary above remains unchanged. Four additional approval-gate boundary cases are specified below and are not counted as executed results.

## SB4 boundary acceptance cases awaiting audit approval

| ID | Input | Expected classification | Expected pricing behavior | Expected operational behavior | Status |
|---|---|---|---|---|---|
| A-SB4-55 | Speedboat, 4 engines, LOA 55 ft, verified weight at or below 12 t | SB4 | Use only an existing approved applicable rate. Do not add or derive a new rate/discount | Classification alone does not approve haul-out. Apply all engineering, trailer, tide, and availability gates | SPECIFIED / NOT EXECUTED |
| A-SB4-56 | Speedboat, 4 engines, LOA 56 ft, verified weight at or below 12 t | SB4 | Do not introduce a 56–60 ft rate or discount. If no approved applicable rate exists, block quotation and request rate approval | Manual operational assessment remains required where standard capability is not verified | SPECIFIED / NOT EXECUTED |
| A-SB4-60 | Speedboat, 4 engines, LOA 60 ft, any weight | SB4 | Preserve approved rates only. No synthetic rate, tier extension, or automatic discount | Classification is not operational approval. If weight exceeds 12 t, automatic standard haul-out quotation must be blocked | SPECIFIED / NOT EXECUTED |
| A-SB4-61 | Speedboat, 4 engines, LOA 61 ft | Outside configured range | No automatic rate selection or quotation | Block standard workflow and escalate for manual commercial and handling assessment | SPECIFIED / NOT EXECUTED |

### Required capacity test variants

Run each in-scope boundary case twice where data permits:

1. verified weight exactly 12.0 tonnes: continue to the remaining engineering checks; do not treat weight alone as final approval;
2. verified weight above 12.0 tonnes: return a hard ineligible result for automatic standard ramp/trailer haul-out, suppress the standard haul-out quotation line, and create a manual handling assessment requirement.

The audit must also verify that price snapshots on existing quotations and invoices do not change when classification rules or future approved rates change.

## Detailed results

| ID | Input | Expected result | Actual result / evidence | Status | Root cause | Affected files | Recommended correction |
|---|---|---|---|---|---|---|---|
| T01 | SB1, 1 engine, 25 ft; v3.6 storage | SB1 and correct period rate | Classifier returns group 1. Current rate source remains v3.5/full-rate oriented and lacks a unified v3.6 period resolver | FAIL | Classification and price selection are separate and v3.6 is not loaded | `lib/speedboat-classification.ts`; `scripts/import-rate-card.json`; Service Request UI/API | Add v3.6 codes and resolver; test daily/weekly/monthly separately |
| T02 | SB2, 2 engines, 35 ft | SB2 and correct period rate | Classifier returns group 2. Soft rates are not selected consistently by Service Request | FAIL | Service Request uses `rate_thb`, not an explicit approved selling-rate type | Same as T01; `lib/pricing-master.ts` | Add explicit rate type/effective selling rate and server-side resolution |
| T03 | SB3, 3 engines, 45 ft | SB3; 800/600 daily, 4,800/3,600 weekly, 19,000/14,250 monthly | Classifier returns group 3. Current import has daily 700 and weekly 4,500, not v3.6 | FAIL | v3.5 rows are stale | `scripts/import-rate-card.json/sql` | Replace via versioned v3.6 import after staging approval; preserve historical rows |
| T04 | SB4, 4 engines, 55 ft | SB4 classification only; retain approved price and require separate operational eligibility | Direct classifier simulation returned group 4 but also returns a ramp code | PASS | Classification matches, but the operational decision remains coupled | `lib/speedboat-classification.ts`; JS port | After audit approval, add the A-SB4-55 acceptance case and separate eligibility result |
| T05 | SB4, 4 engines, 60 ft | SB4 classification only; no new rate/discount; separate operational approval | Direct classifier simulation returned group 4 | PASS | Current pass is accidental because all values over 47 become group 4 | Same as T04 | After audit approval, add explicit 56/60 boundaries and no-synthetic-rate assertions |
| T06 | 4 engines, 61 ft | Outside configured range; manager review; no automatic rate or ramp code | Direct simulation returned group 4 / `RAMP_3OB` | FAIL | No upper-bound state | Classifier TS/JS; quotation agent | After audit approval, return `OUTSIDE_CONFIGURED_RANGE` and prohibit auto rate/ramp code |
| T07 | 60 ft, W4, trailer | Storage eligible subject to slot and technical checks; haul-out separate | No W4 trailer-only policy engine or availability gate | NOT IMPLEMENTED | Berth model lacks method/policy fields and POST accepts raw assignment | `prisma/schema.prisma`; berth assignment API/UI | Add storage eligibility result and W4 policy validation |
| T08 | 60 ft, W4, boat stands | Block | No server-side W4 stand restriction | NOT IMPLEMENTED | No slot-method constraint | Same as T07 | Reject `W4 + BOAT_STANDS` before quotation/allocation |
| T09 | 60 ft, B1, boat stands | Eligible after technical checks; mandatory crane 12,000/event | B1 can exist as a slot, but no stands/crane policy is enforced | NOT IMPLEMENTED | No structured handling method or companion service rule | Berth/service request/pricing modules | Require approval and auto-add locked crane line item |
| T10 | 60 ft, B1 occupied | Block allocation | GET can query overlaps, but POST inserts without overlap validation | NOT IMPLEMENTED | No transactional overlap gate | `app/api/db/berth-assignments/route.ts` | Server/RPC transaction must reject overlap |
| T11 | 60 ft, stands, slot other than B1 | Block | No rule ties 60-ft stands to B1 | NOT IMPLEMENTED | Generic berth allocation only | Berth API/schema/UI | Add explicit slot-policy matrix and fail closed |
| T12 | W4, 7 days | 4,200 ex VAT | Workbook and independent simulation return 4,200; application has no W4 rate/package engine | NOT IMPLEMENTED | v3.6 rate absent | Pricing import/resolver | Add `SB4_W4_WEEK` Soft Opening fixed rate |
| T13 | W4, 30 days | 18,000 ex VAT | Workbook and independent simulation return 18,000; not implemented | NOT IMPLEMENTED | Same | Same | Add `SB4_W4_MONTH` |
| T14 | B1, 7 days | 5,400 ex VAT | Workbook and independent simulation return 5,400; not implemented | NOT IMPLEMENTED | Same | Same | Add `SB4_B1_WEEK` |
| T15 | B1, 30 days | 19,500 ex VAT | Workbook and independent simulation return 19,500; not implemented | NOT IMPLEMENTED | Same | Same | Add `SB4_B1_MONTH` |
| T16 | W4, customer-owned trailer | No trailer rental | No trailer ownership field or duplicate-charge validation | NOT IMPLEMENTED | Ownership and rental policy not modeled | Service Request schema/UI/API; pricing resolver | Record trailer ownership; suppress rental automatically |
| T17 | W4, ORM trailer | Separate rental only with approved rate and agreement | No approved long-term rental gate | NOT IMPLEMENTED | Missing approval-aware rate item | Pricing Master; Service Request; quotation approval | Require active approved code and customer agreement snapshot |
| T18 | 5 staff, 5 night hours | OT cost 3,250 | Workbook and independent simulation return 3,250; no app calculator | NOT IMPLEMENTED | OT is not structured in code | New costing module/API/tests | Add table-based cumulative OT calculator |
| T19 | 5 staff, 8 night hours | Policy simulation 3,250; legal review | Simulation caps at 650/person; no app rule or legal-review flag | NOT IMPLEMENTED | Missing policy engine and review field | New costing module; approval metadata | Cap simulation but force HR/legal review; define fractional rounding |
| T20 | Vessel over 12 tonnes | Hard block on automatic standard haul-out quotation; manual handling assessment required | Current classifier only escalates risk from 4,000 kg and can still provide a ramp code | FAIL | Risk label is not an eligibility block | Classifier; quotation agent; booking/API | After audit approval, create a separate haul-out eligibility gate with hard `>12t` block and no standard quote line |
| T21 | Wet berth request | Unavailable | Active wet-berth rows/options/help/report paths remain | FAIL | Historical/future wet-berth features are still active | Rate card, contracts, quotations, help/dashboard/report UI | Disable new wet-berth sales while retaining history |
| T22 | Soft Opening Rate | No additional 25% discount | Default discount is 0%, but no rate-type lock exists and Service Request does not consistently use pilot/effective rate | FAIL | Generic pilot and discount mechanisms cannot prove a rate is already Soft Opening | Pricing model/UI/API; Service Request | Add immutable rate type and reject extra soft discount |
| T23 | Historical quotation after price change | Original price unchanged | Source tests/migration confirm quotation price snapshots | PASS | — | pricing migration; quotation API | Retain; add v3.6 regression test |
| T24 | Approved quotation converted to invoice | Approved amount preserved | Source tests and RPC copy unit price, discount and line total | PASS | — | invoice RPC/API | Retain; add v3.6 code/source audit fields to invoice if required |
| T25 | External/deep-keel haul-out | Separate subcontract, internal labor/OT, fuel/equipment/prep/handling/margin; block unknown scope | Workbook simulates breakdown, but app has no mandatory structured cost gate | NOT IMPLEMENTED | Generic line items do not enforce completeness | Pricing/costing model; quotation approval | Add special-operation estimate with required/unknown states |
| T26 | 60-ft storage vs standard haul-out | Storage may pass while haul-out fails | UI fields are distinct, but classifier assigns SB4 a ramp code and no independent server eligibility decisions exist | FAIL | Pricing classification and operational capability are coupled | Classifier; quotation agent; Service Request API | Return separate `storageEligibility` and `haulOutEligibility` objects |
| T27 | W4, 10 days | 1 week + 3 days = 6,300 ex VAT | Workbook and independent simulation return 6,300; UI requires manual item/quantity selection | NOT IMPLEMENTED | No package optimizer | Pricing resolver; Service Request UI/API | Add deterministic minimum-cost package function and breakdown |
| T28 | B1, 10 days | 1 week + 3 days = 8,100 ex VAT | Workbook and independent simulation return 8,100; not implemented | NOT IMPLEMENTED | Same | Same | Same |
| T29 | SB4 placed on boat stands | Crane only; customer selling price 12,000 per lifting event; no hydraulic-lift alternative | Current sources conflict: hardstand form 10,000; rate card crane 13,500; workbook special-operation uses 12,000 as cost and calculates 13,800 sale | FAIL | Duplicate hardcoded definitions and no SB4 mandatory crane rule | `scripts/import-rate-card.json/sql`; hardstand form; Pricing Master; Service Request | Create one approved v3.6 crane code at 12,000 selling price/event; deprecate conflicting selectable codes for this rule; auto-add and lock it for SB4 stands |

## Simulation detail

### Storage packages, ex VAT

| Slot | Days | Best package | Amount |
|---|---:|---|---:|
| W4 | 7 | 1 weekly | 4,200 |
| W4 | 10 | 1 weekly + 3 daily | 6,300 |
| W4 | 30 | 1 monthly | 18,000 |
| B1 | 7 | 1 weekly | 5,400 |
| B1 | 10 | 1 weekly + 3 daily | 8,100 |
| B1 | 30 | 1 monthly | 19,500 |

### Night OT cost

| Hours | Cumulative per person | Five staff |
|---:|---:|---:|
| Up to 2 | 350 | 1,750 |
| 3 | 400 | 2,000 |
| 4 | 500 | 2,500 |
| 5 or more | 650 | 3,250 |

Fractional-hour rounding remains unresolved and must not be invented during implementation.
