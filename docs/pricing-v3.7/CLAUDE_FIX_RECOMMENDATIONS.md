# Claude Fix Recommendations — ORM Marina MMS Pricing v3.7

**Audit date:** 2026-11-02
**Status:** **Recommendations only. Nothing in this document has been implemented.**
**Code audited:** `origin/codex/v37-catalog-admin` @ `53a8f0e`

No production price, database, migration, workflow, quotation, invoice or deployment was touched. Every item below is a proposal awaiting manager approval, as required by the audit's safety restrictions.

---

## How to read this

| Field | Meaning |
|---|---|
| **Gate** | What must happen before the change may begin |
| **Risk if deferred** | What goes wrong by leaving it alone |
| **Blast radius** | What else the change touches |

Priority bands:

- **P0 — blocks the v3.7 migration entirely.** Nothing else can proceed safely.
- **P1 — must be fixed before v3.7 goes to any customer-facing environment.**
- **P2 — should be fixed in the v3.7 release.**
- **P3 — hygiene; schedule after v3.7 ships.**

---

## P0 — Blocks everything

### P0-1. Get the two v3.7 workbooks into a reachable location

**Finding:** both approved workbooks are local-only files on a Windows machine; neither is committed or reachable. Audit checks 1, 2 and the Excel half of 3 are BLOCKED.

**Recommendation — pick one:**

| Option | How | Trade-off |
|---|---|---|
| A *(fastest)* | Attach both `.xlsx` files directly to the Claude conversation | No repo change; the files are not version-controlled afterwards |
| B *(most durable)* | Commit both workbooks (or a generated CSV extract) under `docs/pricing-v3.7/source/` | Creates a permanent, diffable audit trail; adds binary files to the repo |
| C | Enable Remote Control for the folder containing them | Live access to the real worktree; requires setup on the Windows machine |

**Recommended: B, with A to unblock immediately.** Option B matters because the v3.6 precedent already works well — `scripts/pricing-v3.6-final-merged.json` records its source filename *and a SHA-256*, which is exactly what made this audit possible at all. Do the same for v3.7.

**Gate:** none — this is the first action.
**Risk if deferred:** the entire v3.7 reconciliation stays blocked; any code change made before the workbook is read is guesswork.
**Blast radius:** none (additive).

### P0-2. Decide the three questions only the workbook can answer

Before a single line of pricing code changes, record written answers to:

1. **Tier 3 / Tier 4 LOA bands** — is Tier 3 `41–50` and Tier 4 `51–60`, and what are the rates for each?
2. **Weekly per-foot storage** — does v3.7 introduce a weekly rate for MOTOR_YACHT / POWER_CATAMARAN / SAILING_CATAMARAN, or is the 30-day-package-only rule retained?
3. **Canonical counts** — is the correct active count 126 or 132, and is the retired-alias count 17 or 39?

**Gate:** P0-1.
**Risk if deferred:** fixing P1-1 or P1-3 without these answers will produce wrong prices with high confidence, which is worse than the current known-stale state.

---

## P1 — Must fix before any customer-facing v3.7 environment

### P1-1. Correct the SB3 / SB4 tier boundary (the 48–50 ft band)

**Finding (audit §8.1, matrix T26/T27):** the approved workbook filename encodes Tier 3 = 41–50 ft and Tier 4 = 51–60 ft. The code encodes SB3 ≤ 47 ft and SB4 = 48–60 ft. **A 48–50 ft vessel is mis-tiered.**

Concrete effect on a 49 ft vessel today: classified SB4; forced into slot W4 or B1 (`validateSb4Storage` throws without one); storage priced from `SB4_W4_*` / `SB4_B1_*`; haul-out referenced against `SB4_HAUL_LAUNCH` at 13,500 soft instead of `SB3_HAUL_LAUNCH` at 9,375 soft — a **4,125 THB** per-round-trip difference, in the customer's favour or against it depending on direction.

**Recommendation.** Change the boundary in **both** classifiers in the same commit — they must never diverge:

- `lib/storage-pricing.ts` → `speedboatStorageClass`: `loaFt <= 47` → `loaFt <= 50`
- `lib/speedboat-classification.ts` → `loaToEngineGroup`: `loaFt <= 47` → `loaFt <= 50`

Then update, in the same change:

- the `"loa"` labels in `scripts/pricing-v3.6-final-merged.json` (`SB3_HAUL_LAUNCH` `41-47 ft` → `41-50 ft`; `SB4_HAUL_LAUNCH` `48-60 ft` → `51-60 ft`)
- `tests/storage-pricing.test.js` and `tests/pricing-engine.test.js` boundary assertions
- add new boundary tests at exactly **47, 48, 50, 51** ft — the four values that distinguish the old and new rules

**Do not** change only one classifier. `speedboatStorageClass` drives storage and slot gating; `loaToEngineGroup` drives the engine-group mismatch warning and the ramp code. Divergence would produce a vessel that is Tier 3 for pricing and Tier 4 for operational review, or vice versa.

**Gate:** P0-2 item 1 — written confirmation of the bands **and** the per-tier rates.
**Risk if deferred:** every 48–50 ft vessel is priced and slot-gated wrongly, and the error is invisible because no code path compares the band against the workbook.
**Blast radius:** classification, storage rate codes, slot validation, haul-out eligibility messaging, engine-group warnings, existing tests. Historical quotations are protected by the snapshot columns and will not be retro-repriced.

### P1-2. Block wet berth, or formally approve it

**Finding (audit §8, matrix T21):** the stated rule is *"Wet berth services remain blocked/unavailable."* The code does not block it anywhere. Wet berth is:

- a selectable quotation category — `app/(dashboard)/quotations/new/page.tsx:49`
- mapped for recurring invoicing — `app/api/billing/recurring/route.ts:229` (`WET_BERTH: "Wet Berth Fee"`)
- permitted in the AI quotation generator's category list — `app/api/quotations/ai-generate/route.ts:83`
- offered on the public inquiry form — `app/inquiry/page.tsx`
- aliased in the line-item component — `components/quotations/LineItemRow.tsx:50` (`"Berth Fee" → "Wet Berth"`)

This is the highest-severity *safety* finding, because the AI generator can produce a wet-berth quotation with no human in the loop.

**Recommendation.** This is a business decision, not a code decision. Two valid outcomes:

- **If wet berth is genuinely unavailable:** add one central guard — a `WET_BERTH_ENABLED` flag in `lib/safe-mode.ts` following the existing fail-closed pattern — and enforce it at *all five* sites above. Fail-closed is the established convention in this codebase (`isProductionBookingsEnabled`, `isAgentWritesEnabled`), so reuse it rather than inventing a new mechanism. Keep the public inquiry form able to *accept* an enquiry but not produce a price.
- **If wet berth is in fact available:** remove the rule from the operational-safety requirements and document the approved wet-berth rates in the v3.7 catalogue, since none currently exist in the canonical data.

**Do not** silently remove the category from the UI while leaving the recurring-billing mapping in place — that produces invoices for a service no one can quote.

**Gate:** manager decision on wet-berth availability.
**Risk if deferred:** AI-generated or manually-created wet-berth quotations for a service the business considers unavailable, plus recurring invoices against it.
**Blast radius:** five call sites; one new flag. No pricing maths.

### P1-3. Eliminate legacy `calc_type` values (silent under-billing)

**Finding (audit §4.3, matrix T28/T29):** `PRICING_CALC_TYPES` accepts both a legacy set (`FLAT_QTY`, `FLAT_DAYS`, `LOA_RATE_QTY`, `LOA_RATE_DAYS`, `MANUAL`) and the current set, but only the current set is interpreted. A legacy value matches no branch in `app/api/db/service-requests/route.ts:148-159`, leaving `qty` at the client-supplied value.

Two failure modes:

1. **Silent under-billing.** A legacy per-foot rate (`LOA_RATE_DAYS` / `LOA_RATE_QTY`) bills **×1 instead of ×LOA**. A 40 ft vessel is charged 1/40th of the intended storage or haul-out fee. No error, no warning.
2. **Safety bypass.** The manual-quote guard tests `method === "MANUAL_QUOTE"` only. A rate carrying legacy `MANUAL` is auto-priced instead of escalated.

Severity is amplified because `lib/pricing-master.ts` **defaults `calc_type` to the legacy value `"FLAT_QTY"`** at line 136 (read-mapping) and line 203 (insert) — so a rate created without an explicit calc type lands in the unhandled set. The branch's own handoff note confirms the live master holds mixed v3.5/v3.6 data, so legacy values are very likely present in production right now.

**Recommendation, in this order:**

1. **Measure first (read-only).** Run `select calc_type, count(*) from pricing_master group by calc_type` against staging. Do not change code before knowing the real distribution.
2. **Fail loudly, not silently.** Add an explicit `default:` branch that throws, e.g. *"Line N: {code} uses unsupported calculation type {method}. Finance must migrate it to an approved v3.7 calculation method."* A hard error on an un-priceable rate is strictly safer than a silently wrong price.
3. **Migrate the data** with an approved mapping: `FLAT_QTY`→`PER_UNIT` or `FLAT_RATE`, `FLAT_DAYS`→`PER_DAY`, `LOA_RATE_QTY`→`PER_FOOT`, `LOA_RATE_DAYS`→`PER_FOOT` (with the storage duration multiplier), `MANUAL`→`MANUAL_QUOTE`. **Each mapping needs Finance sign-off** — `FLAT_QTY` in particular is ambiguous between `PER_UNIT` and `FLAT_RATE`.
4. **Change the default** in `lib/pricing-master.ts` from `"FLAT_QTY"` to `"FLAT_RATE"` only after the data is migrated.
5. **Narrow the enum** in `lib/pricing-validation.ts` to the current set once no legacy rows remain, so the schema itself prevents regression.
6. **Audit existing quotations** created from legacy-type rates for under-billing, and escalate any found to Finance. **Do not retro-adjust issued documents** — historical snapshots must stay intact.

**Gate:** staging read access for step 1; Finance sign-off for step 3.
**Risk if deferred:** ongoing silent revenue loss, and manual-quote-only services being auto-priced.
**Blast radius:** server pricing path, client pricing preview, schema enum, `pricing_master` data, existing quotations (for investigation only).

### P1-4. Unify the recurring billing period basis

**Finding (audit §7.1, matrix T23):** three mutually inconsistent bases exist, and the one that actually issues invoices is the one that matches the requirement least.

| # | Location | Basis |
|---|---|---|
| 1 | `lib/service-workflow.ts:104` | **30 days** from yard start |
| 2 | `lib/ramp-booking-service.ts:67` | **Calendar month** from requested date |
| 3 | `app/api/billing/recurring/route.ts:63-101` ← **issues the invoices** | **Calendar month anchored to the 1st** |

The requirement is *"monthly storage starting from the actual check-in date; 30-day billing period unless an approved calendar-month contract exists."* Basis 3 ignores the check-in date entirely. Meanwhile `storageDurationMultiplier` enforces **exact 30-day** periods when quoting — so a customer is **quoted on 30-day periods and invoiced on calendar months**.

**Recommendation.**

1. **Make the basis explicit data, not implicit code.** Add an approved `billing_basis` field on the contract with values `THIRTY_DAY` (default) and `CALENDAR_MONTH` (requires approval), mirroring the requirement's own wording.
2. **Rework `isDueThisPeriod` and `billingPeriodKey`** to honour that field. For `THIRTY_DAY`, derive the period from `start_date + 30n` rather than a `YYYY-MM` key — this is the substantive change, since the current period key cannot express a 30-day cycle at all.
3. **Retire basis 2** or align it with the contract field, so there is exactly one implementation.
4. **Add a reconciliation test** asserting that the quoted storage period and the invoiced period agree for the same vessel and dates. This is the test whose absence allowed the divergence.
5. **Do not migrate existing contracts silently.** Existing agreements may genuinely be calendar-month. Default existing rows to `CALENDAR_MONTH` to preserve current behaviour, and let Finance opt specific contracts into `THIRTY_DAY`.

**Gate:** manager decision on the default basis and on which existing contracts change.
**Risk if deferred:** customers invoiced on a different cycle from the one quoted; partial first months; revenue recognition drift.
**Blast radius:** recurring invoice generation, contract schema, payment plans, quote/invoice consistency. **Touches live billing — the highest-risk change in this document. Stage and reconcile against a known period before enabling.**

---

## P2 — Should be fixed in the v3.7 release

### P2-1. Enforce `price_status` at quotation time

**Finding (audit §4.4, matrix T30):** `app/api/db/service-requests/route.ts:113` filters on `is_active` and selects `price_status` but never tests it; line 135 blocks only `quote_allowed === "NO"`. A rate with `is_active = true` and `price_status = "PENDING_PAINT_TEAM"` / `"CONTACT_ONLY"` / `"MANUAL_QUOTE"` is quotable, and also appears in the Service Request picker because `app/api/pricing-master/route.ts` filters only on `isActive`.

**Recommendation.** Define the quotable set explicitly — `price_status === "ACTIVE"` **and** `quote_allowed` in `{YES, MANAGER_REVIEW}` — and enforce it in both places. `MANUAL_QUOTE` and `CONTACT_ONLY` should surface as "request a quotation", not as a priced line. This is also what makes the *"Active PENDING/BLOCKED = 0"* baseline enforceable by code rather than by convention.

**Gate:** confirm the intended quotable set with Finance.
**Risk if deferred:** unapproved or pending prices reaching customers.

### P2-2. Escalate `MANAGER_REVIEW` in every workflow section

**Finding (audit §4.5, matrix T31):** `route.ts:192` computes `hasManagerReviewRampRate` from RAMP-group items only. A STORAGE or YARD rate marked `MANAGER_REVIEW` or `CONTACT` is priced with no escalation.

Currently **latent** — every `MANAGER_REVIEW` rate in the canonical data is a haul-out rate in `service_group` `1. Haul-out & Launch`, which maps to RAMP and does escalate. It becomes live the moment v3.7 marks any storage or yard rate `MANAGER_REVIEW`.

**Recommendation.** Compute the flag across **all** normalised items, not just RAMP, and keep the existing `GENERAL_MANAGER` approver routing. Add a test with a `MANAGER_REVIEW` storage rate to lock it.

**Gate:** none — this is a safe generalisation of existing intent.
**Risk if deferred:** a v3.7 storage/yard rate requiring review is quoted without review.

### P2-3. Resolve the duplicate soft-price mechanism

**Finding (audit §4.6, matrix T32):** two designs coexist. In use: soft price baked into `rate_thb`, with `full_rate_thb` as standard and `source_discount_pct: 25` informational. Not in use: `pilot_rate_thb` / `pilot_notes`, surfaced by `lib/pricing-master.ts:129` as `effectiveRate = pilotRateThb ?? rateThb`.

The quotation path never selects or reads `pilot_rate_thb`. So if anyone sets it, **the Pricing Master screen shows one effective rate while quotations bill another.** Also asymmetric: `pricingCreateSchema` omits `pilotRateThb` while `pricingUpdateSchema` includes it.

**Recommendation — choose one, do not keep both:**

- **Preferred:** retire `pilot_rate_thb`. The in-use mechanism already works, is covered by tests, and is what the canonical data encodes. Keep the columns for history but remove `effectiveRate`'s dependence on them, or make `effectiveRate` simply `rateThb`.
- **Alternative:** adopt `pilot_rate_thb` properly — select it in the quotation query, price from `effectiveRate`, add a `pilot_rate_snapshot_thb` column to quotation items, and fix the create/update schema asymmetry.

**Gate:** Finance decision on which represents the soft-opening price.
**Risk if deferred:** a latent mismatch between displayed and billed price, with no test guarding it.

### P2-4. Single source of truth for VAT

**Finding (audit §5.4, matrix T33):** three implementations — `service-requests/route.ts:291` hardcodes `0.07`; `api/db/quotations/route.ts:142` uses **client-supplied** `body.tax_rate ?? 7`; `billing/recurring/route.ts:221` hardcodes `VAT_RATE = 0.07`. Discount-then-VAT ordering is correct in all three.

**Recommendation.** Read the VAT rate from configuration (`mms_agent_config`, as `ai-agents/PRICING_RULES.md` already specifies) through one shared helper, and **stop accepting `tax_rate` from the client** — a caller can currently post `tax_rate: 0` and it passes the 0–100 validation. Keep rounding behaviour consistent across the three paths while you are there (one rounds to whole baht, another to two decimals).

**Gate:** none.
**Risk if deferred:** VAT drift between service requests, quotations and recurring invoices; a client-side zero-VAT quotation.

### P2-5. Terminate billing on check-out

**Finding (matrix T25):** `isDueThisPeriod` honours `contract.end_date` and an auto-expiry pass marks expired contracts — but **no code path sets `end_date` from a vessel check-out event.** A repo-wide search for `check_out` / `checkout` in `.ts`/`.tsx` returned no functional hits. Termination depends on someone remembering to edit the contract.

**Recommendation.** Wire vessel departure (launch / tow-out completion, or berth assignment close-out) to set the contract `end_date`, and add a test that a departed vessel generates no invoice in the following period. Keep it an explicit, auditable write rather than an inferred one.

**Gate:** confirm which event constitutes "check-out" — launch completion, tow-out, or berth release.
**Risk if deferred:** customers invoiced after departure.

### P2-6. Show VAT and total in the Service Request wizard

**Finding (matrix T35):** the wizard shows "Subtotal before VAT" only; line 390 states *"VAT and deposit are calculated and snapshotted by the server when the Draft is created."* The figures are correct server-side — they are simply not visible before submission.

**Recommendation.** Display indicative VAT, total and deposit in step 3, clearly labelled as indicative with the server value authoritative. The server must remain the single source of truth — **do not** start trusting client-computed totals.

**Gate:** none.
**Risk if deferred:** staff quoting VAT-exclusive figures to customers verbally.

### P2-7. Add a tide-delay policy

**Finding (matrix T34):** no tide-delay, weather-delay or postponement concept exists outside mock data. If a launch slips because the tide window closes, additional storage days accrue with no waiver, adjustment or flag — despite tide delays being a normal, system-predicted event in this business.

**Recommendation.** This is a **policy decision before it is a code change.** Define: who approves a tide-delay waiver, how many days are waivable, and whether the waiver is a credit note or a storage-day exclusion. Then implement it as an explicit, approved, audited adjustment — never an automatic silent discount.

**Gate:** manager policy decision (see §Approvals item 9).
**Risk if deferred:** customers billed storage for days they could not launch through no fault of their own — a recurring disputes source.

---

## P3 — Hygiene, after v3.7 ships

| ID | Item | Location | Recommendation |
|---|---|---|---|
| P3-1 | Duplicate check skips Open Rate lines | `service-requests/route.ts:119` | Extend `assertNoDuplicateChargeCodes` to Open Rate lines using a normalised description key. Mitigated today by Admin/MD/Finance restriction plus mandatory description. |
| P3-2 | Recurring duplicate key is `(contract_id, billing_period)` | `billing/recurring/route.ts` | Requirement is "no duplicate billing for the same **vessel, slot and period**". Two contracts covering one vessel/slot in one period would both invoice. Add a vessel+slot+period uniqueness check. |
| P3-3 | Reminder offset hardcoded at 5 days | `lib/service-workflow.ts:109` | Move to configuration; requirement explicitly asks for configurable reminder days. |
| P3-4 | `source_version` never validated | `service-requests/route.ts:340` | Snapshot the version but also **warn** when a quotation mixes rate versions, or when a rate's version is not the current approved one. This is exactly the condition the handoff doc flagged and nothing detects. |
| P3-5 | "v3.6" hardcoded in operator-visible strings | `lib/storage-pricing.ts`; `service-requests/route.ts:170`; `new/page.tsx:238`; stored `storageNote` | Replace with a single version constant. After migration these strings actively mislead operators. |
| P3-6 | Legacy fallback drops all quotation snapshots | `service-requests/route.ts:343` | Acceptable as a staging shim, but add an assertion or alert that it must never run in production, where snapshot loss is unrecoverable. |
| P3-7 | No boat-stand count field | `new/page.tsx` | Only needed if v3.7 prices per stand. `qty` currently means periods, not stands. Confirm against the workbook first. |
| P3-8 | Customer-owned vs ORM-owned trailer not modelled | repo-wide | Only `trailerType` in `lib/mock-data.ts` (mock) and a `trailer_required` boolean on boats. Add only if v3.7 defines differential rates. |
| P3-9 | `pricing_master` bypasses Prisma | `lib/pricing-master.ts` | Raw Supabase despite `prisma/migrations/20260602_add_pricing_master/` existing. Decide Prisma-first or document the boundary; same split already noted for ramp bookings. |
| P3-10 | No warning when discounting an already-soft rate | `new/page.tsx` | Soft 25% is already inside `rate_thb`. Add an advisory when an operator adds discount to a line with `source_discount_pct > 0`. **Advisory, not a block** — the role cap is the existing control. |

---

## Explicitly NOT recommended

Recording these so they are not attempted by mistake:

| Do not | Why |
|---|---|
| "Fix" weekly per-foot storage to stop throwing | The refusal is **deliberate and test-locked** (`tests/pricing-engine.test.js:9`), and matches canonical data that states *"no unapproved weekly rate."* Changing it without workbook confirmation would invent a price. **Resolve P0-2 item 2 first.** |
| Relax the exact-30-day monthly rule | Throwing on 31 days is correct fail-closed behaviour. It prevents inventing a partial-period price. |
| Loosen the 12-tonne haul-out gate | Working exactly as specified; verified by executed test. |
| Change `is_active` filtering to include inactive rates | Correct as-is. The gap is `price_status` (P2-1), not `is_active`. |
| Retro-reprice historical quotations | Snapshot columns exist precisely to preserve agreed prices. Investigate under-billing (P1-3 step 6); do not rewrite issued documents. |
| Auto-enable any PENDING or BLOCKED rate | Prohibited by the audit's safety restrictions and by P2-1's intent. |
| Delete retired legacy aliases | They are `RETIRED_NOT_DELETED` deliberately; four still carry live staging references. |
| Change one LOA classifier without the other | `speedboatStorageClass` and `loaToEngineGroup` must move together (P1-1), or pricing and operational review will disagree. |

---

## Suggested sequence

```
P0-1  attach / commit the workbooks
P0-2  write down the three decisions
        │
        ├── P1-1  tier boundary 48–50 ft          (needs decision 1)
        ├── P1-2  wet berth: block or approve     (needs policy)
        ├── P1-3  legacy calc_type                (needs staging count + Finance mapping)
        └── P1-4  unify billing basis             (needs policy; touches live billing — stage first)
        │
        └── P2-1 … P2-7   v3.7 release scope
                  │
                  └── P3-1 … P3-10   post-release hygiene
```

P1-1 through P1-4 are independent of one another and can proceed in parallel once their gates clear. **P1-4 carries the most operational risk** — it changes live invoice generation and should be staged and reconciled against a known billing period before it is enabled anywhere real.

---

## Approvals required before any implementation

| # | Decision | Owner |
|---|---|---|
| 1 | Tier 3 / Tier 4 LOA bands and per-tier rates | Manager + Finance |
| 2 | Whether a weekly per-foot yacht/catamaran rate exists in v3.7 | Manager + Finance |
| 3 | W4 / B1 pending `full_rate_thb`: approve, or confirm soft-rate-only | Finance |
| 4 | Correct canonical rate count (126 or 132) | Finance |
| 5 | Correct retired-alias count (17 or 39) and the additional list | Finance |
| 6 | Billing basis default and which existing contracts change | Manager + Finance |
| 7 | Configurable reminder days, and the default | Manager |
| 8 | Wet berth: blocked or available | Manager |
| 9 | Tide-delay waiver policy — who approves, how many days, credit vs exclusion | Manager |
| 10 | Differential trailer rates (customer-owned vs ORM-owned) | Finance |
| 11 | Per-stand pricing for boat stands | Finance |
| 12 | Whether operational discount may stack on an already-soft rate | Manager |
| 13 | Legacy `calc_type` → v3.7 mapping, row by row | Finance |
| 14 | Quotable set definition for `price_status` / `quote_allowed` | Finance |

---

**This audit stops here.** No code, Supabase schema, pricing data or Vercel deployment will be changed until these recommendations are reviewed and approved.
