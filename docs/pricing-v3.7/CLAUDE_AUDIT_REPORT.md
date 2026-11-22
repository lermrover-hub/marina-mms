# Claude Audit Report — ORM Marina MMS Pricing v3.7

**Audit date:** 2026-11-02
**Audit type:** Read-only. No production price, database, migration, workflow, deployment, quotation or invoice was modified.
**Auditor:** Claude Code (automated code + data audit)

---

## 0. Scope and what was actually available

### 0.1 Repository and branch actually audited

| Item | Value |
|---|---|
| Container working copy | `/home/user/marina-mms` (cloud session) |
| Branch audited for code | `origin/codex/v37-catalog-admin` |
| Commit audited | `53a8f0e` — *docs(staging): record preview environment handoff* (2026-10-29) |
| Method | Detached read-only `git worktree` created from that commit |
| Audit deliverables committed on | `claude/marina-mms-setup-cgg7v4` (this session's designated branch) |

The path named in the task — `C:\Users\asus\.codex\worktrees\fd83\marina-mms` — is a Windows working copy on your own machine. This audit ran in a cloud container and could not read that path. Remote Control is not configured for this session (`list_computer_folders` returned an empty folder list), so the Windows worktree was unreachable.

Instead, the audit targeted the newest pricing-bearing branch that **is** reachable on `origin`. Branch inventory at audit time:

| Branch | Last commit | Date |
|---|---|---|
| `origin/codex/v37-catalog-admin` | `53a8f0e` | 2026-10-29 |
| `origin/feature/orm-tide-prediction-engine-20261016` | — | 2026-10-16 |
| `origin/codex/issue-3-pricing-v36-implementation` | — | 2026-10-12 |
| `origin/codex/issue-3-pricing-v36-audit` | — | 2026-10-11 |
| `origin/codex/issue-3-pricing-v36` | — | 2026-10-11 |
| `origin/main` | — | 2026-10-07 |

### 0.2 BLOCKED — the two Excel workbooks are not reachable

| Required reference file | Status |
|---|---|
| `...\.codex-remote-attachments\...\1-ORM_Quote_Tidal_v3_7_Tier3_41_50_Tier4_51_60_APPROVED.xlsx` | **BLOCKED — not reachable** |
| `...\artifacts\v37-price-summary-20261103\ORM_Rate_Summary_v3_7_Latest_2026-11-03.xlsx` | **BLOCKED — not reachable** |

Verification performed: a repository-wide search for `*.xlsx`, `*.xls` and `*.csv` across the audited branch returned exactly **one** spreadsheet-class file — `docs/pricing-v3.6/RATE_RECONCILIATION.csv`. Neither `artifacts/` nor `.codex-remote-attachments/` exists in any branch. Both workbooks are local-only, uncommitted files.

**Consequence:** required checks **1 (Excel integrity)**, **2 (Excel source vs summary workbook)** and the Excel half of **3 (Excel vs Pricing Master)** are reported **BLOCKED**. Per the task's own instruction ("If staging access is unavailable, report BLOCKED and do not guess" / "Do not invent missing prices"), no row counts, duplicate findings, formula-error findings or price deltas have been fabricated for them.

**To unblock:** attach both `.xlsx` files to this conversation, or enable Remote Control for the folder containing them.

### 0.3 BLOCKED — staging database

No Supabase credentials are present in this container and no authorized read-only staging connection was available. Therefore all statements about **what is currently stored in `pricing_master`** are **BLOCKED**. Everything in this report about rates is derived from **committed repository artifacts**, which are the code's own canonical seed/import data, not the live table.

---

## 1. Headline finding: the repository does not contain a v3.7 catalog

This is the single most important result of the audit.

**The branch named `codex/v37-catalog-admin` contains no v3.7 pricing catalog, no v3.7 rate data, and no v3.7 pricing logic.**

Evidence:

1. A case-insensitive search for `v3.7`, `v37`, `3.7.0` across all `.ts`, `.tsx`, `.js`, `.mjs`, `.json`, `.md`, `.sql` files on the audited branch returns hits in only **two** files: `docs/handoffs/2026-10-27-alex-jaguar-workflow-test.md` and `package-lock.json` (an unrelated dependency version string). There is no v3.7 rate file, seed, migration or constant.

2. The five commits that distinguish `codex/v37-catalog-admin` from `codex/issue-3-pricing-v36-implementation` touch workflow and staging concerns only — not pricing:

   ```
   53a8f0e docs(staging): record preview environment handoff
   3ebb821 feat(staging): route quotation tests to controlled mailbox
   c1495c0 docs: normalize workflow handoff metadata
   b62add5 docs: record workflow continuation handoff
   39760ab fix(workflow): keep canonical service request state in staging
   ```

   Files changed: `app/(dashboard)/quotations/[id]/page.tsx`, `app/(dashboard)/service-requests/[id]/page.tsx`, `app/api/db/quotations/[id]/route.ts`, `app/api/db/service-requests/[id]/route.ts`, `app/api/db/work-orders/route.ts`, `lib/safe-mode.ts`, `lib/service-workflow-compat.ts`, `tests/safe-mode.test.js`, plus one handoff doc. No pricing file appears.

3. The branch's **own handoff document** states the problem directly — `docs/handoffs/2026-10-27-alex-jaguar-workflow-test.md`, line 86:

   > "Pricing records used by this test still identify source version **v3.5**; the active master also contains mixed **v3.5/v3.6** data, so **v3.7 migration status must be verified separately**."

4. Every canonical pricing artifact in the repository is explicitly labelled v3.6 or v3.5:
   - `scripts/pricing-v3.6-final-merged.json` — `"version": "ORM Pricing Structure v3.6 FINAL_MERGED"`
   - `docs/pricing-v3.6/` — specification, audit report, test matrix, reconciliation CSV, staging readiness
   - `lib/storage-pricing.ts` error text: *"Speedboats over 60 ft are outside the configured **v3.6** storage range."*
   - `app/api/db/service-requests/route.ts`: *"Approved **v3.6** rate ${code} is not active."*
   - `tests/pricing-accounting.test.js` test 11: *"generated rate card preserves **v3.5** pricing and zero operational discount"*

**Answer to "Excel v3.7 vs Pricing Master: do they match?"** — They cannot match, because **no v3.7 implementation exists in the repository to match against**. The implementation is v3.6 (with v3.5 residue). Any v3.7 reconciliation is therefore a *migration* task, not a *drift* task.

---

## 2. Check 1 — Excel integrity

**Status: BLOCKED.** See §0.2.

For the record, the expected baseline was compared against what the repository itself documents, so you can see where the numbers already disagree **before** the workbooks are opened:

| Baseline (expected v3.7) | Repository-documented value (v3.6) | Source | Assessment |
|---|---|---|---|
| Canonical rates: **126** | Active rows **127 → 126**; later **126 → 132** | `docs/pricing-v3.6/ISSUE-3-IMPLEMENTATION.md` line 14; `docs/pricing-v3.6/STAGING_READINESS_2026-10-12.md` line 12 | **Conflict.** Repo's last recorded active count is **132**, not 126. 13 canonical haul-out/yacht/catamaran rates were added after the 126 snapshot. |
| Quote allowed: **107** | Not documented | — | **BLOCKED** (needs workbook or staging). 107 + 19 = 126, internally consistent with the 126 baseline. |
| Manager review: **19** | Not documented | — | **BLOCKED** (needs workbook or staging). |
| Active PENDING/BLOCKED: **0** | *"W4 and B1 full rates remain pending; only approved soft rates are used."* | `STAGING_READINESS_2026-10-12.md` line 17 | **Conflict / at-risk.** W4 and B1 `full_rate_thb` are documented as **pending**. If "pending" is counted, this is not 0. |
| Legacy aliases retired: **39** | **16** (implementation doc); **17** rows in CSV (16 `RETIRED_NOT_DELETED` + 1 `REFERENCE_ONLY_NOT_QUOTEABLE`); *"Retired seven confirmed aliases"* (readiness prose) | `ISSUE-3-IMPLEMENTATION.md` line 17; `RATE_RECONCILIATION.csv`; `STAGING_READINESS_2026-10-12.md` line 15 | **Conflict.** Repo accounts for at most 17. The expected 39 implies **~22 further retirements** introduced by v3.7 and not present here. The repo's own three numbers (16 / 17 / 7) also disagree with each other. |
| Formula errors: **0** | N/A | — | **BLOCKED** (workbook required). |
| VAT treatment: all rates ex VAT | Consistent — rates carry no VAT; VAT added downstream | `scripts/pricing-v3.6-final-merged.json` (no VAT field on any rate) | **Consistent**, but see §5.4 for three conflicting downstream VAT implementations. |

---

## 3. Check 2 — Excel source vs summary workbook

**Status: BLOCKED.** Neither workbook is reachable (§0.2). Added / missing / changed / duplicate rows and price deltas cannot be produced without inventing data.

---

## 4. Check 3 — Excel vs Pricing Master implementation

**Status: PARTIALLY BLOCKED.** The Excel side and the live-table side are both unreachable. What *was* fully audited is the **implementation**: schema, access layer, calculation paths and the committed canonical rate data. Findings follow.

### 4.1 Data-layer: `pricing_master` is raw Supabase, not Prisma

`lib/pricing-master.ts` reads and writes `pricing_master` through `createServerClient()` (raw Supabase), despite `prisma/migrations/20260602_add_pricing_master/migration.sql` existing. Prisma models are therefore not the source of truth for pricing. Any Prisma-only query or type will not see pricing data. (Same architectural split already noted for ramp bookings.)

### 4.2 Columns present (from `lib/pricing-master.ts` + `lib/pricing-validation.ts`)

`code`, `service_name_en/th`, `category`, `unit`, `rate_thb`, `full_rate_thb`, `discount_pct`, `source_discount_pct`, `direct_cost_thb`, `pilot_rate_thb`, `pilot_notes`, `revenue_gl_code`, `cost_gl_code`, `pnl_category`, `cost_pnl_category`, `cost_basis`, `calc_type`, `service_group`, `subgroup`, `provider_type`, `quote_allowed`, `price_status`, `source_version`, `effective_date`, `updated_by`, `approved_by`, `approved_at`, `description`, `notes`, `is_active`.

Enumerations:
- `quote_allowed`: `YES` | `NO` | `CONTACT` | `MANAGER_REVIEW` | `MANUAL`
- `price_status`: `ACTIVE` | `INACTIVE` | `CONTACT_ONLY` | `PENDING_PAINT_TEAM` | `MANUAL_QUOTE`

### 4.3 FINDING A (HIGH) — two parallel `calc_type` taxonomies, legacy types silently mispriced

`PRICING_CALC_TYPES` in `lib/pricing-validation.ts` accepts **both** a legacy set and a current set:

- Legacy: `FLAT_QTY`, `FLAT_DAYS`, `LOA_RATE_QTY`, `LOA_RATE_DAYS`, `MANUAL`
- Current: `FLAT_RATE`, `PER_FOOT`, `PER_METRE`, `PER_TONNE`, `PER_SQUARE_METRE`, `PER_HOUR`, `PER_DAY`, `PER_WEEK`, `PER_MONTH`, `PER_UNIT`, `COST_PLUS`, `MANUAL_QUOTE`

Only the **current** set is interpreted. In `app/api/db/service-requests/route.ts` lines 148–159 the server branches on `FLAT_RATE`, `PER_FOOT`, `PER_METRE`, `PER_TONNE`, `MANUAL_QUOTE`, `COST_PLUS` only. A legacy value falls through every branch, leaving `qty` at the **client-supplied** `item.qty ?? 1`. The same gap exists client-side in `app/(dashboard)/service-requests/new/page.tsx` line 163–166, which ends `: method === "FLAT_RATE" ? 1 : 1`.

Two concrete consequences:

1. **Silent under-billing.** A rate stored as `LOA_RATE_DAYS` or `LOA_RATE_QTY` (legacy per-foot) is **not** multiplied by LOA or by duration. A 40 ft vessel on a per-foot rate bills **×1 instead of ×40**. No error is raised.
2. **Safety bypass.** The manual-quote guard tests `method === "MANUAL_QUOTE"` only. A rate carrying the legacy value `MANUAL` is **not** caught and is auto-priced instead of being escalated.

Severity is raised by `lib/pricing-master.ts` line 136/203: `calc_type` **defaults to `"FLAT_QTY"`** — a legacy value — on both read-mapping and insert. Combined with the handoff note that the active master holds mixed v3.5/v3.6 data, legacy `calc_type` values are likely present in the live table.

### 4.4 FINDING B (MEDIUM) — `price_status` is never enforced at quotation time

`app/api/db/service-requests/route.ts` line 113 filters rates with `.eq("is_active", true)` and **selects** `price_status`, but never tests it. Line 135 blocks only `quote_allowed === "NO"`.

So a rate with `is_active = true` **and** `price_status = "PENDING_PAINT_TEAM"` or `"CONTACT_ONLY"` or `"MANUAL_QUOTE"` is quotable. `app/api/pricing-master/route.ts` likewise filters only on `isActive`, so such rates also appear in the Service Request picker. This is the mechanism by which the "Active PENDING/BLOCKED must be 0" baseline could be violated in practice.

### 4.5 FINDING C (MEDIUM) — `MANAGER_REVIEW` escalates only for RAMP-section rates

Line 192 computes `hasManagerReviewRampRate` from **RAMP-group items only**; line 199 folds it into `operationalApprovalRequired`. A `STORAGE` or `YARD` rate marked `MANAGER_REVIEW` or `CONTACT` is priced with no escalation.

Currently latent, not live: in `scripts/pricing-v3.6-final-merged.json` every `MANAGER_REVIEW` rate is a haul-out/launch rate in `service_group` `"1. Haul-out & Launch"`, which maps to canonical group `RAMP` and therefore does escalate correctly. The gap bites as soon as v3.7 marks any storage or yard rate `MANAGER_REVIEW`.

### 4.6 FINDING D (MEDIUM) — two competing soft-price mechanisms; one is ignored

Two different "discounted price" designs coexist:

1. **In use.** Soft/opening price is baked into `rate_thb`, with `full_rate_thb` holding the standard price and `source_discount_pct` recording the relationship informationally. In `scripts/pricing-v3.6-final-merged.json` every rate has `source_discount_pct: 25` and `rate_thb = full_rate_thb × 0.75` (e.g. `SB1_HAUL_LAUNCH` full 5,500 → rate 4,125).
2. **Not in use.** A dedicated `pilot_rate_thb` / `pilot_notes` column pair, surfaced by `lib/pricing-master.ts` line 129 as `effectiveRate: pilotRateThb ?? rateThb`.

The quotation path never consults mechanism 2. `app/api/db/service-requests/route.ts` line 113 does not even select `pilot_rate_thb`, and line 146 prices from `price?.rate_thb`. The Service Request UI likewise uses `price.rateThb`, not `price.effectiveRate` (`new/page.tsx` line 160).

Consequence: if anyone sets `pilot_rate_thb` on a rate, the **Pricing Master screen will display one effective rate while quotations bill a different one**. Also asymmetric: `pricingCreateSchema` omits `pilotRateThb` while `pricingUpdateSchema` includes it, so a pilot rate can only be added by a second update call.

### 4.7 FINDING E (LOW) — `source_version` is recorded but never validated

Rates carry `source_version`, and quotation items snapshot `pricing_source_version` (line 340). Nothing anywhere asserts that a quoted rate came from the *current approved* version. A v3.5 row and a v3.7 row can be mixed in one quotation with no warning. This is precisely the condition the handoff doc flagged.

### 4.8 FINDING F (LOW) — hardcoded "v3.6" in user-visible strings

`lib/storage-pricing.ts` ("outside the configured v3.6 storage range"), `app/api/db/service-requests/route.ts` line 170 ("Approved v3.6 rate … is not active"), `new/page.tsx` line 238, and the stored `storageNote` ("Storage v3.6: …") all hardcode the version. After a v3.7 migration these strings become actively misleading to operators.

---

## 5. Check 4 — Pricing formula audit

### 5.1 Calculation methods

`calculatePrice()` in `lib/pricing-engine.ts` was executed against every method it supports. All correct (see `CLAUDE_TEST_MATRIX.md`, T-ENG rows): flat, per-foot, per-metre, per-tonne, per-m², per-hour, per-day, per-week, per-month, per-unit, cost-plus, manual quote. `MANUAL_QUOTE` correctly returns `amountThb: null, approvalRequired: true`. `COST_PLUS` correctly forces `approvalRequired: true`.

One structural note: `PER_DAY`, `PER_WEEK`, `PER_MONTH` and `PER_UNIT` are implemented **identically** — all four simply take `context.quantity`. The period carries no arithmetic meaning inside `calculatePrice`; duration semantics live entirely in `storageDurationMultiplier` and `lowestStoragePackage`. Any expectation that `PER_WEEK` itself converts weeks→days is unfounded.

### 5.2 FINDING G (HIGH, and the direct answer to "yacht weekly per-foot") — weekly per-foot storage is deliberately refused

`storageDurationMultiplier(unit, days)` (`lib/pricing-engine.ts` lines 122–130) supports **only** day and month:

```
/month/i  → days / 30, and throws unless days is an exact multiple of 30
/day/i    → days
otherwise → throws "An approved storage billing period is required."
```

A weekly unit (`ft/week`) therefore **throws**. This is not an oversight — it is **locked by an existing test**, `tests/pricing-engine.test.js` line 9:

```js
assert.throws(() => storageDurationMultiplier("ft/week", 7), /approved/)
```

and it matches the canonical data, which contains **no weekly yacht or catamaran storage rate at all**. `YACHT_STORAGE_D` (`ft/day`) and `YACHT_STORAGE_M` (`ft/month`) exist; both carry the description *"Thirty-day package; no unapproved weekly rate."* The same holds for `PCAT_STORAGE_*` and `SCAT_STORAGE_*`.

Executed results (real module calls):

| Case | Result |
|---|---|
| Yacht 40 ft × 10 days @ 30 THB/ft/day | **12,000 THB** — correct (LOA × rate × days) |
| Yacht 40 ft × 60 days @ 525 THB/ft/month | **42,000 THB** — correct (LOA × rate × 2 months) |
| Yacht 40 ft weekly (`ft/week`, 7 days) | **THROWS** — "An approved storage billing period is required." |
| Yacht monthly, 31 days | **THROWS** — "Monthly per-foot storage requires complete 30-day periods." |

**Interpretation.** Per-foot × LOA × duration works correctly for daily and monthly. It is **weekly** that is absent. So:

- If v3.7 **introduces a weekly yacht/catamaran per-foot rate**, then v3.6 code will reject it outright and the blocking test must be changed. This is a **migration gap, not a bug**.
- If v3.7 **does not** introduce one, the current behaviour is correct and should be left alone.

This question cannot be settled without the workbook. It is the single most important item to resolve before any v3.7 code change.

### 5.3 Storage package optimisation

`lowestStoragePackage()` is an exact-cover dynamic-programming minimiser over the 1-day / 7-day / 30-day packages, requiring all three to be present. It returns the cheapest **exact** combination, and throws if no exact combination exists. Verified by execution:

| Days | Slot | Lowest total | Composition |
|---|---|---|---|
| 7 | W4 | 4,200 | `SB4_W4_WEEK ×1` |
| 10 | W4 | 6,300 | `SB4_W4_WEEK ×1` + `SB4_W4_DAY ×3` |
| 30 | W4 | 18,000 | `SB4_W4_MONTH ×1` |
| 7 | B1 | 5,400 | `SB4_B1_WEEK ×1` |
| 10 | B1 | 8,100 | `SB4_B1_WEEK ×1` + `SB4_B1_DAY ×3` |
| 14 | B1 | 10,800 | `SB4_B1_WEEK ×2` |
| 21 | B1 | 16,200 | `SB4_B1_WEEK ×3` |
| 30 | B1 | 19,500 | `SB4_B1_MONTH ×1` |

The 10-day optimisation and the 30-day monthly package both behave as specified. Note that storage **packages** are flat per period and **ignore LOA** — they are a different mechanism from the per-foot yacht/catamaran rates.

### 5.4 FINDING H (MEDIUM) — three different VAT implementations, one client-controlled

| Location | VAT source | Note |
|---|---|---|
| `app/api/db/service-requests/route.ts` line 291 | `Math.round(netSubtotal * 0.07)` | Hardcoded 7%, rounded to whole baht |
| `app/api/db/quotations/route.ts` line 142 | `Number(body.tax_rate ?? 7)` | **Client-supplied**, validated only as 0–100 |
| `app/api/billing/recurring/route.ts` line 221 | `const VAT_RATE = 0.07` | Hardcoded 7%, 2-decimal rounding |

Discount-then-VAT ordering is correct in all three (VAT applies to the post-discount subtotal). But the rate itself is not read from configuration anywhere, contradicting `ai-agents/PRICING_RULES.md`, and the quotation endpoint will accept `tax_rate: 0` from a caller.

### 5.5 Pilot / soft rate double-discount

**No automatic double discount.** The soft 25% is already inside `rate_thb`; `source_discount_pct` is informational and is proven not to feed the operational discount by `tests/pricing-accounting.test.js` tests 1–2 ("pricing defaults operational discount to zero", "source discount is informational and does not change default discount"). Operational `discount_pct` defaults to 0 in the canonical data and in both UI and server.

**Residual risk (not automatic):** an operator may still enter an operational discount on top of an already-soft rate, up to their role cap (`maxOperationalDiscountForRole`). Nothing warns that the line is already discounted 25% at source. Recommend a UI advisory, not a hard block.

### 5.6 Duplicate-charge prevention

Three independent layers, all verified:

1. `assertNoDuplicateChargeCodes()` rejects a repeated code and rejects a code already included in a selected base package (executed: `tests/pricing-engine.test.js` test 5).
2. The Service Request UI pre-checks with `rowsContainCode()` and refuses with *"The same service cannot be billed twice."*
3. For speedboat storage the server **replaces** any client-submitted STORAGE lines with server-computed canonical package lines (`route.ts` line 178), so client-side storage prices cannot be injected or duplicated.

**Gap:** the duplicate check is applied to `items.filter(item => !item.is_open_rate)` (line 119). **Open Rate lines bypass duplicate detection entirely.** Open Rate is restricted to Admin / Managing Director / Finance and requires a description, which mitigates but does not remove the risk.

### 5.7 Historical quotation price snapshots

**Correctly implemented.** `route.ts` line 340 writes, per quotation item: `full_rate_snapshot_thb`, `current_rate_snapshot_thb`, `direct_cost_snapshot_thb`, `revenue_gl_code`, `cost_gl_code`, `pnl_category`, `cost_pnl_category`, `pricing_source_version`, `pricing_effective_date`, `pricing_updated_at`. Backed by executed test 7 ("migration backfills zero discount and quotation snapshots") and test 8 (pricing history is append-only).

**Two gaps:** (a) there is **no `pilot_rate_snapshot`**, so if mechanism 2 of §4.6 is ever used it is not captured historically; (b) the legacy-schema fallback at line 343 inserts a reduced row that **drops every snapshot column** — acceptable as a staging compatibility shim, but it must not reach production.

---

## 6. Check 5 — Service Request UI audit

Audited: `app/(dashboard)/service-requests/new/page.tsx` (3-step wizard) and its server counterpart.

| Required capability | Status | Evidence |
|---|---|---|
| Select service category | ✅ Yes | Section routing `RAMP` / `STORAGE` / `YARD` + `serviceCategories()` |
| Select service item | ✅ Yes | Cascading rate-card select, filtered by section (`sectionPrices`) |
| Select rate card | ✅ Yes | `/api/pricing-master?isActive=true` → `rateCardItemsForSection` |
| Enter quantity | ✅ Yes | "Qty / duration" input, `min 0.001 step 0.001` |
| Enter duration in days / weeks / months | ⚠️ Partial | Duration is entered in **days only** (`storageDays`, 1–3650). A `storagePeriod` selector (DAILY/WEEKLY/MONTHLY) filters which rates are offered but does not accept weeks or months as a unit of entry. |
| Enter LOA where per-foot applies | ⚠️ Partial | LOA is **read from the boat record**, never hand-entered (line 163). If `loa_ft` is unset the line is refused: *"Complete the vessel dimensions required by {code}."* Correct for data integrity; does not satisfy "enter LOA" literally. |
| Add multiple weeks for Boat Stand | ⚠️ Partial | Achieved by entering 7 / 14 / 21 days and letting the optimiser pick `..._WEEK ×1/×2/×3`. There is **no boat-stand *count* field** — quantity means periods, not physical stands. |
| Add multiple service items | ✅ Yes | `addRate()` and `addOpenRate()` append rows |
| Remove service items | ✅ Yes | Per-row trash button |
| See calculated subtotal | ✅ Yes | "Preview subtotal" (line 383) and a per-line review list |
| See discount | ✅ Yes | Per-line "Discount %", capped by `maximumDiscount` for the actor's role |
| **See VAT** | ❌ **No** | Not shown in the Service Request wizard. Line 390 states: *"VAT and deposit are calculated and snapshotted by the server when the Draft is created."* |
| **See total** | ❌ **No** | Only "Subtotal before VAT" is displayed; the VAT-inclusive total is not. |
| Submit Service Request | ✅ Yes | `POST /api/db/service-requests` |
| Continue to Draft Quotation | ✅ Yes | Server creates the linked `DRAFT` quotation in the same transaction and returns `quotation_id` |

**Workflow-rule violations found:** none that break the approved workflow. The two ❌ rows are **presentation gaps** — the figures are computed correctly server-side, just not surfaced to the operator before submission, which risks an operator quoting a VAT-exclusive number to a customer verbally.

Positive controls worth recording: role-capped discount entry; Open Rate restricted to Admin/MD/Finance and requiring a description; vessel/customer ownership cross-check; W4/B1 slot + method gating with an explicit on-screen warning that *"Storage approval does not approve haul-out or launch."*

---

## 7. Check 6 — Recurring billing audit

### 7.1 FINDING I (HIGH) — three mutually inconsistent billing-period bases

| # | Location | Basis | Code |
|---|---|---|---|
| 1 | `lib/service-workflow.ts` line 104 | **30 days from yard start** | `firstCycleDueDate = addUtcDays(yardStartDate, 30)` |
| 2 | `lib/ramp-booking-service.ts` line 67 | **Calendar month from requested date** | `next_billing_date: isMonthly ? addOneCalendarMonth(requestedDate) : null` |
| 3 | `app/api/billing/recurring/route.ts` lines 63–101 | **Calendar month keyed `YYYY-MM`, anchored to the 1st** | `billingPeriodKey()` → `YYYY-MM`; `periodStart = new Date(year, month - 1, 1)` |

The requirement is *"monthly storage starting from the actual check-in date; 30-day billing period unless an approved calendar-month contract exists."*

- Basis 1 matches the 30-day rule.
- Basis 2 starts from the actual date but advances by calendar month, not 30 days.
- Basis 3, which is the engine that **actually issues recurring invoices**, ignores the check-in date entirely and bills on calendar months anchored to the 1st.

Also inconsistent with the storage side: `storageDurationMultiplier` enforces **exact 30-day** periods and explicitly refuses 31 days. So a vessel can be *quoted* on strict 30-day periods and then *invoiced* on calendar months.

**Status: FAIL** — recurring monthly billing is implemented, but on the wrong basis, and three bases disagree.

### 7.2 Remaining recurring-billing requirements

| Requirement | Status | Evidence |
|---|---|---|
| Monthly storage starts from actual check-in date | ❌ Fail | §7.1 basis 3 anchors to the 1st of the calendar month |
| 30-day period unless approved calendar-month contract | ❌ Fail | Inverted — calendar month is the only mode in the recurring engine; there is no 30-day mode and no flag to choose |
| Reminder before due date | ✅ Yes | `deriveCreditSchedule` → `firstReminderDate = firstCycleDueDate − 5 days`; runner at `app/api/billing/service-payment-reminders/route.ts`; `next_reminder_at` / `last_reminder_at` / `reminder_count` columns and a partial index exist |
| **Configurable reminder days** | ❌ No | The 5-day offset is **hardcoded** in `lib/service-workflow.ts` line 109. No setting, env var or config row. |
| Invoice separation by billing period | ✅ Yes | `billing_period` stored on each invoice; `targetPeriod` filtering |
| No duplicate billing for same vessel, slot and period | ⚠️ Partial | Uniqueness is `(contract_id, billing_period)` — keyed on **contract**, not on (vessel, slot, period). Two contracts covering the same vessel/slot in one period would both invoice. |
| Billing ends when vessel checks out | ⚠️ Partial / unverified | `isDueThisPeriod` honours `contract.end_date`, and an auto-expiry pass marks contracts whose `end_date` has passed (lines 348–355). **But no code path was found that sets `end_date` from a vessel check-out event** — a repository-wide search for `check_out` / `checkout` in `.ts`/`.tsx` returned no functional hits. Termination therefore depends on a human editing the contract. |
| Tide-delay launch dates must not create improper storage charges | ❌ Not implemented | No tide-delay, weather-delay or postponement concept exists outside `lib/mock-data-extra.ts`. If a launch slips for tide reasons, extra storage days accrue with no adjustment, waiver or flag. |

Positive control: the reminder runner is gated by `isAutomationWritesEnabled()` and returns `{ dry_run: true }` when writes are disabled — correct fail-safe.

---

## 8. Check 7 — Operational safety audit

| Requirement | Status | Evidence |
|---|---|---|
| Storage eligibility separate from haul-out eligibility | ✅ Correct | Independent code paths. Haul-out gating runs only when `hasWaterMovement`; storage classification never authorises haul-out. Canonical descriptions reinforce it: *"Storage eligibility is separate from haul-out eligibility."* UI banner: *"Storage approval does not approve haul-out or launch."* |
| Vessels over 12 t get no automatic standard haul-out approval | ✅ Correct | `evaluateStandardRampHaulOut` blocks `weightT > 12`, and also blocks missing/zero weight. Server returns **422 `MANUAL_HANDLING_ASSESSMENT_REQUIRED`** (line 193). Executed test: "standard ramp gate hard-blocks vessels over 12 tonnes". |
| Large vessels require manual/manager review | ✅ Correct | Additional blockers: LOA > 42 ft; catamaran > ~35 ft. `SB4_HAUL_LAUNCH` is `MANAGER_REVIEW` and labelled *"Reference price only. SB4 classification does not authorize standard haul-out."* Executed test: "60 ft SB4 storage classification does not authorize standard haul-out". |
| **Wet berth services remain blocked / unavailable** | ❌ **VIOLATED** | Wet berth is selectable and billable in several places: `app/(dashboard)/quotations/new/page.tsx` line 49 lists `"Wet Berth"` as a quotation category; `app/api/billing/recurring/route.ts` line 229 maps `WET_BERTH: "Wet Berth Fee"` for recurring invoices; `components/quotations/LineItemRow.tsx` maps `"Berth Fee" → "Wet Berth"`; `app/api/quotations/ai-generate/route.ts` line 83 includes `Wet Berth` in the AI-permitted category list; the public inquiry form offers `WET_BERTH`. **No guard blocks wet-berth pricing, quoting or recurring billing.** |
| Storage location does not imply haul-out approval | ✅ Correct | As above; separate evaluation plus explicit UI warning |
| W4 and B1 are storage-location codes, not vessel categories | ✅ Correct | Typed as `StorageSlot = "ANY_APPROVED" \| "W4" \| "B1"`, validated against `mms_berths` by `code`, with capacity (`max_loa_ft`) and availability checks. UI states *"SB4 is a pricing class only."* Executed test: "W4 is trailer only and B1 is boat stands only". |
| Special crane / mast / subcontractor / night ops require approval | ⚠️ Partial | Subcontractor work is gated (`COST_PLUS` forces approval; insurance required for `BOAT_OWNER_CONTRACTOR`; `OCEAN_ROVER_SUBCONTRACTOR` cannot receive a marina discount). `LIFT_CRANE_OVER18` is quotation-only in the rate card. **No specific gate was found for mast work or night/after-hours operations** beyond ordinary `MANAGER_REVIEW` flags, and §4.5 shows `MANAGER_REVIEW` does not escalate outside the RAMP section. |

### 8.1 FINDING J (HIGH) — SB3/SB4 tier boundaries disagree with the v3.7 filename

The approved workbook filename encodes **`Tier3_41_50`** and **`Tier4_51_60`**. The implementation and its canonical data encode different boundaries:

| Source | Tier 3 / SB3 | Tier 4 / SB4 |
|---|---|---|
| v3.7 workbook filename (expected) | **41–50 ft** | **51–60 ft** |
| `lib/storage-pricing.ts` `speedboatStorageClass` | ≤ 47 ft | 48–60 ft |
| `lib/speedboat-classification.ts` `loaToEngineGroup` | ≤ 47 ft | 48–60 ft |
| `scripts/pricing-v3.6-final-merged.json` | `SB3_HAUL_LAUNCH` `"loa": "41-47 ft"` | `SB4_HAUL_LAUNCH` `"loa": "48-60 ft"` |
| Retired alias (historical) | — | `STORE_SB_4ENG_48_55_M` implies SB4 was once 48–55 |

**The 48–50 ft band is mis-tiered**: v3.7 places it in Tier 3, the code places it in SB4. A 48–50 ft vessel will be classified, priced, slot-gated (W4/B1 required) and escalation-flagged as SB4 under the current code, when v3.7 says Tier 3. Both `speedboatStorageClass` and `loaToEngineGroup` must change together, plus the `loa` labels in the canonical data and the SB3/SB4 rate rows themselves.

This is the clearest, most actionable v3.7 discrepancy that could be established **without** the workbook — it comes from the approved filename itself. It still requires workbook confirmation of the per-tier prices before any change.

---

## 9. Consolidated findings register

| ID | Severity | Finding | Primary location |
|---|---|---|---|
| — | **CRITICAL (process)** | No v3.7 catalog, data or logic exists in the repository; implementation is v3.6 with v3.5 residue | whole branch; `docs/handoffs/2026-10-27-…md` line 86 |
| J | **HIGH** | SB3/SB4 tier boundaries (≤47 / 48–60) contradict v3.7 Tier3 41–50 / Tier4 51–60; 48–50 ft band mis-tiered | `lib/storage-pricing.ts`, `lib/speedboat-classification.ts`, `scripts/pricing-v3.6-final-merged.json` |
| A | **HIGH** | Legacy `calc_type` values silently fall through → per-foot bills ×1; legacy `MANUAL` bypasses the manual-quote guard; `calc_type` defaults to legacy `FLAT_QTY` | `app/api/db/service-requests/route.ts` 148–159; `new/page.tsx` 163–166; `lib/pricing-master.ts` 136, 203 |
| G | **HIGH** | Weekly per-foot storage is deliberately refused and test-locked; no weekly yacht/catamaran rate exists | `lib/pricing-engine.ts` 122–130; `tests/pricing-engine.test.js` 9 |
| I | **HIGH** | Three inconsistent billing-period bases; the live recurring engine bills calendar months anchored to the 1st, not 30 days from check-in | `lib/service-workflow.ts` 104; `lib/ramp-booking-service.ts` 67; `app/api/billing/recurring/route.ts` 63–101 |
| — | **HIGH (safety)** | Wet berth is not blocked — quotable, AI-quotable and recurring-billable | `quotations/new/page.tsx` 49; `billing/recurring/route.ts` 229; `quotations/ai-generate/route.ts` 83 |
| B | MEDIUM | `price_status` never enforced at quotation time; PENDING/CONTACT_ONLY rates quotable when `is_active` | `service-requests/route.ts` 113, 135; `api/pricing-master/route.ts` |
| C | MEDIUM | `MANAGER_REVIEW` / `CONTACT` escalates only for RAMP-section rates | `service-requests/route.ts` 192, 199 |
| D | MEDIUM | `pilot_rate_thb` / `effectiveRate` exists but is ignored by every pricing path; create/update schema asymmetry | `lib/pricing-master.ts` 129; `service-requests/route.ts` 113, 146 |
| H | MEDIUM | Three VAT implementations; quotation VAT rate is client-supplied | three routes, §5.4 |
| — | MEDIUM | No tide-delay adjustment for storage charges | not implemented |
| — | MEDIUM | Check-out does not terminate billing automatically | no `check_out` wiring found |
| — | MEDIUM | Customer-owned vs ORM-owned trailer not modelled | only `trailerType` in `lib/mock-data.ts`; `trailer_required` boolean on boats |
| — | LOW-MED | Reminder offset hardcoded at 5 days, not configurable | `lib/service-workflow.ts` 109 |
| — | LOW-MED | Service Request UI shows no VAT and no total | `new/page.tsx` 383, 390 |
| — | LOW-MED | Duplicate check skips Open Rate lines | `service-requests/route.ts` 119 |
| — | LOW-MED | Recurring duplicate key is `(contract_id, period)`, not (vessel, slot, period) | `billing/recurring/route.ts` |
| E | LOW | `source_version` recorded but never validated; mixed-version quoting possible | `service-requests/route.ts` 340 |
| F | LOW | "v3.6" hardcoded in operator-visible strings | four locations, §4.8 |
| — | LOW | Legacy-schema fallback drops all quotation snapshot columns | `service-requests/route.ts` 343 |
| — | LOW | No boat-stand *count* field (quantity means periods) | `new/page.tsx` |

---

## 10. Test execution summary

Full detail in `CLAUDE_TEST_MATRIX.md`.

| Outcome | Count |
|---|---|
| Executed and PASS | 14 |
| PARTIAL | 5 |
| FAIL | 3 |
| NOT IMPLEMENTED | 3 |
| BLOCKED (workbook / staging required) | 7 |

Suite runs (real, on `53a8f0e`):

- `tests/pricing-engine.test.js` + `tests/storage-pricing.test.js` — **10/10 pass**
- `tests/pricing-accounting.test.js` — **21/21 pass** (initially errored with `ERR_MODULE_NOT_FOUND: zod`; `zod` was installed into the scratch worktree only, then all 21 passed — this was an environment gap, not a logic defect)
- `tests/service-workflow.test.js`, `tests/quotation-workflow.test.js`, `tests/quotation-validation.test.js` — **all pass**

No test was modified. No application file was modified.

---

## 11. Executive summary (ภาษาไทย)

### 1. Excel กับ Pricing Master ตรงกันหรือไม่

**ยังไม่สามารถเทียบได้ และคำตอบเชิงโครงสร้างคือ "ไม่ตรง"**

- ไฟล์ Excel ทั้งสองไฟล์ **เข้าถึงไม่ได้** จาก session นี้ เพราะเป็นไฟล์บนเครื่อง Windows ของคุณ ไม่ได้ commit เข้า repo (ค้นทั้ง repo ไม่พบไฟล์ `.xlsx` เลยแม้แต่ไฟล์เดียว) การตรวจข้อ 1–2 และครึ่งหนึ่งของข้อ 3 จึงเป็น **BLOCKED**
- แต่สิ่งที่ยืนยันได้ชัดเจนคือ **ใน repo ไม่มี v3.7 อยู่เลย** — ไม่มีไฟล์ราคา v3.7 ไม่มี logic v3.7 ค้นคำว่า v3.7/v37 ทั้ง repo เจอแค่ 2 ไฟล์ และหนึ่งในนั้นเป็น `package-lock.json` ที่ไม่เกี่ยวข้อง
- branch ที่ชื่อ `codex/v37-catalog-admin` **ไม่มี catalog v3.7** — 5 commit ที่ต่างจาก v3.6 เป็นงาน workflow/staging ทั้งหมด
- เอกสาร handoff ของ branch นั้นเขียนไว้เองว่า: *"Pricing records ยังระบุ source version v3.5 และ master ที่ใช้งานมีข้อมูล v3.5/v3.6 ผสมกัน ต้องตรวจสอบสถานะการ migrate v3.7 แยก"*

**สรุป:** นี่ไม่ใช่ปัญหา "ราคาเคลื่อน" แต่เป็น **งาน migrate v3.7 ที่ยังไม่ได้เริ่ม**

### 2. รายการราคาที่แตกต่าง

เทียบราคาแบบรายบรรทัดยังทำไม่ได้ (ต้องมีไฟล์ Excel) แต่ตัวเลข baseline ที่คุณให้มาขัดกับที่ repo บันทึกไว้แล้ว:

| Baseline ที่คาดไว้ (v3.7) | ที่ repo บันทึก (v3.6) | ผล |
|---|---|---|
| Canonical 126 รายการ | ล่าสุดบันทึก **132** รายการ | **ไม่ตรง** (เพิ่ม 13 รายการ haul-out/yacht/catamaran หลัง snapshot 126) |
| Quote allowed 107 | ไม่มีบันทึก | BLOCKED |
| Manager review 19 | ไม่มีบันทึก | BLOCKED |
| Active PENDING/BLOCKED = 0 | *"W4 และ B1 full rate ยัง pending"* | **เสี่ยงไม่ตรง** |
| Legacy alias retired 39 | **16–17** รายการ | **ไม่ตรง** — ขาดอีกราว 22 รายการ |

### 3. รายการ service item ที่ซ้ำหรือขาด

- **ซ้ำ:** ระบบป้องกันการเรียกเก็บซ้ำได้ดี 3 ชั้น (ตรวจรหัสซ้ำ, ตรวจรหัสที่รวมอยู่ใน package แล้ว, และ server เขียนทับบรรทัด storage ที่ client ส่งมา) — **ผ่าน**
  - **ช่องโหว่:** บรรทัด **Open Rate ไม่ถูกตรวจซ้ำ** (จำกัดสิทธิ์ให้ Admin/MD/Finance เท่านั้น ซึ่งช่วยลดความเสี่ยง)
- **ขาด (ยืนยันแล้ว):**
  - **ไม่มี weekly rate สำหรับ yacht และ catamaran** — มีแต่ `ft/day` และ `ft/month` เท่านั้น
  - **ไม่มีการแยกรถพ่วงของลูกค้า vs ของ ORM** — ไม่มี field ไม่มีรหัสราคา (พบแค่ใน mock data)
  - **ไม่มี field จำนวนขาตั้งเรือ (boat stand count)** — qty หมายถึงจำนวนงวด ไม่ใช่จำนวนขา

### 4. ปัญหา yacht weekly per-foot calculation

**นี่คือข้อที่ต้องตัดสินใจก่อนแก้โค้ดใด ๆ**

- per-foot × LOA × ระยะเวลา **ทำงานถูกต้อง** สำหรับ **รายวันและรายเดือน** (ทดสอบจริง: 40 ฟุต × 30 บาท × 10 วัน = **12,000 บาท**; 40 ฟุต × 525 บาท × 2 เดือน = **42,000 บาท**)
- แต่ **รายสัปดาห์ถูกปฏิเสธโดยเจตนา** — `storageDurationMultiplier` รองรับแค่ day กับ month ถ้าเป็น week จะ **throw error** และพฤติกรรมนี้ถูก **ล็อกด้วย test** (`tests/pricing-engine.test.js` บรรทัด 9)
- ข้อมูลราคา canonical ก็สอดคล้องกัน — `YACHT_STORAGE_M` เขียนกำกับไว้ว่า *"Thirty-day package; no unapproved weekly rate"*
- รายเดือนยังบังคับให้เป็นทวีคูณของ 30 วันพอดี (31 วัน = error)

**สิ่งที่ต้องชี้ขาด:** ถ้า v3.7 **เพิ่ม** weekly yacht per-foot rate → โค้ด v3.6 จะปฏิเสธทันที และต้องแก้ทั้ง logic + test ที่ล็อกไว้ ถ้า v3.7 **ไม่เพิ่ม** → พฤติกรรมปัจจุบันถูกต้องแล้ว ห้ามแก้ **ตอบข้อนี้ได้ต้องเปิดไฟล์ Excel ก่อน**

### 5. ปัญหา Boat Stand มากกว่า 1 สัปดาห์

**คำนวณถูกต้อง** — ทดสอบจริงด้วย B1 (ขาตั้งเรือ):

| ระยะเวลา | ยอดต่ำสุด | องค์ประกอบ |
|---|---|---|
| 1 สัปดาห์ (7 วัน) | 5,400 | `SB4_B1_WEEK ×1` |
| 2 สัปดาห์ (14 วัน) | 10,800 | `SB4_B1_WEEK ×2` |
| 3 สัปดาห์ (21 วัน) | 16,200 | `SB4_B1_WEEK ×3` |

ตัวเพิ่มประสิทธิภาพเลือกชุดที่ถูกที่สุดแบบลงตัวพอดีได้ถูกต้อง (10 วัน W4 = 6,300 = 1 สัปดาห์ + 3 วัน; 30 วัน = 18,000 ใช้ package รายเดือน)

**ข้อจำกัด:** การใส่ "หลายสัปดาห์" ทำโดยกรอก **จำนวนวัน** (7/14/21) ไม่ใช่เลือกสัปดาห์โดยตรง และ **ไม่มีช่องกรอกจำนวนขาตั้ง** — ถ้า v3.7 คิดราคาต่อขา ระบบปัจจุบันแสดงไม่ได้

### 6. สถานะ recurring billing และ reminder

**สถานะ: FAIL — คิดรอบบิลผิดหลัก และมี 3 มาตรฐานขัดกันเอง**

| ที่ | หลักการคิด |
|---|---|
| `lib/service-workflow.ts` | **30 วัน** นับจากวันเข้า yard |
| `lib/ramp-booking-service.ts` | **เดือนปฏิทิน** นับจากวันที่ขอ |
| `app/api/billing/recurring/route.ts` ← **ตัวที่ออกใบแจ้งหนี้จริง** | **เดือนปฏิทิน ยึดวันที่ 1** ของเดือน |

กฎที่ต้องการคือ *"เริ่มจากวันเช็คอินจริง รอบ 30 วัน เว้นแต่มีสัญญาแบบเดือนปฏิทินที่อนุมัติแล้ว"* — ตัวที่ออกบิลจริง **ไม่สนใจวันเช็คอินเลย** และไม่มีโหมด 30 วันให้เลือก ซ้ำร้ายฝั่ง storage บังคับ 30 วันพอดี ทำให้ **ใบเสนอราคาคิดแบบ 30 วัน แต่ใบแจ้งหนี้คิดแบบเดือนปฏิทิน**

| หัวข้อ | สถานะ |
|---|---|
| เริ่มจากวันเช็คอินจริง | ❌ ไม่ผ่าน |
| รอบ 30 วัน | ❌ ไม่ผ่าน (มีแต่เดือนปฏิทิน) |
| แจ้งเตือนก่อนครบกำหนด | ✅ มี (5 วันก่อน) + มี runner + ปลอดภัยด้วย dry-run |
| ตั้งจำนวนวันแจ้งเตือนได้ | ❌ **hardcode 5 วัน** ตั้งค่าไม่ได้ |
| แยกใบแจ้งหนี้ตามรอบ | ✅ มี `billing_period` |
| กันบิลซ้ำ (เรือ/ช่อง/รอบ) | ⚠️ บางส่วน — key เป็น `(contract_id, period)` ไม่ใช่ (เรือ, ช่อง, รอบ) |
| หยุดบิลเมื่อเช็คเอาท์ | ⚠️ มี auto-expiry ตาม `end_date` แต่ **ไม่พบโค้ดที่ตั้ง `end_date` จากการเช็คเอาท์** ต้องแก้สัญญาด้วยมือ |
| เลื่อนลงน้ำเพราะน้ำขึ้นน้ำลง ต้องไม่คิดค่าจอดเกิน | ❌ **ไม่มีในระบบเลย** |

### 7. Test pass/fail/blocked summary

| ผล | จำนวน |
|---|---|
| รันจริงและผ่าน | **14** |
| ผ่านบางส่วน | **5** |
| ไม่ผ่าน | **3** (wet berth ไม่ถูกบล็อก, รอบบิล recurring, 48–50 ฟุต tier) |
| ยังไม่ได้ทำ | **3** (รถพ่วงลูกค้า/ORM, tide-delay) |
| BLOCKED (ต้องมี Excel หรือ staging) | **7** |

ชุดทดสอบที่รันจริงบน `53a8f0e`: `pricing-engine` + `storage-pricing` **10/10 ผ่าน**, `pricing-accounting` **21/21 ผ่าน**, `service-workflow` / `quotation-workflow` / `quotation-validation` **ผ่านทั้งหมด** (ไม่แก้ test และไม่แก้โค้ดแอปแม้แต่บรรทัดเดียว)

### 8. รายการที่ต้องแก้ไขก่อนเข้าสู่ Phase ถัดไป

เรียงตามลำดับความสำคัญ (รายละเอียดใน `CLAUDE_FIX_RECOMMENDATIONS.md`):

1. **นำไฟล์ Excel v3.7 เข้า repo** แล้วตรวจข้อ 1–3 ให้จบ — ทุกอย่างค้างอยู่ที่ขั้นนี้
2. **แก้ tier 48–50 ฟุต** — v3.7 บอก Tier 3 แต่โค้ดจัดเป็น SB4 กระทบทั้งการจัดชั้น ราคา การบังคับช่อง W4/B1 และการ escalate
3. **บล็อก wet berth** — ตอนนี้เสนอราคาได้ AI ออกใบเสนอราคาได้ และออกบิล recurring ได้ ผิดกฎความปลอดภัยที่ตั้งไว้
4. **รวมหลักการคิดรอบบิลให้เหลือหลักเดียว** — ปัจจุบัน 3 แบบขัดกัน และตัวที่ออกบิลจริงผิดหลัก
5. **ล้าง legacy `calc_type`** — เสี่ยงเก็บเงินขาดแบบเงียบ ๆ (per-foot คิด ×1) และข้าม guard ของ manual quote
6. **บังคับใช้ `price_status`** ตอนออกใบเสนอราคา
7. **ชี้ขาดเรื่อง weekly yacht rate** (ข้อ 4) ก่อนแก้โค้ดใด ๆ
8. **รวม VAT ให้อ่านจาก config ที่เดียว** และเลิกรับ `tax_rate` จาก client

### 9. รายการที่ต้องขออนุมัติจากผู้จัดการ

ทุกข้อด้านล่างเป็นการตัดสินใจเชิงธุรกิจ/ราคา **ซึ่ง audit นี้ไม่ได้ลงมือทำ และจะไม่ทำจนได้รับอนุมัติ**

1. **ขอบเขต tier SB3/SB4** — ยืนยัน 41–50 / 51–60 ตาม v3.7 และราคาของแต่ละ tier
2. **weekly yacht/catamaran per-foot rate** — v3.7 มีหรือไม่ ถ้ามีต้องอนุมัติราคาและแก้ test ที่ล็อกไว้
3. **W4/B1 full rate ที่ยัง pending** — อนุมัติราคาเต็ม หรือยืนยันว่าใช้ soft rate ต่อ
4. **จำนวน canonical rate ที่ถูกต้อง** — 126 หรือ 132
5. **จำนวน legacy alias ที่ต้อง retire** — 16/17 หรือ 39 และรายการที่เพิ่ม
6. **นโยบายรอบบิล** — 30 วันจากเช็คอิน หรือเดือนปฏิทิน (และสัญญาแบบไหนได้ข้อยกเว้น)
7. **จำนวนวันแจ้งเตือน** — คงที่ 5 วัน หรือให้ตั้งค่าได้
8. **นโยบาย wet berth** — บล็อกจริงตามที่ระบุ หรือเปิดใช้งาน (ปัจจุบันเปิดอยู่โดยพฤตินัย)
9. **นโยบาย tide-delay** — เลื่อนลงน้ำเพราะน้ำ ต้องยกเว้นค่าจอดหรือไม่ กี่วัน ใครอนุมัติ
10. **รถพ่วงลูกค้า vs ORM** — ต้องมีราคาแยกหรือไม่
11. **จำนวนขาตั้งเรือ** — คิดราคาต่อขาหรือไม่
12. **ส่วนลดซ้อน soft rate** — อนุญาตให้ลดเพิ่มจาก soft rate 25% ได้หรือไม่ (ตอนนี้ทำได้ตาม role cap โดยไม่มีคำเตือน)

---

## 12. Compliance statement

No production price, database row, migration, workflow, quotation, invoice, historical record, discount or haul-out approval was modified. No migration was executed. Nothing was deployed. No PENDING or BLOCKED rate was enabled. No missing price was invented. No application code or test was edited.

The only writes performed were: creation of the four audit documents under `docs/pricing-v3.7/`, a detached read-only `git worktree` in the session scratchpad, and a local `npm install zod --no-save` **inside that scratch worktree only** (never the repository) to make `tests/pricing-accounting.test.js` runnable.

**This audit stops here and awaits approval before any code, Supabase or Vercel change.**
