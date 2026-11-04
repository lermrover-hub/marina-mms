# Pricing v3.6 Implementation Plan

## Authorization boundary

This is a plan only. Do not begin implementation, create/apply migrations, import rate data, deploy, or modify staging/production until the user explicitly approves the implementation phase.

The latest workflow is considered correct and should remain intact. Changes should be additive and localized to pricing, eligibility, allocation validation, and costing.

`W4` and `B1` are physical boat-storage slot/area codes. Keep them in storage/berth inventory. Rate-card items may carry an `applicable_slot_code` constraint, but W4/B1 must not become service categories or vessel classes.

## Recommended sequence

### Phase 0 — Freeze inputs and decisions (0.5–1 day)

1. Store an approved copy/hash of `ORM_Rate_Structure_v3_6_CONSOLIDATED.xlsx`
   - also retain `ORM_Rate_Structure_v3_6_DRAFT.xlsx` as the base reference
   - record the reconciliation rule: CONSOLIDATED supersedes DRAFT only for added/changed SB4 and W4/B1 content
2. Record the user addendum:
   - SB4 + boat stands requires crane only
   - customer selling price THB 12,000 per lifting event
   - clarify whether both “onto stands” and “off stands” are normally two events
3. Resolve fractional OT rounding with HR/legal
4. Confirm W4 maximum physical envelope and update the current 51-ft mock/source discrepancy
5. Keep W4 Full Rate blank pending management approval

**Gate:** signed pricing/operations decision log. No code or import yet.

### Phase 1 — Characterization tests around the existing workflow (1–2 days)

Before changes, add tests that lock the working workflow:

- Service Request still creates Draft Quotation
- approval/customer/payment/Work Order gates remain unchanged
- stored-vessel optional service route remains valid
- Tow In/Tow Out remains independent from Haul-out/Launch
- historical quotation-to-invoice amount preservation remains valid

Add failing v3.6 tests T01–T29 before implementation.

**Gate:** expected legacy tests green; v3.6 tests fail for documented reasons only.

### Phase 2 — Pricing and classification domain (2–3 days)

1. Replace implicit SB4 fallback with explicit boundaries
2. Add invalid/missing/outside-range results
3. Keep pricing classification separate from equipment eligibility
4. Add canonical rate type and approval status
5. Implement a single server-side effective-selling-price resolver
6. Ensure Soft Opening rates never receive another automatic 25% reduction

Likely files:

- `lib/speedboat-classification.ts`
- `ai-agents/lib/speedboat-classification.js`
- `ai-agents/agents/quotation-agent.js`
- `lib/pricing-master.ts`
- pricing validation and API types

**Gate:** T01–T06, T20, T22, T26 classification/rate-resolution tests pass.

### Phase 3 — Versioned v3.6 rate-card preparation (2–3 days)

Prepare but do not apply an idempotent migration/import that:

- adds SB1–SB3 Daily/Weekly/Monthly Full and Soft rates
- adds SB4 Soft rates mapped to physical slots W4/B1, with Full Rate null
- creates the SB4 crane selling-price code at 12,000 THB/event
- keeps crane supplier/direct cost separate from selling price
- marks old conflicting crane/rate codes non-selectable for new v3.6 quotes without deleting history
- marks standard stands included for SB4 B1
- disables new Wet Berth sale eligibility
- uses a new source version such as `ORM-PRICE-2026-v3.6`

**Gate:** dry-run import diff reviewed by Finance and Operations; zero production write.

### Phase 4 — Storage package optimizer (2–3 days)

Create a pure deterministic function accepting approved Daily/Weekly/Monthly packages and billable days. It must return:

- selected package quantities
- duration covered
- unit rates
- subtotal, VAT, total
- rate version and source codes

Run on the server when Service Request creates the Draft Quotation. UI may preview the same result but cannot be authoritative.

Required boundaries: 1, 6, 7, 8, 10, 29, 30, 31, 37 and 60 days for both W4 and B1.

**Gate:** T12–T15, T27–T28 and additional boundary/property tests pass.

### Phase 5 — Storage/haul-out eligibility and W4/B1 allocation (3–4 days)

1. Add separate storage and haul-out evaluations
2. Add W4 trailer-only and B1 stands-only policies
3. Add trailer ownership and agreement fields
4. Add transactional no-overlap validation
5. Restrict 60-ft stands to B1
6. For SB4 stands:
   - block hydraulic lift
   - require technical approval
   - auto-add one locked 12,000 THB crane item for each selected lifting event
7. Do not infer haul-out authorization from storage eligibility

**Gate:** T07–T11, T16–T17, T20, T26 and T29 pass, including concurrent allocation test.

### Phase 6 — OT and external haul-out costing (2–3 days)

1. Implement versioned cumulative OT cost policy
2. Record staff count, hours and rounding method
3. Flag 5h+ for HR/legal review without increasing beyond simulation cap
4. Add structured external-operation cost components
5. Block final quotation while mandatory costs are pending
6. Require manager approval for selling price and scope

**Gate:** T18–T19 and T25 pass; no AI-invented price.

### Phase 7 — UI integration without workflow redesign (2–3 days)

Make minimal changes inside the existing screens:

- display pricing class and separate eligibility decisions
- display W4/B1 allowed method and availability reason
- show package breakdown before submit
- show crane rule and event count for SB4 stands
- show Soft Opening badge and “no additional automatic discount”
- show unresolved special-operation costs and disable final submission
- preserve the existing Service Request and approval progression

**Gate:** mobile and desktop UI test; no regression in current workflow screenshots/steps.

### Phase 8 — Staging-only data migration and E2E (2–4 days)

Only after explicit staging authorization:

1. Back up/export current staging Pricing Master
2. Apply schema migration to staging
3. Run rate-card import in dry-run, review diff, then run against staging
4. Verify all v3.6 rows, null W4 Full Rates, approval states and deactivated conflicts
5. Execute authenticated E2E:
   - Service Request
   - vessel classification
   - W4/B1 availability and method validation
   - Draft Quotation
   - manager approval
   - customer delivery preview only unless separately authorized
   - payment gate
   - invoice conversion and historical amount preservation
6. Test simultaneous B1 allocation attempts

**Gate:** Finance, Operations/Marina Manager, technical reviewer and Accounting sign-off.

### Phase 9 — Controlled production release (separate authorization)

Production remains out of scope until a new explicit approval. A release plan must include:

- database backup and migration rollback path
- rate import diff and approval record
- feature flag for v3.6 selection
- Wet Berth sale block verification
- monitoring of quote totals, discount use and eligibility rejections
- no rewrite of historical quotation/invoice rows

## Estimated effort

| Workstream | Estimate |
|---|---:|
| Input freeze and characterization | 1.5–3 days |
| Pricing/classification and rate import preparation | 4–6 days |
| Optimizer and eligibility/allocation rules | 5–7 days |
| OT/special operation | 2–3 days |
| UI integration | 2–3 days |
| Staging migration/E2E/UAT | 2–4 days |
| **Total** | **14–22 developer-days** |

Estimate excludes management pricing approval, engineering verification, HR/legal review, vendor quotation lead time, and production change window.

## Pull request structure

Prefer small, reviewable branches/PRs:

1. `pricing-v36-characterization-tests`
2. `pricing-v36-domain-model`
3. `pricing-v36-rate-import`
4. `pricing-v36-storage-optimizer`
5. `pricing-v36-eligibility-allocation`
6. `pricing-v36-special-operations`
7. `pricing-v36-ui-staging-e2e`

Do not mix workflow redesign with these changes.

## Stop conditions

Stop and request a business decision if any of these occur:

- W4 Full Rate is required by code/import
- crane “per event” versus “round trip” is ambiguous for a quote
- actual crane supplier cost differs from customer selling price and the system cannot store both
- vessel physical data or technical approval is missing
- B1/W4 live capacity is unavailable or inconsistent
- a Soft Opening item would receive another automatic discount
- mandatory external-operation cost remains unknown
- a migration would touch production or rewrite historical document prices

## Deliverable after implementation authorization

Each implementation phase should provide:

- code diff
- migration/import dry-run diff where applicable
- executed test output
- staging screenshots for affected screens
- database row evidence with sensitive values masked
- rollback instructions
- list of intentionally untouched workflow components

No production deployment should be bundled with implementation approval.
