# Tide Safety Rules — Ocean Rover Marina

Approved operational values and calculation rules for ramp operations at Ko Samui.
These values were confirmed from the Ko Samui 2026 operational spreadsheet.

Last updated: 2026-06-11

---

## 1. Approved Operational Values

| Parameter | Approved Value | Source |
|---|---|---|
| `trailer_height_m` | **0.70 m** | Ko Samui 2026 operational spreadsheet |
| `safety_clearance_m` | **0.10 m** | Ko Samui 2026 operational spreadsheet |
| `ramp_offset_m` | **−1.00 m** | Ko Samui 2026 operational spreadsheet |

These values are stored in `mms_agent_config` (agent_id = "tide") and are the fallback defaults in `ai-agents/lib/agent-config.js`.

**Do not change these values in code.** To adjust, update the DB record via **Settings → AI Agent Rules → Tide Agent** in the web app.

---

## 2. Tide Safety Formula

### Step 1 — Minimum Required Actual Depth

```
minimum_required_actual_depth_m = boat_draft_m + trailer_height_m + safety_clearance_m
```

Default with approved values:
```
minimum_required_actual_depth_m = boat_draft_m + 0.70 + 0.10
                                = boat_draft_m + 0.80
```

### Step 2 — Minimum Required Tide-Table Height

```
minimum_required_tide_table_height_m = minimum_required_actual_depth_m - ramp_offset_m
```

Because `ramp_offset_m = −1.00` (negative — ramp surface is 1 m below tide datum):
```
= minimum_required_actual_depth_m - (−1.00)
= minimum_required_actual_depth_m + 1.00
```

### Step 3 — Safety Classification

A time slot is classified **SAFE** when:
```
predicted_tide_height_m >= minimum_required_tide_table_height_m
```

### Example (zero draft, Ko Samui spreadsheet reference case)

```
minimum_required_actual_depth = 0 + 0.70 + 0.10       = 0.80 m  ← matches spreadsheet
minimum_required_tide_table   = 0.80 - (−1.00)         = 1.80 m  ← matches spreadsheet
→ SAFE when predicted tide ≥ 1.80 m
```

### Example (0.50 m draft, approved defaults)

```
minimum_required_actual_depth = 0.50 + 0.70 + 0.10    = 1.30 m
minimum_required_tide_table   = 1.30 - (−1.00)         = 2.30 m
→ SAFE when predicted tide ≥ 2.30 m
```

---

## 3. Tide Agent Output

The tide agent returns:

```json
{
  "ok": true,
  "draftM": 0.50,
  "requiredActualDepth": 1.30,
  "requiredTideHeight": 2.30,
  "earliestSafeHour": "06:00",
  "safeWindows": [
    { "hour": "06:00", "tide": 0.45, "safe": true },
    ...
  ],
  "slots": [...],
  "warning": "Tide prediction may differ from actual sea level due to weather. Final confirmation required on the day."
}
```

The `warning` field must always be present in the output. It must never be suppressed.

---

## 4. Dockmaster Final Approval Rule

**The system's SAFE classification is advisory only.**

Actual sea level may differ from tide-table predictions due to:
- Wind direction and speed
- Barometric pressure
- Regional storm surge
- Swell height and period
- Rainfall runoff

**The dockmaster or operations supervisor must give final physical confirmation on the day of every launch and retrieval operation.**

The tide agent must never be used as the sole authority for clearing a vessel for launch.
No AI agent may issue a "vessel cleared for launch" confirmation.

---

## 5. No-Data Handling

When tide data is not available for the requested date, the tide agent returns:

```json
{ "ok": false, "reason": "no_tide_data", "draftM": 0 }
```

A ramp booking must not proceed without tide data. Operations staff must source tide data manually and enter it before scheduling.

---

## 6. Ramp Depth Offset Explanation

The `ramp_offset_m` (−1.00 m) accounts for the fact that the ramp surface at the Ko Samui facility sits approximately 1.00 m below the tide-table reference datum.

This means:
- A tide-table reading of 1.00 m means the actual water depth at the ramp foot is approximately 2.00 m.
- The offset converts between the published tide-table height and the actual depth available at the ramp.

This value is site-specific. If the ramp is dredged, extended, or reconstructed, this value must be resurveyed and updated.
