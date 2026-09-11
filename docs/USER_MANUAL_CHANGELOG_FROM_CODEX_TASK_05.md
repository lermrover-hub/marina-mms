# User Manual Changelog — Evidence Review ("Codex Task 05")

**Purpose:** This file records the evidence search performed before writing the
latest user manual (`USER_MANUAL_LATEST_EN.md` / `USER_MANUAL_LATEST_TH.md`)
and lists what changed in the manual versus the previous manual
(`docs/03-user-manual.md`, v1.0, May 2026).

---

## 1. "Codex Task 05" / "September patch" evidence search

A full-repository search was performed for the following terms, across all
tracked files, all filenames, and the complete `git log --all` history on
both `main` and `claude/marina-mms-setup-cgg7v4`:

- `Codex Task 05`
- `Task 05` / `task_05` / `patch 05` (case-insensitive, word-boundary)
- `web app development patch September`
- `September patch`
- `web app patch`

**Result: no match found.** There is no file, commit message, branch, tag,
or documentation entry in this repository named or labeled "Codex Task 05"
or any "September patch." The repository's entire commit history runs from
its initial commits through **2026-06-17** (`9126224`) — there is no commit
dated in any September.

**Conclusion:** "Codex Task 05" is **not a locatable artifact in this
repository**. It may refer to a task tracked in an external system (a
separate Codex session log, ticketing tool, or a repository not included in
this session's scope) that was not committed here. This manual was
therefore written from the two evidence sources that *do* exist and are
verifiable in-repo:

1. **Current repository code** — actual routes, pages, API handlers, Prisma
   schema, and library functions (ground truth for "Implemented").
2. **In-repo project documentation that functions as the closest equivalent
   to a dated engineering changelog:**
   - `CLAUDE_HANDOFF.md` (root) — dated Claude ↔ Codex handoff log, entries
     from 2026-06-03 through 2026-06-17.
   - `DEV_SCRIPTS.md` (root) — dated development/QA/test log, 1167 lines,
     entries from 2026-06-07 through 2026-06-17.
   - `ai-agents/PRICING_RULES.md` — canonical pricing/business-rule
     reference (last updated 2026-06-11).
   - `ai-agents/TIDE_RULES.md` — canonical tide-safety rule reference (last
     updated 2026-06-11).
   - `docs/work-progress-2026-05-24.md`, `docs/handoff/handoff-2026-06-08.md`
     — earlier dated progress logs.

No file named `CLAUDE.md` exists in this repository (searched root and all
subdirectories, excluding `node_modules` and `.git`). The `CLAUDE_HANDOFF.md`
file above is the closest match and was read in full as part of this
evidence review.

---

## 2. What changed vs. the previous manual (`docs/03-user-manual.md`, v1.0, May 2026)

The previous manual predates all of the following, which are now
documented (with Implemented/Partial/Planned/Unknown status) in the new
manuals:

| Area | Previous manual (May 2026) | New manual status |
|---|---|---|
| AI Agent Control Center (`/ai-agents`) | Not documented | Documented — Implemented (preview-only; production writes gated behind env flags) |
| Digital signature upload & auto-stamp | Not documented | Documented — Implemented |
| Receipt generation, gated by payment status | Not documented | Documented — Implemented |
| Contractors / Suppliers / Purchase Orders / Purchase Requests / Stock Movements / Timesheets / Audit Log | Not documented | Documented — Implemented |
| Work Order labor tab | Not documented | Documented — Implemented |
| Recurring billing UI | Not documented | Documented — Implemented (UI + API present; recurring execution scope not independently verified — marked Partial) |
| Quotation → Order/Work Order conversion | Not documented | Documented — Implemented |
| Inventory usage reports | Not documented | Documented — Implemented |
| Tide safety calculation fix (`requiredTideHeight` unification, `-1.00 m` fallback) | Not documented | Documented — Implemented, with the mandatory manual-confirmation warning preserved |
| Speedboat LOA-based classification rule | Not documented in manual (existed in `ai-agents/lib`) | Documented — Implemented, LOA-priority rule explained |
| Outsourced pricing escalation (engine/mechanic, paint) | Not documented | Documented — Implemented |
| Pilot rate (`pilotRateThb`) and structured `gl_code` field described in `PRICING_RULES.md` | Not documented | Documented — **Partial/Unknown**: the current `PricingMaster` Prisma model (`prisma/schema.prisma`) has **no `pilotRateThb` field and no structured `gl_code` column** — only `code`, `serviceNameEn/Th`, `category`, `unit`, `rateThb`, `description`, `notes`, `isActive`. GL codes exist only as free text inside imported `description`/`notes` strings (e.g. `scripts/import-rate-card.sql`), not as a queryable schema field. This is called out explicitly as a documentation-vs-schema gap. |

---

## 3. Business-rule confirmation status (explicit instruction from task)

| Rule (as stated in the task) | Confirmed by current code/docs? | Evidence |
|---|---|---|
| "Speedboat haul-out is flat-rate" | **Not confirmed.** No occurrence of "flat rate" / "flat-rate" anywhere in the repository (code, docs, or seed data). Haul-out pricing in `scripts/import-rate-card.sql` / `import-rate-card.json` is itemized per service (per trip, per day, per event, per stand/day), not a single flat fee. | Repo-wide search for "flat.rate" returned zero matches. |
| "Haul-out is round trip" | **Confirmed**, via the general truck/crane rule, not a haul-out-specific rule. | `ai-agents/PRICING_RULES.md` §4 "Truck / Transport Round-Trip Rule": *"Truck and crane services for boat transportation are priced as a round trip unless the booking is explicitly one-way... One-way pricing requires manager approval with a written note."* |
| "Truck cost is 2 trips" | **Confirmed as round-trip (there + back = 2 legs)**, matching the same rule above. The rate card itemizes truck cost per single `trip` (`TRUCK_MINI_DAY`, `TRUCK_BIG_DAY`, etc.); the round-trip rule requires two such trip charges (or an equivalent round-trip line) unless one-way is manager-approved in writing. | `ai-agents/PRICING_RULES.md` §4; `scripts/import-rate-card.sql` lines 22–27 (`Towing Truck Cost` category, unit `trip`). |
| "Hydraulic lift must map to GL 4140" | **Confirmed in imported rate-card data**, but **not enforced by the database schema**. `LIFT_HYD_12T` ("Hydraulic lift ≤12T") and related lift/crane/yard rows in `scripts/import-rate-card.sql` and `scripts/import-rate-card.json` all carry `GL: 4140` inside their text `description`/`notes` field. The `PricingMaster` Prisma model has no dedicated `gl_code` column, so this mapping is documentation/data convention only, not a validated or queryable database constraint. | `scripts/import-rate-card.sql:28` (`LIFT_HYD_12T`); `prisma/schema.prisma` `model PricingMaster` (no `gl_code` field). |
| "Tide window is only a planning aid and must be confirmed manually" | **Confirmed**, explicitly and strongly, in both the rule doc and the app's own output. | `ai-agents/TIDE_RULES.md` §4 "Dockmaster Final Approval Rule": *"The system's SAFE classification is advisory only... The dockmaster or operations supervisor must give final physical confirmation on the day of every launch and retrieval operation... No AI agent may issue a 'vessel cleared for launch' confirmation."* The tide agent's JSON response also carries a mandatory `warning` field ("Tide prediction may differ from actual sea level... Final confirmation required on the day.") that "must never be suppressed." |
| "Do not claim wet berth expansion is complete" | **No claim made.** No mention of any "wet berth expansion" project exists anywhere in the repository. Wet berth functionality documented is limited to what the code shows: berth records, assignments, and the berth calendar/map, all under the existing (not expanded) berth inventory. | Repo-wide search for "wet berth expansion" / "berth expansion" returned zero matches. |
| "Do not claim a backend/database feature is complete unless current code verifies it" | Applied throughout. Every "Implemented" claim in the new manuals is backed by a specific file/route/model cited in this changelog or directly observable in the manual's own text. | See manual body. |

---

## 4. Uncertainty / gaps not resolved by this review

- No "Codex Task 05" artifact exists in this repository to compare against — see §1.
- `PRICING_RULES.md` describes a `pilotRateThb` override field and a structured `gl_code` field on `mms_pricing_master` that **do not exist** in the current Prisma schema (`PricingMaster` model). This may mean (a) the rule doc is aspirational/ahead of the schema, (b) these fields exist only in the live Supabase database and were added outside Prisma migrations, or (c) the doc is stale. This could not be resolved from static code alone — flagged as **Unknown** in the manuals.
- Recurring billing (`billing/recurring`) has a UI page and an API route (`app/api/billing/recurring`), but the actual recurring-execution/scheduling mechanism (cron, webhook, or manual trigger) was not independently traced end-to-end — flagged as **Partial** in the manuals.
- AI Agent Control Center: code confirms preview/dry-run behavior and explicit write-blocking (`writes_performed=false`, `ENABLE_AI_AGENT_WRITES`/`ENABLE_AUTOMATION_WRITES` gates), but live/production message-sending (LINE, WhatsApp, email) integration status beyond webhook handlers was not fully load-tested in this review — flagged as **Partial**.
