% ORM Marina MMS — Pricing v3.7 Audit: Summary & Fix Handoff to Codex
% Prepared by Claude Code (read-only audit)
% 2 November 2026

---

## Handoff metadata

| Field | Value |
|---|---|
| Prepared for | **Codex** (implementation agent) |
| Prepared by | Claude Code — read-only audit, no code changed |
| Audit date | 2026-11-02 |
| Code audited | `origin/codex/v37-catalog-admin` @ `53a8f0e` |
| Canonical rate data | `scripts/pricing-v3.6-final-merged.json` (v3.6) |
| Full audit documents | `docs/pricing-v3.7/CLAUDE_AUDIT_REPORT.md`, `CLAUDE_TEST_MATRIX.md`, `CLAUDE_PRICE_RECONCILIATION.md`, `CLAUDE_FIX_RECOMMENDATIONS.md` |
| Workflow | Per repo convention (`CLAUDE_HANDOFF.md`, `DEV_SCRIPTS.md`): Claude audits/implements, Codex reviews/debugs/tests |

---

## 1. Read this first — status in one paragraph

An audit of Pricing Master, pricing logic and Service Request was requested against the approved **v3.7** workbook. **The repository contains no v3.7 catalog, data or logic at all.** The branch named `codex/v37-catalog-admin` adds only workflow/staging fixes; a search for `v3.7`/`v37` across every code, data and doc file on that branch returns one handoff document and one unrelated lockfile string. The implementation is **v3.6 with v3.5 residue**, which the branch's own handoff note already states. Separately, both v3.7 `.xlsx` workbooks are local-only files on a Windows machine and were unreachable from the audit environment, so all Excel-dependent checks are **BLOCKED**, not failed. Within those limits the code audit was completed in full and produced **19 issues**, of which **5 are high severity** and **2 are actively losing money or creating liability right now**.

**Nothing has been fixed. No code, data, migration, workflow or deployment was changed.** This document is the fix list.

---

## 2. Do not start here — two hard gates

Codex should **not** begin implementation until these clear. Starting earlier will produce confidently wrong prices.

### Gate A — the workbooks must be reachable

| File | State |
|---|---|
| `1-ORM_Quote_Tidal_v3_7_Tier3_41_50_Tier4_51_60_APPROVED.xlsx` | Unreachable (local-only, `.codex-remote-attachments`) |
| `ORM_Rate_Summary_v3_7_Latest_2026-11-03.xlsx` | Unreachable (local-only, `artifacts/`) |

A repo-wide search found **exactly one** spreadsheet-class file on the branch: `docs/pricing-v3.6/RATE_RECONCILIATION.csv`. No `.xlsx` exists anywhere.

**Action:** commit both workbooks (or a CSV extract) under `docs/pricing-v3.7/source/`, recording filename **and SHA-256** — exactly as `scripts/pricing-v3.6-final-merged.json` already does for v3.6. That precedent is the only reason this audit was possible at all.

### Gate B — three business answers must be written down

| # | Question | Blocks |
|---|---|---|
| 1 | Tier 3 / Tier 4 LOA bands and the rate for each | ISSUE-01 |
| 2 | Does v3.7 introduce a **weekly** per-foot yacht/catamaran storage rate? | ISSUE-03 |
| 3 | Correct canonical count (126 or 132) and retired-alias count (17 or 39) | ISSUE-16, ISSUE-17 |

---

## 3. Issue register

Severity: **H** high · **M** medium · **L** low. Gate: what must clear first.

### 3.1 High severity

#### ISSUE-01 · H · Tier boundary wrong for the 48–50 ft band

| | |
|---|---|
| **Files** | `lib/storage-pricing.ts` (`speedboatStorageClass`), `lib/speedboat-classification.ts` (`loaToEngineGroup`), `scripts/pricing-v3.6-final-merged.json` |
| **Now** | SB3 ≤ 47 ft; SB4 = 48–60 ft. Canonical data: `SB3_HAUL_LAUNCH` `"loa": "41-47 ft"`, `SB4_HAUL_LAUNCH` `"loa": "48-60 ft"` |
| **Required (v3.7)** | Tier 3 = 41–50 ft; Tier 4 = 51–60 ft — encoded in the approved workbook filename itself |
| **Impact** | A 49 ft vessel is classified SB4: forced into slot W4 or B1 (`validateSb4Storage` throws without one), storage priced from `SB4_W4_*`/`SB4_B1_*`, haul-out referenced at **13,500** soft instead of **9,375** — a **4,125 THB** per-round-trip error |
| **Fix** | Change `loaFt <= 47` → `loaFt <= 50` in **both** classifiers in one commit. Update the `"loa"` labels. Add boundary tests at exactly **47, 48, 50, 51** ft. |
| **Warning** | Do **not** change one classifier only. `speedboatStorageClass` drives storage + slot gating; `loaToEngineGroup` drives the engine-group warning and ramp code. Divergence yields a vessel that is Tier 3 for price and Tier 4 for operational review. |
| **Gate** | B-1 (bands **and** rates) |

#### ISSUE-02 · H · Legacy `calc_type` silently under-bills

| | |
|---|---|
| **Files** | `app/api/db/service-requests/route.ts:148-159`; `app/(dashboard)/service-requests/new/page.tsx:163-166`; `lib/pricing-master.ts:136,203`; `lib/pricing-validation.ts` |
| **Now** | `PRICING_CALC_TYPES` accepts legacy (`FLAT_QTY`, `FLAT_DAYS`, `LOA_RATE_QTY`, `LOA_RATE_DAYS`, `MANUAL`) **and** current (`FLAT_RATE`, `PER_FOOT`, …). Only the current set is interpreted. A legacy value matches no branch, so `qty` stays at the **client-supplied** `item.qty ?? 1`. Client-side ends `: method === "FLAT_RATE" ? 1 : 1`. |
| **Impact** | (a) **Silent under-billing** — a legacy per-foot rate bills **×1 instead of ×LOA**; a 40 ft vessel is charged 1/40th of the intended fee, with no error. (b) **Safety bypass** — the manual-quote guard tests `method === "MANUAL_QUOTE"` only, so legacy `MANUAL` is auto-priced instead of escalated. |
| **Amplifier** | `calc_type` **defaults to legacy `"FLAT_QTY"`** at `lib/pricing-master.ts:136` (read-map) and `:203` (insert). The branch handoff note confirms the live master holds mixed v3.5/v3.6 data, so legacy values are very likely in production now. |
| **Fix order** | 1. **Measure first, read-only:** `select calc_type, count(*) from pricing_master group by calc_type`. 2. Add an explicit `default:` branch that **throws** — a hard error on an un-priceable rate beats a silently wrong price. 3. Migrate data with an approved mapping. 4. Change the default to `FLAT_RATE` only after migration. 5. Narrow the enum. 6. Audit existing quotations for under-billing and escalate to Finance — **do not** retro-adjust issued documents. |
| **Mapping needs sign-off** | `FLAT_QTY`→`PER_UNIT` or `FLAT_RATE` (ambiguous), `FLAT_DAYS`→`PER_DAY`, `LOA_RATE_QTY`→`PER_FOOT`, `LOA_RATE_DAYS`→`PER_FOOT` + duration multiplier, `MANUAL`→`MANUAL_QUOTE` |
| **Gate** | Staging read for step 1; Finance sign-off for step 3 |

#### ISSUE-03 · H · Weekly per-foot storage is refused — by design

| | |
|---|---|
| **Files** | `lib/pricing-engine.ts:122-130` (`storageDurationMultiplier`); `tests/pricing-engine.test.js:9` |
| **Now** | Only day and month are supported. `/month/i` → `days/30` and throws unless `days` is an exact multiple of 30; `/day/i` → `days`; **anything else throws** `"An approved storage billing period is required."` |
| **Verified by execution** | Yacht 40 ft × 10 d @ 30 = **12,000** ✓ · 40 ft × 60 d @ 525 = **42,000** ✓ · weekly (`ft/week`) → **THROWS** · 31 days monthly → **THROWS** |
| **Critical context** | This is **not a bug.** It is locked by a passing test, and the canonical data agrees: there is **no** `*_STORAGE_W` row for MOTOR_YACHT, POWER_CATAMARAN or SAILING_CATAMARAN, and `YACHT_STORAGE_M` reads *"Thirty-day package; no unapproved weekly rate."* |
| **Note** | Weekly pricing is **not** absent as a concept — SB1, SB2 and SB4 all have weekly storage rates. It is absent only from **per-foot** categories. |
| **Fix** | **Conditional.** If v3.7 adds a weekly per-foot rate: extend `storageDurationMultiplier` with a `/week/i` branch, change the blocking test, and add the new rate rows. If v3.7 does not: **change nothing.** |
| **Gate** | B-2. Do not touch this without the workbook — altering it otherwise means inventing a price. |

#### ISSUE-04 · H · Three conflicting recurring-billing bases

| | |
|---|---|
| **Files** | `lib/service-workflow.ts:104`; `lib/ramp-booking-service.ts:67`; `app/api/billing/recurring/route.ts:63-101` |
| **Now** | Three bases coexist: **(1)** `firstCycleDueDate = addUtcDays(yardStartDate, 30)` — 30 days. **(2)** `next_billing_date: addOneCalendarMonth(requestedDate)` — calendar month from check-in. **(3)** `billingPeriodKey()` → `YYYY-MM`, `periodStart = new Date(year, month-1, 1)` — **calendar month anchored to the 1st**. Basis 3 is the engine that **actually issues invoices**. |
| **Required** | *"Monthly storage starting from the actual check-in date; 30-day billing period unless an approved calendar-month contract exists."* Basis 3 ignores the check-in date entirely and offers no 30-day mode. |
| **Worse** | `storageDurationMultiplier` enforces **exact 30-day** periods when quoting. So a customer is **quoted on 30-day periods and invoiced on calendar months.** |
| **Fix** | 1. Add an approved `billing_basis` field on the contract: `THIRTY_DAY` (default) / `CALENDAR_MONTH` (requires approval). 2. Rework `isDueThisPeriod` and `billingPeriodKey` to honour it — for `THIRTY_DAY`, derive the period from `start_date + 30n`; the current `YYYY-MM` key **cannot express a 30-day cycle at all**. 3. Retire basis 2 or align it. 4. Add a test asserting quoted period == invoiced period for the same vessel and dates — the missing test that allowed this drift. 5. Default **existing** rows to `CALENDAR_MONTH` to preserve current behaviour; let Finance opt contracts into `THIRTY_DAY`. |
| **Risk** | **Highest-risk change in this document — it touches live invoice generation.** Stage and reconcile against a known billing period before enabling anywhere real. |
| **Gate** | Approval on default basis and which existing contracts change |

#### ISSUE-05 · H · Wet berth is not blocked

| | |
|---|---|
| **Files** | `app/(dashboard)/quotations/new/page.tsx:49`; `app/api/billing/recurring/route.ts:229`; `app/api/quotations/ai-generate/route.ts:83`; `components/quotations/LineItemRow.tsx:50`; `app/inquiry/page.tsx` |
| **Now** | The stated rule is *"wet berth services remain blocked/unavailable."* Nothing blocks it. Wet berth is a selectable quotation category, is mapped for recurring invoicing (`WET_BERTH: "Wet Berth Fee"`), is in the **AI quotation generator's permitted category list**, is aliased in the line-item component, and is offered on the public inquiry form. |
| **Why it is the top safety issue** | The AI generator can produce a wet-berth quotation with **no human in the loop**, for a service the business considers unavailable. |
| **Fix** | Business decision first. If genuinely unavailable: add a `WET_BERTH_ENABLED` flag in `lib/safe-mode.ts` following the existing **fail-closed** convention (`isProductionBookingsEnabled`, `isAgentWritesEnabled`) and enforce it at **all five** sites. Let the inquiry form still accept an enquiry but not price it. If actually available: remove the rule and add approved wet-berth rates — **none exist** in the canonical data today. |
| **Warning** | Do **not** remove the UI category while leaving the recurring-billing mapping — that invoices a service nobody can quote. |
| **Gate** | Manager decision on wet-berth availability |

### 3.2 Medium severity

| ID | Sev | Issue | File / evidence | Fix |
|---|---|---|---|---|
| ISSUE-06 | M | `price_status` never enforced at quotation time. A rate with `is_active = true` **and** `price_status` `PENDING_PAINT_TEAM` / `CONTACT_ONLY` / `MANUAL_QUOTE` is quotable; it also appears in the SR picker. This is how *"Active PENDING/BLOCKED = 0"* gets violated in practice. | `app/api/db/service-requests/route.ts:113` (selects `price_status`, never tests it), `:135` (blocks only `quote_allowed === "NO"`); `app/api/pricing-master/route.ts` (filters only `isActive`) | Define the quotable set explicitly — `price_status === "ACTIVE"` **and** `quote_allowed ∈ {YES, MANAGER_REVIEW}` — and enforce in both places. Surface `MANUAL_QUOTE`/`CONTACT_ONLY` as "request a quotation", not a priced line. |
| ISSUE-07 | M | `MANAGER_REVIEW` / `CONTACT` escalates **only** for RAMP-section rates. A STORAGE or YARD rate so marked is priced with no escalation. | `route.ts:192` computes `hasManagerReviewRampRate` from RAMP items only; `:199` folds it in | Compute across **all** normalised items; keep `GENERAL_MANAGER` routing. Add a test with a `MANAGER_REVIEW` storage rate. **Currently latent** — all existing `MANAGER_REVIEW` rates are haul-out (RAMP group) and do escalate. Bites the moment v3.7 marks a storage/yard rate. |
| ISSUE-08 | M | Two competing soft-price mechanisms; one is ignored. **In use:** soft price baked into `rate_thb`, `full_rate_thb` = standard, `source_discount_pct: 25` informational. **Not in use:** `pilot_rate_thb`/`pilot_notes`, surfaced as `effectiveRate = pilotRateThb ?? rateThb`. The quotation path never even selects `pilot_rate_thb`. | `lib/pricing-master.ts:129`; `route.ts:113,146`; `new/page.tsx:160` uses `price.rateThb` not `price.effectiveRate` | **Pick one.** Preferred: retire `pilot_rate_thb` (the in-use mechanism works and is tested). Alternative: adopt it properly — select it, price from `effectiveRate`, add `pilot_rate_snapshot_thb` to quotation items, fix the create/update schema asymmetry (`pricingCreateSchema` omits it, `pricingUpdateSchema` includes it). **If left as-is, the Pricing Master screen shows one effective rate while quotations bill another.** |
| ISSUE-09 | M | Three VAT implementations, one **client-supplied**. | `route.ts:291` hardcodes `0.07`; `app/api/db/quotations/route.ts:142` uses `Number(body.tax_rate ?? 7)`; `app/api/billing/recurring/route.ts:221` hardcodes `VAT_RATE = 0.07` | Read VAT from config (`mms_agent_config`, as `ai-agents/PRICING_RULES.md` already specifies) via one shared helper. **Stop accepting `tax_rate` from the client** — `tax_rate: 0` currently passes the 0–100 validation. Unify rounding (one rounds to whole baht, another to 2 dp). Discount→VAT ordering is already correct in all three. |
| ISSUE-10 | M | Check-out does not terminate billing. `isDueThisPeriod` honours `contract.end_date` and auto-expiry marks expired contracts, but **no code path sets `end_date` from a check-out event** (repo-wide search for `check_out`/`checkout` in `.ts`/`.tsx` found no functional hits). | `app/api/billing/recurring/route.ts:77-80,348-355` | Wire vessel departure (launch/tow-out completion, or berth release) to set `end_date`. Add a test that a departed vessel generates no invoice next period. Make it an explicit, auditable write. **Gate:** confirm which event counts as check-out. |
| ISSUE-11 | M | No tide-delay adjustment. If a launch slips because the tide window closes, extra storage days accrue with no waiver, adjustment or flag — despite tide delay being a normal, system-predicted event here. Nothing exists outside `lib/mock-data-extra.ts`. | not implemented | **Policy before code.** Define who approves a waiver, how many days are waivable, and whether it is a credit note or a storage-day exclusion. Then implement as an explicit approved audited adjustment — **never** an automatic silent discount. |
| ISSUE-12 | M | Service Request wizard shows **no VAT and no total** — only "Subtotal before VAT". Figures are correct server-side, just invisible pre-submit. | `new/page.tsx:383,390` | Show indicative VAT, total and deposit in step 3, labelled indicative with the server authoritative. **Do not** start trusting client-computed totals. |

### 3.3 Low severity / hygiene

| ID | Sev | Issue | File | Fix |
|---|---|---|---|---|
| ISSUE-13 | L | Duplicate-charge check **skips Open Rate lines** | `route.ts:119` (`items.filter(i => !i.is_open_rate)`) | Extend to Open Rate using a normalised description key. Mitigated by Admin/MD/Finance restriction + mandatory description. |
| ISSUE-14 | L | Recurring duplicate key is `(contract_id, billing_period)`, but the requirement is "no duplicate billing for the same **vessel, slot and period**". Two contracts on one vessel/slot would both invoice. | `app/api/billing/recurring/route.ts` | Add vessel+slot+period uniqueness. |
| ISSUE-15 | L | Reminder offset **hardcoded at 5 days**; requirement asks for configurable days | `lib/service-workflow.ts:109` (`addUtcDays(firstCycleDueDate, -5)`) | Move to config. Reminder mechanism itself is sound: runner at `app/api/billing/service-payment-reminders`, gated by `isAutomationWritesEnabled()` with `{dry_run:true}` when off; `next_reminder_at`/`last_reminder_at`/`reminder_count` columns + partial index exist. |
| ISSUE-16 | L | `source_version` snapshotted but **never validated**. A v3.5 row and a v3.7 row can be mixed in one quotation with no warning — exactly the condition the handoff doc flagged, and nothing detects it. | `route.ts:340` | Warn when a quotation mixes rate versions, or when a rate's version is not the current approved one. |
| ISSUE-17 | L | `"v3.6"` hardcoded in **operator-visible** strings — actively misleading after migration | `lib/storage-pricing.ts`; `route.ts:170`; `new/page.tsx:238`; stored `storageNote` | Replace with one version constant. |
| ISSUE-18 | L | Legacy-schema fallback **drops every quotation snapshot column** | `route.ts:343` | Acceptable as a staging shim; add an assertion/alert that it must never run in production, where snapshot loss is unrecoverable. |
| ISSUE-19 | L | `pricing_master` bypasses Prisma (raw Supabase) despite `prisma/migrations/20260602_add_pricing_master/` existing. Prisma-only queries/types will not see pricing data. | `lib/pricing-master.ts` | Decide Prisma-first or document the boundary. Same split already noted for ramp bookings. |

### 3.4 Not modelled — build only if v3.7 requires it

| ID | Item | Evidence | Note |
|---|---|---|---|
| ISSUE-20 | Customer-owned vs ORM-owned trailer | Only `trailerType` in `lib/mock-data.ts` (mock) and a `trailer_required` boolean on boats. `validateSb4Storage` distinguishes *method* (`TRAILER`/`BOAT_STANDS`), never *ownership*. | Add only if v3.7 defines differential rates |
| ISSUE-21 | Boat-stand **count** | `qty` for storage means **periods**, not physical stands | Add only if v3.7 prices per stand |

---

## 4. Do NOT "fix" these — they are correct

Recording these so they are not broken by well-meaning changes.

| Leave alone | Why |
|---|---|
| Weekly per-foot storage throwing | **Deliberate and test-locked** (`tests/pricing-engine.test.js:9`); matches canonical data stating *"no unapproved weekly rate."* Resolve Gate B-2 first. |
| Exact-30-day monthly rule (31 days throws) | Correct fail-closed behaviour; prevents inventing a partial-period price |
| 12-tonne haul-out gate | Working exactly as specified; verified by executed test. Returns **422 `MANUAL_HANDLING_ASSESSMENT_REQUIRED`** |
| `is_active` filtering | Correct. The gap is `price_status` (ISSUE-06), not `is_active` |
| Storage-package exact-cover optimiser | Verified correct across 7/10/14/21/30 days, both slots |
| Server replacing client STORAGE lines | Correct — prevents client-injected storage prices (`route.ts:178`) |
| Quotation snapshot columns | Correct and essential. **Never** retro-reprice historical quotations |
| Retired legacy aliases | `RETIRED_NOT_DELETED` deliberately; **four still carry live staging references** |
| Role-capped discount entry, Open Rate restriction, W4/B1 slot gating | All correct controls |

---

## 5. Verified-correct behaviour (executed, not assumed)

| Case | Result |
|---|---|
| SB1 25 ft / SB2 35 ft / SB3 45 ft / SB4 55, 56, 60 ft | Correct |
| 61 ft | Correctly refused |
| Yacht 40 ft × 10 d @ 30 /ft/day | **12,000 THB** |
| Yacht 40 ft × 60 d @ 525 /ft/month | **42,000 THB** |
| Power / sailing catamaran 40 ft × 10 d @ 45 /ft/day | **18,000 THB** |
| Boat stand B1 — 1 / 2 / 3 weeks | **5,400 / 10,800 / 16,200** (`WEEK ×1/×2/×3`) |
| 10-day package — W4 / B1 | **6,300 / 8,100** (`WEEK ×1` + `DAY ×3`) |
| 30-day package — W4 / B1 | **18,000 / 19,500** (`MONTH ×1`) |
| Vessel 12.1 t with water movement | Blocked, 422 |
| Duplicate / package-included charge codes | Rejected at 3 layers |
| Soft rate + default discount | No automatic double discount |

**Suites run on `53a8f0e`, none modified:** `pricing-engine` + `storage-pricing` **10/10**, `pricing-accounting` **21/21**, `service-workflow` / `quotation-workflow` / `quotation-validation` **all pass**. The one initial failure was `ERR_MODULE_NOT_FOUND: zod` in a bare worktree — an environment gap, not a logic defect; `zod` was installed into the scratch worktree only.

**Totals (T01–T25 band):** 14 PASS · 5 PARTIAL · 3 FAIL · 3 NOT IMPLEMENTED · 7 BLOCKED.

---

## 6. Baseline count conflicts for Finance

| Expected v3.7 | Repo-documented v3.6 | Source | Delta |
|---|---|---|---|
| Canonical **126** | 127→126, then **126→132** | `ISSUE-3-IMPLEMENTATION.md:14`; `STAGING_READINESS_2026-10-12.md:12` | **+6**; 13 haul-out/yacht/catamaran rates added after the 126 snapshot |
| Quote allowed **107** | not documented | — | BLOCKED (107+19=126, consistent with 126 but not 132) |
| Manager review **19** | not documented | — | BLOCKED |
| Active PENDING/BLOCKED **0** | *"W4 and B1 full rates remain pending"* | `STAGING_READINESS_2026-10-12.md:17` | **At risk** |
| Aliases retired **39** | **16** / 17 rows / *"seven"* | three repo sources that **disagree with each other** | **−22** |

---

## 7. Suggested sequence

```
Gate A  commit the workbooks (+ SHA-256)
Gate B  write down the three decisions
          |
          +-- ISSUE-01  tier 48-50 ft        (needs B-1)
          +-- ISSUE-05  wet berth            (needs policy)
          +-- ISSUE-02  legacy calc_type     (needs staging count + Finance mapping)
          +-- ISSUE-04  billing basis        (needs policy; LIVE BILLING - stage first)
          |
          +-- ISSUE-06 .. ISSUE-12   v3.7 release scope
                    |
                    +-- ISSUE-13 .. ISSUE-19   post-release hygiene
```

ISSUE-01/02/04/05 are mutually independent and can run in parallel once gated. **ISSUE-04 carries the most operational risk.**

---

## 8. Approvals required before implementation

| # | Decision | Owner |
|---|---|---|
| 1 | Tier 3 / Tier 4 LOA bands and per-tier rates | Manager + Finance |
| 2 | Weekly per-foot yacht/catamaran rate in v3.7? | Manager + Finance |
| 3 | W4/B1 pending `full_rate_thb`: approve or confirm soft-only | Finance |
| 4 | Canonical rate count — 126 or 132 | Finance |
| 5 | Retired-alias count — 17 or 39, plus the additional list | Finance |
| 6 | Billing basis default; which existing contracts change | Manager + Finance |
| 7 | Configurable reminder days and the default | Manager |
| 8 | Wet berth — blocked or available | Manager |
| 9 | Tide-delay waiver policy — approver, day cap, credit vs exclusion | Manager |
| 10 | Differential trailer rates (customer vs ORM) | Finance |
| 11 | Per-stand pricing for boat stands | Finance |
| 12 | May operational discount stack on an already-soft rate? | Manager |
| 13 | Legacy `calc_type` → v3.7 mapping, row by row | Finance |
| 14 | Quotable set for `price_status` / `quote_allowed` | Finance |

---

## 9. บทสรุปผู้บริหาร (ภาษาไทย)

**สถานะ:** ตรวจสอบเสร็จแล้ว **ยังไม่ได้แก้โค้ดใด ๆ** ไม่แตะ production ฐานข้อมูล migration workflow หรือ deployment

**ข้อค้นพบหลัก:** ใน repo **ไม่มี v3.7 อยู่เลย** branch ที่ชื่อ `codex/v37-catalog-admin` ไม่มี catalog v3.7 — 5 commit ที่ต่างจาก v3.6 เป็นงาน workflow/staging ทั้งหมด ค้นคำว่า v3.7/v37 ทั้ง repo เจอแค่เอกสาร handoff 1 ไฟล์ ระบบที่ใช้งานจริงยังเป็น **v3.6 ปนกับ v3.5** ซึ่งเอกสาร handoff ของ branch นั้นเขียนยอมรับไว้เองแล้ว **นี่คืองาน migrate ที่ยังไม่เริ่ม ไม่ใช่ราคาเคลื่อน**

**ติดขัด:** ไฟล์ Excel v3.7 ทั้งสองไฟล์อยู่บนเครื่อง Windows ของคุณ ไม่ได้ commit เข้า repo จึงเข้าถึงไม่ได้ การตรวจที่ต้องใช้ Excel เป็น **BLOCKED** (ไม่ใช่ "ไม่ผ่าน") — **การแนบไฟล์ 2 ไฟล์นี้คือสิ่งเดียวที่ปลดล็อกงานที่เหลือทั้งหมด**

**เรื่องที่ต้องรีบที่สุด 5 ข้อ:**

1. **ช่วง 48–50 ฟุต จัดชั้นผิด** — v3.7 บอก Tier 3 แต่โค้ดจัดเป็น SB4 เรือ 49 ฟุตถูกบังคับลงช่อง W4/B1 และอ้างราคา 13,500 แทน 9,375 (**ต่างกัน 4,125 บาทต่อเที่ยว**)
2. **`calc_type` แบบเก่าทำให้เก็บเงินขาดแบบเงียบ ๆ** — rate per-foot แบบเก่าคิด **×1 แทน ×LOA** เรือ 40 ฟุตจึงถูกเก็บเพียง 1/40 ของที่ควรเก็บ โดยไม่มี error และ `MANUAL` แบบเก่าก็ข้ามด่านตรวจ manual quote ไปเลย
3. **wet berth ไม่ได้ถูกบล็อก** — เสนอราคาได้ **AI ออกใบเสนอราคาได้เอง** และออกบิล recurring ได้ ทั้งที่กฎระบุว่าต้องปิดบริการนี้
4. **รอบบิลมี 3 มาตรฐานขัดกัน** — ตัวที่ออกใบแจ้งหนี้จริงคิดแบบเดือนปฏิทินยึดวันที่ 1 ไม่ใช่ 30 วันจากวันเช็คอิน ทำให้ **ใบเสนอราคาคิด 30 วัน แต่ใบแจ้งหนี้คิดเดือนปฏิทิน**
5. **weekly per-foot ของ yacht ถูกปฏิเสธโดยเจตนา** — ไม่ใช่บั๊ก มี test ล็อกไว้ และข้อมูลราคาเขียนกำกับว่า *"no unapproved weekly rate"* รายวัน/รายเดือนถูกต้องแล้ว (12,000 และ 42,000 บาท) **ห้ามแก้จนกว่าจะเปิด Excel ยืนยันว่า v3.7 เพิ่ม rate รายสัปดาห์จริงหรือไม่**

**ที่ถูกต้องแล้ว ห้ามแก้:** ด่าน 12 ตัน · การกันคิดเงินซ้ำ · การเลือก package ถูกสุด (Boat Stand 1/2/3 สัปดาห์ = 5,400/10,800/16,200 ถูกต้อง) · การเก็บ snapshot ราคาในใบเสนอราคาเดิม

**ผลทดสอบ:** รันจริงผ่าน 14 · ผ่านบางส่วน 5 · ไม่ผ่าน 3 · ยังไม่ได้ทำ 3 · BLOCKED 7 — ชุดทดสอบทั้งหมดบน `53a8f0e` ผ่าน และ **ไม่ได้แก้ test แม้แต่บรรทัดเดียว**

**ต้องอนุมัติก่อนลงมือ 14 เรื่อง** (ตารางข้อ 8) — เรื่องสำคัญคือ ขอบเขต tier, weekly rate, นโยบาย wet berth, นโยบายรอบบิล, และ mapping ของ `calc_type` แบบเก่า

---

## 10. Compliance statement

No production price, database row, migration, workflow, quotation, invoice, historical record, discount or haul-out approval was modified. No migration executed. Nothing deployed. No PENDING or BLOCKED rate enabled. No missing price invented. No application code or test edited.

Only writes performed: the audit documents under `docs/pricing-v3.7/`, a detached read-only `git worktree` in the session scratchpad, and `npm install zod --no-save` **inside that scratch worktree only**.

**Audit stops here. Awaiting approval before any code, Supabase or Vercel change.**
