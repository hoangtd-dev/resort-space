# Prebuilt Land — Koh Tao Beachfront Resort Terrain

## Concept

Inspired by hillside beach resorts on Koh Tao. The land rises from the shoreline
inland, with the beach at the lowest point and a high ridge at the back where the
main road, reception, and restaurant sit. Bungalows spread across the hillside slope
between the beach and the ridge.

---

## Terrain Profile

`t` is the depth fraction: `t = (140 - worldZ) / 600`
- `t = 0` → shore (worldZ = +140)
- `t = 1` → far inland (worldZ = −460)

| Zone | t range | worldZ approx | Height (y) | Purpose |
|---|---|---|---|---|
| Beach flat | 0.00 → 0.05 | +140 → +110 | ~0.6 | Sea-level sand, wave zone |
| Beach rise | 0.05 → 0.15 | +110 → +50 | 0.6 → 3 | Gentle ramp up from waterline |
| Hillside slope | 0.15 → 0.68 | +50 → −270 | 3 → 17 | Main bungalow slope, S-curve |
| Back ridge | 0.68 → 0.80 | −270 → −340 | 15 → 17 | Flat plateau — road / reception level |
| Far forest | 0.80 → 1.00 | −340 → −460 | stays high | Forest, no resort activity |

The resort yellow border sits at Z = −270 (t ≈ 0.68), which aligns with the top of
the hillside — the back ridge is just behind it, forming a natural boundary.

---

## Lateral (X-axis) Shaping

The slope has sinusoidal undulation across X to create:
- Natural drainage gullies (lower spots)
- Gentle ridges between gullies (higher spots)
- Informal flat terraces where bungalows can be sited

Undulation only activates on the hillside (t > 0.12) and fades on the beach flat.

---

## Color Zones

Defined by `t` thresholds in `pickColor()` — no changes needed, already fits:

| Color | t range | worldZ | Description |
|---|---|---|---|
| Dry sand | 0 → 0.22 | +140 → +8 | Beach and waterline |
| Sand → Lawn transition | 0.22 → 0.32 | +8 → −52 | Base of slope |
| Lawn (light green) | 0.32 → 0.70 | −52 → −280 | Main resort hillside |
| Jungle (dark green) | 0.70 → 1.00 | −280 → −460 | Forest behind resort |

---

## Implementation

All changes are in `computeHeight(t, lx, ly)` inside `src/scene/land/land.js`:

1. **Main elevation profile** — replace flat + late-rising formula with:
   - Flat beach → gentle beach ramp → S-curve hillside → back plateau
2. **Lateral undulation** — add sine waves in `lx` scaled by slope blend factor
3. **Roughness** — keep existing roughness noise, slightly increase weight on slope
4. **Front edge dip** — keep existing (dips below water so ocean covers the seam)
5. **Side edge plunge** — keep existing (avoids gaps at land edges)

---

## Key Numbers (tuned via Terrain Tuner UI)

| Parameter | Value | Field in `LAND_CONFIG` |
|---|---|---|
| Inland depth | 550 | `depth` |
| Beach ramp end t | 0.14 | `beachRampEndT` |
| Level 1 end t | 0.27 | `l1EndT` |
| Level 1 height | 24 | `l1Height` |
| Level 2 end t | 0.40 | `l2EndT` |
| Level 2 height | 49 | `l2Height` |
| Level 3 end t | 0.53 | `l3EndT` |
| Level 3 height (peak) | 73 | `l3Height` |
| Resort rear Z | −120 | `controls.js` `PAN_MIN.z` |
| Resort X width | ±180 | `controls.js` `PAN_MIN/MAX.x` |
| Shore Z | +140 | `ocean.js` `SHORE_Z` |
