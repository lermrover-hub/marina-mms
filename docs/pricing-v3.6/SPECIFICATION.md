# ORM Pricing Structure v3.6 — Audit Specification

**Source of truth:** `ORM_Rate_Structure_v3_6_FINAL_MERGED.xlsx`
**Source SHA-256:** `AAA63443ABD839508D063B5029159B0E1A05A31A7621A73D5B8D6073C6243203`
**Status:** Audit specification awaiting approval
**Implementation gate:** Closed

## 1. Scope

This specification defines the audit acceptance criteria for four-engine speedboat classification and standard haul-out eligibility. It does not authorize a price import, database change, migration, deployment, or recalculation of an issued document.

## 2. SB4 classification boundary

- SB4 means a four-engine speedboat with LOA from 48 ft through 60 ft inclusive.
- A 55 ft, 56 ft, or 60 ft four-engine speedboat belongs to SB4 for pricing classification.
- A 61 ft four-engine speedboat is outside the configured range.
- Engine count and LOA must both be validated. A mismatch requires manager review.
- Classification identifies the applicable pricing category only. It never constitutes operational approval, slot allocation, ramp approval, or permission to create a standard haul-out quotation.

## 3. Price preservation

- Preserve every existing approved selling price.
- Do not derive, interpolate, clone, or automatically add a new rate for 56–60 ft.
- Do not automatically introduce a new discount for 56–60 ft.
- A 56–60 ft vessel may use only an existing approved rate whose documented scope already includes that vessel and service.
- If no approved applicable rate exists, the quotation line remains blocked and must be escalated for an approved rate. The system must not substitute a nearby tier.
- Previously issued quotations and invoices retain their stored price snapshots.

## 4. Operational eligibility

Pricing classification and operational eligibility are separate decisions.

For automatic standard ramp/trailer haul-out, the system must validate at least:

- verified vessel weight
- LOA, beam, and draft
- center of gravity where required
- trailer fit and load distribution
- tidal and ramp conditions
- equipment and slot availability

A vessel exceeding the verified 12-tonne standard ramp/trailer capacity must:

1. be blocked from automatic standard haul-out quotation;
2. receive an `OUTSIDE_STANDARD_CAPACITY` or equivalent non-approvable result;
3. be escalated for manual handling assessment and special-operation costing; and
4. remain ineligible for a standard Work Order until the required technical and commercial approvals are recorded.

Being 60 ft and classified as SB4 does not override the 12-tonne limit or any other engineering constraint.

## 5. Audit approval gate

Before implementation is authorized, the audit must confirm:

- all affected source locations and duplicate business rules;
- every rate or discount path that could be selected for 55–61 ft;
- the separation of classification from haul-out eligibility;
- the server-side block for weight above 12 tonnes;
- preservation of historical quotation and invoice snapshots;
- no production pricing or database write in the audit phase.

Only after explicit audit approval may the team update production-facing pricing rules, classification logic, executable tests, database structures, or deployments. Any implementation must run on a separate branch and staging environment first.
