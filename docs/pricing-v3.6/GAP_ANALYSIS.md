# Pricing v3.6 Gap Analysis

## Decision

The existing workflow should be retained. The primary gaps are pricing semantics, vessel/slot eligibility, package calculation, and server-side enforcement—not the Service Request → Draft Quotation → Approval → Customer → Payment → Service Order → Work Order sequence.

`W4` and `B1` are physical boat-storage slot/area codes. They must remain berth/storage inventory entities. Pricing Master may reference an applicable slot code, but must not redefine W4 or B1 as a service category or vessel class.

The audit uses `ORM_Rate_Structure_v3_6_DRAFT.xlsx` and `ORM_Rate_Structure_v3_6_CONSOLIDATED.xlsx` together. CONSOLIDATED is treated as the later amendment only where it adds or changes SB4/W4/B1 content; identical shared sheets are one common baseline. The latest direct user instruction remains authoritative over both files.

## Priority gaps

### P0 — Must close before v3.6 staging quotation tests

#### G01. SB4 upper boundary and invalid-input handling

**Current:** all LOA values above 47 ft, including 61+ ft, become group 4; missing LOA becomes 0/SB1.  
**Required:** SB4 is 48–60 ft; 61+ or missing/invalid LOA is not auto-priceable. Engine count and LOA mismatch requires review.  
**Risk:** incorrect rate selection and operational authorization.  
**Change:** introduce explicit classification outcomes (`CLASSIFIED`, `MISMATCH_REVIEW`, `OUTSIDE_RANGE`, `MISSING_DATA`) in both TS and agent JS implementations.

#### G02. Storage eligibility is coupled to haul-out pricing

**Current:** SB4 receives `RAMP_3OB`; no separate eligibility result.  
**Required:** a 60-ft speedboat may qualify for storage while failing standard haul-out.  
**Risk:** staff may interpret a price code as equipment authorization.  
**Change:** split into pure `classifyForPricing`, `evaluateStorageEligibility`, and `evaluateHaulOutEligibility` services. Only the latter may issue/deny a ramp method.

#### G03. W4/B1 slot policy is not enforced

**Current:** berth model stores generic capacity; assignment POST inserts raw body.  
**Required:** W4 trailer-only, B1 stands-only for a 60-ft vessel, no overlapping booking, no other stand slot.  
**Risk:** unsafe or impossible allocation.  
**Change:** add slot method/policy metadata and a transactional assignment RPC/API validation. UI filtering is supplementary and cannot replace server validation.

#### G04. Mandatory SB4 stands crane rule is absent and prices conflict

**Latest approved audit input:** if a 4-engine speedboat is placed on stands, only a crane may lift it; customer price is THB 12,000 per lifting event.  
**Current conflicts:**

- hardstand form: THB 10,000
- v3.5 `LIFT_CRANE_12_18`: THB 13,500
- v3.6 `SPECIAL_OPERATION`: THB 12,000 entered as outsourced cost, resulting in THB 13,800 after 15% markup

**Risk:** wrong customer charge, wrong margin, or hydraulic equipment selected contrary to the rule.  
**Change:** create a single approved v3.6 selling-price code for this use case, distinguish selling price from subcontractor cost, and auto-add a locked line for each requested crane event. Do not assume one event includes the later reverse lift.

#### G05. v3.6 rate card is not installed

**Current:** import source/version is v3.5; no approved v3.6 price mapping to the physical W4/B1 slots; SB3 daily/weekly values differ.  
**Required:** versioned v3.6 rows and explicit price types.  
**Risk:** correct workflow still produces wrong quotation.  
**Change:** prepare an idempotent staging-only import. Do not update old quotation items. Deprecate old selectable codes instead of deleting history.

#### G06. Soft Opening can be applied inconsistently

**Current:** Pricing Master supports current/pilot/default discount/source discount, but Service Request reads `rate_thb` and the Pricing Master UI can bulk-create pilot discounts.  
**Required:** an already-soft rate cannot receive another automatic 25% reduction. W4 Full Rate remains blank.  
**Risk:** double discount or accidental derivation of unapproved Full Rate.  
**Change:** add `rate_type` and `approval_status`; server resolves one approved selling price and rejects additional automatic discount for `SOFT_OPENING`.

### P1 — Must close before controlled pilot

#### G07. No minimum-cost duration optimizer

**Current:** staff selects Daily/Weekly/Monthly and quantity manually.  
**Required:** calculate the cheapest approved combination for the requested billable days and show the exact breakdown.  
**Risk:** overcharge, undercharge, inconsistent quotes.  
**Change:** deterministic integer package optimizer with server recalculation and boundary tests.

The optimizer must use packages that cover exactly the requested number of billable days unless a separately approved policy permits over-coverage. Tie-breaking must be deterministic and auditable.

#### G08. Trailer ownership/rental is not modeled

**Current:** no structured customer-vs-ORM trailer field.  
**Required:** customer trailer has no rental; ORM trailer needs an approved rate and explicit agreement.  
**Risk:** duplicate billing.  
**Change:** capture trailer ownership and agreement reference; block rental when customer-owned.

#### G09. B1 stand inclusion can double bill

**Current:** separate `STAND_DAY/WEEK/MONTH` items remain selectable.  
**Required:** standard stands are included in SB4 B1 rate.  
**Risk:** duplicate charge.  
**Change:** mark inclusion/exclusion relationships and reject incompatible line combinations.

#### G10. Wet Berth remains sellable

**Current:** rate cards and UI options expose Wet Berth.  
**Required:** unavailable until commissioning.  
**Risk:** quote/contract for a service ORM cannot deliver.  
**Change:** disable new-sale eligibility while retaining historical records and reporting.

#### G11. Night OT is not a structured cost

**Current:** no cumulative OT calculator.  
**Required:** policy table, employee count, hours, calculated internal cost, and HR/legal review for 5h+.  
**Risk:** inconsistent costing and potential labor-law issue.  
**Change:** versioned OT policy and a cost-only line; do not present the policy as replacing statutory obligations. Obtain a fractional-hour rounding decision.

#### G12. External haul-out completeness gate is absent

**Current:** generic quotation items can be added without proving mast/crane/travel/fuel/prep/handling scope.  
**Required:** separate outsourced/internal components; unknown mandatory costs block final customer quotation.  
**Risk:** loss-making or incomplete quote.  
**Change:** special-operation estimate entity with component status (`KNOWN`, `QUOTED`, `PENDING`, `NOT_APPLICABLE`) and manager approval.

### P2 — Accounting and governance hardening

#### G13. Price semantics need a canonical model

Add non-overlapping fields or related version rows for:

- Full Rate
- Soft Opening Rate
- Direct Cost
- Outsourced Cost
- Special Operation Cost
- Approved Customer Selling Price

Do not overload `pilot_rate_thb` as the permanent meaning of Soft Opening.

#### G14. Invoice provenance is less detailed than quotation provenance

The amount is preserved, which satisfies T24, but invoice items do not carry every pricing snapshot field. Add source quotation-item linkage or immutable provenance only if Finance requires audit at invoice-line level.

#### G15. Duplicate hardcoded rate displays exist

The hardstand form contains a static crane price. All customer-facing documents should resolve an approved rate-code snapshot or deliberately show “quotation required”; they should not maintain independent prices.

## Data model changes proposed (not implemented)

### Pricing

- `rate_version`
- `rate_type`
- `approval_status`
- `location_code`
- `vessel_class`
- `min_loa_ft`, `max_loa_ft`
- `min_engines`, `max_engines`
- `storage_method`
- `included_item_codes`
- `excluded_item_codes`
- `requires_technical_approval`
- `effective_from`, `effective_to`

### Vessel and operational eligibility

- verified loaded weight
- LOA, beam, draft, center-of-gravity verification state
- trailer suitability and ownership
- technical assessor and approval timestamp
- separate storage and haul-out decisions/reasons

### Slot policy

- allowed storage methods
- maximum verified dimensions/weight
- exclusive vessel class rules
- overlap exclusion at database transaction level

### Special operation

- component type
- cost source and supplier quotation reference
- quantity/events
- direct/outsourced/internal classification
- cost approval and selling-price approval
- unresolved/mandatory flag

## Existing components to preserve

- current Service Request wizard structure
- customer/boat linked dropdowns
- Tow In/Tow Out without mandatory haul-out/launch
- Storage and Yard Service route selection
- service category → rate-card item selection
- Open Rate role restriction
- Draft Quotation and manager approval sequence
- payment gate before Work Order
- quotation price snapshots and audit history
- quotation-to-invoice amount preservation
- safe-mode flags and customer-message safeguards

## Acceptance criteria before implementation can be called complete

1. All T01–T29 pass at unit/integration level
2. W4/B1 rules are enforced by server/database, not only UI
3. 61 ft and missing LOA fail closed
4. A 60-ft storage approval cannot authorize standard ramp haul-out
5. SB4 stands always creates the approved 12,000 THB/event crane line and prevents hydraulic lift selection
6. Soft Opening rows cannot receive automatic second 25% reduction
7. Historical quotation and invoice totals remain unchanged after rate updates
8. Live availability conflict is tested on staging with two concurrent booking attempts
9. No new Wet Berth quote/contract can be created
10. Finance, Marina Manager, Dockmaster/technical reviewer, and Accounting sign off staging evidence before production consideration
