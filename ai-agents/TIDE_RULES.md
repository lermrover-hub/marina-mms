# Tide Safety Rules — Ocean Rover Marina

Last reviewed 2026-10-16. Physical settings confirmed by ORM owner.

## Geometry & datum

- Reference: **LLW** (Lowest Low Water).
- Ramp depth offset: **−1.00 m** vs published LLW table.
- Central trailer frame elevation: **0.60 m** above seabed.
- Side bunk elevation: **1.00 m**; bunk contact may occur. Not part of middle-frame clearance.
- Keel-to-middle-frame minimum free clearance: **0.10 m**.
- Optional forecast uncertainty margin: `U >= 0`, calibrated separately.

For tide table height `H` and vessel draft `draft` (metres):

```
actual_ramp_depth = H + (-1.00)               // H - 1.00
required_actual_depth = draft + 0.60 + 0.10  // draft + 0.70
required_tide_height = draft + 1.70
keel_to_frame_clearance = H - 1.00 - draft - 0.60
frame_pass = H - U >= required_tide_height
```

For draft=0.50 m, minimum tide table height = **2.20 m** when U=0.

**Do not add the 1.00-metre side-bunk height** to the middle-frame clearance formula: hull/bunk contact requires separate geometric and structural evaluation.

## Source safety

Historical 2026 table values are retained, and their declared datum must be checked against the original Hydrographic Department table: the old generated file header calls it LAT, while ORM confirms LLW as the intended datum. **Never silently relabel existing values.**

The 2027–2028 internal harmonic extrapolation is planning-preview-only and may NEVER authorize or imply a safe launch. An FES2022 model likewise needs surveyed site coordinates, a verified MSL-to-LLW conversion and comparison with site gauge readings. Physically confirm tidal level, waves, weather, trailer posture, hull support and ramp slope on every launch/retrieval. Predictions are advisory; only a dockmaster may authorize the operation.

All real operations must be verified over the full duration, not at a single hour. No-data is fail-closed.

## Agent configuration

The `trailer_height_m` configuration field is retained for API compatibility but NOW means central frame elevation (**0.60 m**); safety clearance (**0.10 m**); ramp offset (**−1.00 m**). The **1.00 m side bunk** remains an independent geometry field.

Change operational configuration in Settings → AI Agent Rules → Tide Agent. Do not bypass final on-site confirmation.
