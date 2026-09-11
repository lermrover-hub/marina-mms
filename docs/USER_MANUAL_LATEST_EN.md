# Marina MMS — User Manual (Latest)
**Ocean Rover Marina & Boat Yard Management System**
Version 2.0 | Compiled 2026-09-11, from repository state as of commit `9126224` (2026-06-17)

> **Evidence note:** No "Codex Task 05" or "September patch" artifact could
> be located in this repository (see
> `docs/USER_MANUAL_CHANGELOG_FROM_CODEX_TASK_05.md` for the full search
> record). This manual is built directly from the current application code,
> the Prisma database schema, and the project's own dated engineering
> documentation (`CLAUDE_HANDOFF.md`, `DEV_SCRIPTS.md`,
> `ai-agents/PRICING_RULES.md`, `ai-agents/TIDE_RULES.md`).

**Status legend used throughout this manual:**
- ✅ **Implemented** — a route, page, component, API handler, or data model exists and performs the described function.
- 🟡 **Partial** — some part of the feature exists in code but is incomplete, gated, or not fully verifiable end-to-end.
- 🔵 **Planned** — referenced in project documentation but no working code found.
- ⚪ **Unknown** — cannot be confirmed or denied from the current repository (e.g. depends on live database state, external service, or a doc that contradicts the schema).

---

## 1. Getting Started

### 1.1 Accessing the System ✅ Implemented
- Production URL: `https://marina-mms.vercel.app`
- Built with Next.js 15 (App Router), responsive layout — works on desktop, tablet, and phone browsers.
- Login route: `app/(auth)/login/page.tsx`. Authentication is handled via NextAuth (`auth.ts`, `app/api/auth/[...nextauth]`) backed by Supabase.

### 1.2 User Roles ✅ Implemented
Defined in `types/index.ts` (`UserRole`):
`SUPER_ADMIN`, `MANAGING_DIRECTOR`, `MARINA_MANAGER`, `BOAT_YARD_MANAGER`, `FINANCE`, `SALES`, `OPERATION_SUPERVISOR`, `TECHNICIAN`, `SECURITY`, `CONTRACTOR`, `CUSTOMER`, `STAFF`.

Route access is enforced in `middleware.ts` and per-page/API checks. The customer-facing side runs under a separate portal route group.

### 1.3 Language ⚪ Unknown
The prior manual (v1.0) claimed a full English/Thai UI toggle. Thai labels exist in data (e.g. `serviceNameTh` on pricing items, Thai text in printed forms), but a systemic UI language-switch mechanism was not located in the current dashboard shell code during this review. Treat any in-app language toggle as unverified until confirmed against the live app.

---

## 2. Booking Calendar

**Status: ✅ Implemented**
- Route: `app/(dashboard)/berths/calendar/page.tsx`
- Month-grid calendar showing berth/hardstand assignments by zone (`C` Hardstand/Cradle, `W` Workshop Bays, `B` Beach Storage, `WB` Wet Berths).
- Reads live assignment data (boat name, customer name, start/end date, status: `ACTIVE`, `RESERVED`, `COMPLETED`, `CANCELLED`).
- Month navigation (previous/next), zone color coding, per-day cell rendering.
- This is a **visual occupancy calendar**, not a drag-and-drop scheduling tool — no evidence of drag/drop rebooking in this page.

## 3. Floor Plan / Slot Plan

**Status: ✅ Implemented**
- Route: `app/(dashboard)/berths/page.tsx` — contains a `BerthMap` component that renders an absolutely-positioned visual map of berth/hardstand/workshop/speedboat/wet-berth slots ("Phase 2 hardstand, workshop, speedboat, and big-yacht berth layout" per the page's own description text).
- Each mapped slot is clickable and links to `app/(dashboard)/berths/[id]/page.tsx` for detail.
- A second, tabular/editable view exists at `app/(dashboard)/berths/management/page.tsx`, with an assignment edit modal (change dates, status, target berth, notes; delete assignment).
- Slots are color-coded by fill/status; the page footer states it is reading live data ("Live database - N berths loaded").

## 4. Customer and Vessel Records

**Status: ✅ Implemented**
- Customers: list (`customers/page.tsx`), detail (`customers/[id]/page.tsx`), create (`customers/new/page.tsx`), edit (`customers/[id]/edit/page.tsx`), and a segmentation view (`customers/segmentation/page.tsx`).
- Customer types (`types/index.ts` `CustomerType`): `PRIVATE_OWNER`, `CHARTER_OPERATOR`, `SPEEDBOAT_OPERATOR`, plus company types (`YACHT_BROKER`, `CONTRACTOR`, `SUPPLIER`).
- Vessel (boat) records: list (`boats/page.tsx`), detail (`boats/[id]/page.tsx`), create (`boats/new/page.tsx`), edit (`boats/[id]/edit/page.tsx`).
- Vessel fields captured on the new-boat form (`boats/new/page.tsx`): boat type, LOA (ft), beam, draft, weight, engine type, engine brand, and linkage to an owning customer. A "Boat Specs" reference lookup exists (`boat-specs/page.tsx`) that can pre-fill LOA/beam/draft/weight from a known model.
- Customer detail page shows the customer's linked boats in a tab (`Tabs defaultValue="boats"`).
- API: `app/api/db/customers`, `app/api/db/boats` (with `[id]` sub-routes) — full CRUD confirmed by route file structure.

## 5. New Booking Workflow

**Status: ✅ Implemented (two distinct booking types)**

There is no single unified "New Booking" wizard; the app has two separate, purpose-specific creation flows:

1. **Ramp booking (launch/retrieval/haul-out)** — `app/(dashboard)/ramp-bookings/new/page.tsx`
   - Operation type selector (`OPERATION_TYPES` — includes launch, retrieval, haul-out types).
   - Captures boat draft, trailer height, tide-safety inputs; enforces that draft and trailer height are provided for `LAUNCH`/`RETRIEVAL` operations before submission (`if ((opType === "LAUNCH" || opType === "RETRIEVAL") && (draft <= 0 || trailer <= 0)) ...`).
   - Runs a live tide-safety check against `/api/tide/calculate` as the user fills the form.
   - API: `app/api/db/ramp-bookings` (+ `[id]`).

2. **Quotation-based service booking** — `app/(dashboard)/quotations/new/page.tsx`
   - Free-text service description plus structured multi-line-item builder (see §6).
   - Converts to a Work Order / Contract / Invoice downstream (see §9, §12).

## 6. Multi-Service Selection

**Status: ✅ Implemented**
- On the quotation builder (`quotations/new/page.tsx`), users add multiple line items (`addItem()` appends a new row), each with its own **category** (from a fixed list including `Ramp Access`, `Haul-out`, `Towing Truck Cost`, `Yard Services`, `Storage - Speedboat`, `Storage - Small Craft`, `Repair Yard`, `Wash & Cleaning`, `Utilities`, `Wet Berth`, `OT / After-Hours Labor`, and more), unit, quantity, and unit price.
- Items can be picked from the active rate card (Pricing Master) or entered manually.
- The AI quotation-generation endpoint (`app/api/quotations/ai-generate/route.ts`) also produces multi-category line items (3–10 items) from a free-text job description, constrained to the same category list.

## 7. Truck / Trailer / Lifting Services

**Status: ✅ Implemented as rate-card line items; 🟡 Partial as a dedicated booking field**
- These are **not** a separate booking sub-form; they are priced and recorded as quotation line items under the categories `Towing Truck Cost` and `Yard Services` (which includes hydraulic lift and crane items).
- Confirmed rate-card rows (`scripts/import-rate-card.sql`): `TRUCK_MINI_DAY`, `TRUCK_MINI_NIGHT`, `TRUCK_MINI_LATE`, `TRUCK_BIG_DAY`, `TRUCK_BIG_BEFORE_MID`, `TRUCK_BIG_AFTER_MID` (all unit `trip`); `LIFT_HYD_12T` (hydraulic lift ≤12T), `LIFT_CRANE_12_18`, `LIFT_CRANE_OVER18`, `TRAILER_GENERAL`, `TRAILER_REPAIR`, `STAND_DAY/WEEK/MONTH`, `YARD_MOVE`, `YARD_BIG_TRUCK`, `YARD_EMERGENCY`.
- Trailer **height** (not trailer rental) is also captured directly on the ramp-booking form as a tide-safety input (see §5, §8) — this is a separate use of "trailer" from the trailer-rental rate-card item.
- **Business rule — Truck round-trip (confirmed):** Truck and crane services are priced as a **round trip** by default. One-way pricing requires written manager approval. Source: `ai-agents/PRICING_RULES.md` §4. In practice this means a truck job normally carries two trip-equivalent charges (out + back) unless a manager has approved and documented a one-way exception.
- **Business rule — Hydraulic lift GL mapping (confirmed in data, not schema-enforced):** The `LIFT_HYD_12T` and related yard/lift/truck rate-card rows are tagged `GL: 4140` inside their imported description text (`scripts/import-rate-card.sql`). There is **no dedicated `gl_code` column** in the live `PricingMaster` Prisma model — the mapping exists as a data/documentation convention, not as an enforced database field. Do not present GL coding as a queryable or validated system feature.

## 8. Tide Window Calculator

**Status: ✅ Implemented**
- Standalone calculator page: `app/(dashboard)/ramp-bookings/tide-calculator/page.tsx`.
- Also embedded live inside the ramp-booking creation form (`ramp-bookings/new/page.tsx`).
- API: `app/api/tide/calculate/route.ts` (marked `force-dynamic` as of commit `9126224` to prevent stale cached results).
- **Formula (confirmed, `ai-agents/TIDE_RULES.md`):**
  ```
  minimum_required_actual_depth_m = boat_draft_m + trailer_height_m + safety_clearance_m
  minimum_required_tide_table_height_m = minimum_required_actual_depth_m − ramp_offset_m
  SAFE when predicted_tide_height_m ≥ minimum_required_tide_table_height_m
  ```
- **Approved default values:** `trailer_height_m = 0.70`, `safety_clearance_m = 0.10`, `ramp_offset_m = −1.00`. Stored in `mms_agent_config` (agent_id `"tide"`) and mirrored as fallback defaults in `ai-agents/lib/agent-config.js`. Changeable only via **Settings → AI Agent Rules → Tide Agent** in the web app — not hardcoded.
- The calculator returns hourly slots for the day, a safe/unsafe flag per slot, the earliest safe hour, and safe windows.
- **Business rule — planning aid only (confirmed, strongly worded in source):** `ai-agents/TIDE_RULES.md` §4, "Dockmaster Final Approval Rule": *"The system's SAFE classification is advisory only... The dockmaster or operations supervisor must give final physical confirmation on the day of every launch and retrieval operation... No AI agent may issue a 'vessel cleared for launch' confirmation."* The API/agent output always includes a `warning` field stating tide predictions may differ from actual sea level and that final confirmation is required on the day — this field "must never be suppressed."
- If tide data is unavailable for a requested date, the system must return a `no_tide_data` response and the booking must not proceed without staff manually sourcing and entering tide data (§5 of `TIDE_RULES.md`).

**⚠️ Staff instruction (mandatory):** Treat every tide-calculator result as a planning aid only. A dockmaster or operations supervisor must physically confirm actual water depth on the day, every time, before any launch or retrieval.

## 9. Quotation / Pricing Behavior

**Status: ✅ Implemented**
- Quotation list/detail/create: `app/(dashboard)/quotations/*`. API: `app/api/db/quotations`, `app/api/db/quotation-items`.
- Pricing source of truth: `PricingMaster` (Prisma model `prisma/schema.prisma`), exposed via `GET /api/pricing-master?isActive=true`. Fields confirmed in schema: `code`, `serviceNameEn`, `serviceNameTh`, `category`, `unit`, `rateThb`, `description`, `notes`, `isActive`.
- **AI-assisted quotation drafting** exists (`app/api/quotations/ai-generate/route.ts`), producing category-constrained, 3–10 line-item draft quotations from a free-text job description, in THB, VAT-exclusive. This is a **draft generator**, not an auto-send system — output still requires review before becoming a customer-facing quotation.
- **VAT rule (confirmed):** `taxAmount = round(subtotal × vat_pct/100)`; `grandTotal = subtotal + taxAmount`. Default `vat_pct = 7`, read from `mms_agent_config`, never hardcoded per `ai-agents/PRICING_RULES.md` §6.
- **Deposit rule (confirmed):** `depositRequired = round(grandTotal × deposit_pct/100)`. Default `deposit_pct = 50`.
- **Validity rule (confirmed):** `validUntil = today + valid_days` (default 7 days); quotation should move to `expired` status after that date.
- **Speedboat classification rule (confirmed, implemented in both web and agent code — `lib/speedboat-classification.ts` and `ai-agents/lib/speedboat-classification.js`):** Classification is **LOA-based, not engine-count-based**. Engine count is a confirmation signal only; when engine count and LOA-derived group disagree, LOA takes priority and a mismatch warning must be shown.
  - 1 engine ≤27 ft → Normal, `RAMP_1OB`
  - 2 engines 27–40 ft → Normal/Medium, `RAMP_2OB`
  - 3 engines 40–47 ft → Medium/High, `RAMP_3OB`
  - 4 engines 47–55 ft → High/Special Handling, `RAMP_3OB`
  - Secondary escalation (+1 risk level each): beam ≥9 ft, draft ≥2.5 ft, weight ≥4,000 kg.
- **Speedboat haul-out flat-rate claim: ⚪ Unknown / not confirmed.** No occurrence of "flat rate" or "flat-rate" exists anywhere in this repository. Rate-card haul-out-related items are itemized per trip/day/event/stand-day, not billed as a single flat fee. **Do not describe speedboat haul-out as flat-rate in customer-facing material** unless this is confirmed against the live, current rate card by Finance.
- **Outsourced pricing rule (confirmed, `PRICING_RULES.md` §5):** Engine/mechanic and paint/polishing/antifouling/gelcoat work must **not** be auto-priced by the AI agent. These are escalated to a manager for manual pricing and direct customer contact — the AI agent must not contact the customer or generate a customer-facing quotation for these categories.
- **Pilot rate override (`pilotRateThb`): ⚪ Unknown.** `PRICING_RULES.md` describes this field, but it does **not exist** in the current `PricingMaster` Prisma schema. Treat "pilot rate" as an aspirational/undocumented-in-schema feature until verified against the live database.
- **GL code field: ⚪ Unknown / not schema-enforced.** See §7 — GL codes are present in imported text notes only, not as a structured database column.

## 10. Invoice / Payment Behavior

**Status: ✅ Implemented**
- Invoices: `app/(dashboard)/invoices/*`, API `app/api/db/invoices`, `app/api/db/invoice-items`.
- Payments: `app/(dashboard)/payments/*` (list, detail, new — `payments/new/page.tsx` is a substantial 567-line form), API `app/api/db/payments`.
- Invoice statuses include `OVERDUE` (confirmed in `types/index.ts` and `components/shared/StatusBadge.tsx`); invoice detail page visibly flags overdue invoices (`isOverdue`, red styling, "This invoice is OVERDUE" banner).
- **Receipt generation** — `app/print/receipts/[id]/page.tsx` — is **gated by payment status**: receipts are only accessible/generated for `CONFIRMED` payments (confirmed by `CLAUDE_HANDOFF.md` 2026-06-12 entry: "Receipt access is now limited to CONFIRMED payments in both UI and API," after a prior bug allowed receipts for pending/rejected/refunded payments — this was fixed).
- Print/official documents exist for invoices, quotations, contracts, work orders, ramp bookings, and receipts (`app/print/*`).
- **Digital signature auto-stamp** — `app/api/settings/signature`, uploadable in Settings — is used to auto-stamp official/printed documents (confirmed by commit `228f622`, "digital signature upload & auto-stamp on official documents").
- **Recurring billing** — `app/(dashboard)/billing/recurring/page.tsx`, `app/api/billing/recurring` — 🟡 **Partial**: the UI and API route exist, but the underlying scheduling/execution mechanism was not independently traced end-to-end in this review.

## 11. Late Payment Flag

**Status: ✅ Implemented**
- `OVERDUE` invoice status exists as a first-class status (`types/index.ts`), rendered with a red "Overdue" badge (`StatusBadge.tsx`).
- Dashboard/notification integration: `components/layout/NotificationBell.tsx` has an `OVERDUE_INVOICE` notification type; `app/api/db/notifications/route.ts` includes example overdue-invoice notification content.
- **Aging report** — `app/(dashboard)/reports/aging/page.tsx`, API `app/api/db/reports/aging/route.ts` — computes `days_overdue` per invoice and `max_days_overdue` per customer, grouping outstanding invoices by customer.
- **AI finance-agent overdue check** — `app/api/ai/control/route.ts` — computes an `overdue` invoice list, `overdue_count`, `overdue_total`, and flags `escalation_required` when the overdue total exceeds a configured threshold (`config.escalation_amount_thb`). This is a **read-only/reporting** function — no evidence it auto-sends collection messages without approval.
- Customer portal also surfaces `OVERDUE` status on the customer's own invoice list (`app/(portal)/portal/invoices/page.tsx`, `app/(portal)/portal/page.tsx`).

## 12. Admin / Settings / Rate Card

**Status: ✅ Implemented**
- Settings shell: `app/(dashboard)/settings/page.tsx`, tabbed interface including at minimum: **Pricing Rules** ("Service rates, packages, and markup rules") and **AI Agent Rules** ("Configurable rules for quotation, comms, finance, tide, and marina agents").
- **Rate Card / Pricing Master** — dedicated page `app/(dashboard)/pricing-master/page.tsx` and detail/edit `pricing-master/[id]/page.tsx`, API `app/api/pricing-master` (+ `[id]`). Settings' Pricing Rules tab also loads and displays pricing-master rows (`loadPricingRules()`).
- **AI Agent configuration** — per-agent tabs (quotation, tide, comms, finance, marina, and others per `ACTIVE_AGENT_TAB` state), editable fields including tide agent's `ramp_offset_m` and communications' signature phone field. Backed by `mms_agent_config` in the database, exposed via `app/api/db/agent-config`.
- **AI Agent Control Center** — separate dashboard page `app/(dashboard)/ai-agents/page.tsx` (readiness, safety state, config editing, validation, read-only preview runs per `CLAUDE_HANDOFF.md`). Production writes remain explicitly disabled unless `ENABLE_AI_AGENT_WRITES` / `ENABLE_AUTOMATION_WRITES` environment flags are set — per the handoff doc, these must **not** be enabled without explicit approval.
- **Digital signature upload** (Settings) — confirmed, see §10.
- Audit log: `app/(dashboard)/audit-log/page.tsx`, `app/api/db/audit-log`, `app/api/db/agent-audit-log` — records changes/actions for review.

## 13. Daily Operation Checklist for Marina Staff

The following is a practical checklist assembled from the implemented features above. It is operational guidance, not a code-verified "checklist feature" in the app (no dedicated in-app checklist widget was found for this specific list).

1. **Open the Berth Map / Floor Plan** (`/berths`) — confirm today's occupied, reserved, and free slots.
2. **Check the Booking Calendar** (`/berths/calendar`) — review upcoming arrivals/departures for the week.
3. **Review Ramp Bookings for the day** (`/ramp-bookings`) — confirm operation type (launch/retrieval/haul-out), assigned staff, and scheduled time.
4. **Run the Tide Window Calculator** for every scheduled launch/retrieval (`/ramp-bookings/tide-calculator`, or inline on the booking form) — record the predicted safe window.
5. **Physically confirm actual water depth on-site** before any launch/retrieval — the tide calculator is a planning aid only; this manual physical check is mandatory (see §8).
6. **Check Notifications** (`/notifications`) — overdue invoices, contract/insurance alerts, work-order overdue alerts.
7. **Review open Service Requests / Work Orders** (`/service-requests`, `/work-orders`) — confirm task and material status.
8. **Log incidents immediately** via `/incidents/new` if any safety or damage event occurs during the shift.
9. **Record boat movements** (`/movements/new`) for any yard/berth relocation.
10. **End of shift:** confirm all same-day quotations, invoices, and payments entered are complete and saved.

## 14. Manager Approval Checklist

Assembled from confirmed approval-gated rules found in code/docs:

1. **One-way truck/crane pricing** — requires manager approval with a written note before quoting (vs. default round-trip). Source: `PRICING_RULES.md` §4.
2. **Engine/mechanic and paint/antifouling/gelcoat pricing** — must not be auto-priced; manager must contact the customer directly and coordinate with the mechanic/specialist/subcontractor before pricing. Source: `PRICING_RULES.md` §5.
3. **Any pricing item flagged as missing, unclear, out-of-policy, "contact," or "manual-quote"** — the AI agent must create a manager escalation/audit entry rather than quote directly; manager owns final pricing and customer contact. Source: `PRICING_RULES.md` §5.
4. **Any single rate-card item change greater than 20%** — should be reviewed by the Managing Director before publishing. Source: `PRICING_RULES.md` §11.
5. **AI Order approvals** — `AiOrder` records (Prisma model) default to `approvalRequiredRole = "MANAGING_DIRECTOR"`, routed through an `ApprovalQueueItem` queue before execution. Confirmed by schema; the full approval-UI workflow should be verified against the live `/ai-agents` control center before relying on it operationally.
6. **Deposit override** — deposit is required before work begins "unless a manager override is recorded" (`PRICING_RULES.md` §7). No specific UI for recording this override was independently confirmed in this review — treat as 🟡 Partial (rule exists; UI/API enforcement not fully traced).
7. **Production AI-agent write flags** (`ENABLE_AI_AGENT_WRITES`, `ENABLE_AUTOMATION_WRITES`) — must remain disabled in production unless a manager/owner explicitly authorizes enabling them (`CLAUDE_HANDOFF.md` Safety Boundaries).

## 15. Troubleshooting

| Symptom | Likely cause / what to check | Status |
|---|---|---|
| Tide calculator shows no safe window / all unsafe | Verify boat draft and trailer height were entered; check that tide data exists for the selected date — the system should return `no_tide_data` rather than a false result if data is missing (`TIDE_RULES.md` §5). Do not schedule the operation if data is missing — source tide data manually. | ✅ Behavior confirmed in rules doc |
| Quotation total looks wrong after a rate-card change | Rate-card changes apply only to **new** quotations; in-flight quotations already sent are not retroactively repriced (`PRICING_RULES.md` §11). Check the quotation's creation date vs. the rate-card change date. | ✅ Confirmed |
| Receipt link doesn't work / "not found" for a payment | Receipts are only available for payments with status `CONFIRMED` — pending, rejected, and refunded payments will not produce a receipt by design (`CLAUDE_HANDOFF.md` 2026-06-12). | ✅ Confirmed, by design |
| A quotation line item for engine repair or antifouling wasn't auto-priced by the AI generator | This is expected — engine/mechanic and paint-related categories are intentionally excluded from AI auto-pricing and routed to manager escalation (`PRICING_RULES.md` §5). Contact the manager to price manually. | ✅ Confirmed, by design |
| AI Agent preview run shows "writes_performed: false" | Expected — preview/dry-run mode never writes to production data; this is a safety feature, not a bug. | ✅ Confirmed by design (`CLAUDE_HANDOFF.md`) |
| GL code doesn't show on a Pricing Master item / can't filter by GL code | GL codes are not a structured field in the current schema — they exist only as text inside the item's description/notes for imported rows. This is a known documentation-vs-schema gap, not a bug to "fix" in the UI without a schema migration. | 🟡 Partial / known gap — see §7, §9 |
| Login session expires unexpectedly | Sessions expire after a period of inactivity per NextAuth/Supabase Auth configuration; re-login is expected behavior, not a fault. Exact timeout value was not independently re-verified in current code during this review (carried over from prior manual — ⚪ Unknown, confirm against current `auth.ts` config before quoting an exact hour figure). | ⚪ Unknown (timeout value) |
| A page 404s or a button does nothing | Cross-check the route against the route list in this manual (§§2–12) and against `app/(dashboard)/*/page.tsx` in the repo. If the route isn't listed here, it may be a route that exists in code but wasn't independently exercised in this review — report to the development team with the exact URL and role used. | — |

---

## 16. Feature Status Summary Table

| Feature | Status |
|---|---|
| Booking Calendar | ✅ Implemented |
| Floor Plan / Slot Plan (Berth Map) | ✅ Implemented |
| Customer records | ✅ Implemented |
| Vessel (boat) records | ✅ Implemented |
| New ramp booking workflow | ✅ Implemented |
| New quotation workflow | ✅ Implemented |
| Multi-service line-item selection | ✅ Implemented |
| Truck / trailer / lift service pricing (as line items) | ✅ Implemented |
| Dedicated truck/trailer/lift booking sub-form | 🟡 Partial (handled via quotation line items, not a separate booking field) |
| Tide Window Calculator | ✅ Implemented |
| Tide result = planning aid, manual confirmation required | ✅ Implemented (enforced in rule doc + mandatory warning field) |
| Quotation pricing engine (VAT, deposit, validity) | ✅ Implemented |
| Speedboat LOA-based classification | ✅ Implemented |
| Speedboat haul-out flat-rate pricing | ⚪ Unknown / not confirmed — do not claim |
| Truck/crane round-trip default pricing | ✅ Implemented (rule + rate-card structure) |
| Hydraulic lift → GL 4140 mapping | 🟡 Partial (confirmed in imported data text; not a schema-enforced field) |
| Outsourced pricing escalation (engine/paint) | ✅ Implemented |
| Pilot rate override (`pilotRateThb`) | ⚪ Unknown (documented, not in current schema) |
| Invoicing | ✅ Implemented |
| Payments | ✅ Implemented |
| Receipt generation (payment-status gated) | ✅ Implemented |
| Recurring billing | 🟡 Partial |
| Late payment / overdue flag | ✅ Implemented |
| Aging report | ✅ Implemented |
| Digital signature upload/auto-stamp | ✅ Implemented |
| Rate Card / Pricing Master admin | ✅ Implemented |
| AI Agent Rules settings | ✅ Implemented |
| AI Agent Control Center | ✅ Implemented (preview-only; production writes gated) |
| Manager approval queue (AI orders) | ✅ Implemented (schema + queue confirmed; full UI flow not independently retraced) |
| Audit log | ✅ Implemented |
| Customer portal | ✅ Implemented |
| Wet berth "expansion" project | 🔵 Not applicable — no such project referenced anywhere in the repository; do not claim it exists or is complete |
| In-app EN/TH language toggle | ⚪ Unknown |

---

*This manual documents only what could be verified against the current repository. Where a feature's completeness could not be confirmed, it is marked Partial or Unknown rather than assumed working. See `docs/USER_MANUAL_CHANGELOG_FROM_CODEX_TASK_05.md` for the full evidence trail.*
