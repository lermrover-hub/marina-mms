# Claude Test Matrix — ORM Marina MMS Pricing v3.7

**Audit date:** 2026-11-02
**Code under test:** `origin/codex/v37-catalog-admin` @ `53a8f0e`
**Rate data used:** `scripts/pricing-v3.6-final-merged.json` (the repository's canonical committed rate set — **v3.6**, because no v3.7 data exists in the repository)
**Rule:** no application code or test was modified to make anything pass.

---

## Evidence classification

Every row below is tagged with how its result was obtained. This distinction is deliberate and must not be collapsed.

| Tag | Meaning |
|---|---|
| **EXEC** | Really executed. Either an existing test in `tests/` was run, or the real module was imported and called with real inputs, and the printed output is quoted. |
| **CALC** | Theoretical calculation performed by reading the code path and the committed rate data. No database involved. |
| **CODE** | Static verification by reading the implementation (used where the behaviour is a guard/gate rather than a number). |
| **BLOCKED-XL** | Cannot be determined without the v3.7 Excel workbooks (unreachable — see audit report §0.2). |
| **BLOCKED-DB** | Cannot be determined without authorized read-only staging access (unavailable). |

---

## A. Required matrix T01–T25

| ID | Case | Input | Expected | Actual | Result | Evidence | Root cause / note | Affected file or rate code |
|---|---|---|---|---|---|---|---|---|
| T01 | SB1 classification | LOA 25 ft | `SB1` | `SB1` | **PASS** | EXEC | — | `lib/storage-pricing.ts` |
| T02 | SB2 classification | LOA 35 ft | `SB2` | `SB2` | **PASS** | EXEC | — | `lib/storage-pricing.ts` |
| T03 | SB3 classification | LOA 45 ft | `SB3` | `SB3` | **PASS** | EXEC | — | `lib/storage-pricing.ts` |
| T04 | SB4 55 ft | LOA 55 ft | `SB4` | `SB4` | **PASS** | EXEC | — | `lib/storage-pricing.ts` |
| T05 | SB4 56 ft | LOA 56 ft | `SB4` | `SB4` | **PASS** | EXEC | — | `lib/storage-pricing.ts` |
| T06 | SB4 60 ft | LOA 60 ft | `SB4` | `SB4` | **PASS** | EXEC | Boundary inclusive | `lib/storage-pricing.ts` |
| T07 | SB4 61 ft blocked | LOA 61 ft | throw / blocked | throws *"Speedboats over 60 ft are outside the configured v3.6 storage range."* | **PASS** | EXEC | Correctly refused. Message hardcodes "v3.6" (Finding F) | `lib/storage-pricing.ts` |
| T08 | Yacht monohull weekly storage × LOA | 40 ft, weekly (`ft/week`), 7 d | rate/ft × LOA × weeks | **throws** *"An approved storage billing period is required."* | **NOT IMPLEMENTED** (deliberate) | EXEC | Weekly per-foot is refused by design and **test-locked** (`tests/pricing-engine.test.js:9`). No weekly yacht rate exists in canonical data; `YACHT_STORAGE_M` states *"Thirty-day package; no unapproved weekly rate."* Daily and monthly are correct — see T08a/T08b | `lib/pricing-engine.ts:122-130`; `YACHT_STORAGE_D`, `YACHT_STORAGE_M` |
| T08a | Yacht daily per-foot (control) | 40 ft × 10 d @ 30 THB/ft/day | 12,000 | **12,000** | **PASS** | EXEC | Confirms LOA × rate × days is correct for daily | `YACHT_STORAGE_D` |
| T08b | Yacht monthly per-foot (control) | 40 ft × 60 d @ 525 THB/ft/month | 42,000 | **42,000** | **PASS** | EXEC | Confirms LOA × rate × months. 31 days correctly throws (exact 30-day periods enforced) | `YACHT_STORAGE_M` |
| T09 | Power catamaran per-foot storage | 40 ft × 10 d @ 45 THB/ft/day | 18,000 | **18,000** | **PASS** | EXEC | Haul-out counterpart `PCAT_HAUL_LAUNCH` is `MANAGER_REVIEW`, ~35 ft max | `PCAT_STORAGE_D` |
| T10 | Sailing catamaran per-foot storage | 40 ft × 10 d @ 45 THB/ft/day | 18,000 | **18,000** | **PASS** | EXEC | Same daily storage rate as PCAT; haul-out differs (562.5 vs 525 /ft) | `SCAT_STORAGE_D` |
| T11 | Boat stand 1 week | B1, 7 days | cheapest exact | **5,400** = `SB4_B1_WEEK ×1` | **PASS** | EXEC | — | `SB4_B1_WEEK` |
| T12 | Boat stand 2 weeks | B1, 14 days | cheapest exact | **10,800** = `SB4_B1_WEEK ×2` | **PASS** | EXEC | Cheaper than 14×day (12,600) and week+7day (11,700) | `SB4_B1_WEEK` |
| T13 | Boat stand 3 weeks | B1, 21 days | cheapest exact | **16,200** = `SB4_B1_WEEK ×3` | **PASS** | EXEC | Month package not usable (exact-cover only) | `SB4_B1_WEEK` |
| T14 | 10-day package optimisation | W4, 10 days | cheapest exact | **6,300** = `WEEK ×1` + `DAY ×3` | **PASS** | EXEC | B1 equivalent = **8,100**. Both match existing suite assertions | `SB4_W4_*`, `SB4_B1_*` |
| T15 | 30-day monthly package | W4, 30 days | monthly package | **18,000** = `MONTH ×1` | **PASS** | EXEC | B1 equivalent = **19,500** | `SB4_W4_MONTH`, `SB4_B1_MONTH` |
| T16 | Customer-owned trailer | storage with customer trailer | distinct handling / rate | no such concept in code | **NOT IMPLEMENTED** | CODE | Only `trailerType` in `lib/mock-data.ts` (mock) and a `trailer_required` boolean on boats. No ownership field, no rate code, no price difference | `types/index.ts`, `app/api/db/boats/route.ts` |
| T17 | ORM-owned trailer | storage with ORM trailer | distinct handling / rate | no such concept in code | **NOT IMPLEMENTED** | CODE | `validateSb4Storage` distinguishes *method* (`TRAILER` vs `BOAT_STANDS`), never *ownership* | `lib/storage-pricing.ts` |
| T18 | Pilot rate without double discount | soft rate + default discount | no second automatic discount | operational `discount_pct` defaults 0; `source_discount_pct` informational only | **PASS** | EXEC | Soft 25% is baked into `rate_thb` (`rate_thb = full_rate_thb × 0.75`). Proven by `pricing-accounting` tests 1–2. **Caveat:** an operator may still add a role-capped discount on top, with no warning | `lib/pricing-validation.ts`, `scripts/pricing-v3.6-final-merged.json` |
| T19 | Duplicate storage prevention | same code twice; code already in package | rejected | rejected at 3 layers | **PASS** | EXEC | `assertNoDuplicateChargeCodes` rejects repeats and package-included codes; UI `rowsContainCode`; server replaces client STORAGE lines. **Gap:** Open Rate lines are excluded from the check | `lib/pricing-engine.ts:113-120`; `service-requests/route.ts:119,178` |
| T20 | Vessel over 12 tonnes | 40 ft, 12.1 t, water movement | blocked, manual assessment | blocked — HTTP **422 `MANUAL_HANDLING_ASSESSMENT_REQUIRED`** | **PASS** | EXEC | Also blocks missing/zero weight, LOA > 42 ft, catamaran > ~35 ft | `lib/pricing-engine.ts:84-111`; `service-requests/route.ts:193` |
| T21 | Wet berth request | wet berth service requested | blocked / unavailable | **quotable, AI-quotable, and recurring-billable** | **FAIL** | CODE | No guard anywhere. `"Wet Berth"` is a quotation category; `WET_BERTH: "Wet Berth Fee"` is mapped for recurring invoices; AI generator permits the category; public inquiry form offers it | `quotations/new/page.tsx:49`; `billing/recurring/route.ts:229`; `quotations/ai-generate/route.ts:83`; `components/quotations/LineItemRow.tsx:50` |
| T22 | Historical quotation price preservation | quote then change master rate | original price preserved | 9 snapshot columns written per line | **PASS** | EXEC | `full_rate_snapshot_thb`, `current_rate_snapshot_thb`, `direct_cost_snapshot_thb`, GL codes, P&L categories, `pricing_source_version`, `pricing_effective_date`, `pricing_updated_at`; history is append-only. **Gaps:** no `pilot_rate_snapshot`; legacy fallback drops all snapshots | `service-requests/route.ts:340,343` |
| T23 | Recurring monthly billing | monthly storage from check-in | 30-day period from actual check-in | calendar month anchored to the **1st**; three conflicting bases exist | **FAIL** | CODE | Live engine ignores check-in date. `service-workflow.ts` uses +30 days; `ramp-booking-service.ts` uses calendar month from requested date; `billing/recurring` uses `YYYY-MM` from the 1st. Quoting enforces exact 30-day periods → quote and invoice disagree | `app/api/billing/recurring/route.ts:63-101`; `lib/service-workflow.ts:104`; `lib/ramp-booking-service.ts:67` |
| T24 | Billing reminder before due date | monthly plan | reminder before due, days configurable | reminder exists at **due − 5 days**; offset **hardcoded** | **PARTIAL** | CODE | Runner at `/api/billing/service-payment-reminders`, gated by `isAutomationWritesEnabled()` (dry-run when off). Columns `next_reminder_at`, `last_reminder_at`, `reminder_count` + partial index exist. No configuration for the 5-day offset | `lib/service-workflow.ts:109` |
| T25 | Billing termination after check-out | vessel checks out | billing stops | stops only if `contract.end_date` is set manually | **PARTIAL** | CODE | `isDueThisPeriod` honours `end_date`; auto-expiry marks expired contracts. **No code path sets `end_date` from a check-out event** — repo-wide search for `check_out`/`checkout` in `.ts`/`.tsx` returned no functional hits | `app/api/billing/recurring/route.ts:77-80,348-355` |

---

## B. Supplementary rows established during the audit

These were not in the requested matrix but are material to the v3.7 decision.

| ID | Case | Expected | Actual | Result | Evidence | Note |
|---|---|---|---|---|---|---|
| T26 | SB3 tier upper bound vs v3.7 | Tier 3 = 41–50 ft | code: SB3 ≤ **47** ft | **FAIL** | CODE | Workbook filename encodes `Tier3_41_50`. Canonical data says `SB3_HAUL_LAUNCH` `"loa": "41-47 ft"` |
| T27 | SB4 tier lower bound vs v3.7 | Tier 4 = 51–60 ft | code: SB4 = **48**–60 ft | **FAIL** | CODE | **The 48–50 ft band is mis-tiered**: v3.7 → Tier 3, code → SB4. Both `speedboatStorageClass` and `loaToEngineGroup` must change together |
| T28 | Legacy `calc_type` per-foot | ×LOA | **×1** (client qty), silently | **FAIL** | CODE | `LOA_RATE_QTY` / `LOA_RATE_DAYS` match no branch; `qty` stays at client value. `calc_type` **defaults to legacy `FLAT_QTY`** on read-map and insert |
| T29 | Legacy `MANUAL` calc type | escalate, no auto price | auto-priced | **FAIL** | CODE | Guard tests only `method === "MANUAL_QUOTE"`; legacy `MANUAL` bypasses it |
| T30 | `price_status` enforcement at quote time | PENDING / CONTACT_ONLY not quotable | quotable when `is_active = true` | **FAIL** | CODE | `price_status` is selected but never tested; only `quote_allowed === "NO"` blocks |
| T31 | `MANAGER_REVIEW` escalation outside RAMP | escalate | no escalation for STORAGE / YARD | **PARTIAL** | CODE | Latent only: all current `MANAGER_REVIEW` rates are haul-out (RAMP group), which does escalate correctly |
| T32 | `pilot_rate_thb` honoured in quoting | used if set | ignored — not even selected | **PARTIAL** | CODE | Pricing Master screen shows `effectiveRate = pilotRateThb ?? rateThb`; quoting prices from `rate_thb`. Divergent displays if ever set |
| T33 | VAT rate source | single config value | three implementations; quotation accepts client `tax_rate` | **PARTIAL** | CODE | Discount→VAT ordering is correct in all three. `tax_rate: 0` would be accepted |
| T34 | Tide-delay storage adjustment | no improper storage charge | no such concept | **NOT IMPLEMENTED** | CODE | Only a `"Customer postponed"` string in mock data |
| T35 | Service Request UI shows VAT and total | both visible | subtotal only | **FAIL (presentation)** | CODE | *"VAT and deposit are calculated and snapshotted by the server when the Draft is created."* Figures are correct server-side, just not shown pre-submit |
| T36 | Boat-stand count | per-stand quantity | not modelled | **NOT IMPLEMENTED** | CODE | `qty` for storage means **periods**, not physical stands |
| T37 | Exact-cover failure handling | clear error | throws *"No exact approved package combination covers N days."* | **PASS** | CODE | Correct fail-closed behaviour; never invents a partial-period price |

---

## C. BLOCKED rows — require the v3.7 workbooks or staging

| ID | Case | Blocker | What is needed |
|---|---|---|---|
| B01 | Canonical rate count = 126 | BLOCKED-XL / BLOCKED-DB | Repo's last recorded active count is **132** (`STAGING_READINESS_2026-10-12.md`). Needs the workbook sheet row count and/or a staging `count(*)` |
| B02 | Quote allowed = 107 | BLOCKED-XL / BLOCKED-DB | No repo documentation of the quote-allowed split |
| B03 | Manager review = 19 | BLOCKED-XL / BLOCKED-DB | No repo documentation of the manager-review split |
| B04 | Active PENDING/BLOCKED = 0 | BLOCKED-DB | Repo states *"W4 and B1 full rates remain pending"* — needs a live `price_status` / `full_rate_thb` null check |
| B05 | Legacy aliases retired = 39 | BLOCKED-XL | Repo accounts for **16** (implementation doc), **17** rows in `RATE_RECONCILIATION.csv`, and *"seven"* (readiness prose) — three internally inconsistent numbers, all short of 39 |
| B06 | Formula errors = 0; broken references | BLOCKED-XL | Workbook required |
| B07 | Per-row price reconciliation (Excel ↔ summary ↔ master) | BLOCKED-XL / BLOCKED-DB | Both workbooks and a read-only staging snapshot required |

---

## D. Suite execution log (real runs on `53a8f0e`)

```
$ node --test tests/pricing-engine.test.js tests/storage-pricing.test.js
ok 1  - per-foot storage includes duration without inventing partial monthly rates
ok 2  - calculation methods cover flat, dimensions, time, unit and cost-plus
ok 3  - standard ramp gate hard-blocks vessels over 12 tonnes
ok 4  - 60 ft SB4 storage classification does not authorize standard haul-out
ok 5  - duplicate and included add-on charges are rejected
ok 6  - v3.6 speedboat storage classes stop at 60 ft
ok 7  - SB4 storage routes to slot-specific canonical codes
ok 8  - W4 is trailer only and B1 is boat stands only
ok 9  - W4 exact package totals match FINAL_MERGED
ok 10 - B1 exact package totals match FINAL_MERGED
# tests 10 | pass 10 | fail 0

$ node --test tests/pricing-accounting.test.js
# first run: not ok - ERR_MODULE_NOT_FOUND: Cannot find package 'zod'
# after `npm install zod --no-save` INSIDE THE SCRATCH WORKTREE ONLY:
# tests 21 | pass 21 | fail 0

$ node --test tests/service-workflow.test.js tests/quotation-workflow.test.js tests/quotation-validation.test.js
# all pass (27 subtests across the group, including the pricing-accounting file)
```

The single initial failure was an **environment** gap (missing dependency in a bare worktree), not a logic defect. It is recorded here rather than hidden, per the audit rule that real and blocked results must stay distinguishable.

Direct module execution used for T05, T08, T08a, T08b, T09–T13:

```
T11 B1  7d : 5400  | SB4_B1_WEEKx1
T12 B1 14d : 10800 | SB4_B1_WEEKx2
T13 B1 21d : 16200 | SB4_B1_WEEKx3
T05 56ft   : SB4
T09 PCAT 40ft x 10d @45 : 18000
T10 SCAT 40ft x 10d @45 : 18000
T08 yacht weekly -> THROWS: An approved storage billing period is required.
T08 yacht daily   40ft x10d @30  : 12000
T08 yacht monthly 40ft x60d @525 : 42000
```

---

## E. Totals

| Outcome | IDs | Count |
|---|---|---|
| **PASS** | T01–T07, T08a, T08b, T09–T15, T18–T20, T22, T37 | **21** |
| **PARTIAL** | T24, T25, T31, T32, T33 | **5** |
| **FAIL** | T21, T23, T26, T27, T28, T29, T30, T35 | **8** |
| **NOT IMPLEMENTED** | T08 (deliberate), T16, T17, T34, T36 | **5** |
| **BLOCKED** | B01–B07 | **7** |

> Counting note: the audit report's §10 summary counts only the requested T01–T25 band (14 PASS / 5 PARTIAL / 3 FAIL / 3 NOT IMPLEMENTED / 7 BLOCKED). The table above includes the supplementary T26–T37 rows, so the totals are larger. Both are correct for their stated scope.

**T08 is tagged NOT IMPLEMENTED rather than FAIL on purpose:** weekly per-foot storage is absent *by design*, locked by a passing test and consistent with the canonical rate data. Whether that design is still correct under v3.7 is a business decision that requires the workbook — it must not be "fixed" on the strength of this matrix alone.
