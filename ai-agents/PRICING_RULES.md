# Pricing Rules — Ocean Rover Marina

Rules that govern how prices are calculated, classified, and applied by agents and the web app.
Do not hardcode these values. Read from `mms_agent_config` (vat_pct, deposit_pct, valid_days) and `mms_pricing_master` (rate card).

Last updated: 2026-06-11

---

## 1. Rate Card (Pricing Master)

All prices must come from `mms_pricing_master`. The quotation agent reads the active rate card via `GET /api/pricing-master?isActive=true`.

Each pricing item has:
- `code` — unique identifier (e.g. `RAMP_1OB`, `WB_MONTHLY`, `LABOR_MECH`)
- `serviceNameEn` / `serviceNameTh` — display name
- `category` — grouping (Ramp, Wet Berth, Dry Storage, Labour, Materials, Cleaning, etc.)
- `rateThb` — standard rate in Thai Baht
- `pilotRateThb` — optional override rate (used when running pilot pricing)
- `unit` — per vessel, per foot, per hour, per trip, per month, etc.
- `note` — explains any conditions, inclusions, or exclusions

**Effective rate rule**: Use `pilotRateThb` when it is set and non-null; otherwise use `rateThb`.

---

## 2. Speedboat Classification Rule

**Do NOT classify speedboats by engine count alone.**

Use LOA (ft) as the primary axis. Engine count is a confirmation signal only.

### Classification Table

| Engine Group | LOA Range | Base Risk Flag | Ramp Code |
|---|---|---|---|
| 1 Engine | ≤ 27 ft | Normal | `RAMP_1OB` |
| 2 Engines | > 27 – 40 ft | Normal / Medium | `RAMP_2OB` |
| 3 Engines | > 40 – 47 ft | Medium / High | `RAMP_3OB` |
| 4 Engines | > 47 – 55 ft | High / Special Handling | `RAMP_3OB` |

### Secondary Risk Escalation

Each of the following escalates the risk level one step (Normal → Medium → High → Special Handling):
- Beam ≥ 9 ft
- Draft ≥ 2.5 ft
- Weight ≥ 4,000 kg

### LOA / Engine Mismatch

When the declared engine count does not match the LOA-derived group, LOA takes priority.
A mismatch warning must be shown on the quotation: `"Engine count (N) does not match LOA-derived group (M). LOA (X ft) takes priority. Verify boat data before quoting."`

### Implementation

- Web app: `lib/speedboat-classification.ts`
- AI agent: `ai-agents/lib/speedboat-classification.js`

Both files must remain in sync. Any rule change must be applied to both.

---

## 3. Yacht / Large Vessel Per-Foot Rule

For wet berth, dry storage, and antifouling services, yachts and large motor vessels are priced **per foot of LOA**.

- Read the `rateThb` (or `pilotRateThb`) from the relevant pricing item in `mms_pricing_master`.
- Multiply by the boat's LOA in feet.
- If LOA is not available, use the next standard tier size up and flag the quotation for staff review.

---

## 4. Truck / Transport Round-Trip Rule

Truck and crane services for boat transportation are priced as a **round trip** unless the booking is explicitly one-way (e.g. delivery only, confirmed in writing).

- Quotation items for truck/crane services must specify "round trip" in the description.
- One-way pricing requires manager approval with a written note.

---

## 5. VAT Rule

VAT is applied to the subtotal after discount.

```
taxAmount = round(subtotal × (vat_pct / 100))
grandTotal = subtotal + taxAmount
```

Default `vat_pct` = 7 (Thai VAT).
Actual value is read from `mms_agent_config` (agent_id = "quotation", key = "vat_pct").
Never hardcode 7% in agent logic — always read from config.

---

## 6. Deposit Rule

```
depositRequired = round(grandTotal × (deposit_pct / 100))
```

Default `deposit_pct` = 50.
Actual value is read from `mms_agent_config` (agent_id = "quotation", key = "deposit_pct").
Deposit is required before work begins unless a manager override is recorded.

---

## 7. Quotation Validity Rule

```
validUntil = today + valid_days
```

Default `valid_days` = 7.
Actual value is read from `mms_agent_config` (agent_id = "quotation", key = "valid_days").
After `validUntil`, the quotation status must be set to `expired` and a new quotation issued.

---

## 8. GL Mapping Rule

Each pricing item in `mms_pricing_master` should have a `gl_code` that maps to the marina's chart of accounts.

| Category | Example GL Code |
|---|---|
| Wet Berth | 4100 |
| Dry Storage | 4110 |
| Ramp Service | 4120 |
| Labour | 4200 |
| Materials | 4210 |
| Contractor | 4220 |
| Cleaning / Detailing | 4230 |
| Fuel | 4300 |
| Electricity / Utilities | 4310 |

GL codes must not be assigned by AI agents. They are set by Finance when configuring `mms_pricing_master`.

---

## 9. Pilot Rate Note

A pilot rate (`pilotRateThb`) is an override price used for testing new pricing or applying a promotional rate for a specific period.
- Pilot rates are flagged in the rate card summary sent to Claude with the tag `[pilot]`.
- Pilot rates do not require a separate approval — they are pre-approved when entered into `mms_pricing_master`.
- When a pilot rate is active, the standard `rateThb` is ignored for quoting purposes.

---

## 10. Pricing Change Process

1. Finance or Marina Manager updates `mms_pricing_master` via the web app Pricing Master page.
2. Change takes effect immediately for new quotations.
3. In-flight quotations already sent to customers are not retroactively repriced.
4. Any change > 20% in a single item should be reviewed by the Managing Director before publish.
