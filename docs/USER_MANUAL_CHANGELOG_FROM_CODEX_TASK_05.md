# Changelog / Evidence Review — "Codex Task 05" (Pilot Manual Edition)

**Purpose:** This file records the evidence search performed before writing
`docs/07-fc-chief-engineer-pilot-manual.md` (the FC / Chief Engineer pilot
manual) and reports, section by section, what could and could not be
verified against "Codex Task 05 — Web app development patch September."

**Repository state at time of writing:** branch `claude/marina-mms-setup-cgg7v4`,
based on commit `9126224` (application code) plus `455e8f9` (prior
documentation commit from this same session). Working tree clean at the
start of this task.

---

## 1. Evidence found

A full-repository search was repeated for this task (independently of the
earlier `USER_MANUAL_LATEST_*` search) across all tracked files, all
filenames, and `git log --all` on every branch, for:

- `Codex Task 05`, `Task 05`, `task_05`, `patch 05`
- `Web app development patch September`, `September patch`, `web app patch`
- `CLAUDE.md`

**Result: no match found for any of the above.**

- No file, directory, commit message, branch name, or tag contains "Codex
  Task 05" or any September-dated patch label.
- `CLAUDE.md` does not exist anywhere in the repository (root or any
  subdirectory, excluding `node_modules` and `.git`).
- The full commit history (`git log --all`) does not contain any commit
  dated in September of any year; the latest application commit is
  `9126224` (2026-06-17 era work).

**Conclusion — stated explicitly per task instructions:** *Codex Task 05
evidence not found / cannot verify.* This changelog and the pilot manual
are therefore written strictly from two verifiable sources: (1) the current
repository code, and (2) in-repo dated documentation that substitutes for a
changelog (`CLAUDE_HANDOFF.md`, `DEV_SCRIPTS.md`, `ai-agents/PRICING_RULES.md`,
`ai-agents/TIDE_RULES.md`). No claim in the pilot manual is attributed to
"Codex Task 05" — every claim cites a file path instead.

---

## 2. Files / modules affected by Codex Task 05

Not applicable — no Codex Task 05 artifact exists to diff against. There is
no "before Task 05 / after Task 05" file list that can be produced from
repository evidence. Where this changelog previously (in the
`USER_MANUAL_LATEST_*` changelog, Task A) compared the current manual to
`docs/03-user-manual.md` (v1.0, May 2026), that comparison remains a valid
proxy for "what changed" and is reused in §3 below, but it is **not** a
verified "Codex Task 05" diff.

---

## 3. User-facing changes

Compared to the previous manual baseline (`docs/03-user-manual.md`, v1.0,
May 2026), the following user-facing areas are now documented in the new
pilot manual with an explicit status (see manual §5 for the full table):

- AI Agent Control Center (`app/(dashboard)/ai-agents/page.tsx`) — Implemented, preview-only.
- Digital signature upload & auto-stamp on quotations (`app/api/settings/signature`) — Implemented.
- Receipt generation gated on `CONFIRMED` payment status (`app/print/receipts/[id]/page.tsx`) — Implemented.
- Ramp booking live tide check (`app/(dashboard)/ramp-bookings/new/page.tsx`, `app/api/tide/calculate/route.ts`) — Implemented, with mandatory manual-confirmation warning.
- Tide Window Calculator standalone tool (`app/(dashboard)/ramp-bookings/tide-calculator/page.tsx`) — Implemented.
- Aging report (`app/(dashboard)/reports/aging/page.tsx`, `app/api/db/reports/aging/route.ts`) — Implemented.
- Recurring billing UI (`app/(dashboard)/billing/recurring/page.tsx`) — Partial (execution/scheduling mechanism not independently traced).
- A single unified "one-form" booking wizard covering wet berth + ramp + service in one screen — **not found in the codebase**; the app instead exposes two separate real workflows (Ramp Booking, Quotation). Marked Unknown/Partial in the manual rather than described as existing.

---

## 4. Operational changes

- Dockmaster/manual final-approval requirement for launch/retrieval is
  enforced only as a **documented rule** (`ai-agents/TIDE_RULES.md` §4), not
  as a database-level sign-off/approval record — there is no schema field
  or workflow step that blocks an operation until a human confirms it. This
  is called out in the manual's checklists (§18/§19) as a manual, not
  system-enforced, step.
- Truck/crane round-trip pricing (`ai-agents/PRICING_RULES.md` §4) and
  outsourced-pricing escalation for engine/mechanic/paint work
  (`ai-agents/PRICING_RULES.md` §5) remain manual-judgment rules; nothing in
  the UI blocks a one-way truck charge or an auto-priced engine job — staff
  must apply the rule themselves. Documented as an operational caution in
  the manual (§21 Common Mistakes).

---

## 5. Pricing / calculation changes

- No new pricing logic was found beyond what Task A's manuals already
  documented. Confirmed again in this pass:
  - Speedboat LOA-based classification: `lib/speedboat-classification.ts`, matching `ai-agents/PRICING_RULES.md` table — Implemented.
  - "Speedboat haul-out is flat-rate": **still not confirmed** — zero occurrences of "flat rate"/"flat-rate" anywhere in the repository; haul-out pricing in `scripts/import-rate-card.sql`/`.json` is itemized, not a single flat fee. Marked Unknown/cannot verify in the manual.
  - Yacht/large-vessel per-foot rule (`ai-agents/PRICING_RULES.md` §3): explicitly scoped in the rule text to wet berth, dry storage, and antifouling only — it does **not** explicitly cover haul-out. Marked Partial in the manual (do not extend the rule to haul-out without confirmation).
  - VAT default 7%, deposit default 50%, quotation validity 7 days: `ai-agents/PRICING_RULES.md` — Implemented as configured defaults; no UI evidence they are user-editable per quotation was newly found in this pass.

---

## 6. Database / backend changes

- `prisma/schema.prisma` `model PricingMaster` re-confirmed to have **no
  `pilotRateThb` field and no structured `gl_code` column** — fields present
  are `id, code, serviceNameEn, serviceNameTh, category, unit, rateThb,
  description, notes, isActive, createdAt, updatedAt`. `PRICING_RULES.md`
  §10 references a pilot-rate override field that does not exist in the
  schema. This is a standing documentation-vs-schema mismatch, unchanged
  since Task A, and repeated here because the pilot manual's audience
  (Chief Engineer / FC) directly touches pricing.
- GL 4140 appears only as free text inside `description`/`notes` strings in
  `scripts/import-rate-card.sql` / `import-rate-card.json` (e.g.
  `LIFT_HYD_12T`), never as a queryable schema column. Confirmed unchanged.
- `AiOrder.approvalRequiredRole` defaults to `"MANAGING_DIRECTOR"` — no
  change found; cited in the manual's approval-chain section as the
  system-level default that pilot testers should expect, distinct from the
  human "dockmaster final approval" rule above.

---

## 7. UI changes

- No UI changes were made by this documentation task itself (per the task
  instruction, no application code was edited). The pilot manual documents
  the UI **as it exists today**, including that the tide check on the ramp
  booking form (`app/(dashboard)/ramp-bookings/new/page.tsx`) surfaces its
  `warning` field to the user and that the app does not suppress it — this
  matches `ai-agents/TIDE_RULES.md` §4's "must never be suppressed"
  requirement and is reproduced verbatim in the manual's Tide Window
  section.

---

## 8. Documentation impact

- New file: `docs/07-fc-chief-engineer-pilot-manual.md` (Thai, 24-section
  pilot/training manual for FC, Chief Engineer, Marina Manager, and the
  pilot testing team).
- New file: `docs/07-fc-chief-engineer-pilot-manual.docx` (Word rendering of
  the above, generated by `docs/build_manual_docx.py`).
- New file: `docs/build_manual_docx.py` (Markdown → DOCX converter,
  documentation tooling only — not part of the marina application).
- This file rewritten from a 4-section structure (Task A) to the current
  9-section structure to match the pilot-manual task's required format.
- `README.md` updated with a "## User Manuals" section linking the three
  files above, in addition to the existing "## User Manual" section from
  Task A (English/Thai full manuals). The two sections are kept separate
  because they describe two different documents with different audiences
  and scope (full reference manual vs. FC/Chief Engineer pilot-training
  manual).

---

## 9. Unverified / unclear items

- **Codex Task 05 itself** — no evidence of its existence in this
  repository (see §1). Cannot be verified, confirmed, or diffed against.
- **`pilotRateThb` / structured `gl_code`** — described in
  `ai-agents/PRICING_RULES.md` but absent from `prisma/schema.prisma`.
  Unknown whether this is an aspirational doc, a live-database-only field
  outside Prisma migrations, or a stale reference.
- **Speedboat haul-out flat-rate claim** — cannot be verified; no supporting
  evidence found anywhere in the repository.
- **Yacht per-foot rule applied to haul-out** — the rule as written does not
  cover haul-out; extending it there is unconfirmed.
- **Recurring billing execution mechanism** — UI and API route exist, but
  the actual trigger (cron/webhook/manual) was not traced end-to-end in
  this pass either.
- **Unified single-form booking wizard** — does not appear to exist in the
  codebase; the app has two separate workflows (Ramp Booking, Quotation).
  Flagged so pilot testers are not told to look for a feature that is not
  there.
