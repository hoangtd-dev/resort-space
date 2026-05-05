// Hard limits on terrain height. Prevents bottomless craters / sky-piercing
// spikes. Tune as needed for the resort scale (units = world meters).
export const MIN_HEIGHT = -8;
export const MAX_HEIGHT = 30;

function clampHeight(z) {
  if (z < MIN_HEIGHT) return MIN_HEIGHT;
  if (z > MAX_HEIGHT) return MAX_HEIGHT;
  return z;
}

// Smooth falloff across the donut transition zone.
//
// Inner radius (full strength)  = size * (1 - hardness)
// Outer radius (zero strength)  = size
//
// hardness = 0  → no inner core; falloff begins at center, smoothest hill.
// hardness = 1  → inner core fills entire brush; falloff is a hard cliff.
//
// Returns a value in [0, 1].
export function falloff(dist, size, hardness) {
  if (dist >= size) return 0;
  const inner = size * (1 - hardness);
  if (dist <= inner) return 1;
  const t = (dist - inner) / (size - inner);
  return 1 - smoothstep01(t);
}

function smoothstep01(t) {
  return t * t * (3 - 2 * t);
}

// Naive lift / lower: every vertex inside the brush moves by direction*strength*falloff*dt.
// No memory of neighbouring heights — repainting amplifies existing bumps.
//
// geometry  — THREE.PlaneGeometry (local XY plane, Z is height)
// hitLocal  — THREE.Vector3 brush center in geometry's local space
// params    — { size, hardness, strength, direction, dt }
export function applyCircleBrush(geometry, hitLocal, params) {
  const { size, hardness, strength, direction, dt } = params;
  const positions = geometry.attributes.position;
  const sizeSq = size * size;

  for (let i = 0; i < positions.count; i++) {
    const dx = positions.getX(i) - hitLocal.x;
    const dy = positions.getY(i) - hitLocal.y;
    const distSq = dx * dx + dy * dy;
    if (distSq >= sizeSq) continue;

    const f = falloff(Math.sqrt(distSq), size, hardness);
    const delta = direction * strength * f * dt;
    positions.setZ(i, clampHeight(positions.getZ(i) + delta));
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
}

// Level-then-lift (Planet Zoo-style). Two phases per frame:
//
//   Phase 1 (Leveling — INNER RING ONLY)
//     Only vertices in the brush's full-strength core (dist <= size*(1-hardness))
//     participate. If any core vertex is more than `epsilon` away from the
//     core extreme (max for lift, min for lower), those off-extreme verts move
//     toward the extreme. Outer (feathered) verts and on-extreme verts hold.
//
//   Phase 2 (Lifting / Lowering — WHOLE BRUSH)
//     Once the core is flat, the entire brush (core + feathered ring) moves
//     together. Each vert moves by step*f, capped at the next-frame extreme so
//     low-falloff verts don't drift past the brush's leading edge.
//
// `direction = +1` lifts (extreme = max, ceiling caps from above).
// `direction = -1` lowers (extreme = min, floor caps from below).
//
// Edge case (hardness ≈ 0): inner radius collapses, no core verts exist,
// so leveling is vacuously satisfied and we go straight to phase 2 — making
// hardness-0 behave like naive (with falloff). Intended graceful limit.
export function applyCircleBrushLevelLift(geometry, hitLocal, params) {
  applyLevelMode(geometry, hitLocal, params, 1);
}

export function applyCircleBrushLevelLower(geometry, hitLocal, params) {
  applyLevelMode(geometry, hitLocal, params, -1);
}

// Lift + per-step smoothing. Each frame: every vert in brush rises by step*f,
// then blends toward the average of its 4 cardinal neighbors at rate
// `smoothness * dt`. Bumps get continuously erased — repaint amplifies less.
//
// Result: naturally rounded hills, no plateaus. Simpler mental model than
// level-then-lift (single pass, no phase switching).
//
// Tunable via params.smoothness (default 5 = strong smoothing per second).
export function applyCircleBrushLiftSmooth(geometry, hitLocal, params) {
  const { size, hardness, strength, dt, smoothness = 5 } = params;
  const positions = geometry.attributes.position;
  const sizeSq = size * size;
  const step = strength * dt;
  const smoothStep = Math.min(smoothness * dt, 1);

  const { widthSegments, heightSegments } = geometry.parameters;
  const cols = widthSegments + 1;
  const rows = heightSegments + 1;

  // Pass 1: lift, also collect brush membership for the smoothing pass.
  const inBrush = [];
  for (let i = 0; i < positions.count; i++) {
    const dx = positions.getX(i) - hitLocal.x;
    const dy = positions.getY(i) - hitLocal.y;
    const distSq = dx * dx + dy * dy;
    if (distSq >= sizeSq) continue;

    const f = falloff(Math.sqrt(distSq), size, hardness);
    const z = positions.getZ(i);
    positions.setZ(i, clampHeight(z + step * f));

    inBrush.push({ i, ix: i % cols, iy: Math.floor(i / cols) });
  }

  // Pass 2: smooth toward neighbor avg. Read positions, compute new values,
  // write in second loop so smoothing isn't biased by iteration order.
  const targets = new Float32Array(inBrush.length);
  for (let k = 0; k < inBrush.length; k++) {
    const { i, ix, iy } = inBrush[k];
    let sum = positions.getZ(i);
    let count = 1;
    if (ix > 0) {
      sum += positions.getZ(i - 1);
      count++;
    }
    if (ix < cols - 1) {
      sum += positions.getZ(i + 1);
      count++;
    }
    if (iy > 0) {
      sum += positions.getZ(i - cols);
      count++;
    }
    if (iy < rows - 1) {
      sum += positions.getZ(i + cols);
      count++;
    }
    const avg = sum / count;
    const z = positions.getZ(i);
    targets[k] = z + (avg - z) * smoothStep;
  }
  for (let k = 0; k < inBrush.length; k++) {
    positions.setZ(inBrush[k].i, clampHeight(targets[k]));
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
}

// Phase-1-only variant of level-mode. Off-extreme core verts catch up toward
// coreExtreme, then stop. No phase 2 — once the core is flat the brush does
// nothing. Use for "level" / "flatten" tools where the user explicitly does
// NOT want further height change.
//
// `direction = +1`: extreme = max (level low spots up to local max).
// `direction = -1`: extreme = min (level high spots down to local min).
export function applyCircleBrushLevelOnly(geometry, hitLocal, params) {
  applyLevelOnly(geometry, hitLocal, params, 1);
}

function applyLevelOnly(geometry, hitLocal, params, direction) {
  const { size, hardness, strength, dt, levelSpeed = 3 } = params;
  const positions = geometry.attributes.position;
  const sizeSq = size * size;
  const innerR = size * (1 - hardness);
  const innerSq = innerR * innerR;
  const step = strength * dt;
  const signedLevelStep = step * levelSpeed * direction;

  const inCore = [];
  let coreExtreme = -Infinity * direction;

  for (let i = 0; i < positions.count; i++) {
    const dx = positions.getX(i) - hitLocal.x;
    const dy = positions.getY(i) - hitLocal.y;
    const distSq = dx * dx + dy * dy;
    if (distSq >= sizeSq) continue;
    if (distSq <= innerSq) {
      const z = positions.getZ(i);
      if (direction * z > direction * coreExtreme) coreExtreme = z;
      inCore.push(i);
    }
  }
  if (inCore.length === 0) return;

  for (const i of inCore) {
    const z = positions.getZ(i);
    const gap = direction * (coreExtreme - z);
    if (gap > 0) {
      const move = Math.min(gap, Math.abs(signedLevelStep));
      positions.setZ(i, clampHeight(z + move * direction));
    }
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
}

function applyLevelMode(geometry, hitLocal, params, direction) {
  const { size, hardness, strength, dt, levelSpeed = 3 } = params;
  const positions = geometry.attributes.position;
  const sizeSq = size * size;
  const innerR = size * (1 - hardness);
  const innerSq = innerR * innerR;
  const step = strength * dt; // unsigned magnitude
  const signedStep = step * direction;
  const signedLevelStep = step * levelSpeed * direction;
  const epsilon = step * 0.5;

  // For lift (+1): want max → seed extreme at -Infinity, prefer larger.
  // For lower (-1): want min → seed extreme at +Infinity, prefer smaller.
  // `direction * z > direction * extreme` works for both cases.
  const inBrush = [];
  const inCore = [];
  let coreExtreme = -Infinity * direction;
  let overallExtreme = -Infinity * direction;

  for (let i = 0; i < positions.count; i++) {
    const dx = positions.getX(i) - hitLocal.x;
    const dy = positions.getY(i) - hitLocal.y;
    const distSq = dx * dx + dy * dy;
    if (distSq >= sizeSq) continue;

    const f = falloff(Math.sqrt(distSq), size, hardness);
    const z = positions.getZ(i);
    if (direction * z > direction * overallExtreme) overallExtreme = z;
    inBrush.push({ i, f });

    if (distSq <= innerSq) {
      if (direction * z > direction * coreExtreme) coreExtreme = z;
      inCore.push(i);
    }
  }
  if (inBrush.length === 0) return;

  let leveled = true;
  if (inCore.length > 0) {
    for (const i of inCore) {
      // gap is unsigned: how far this vert is from the extreme on the wrong side.
      const gap = direction * (coreExtreme - positions.getZ(i));
      if (gap > epsilon) {
        leveled = false;
        break;
      }
    }
  }

  if (!leveled) {
    // Phase 1: catch up off-extreme core verts toward coreExtreme.
    for (const i of inCore) {
      const z = positions.getZ(i);
      const gap = direction * (coreExtreme - z); // unsigned
      if (gap > 0) {
        const move = Math.min(gap, Math.abs(signedLevelStep));
        positions.setZ(i, clampHeight(z + move * direction));
      }
    }
  } else {
    // Phase 2: whole brush moves; clamp at next-frame extreme so feathered
    // edges can't pass the leading face of the dome / pit.
    const refExtreme = inCore.length > 0 ? coreExtreme : overallExtreme;
    const cap = refExtreme + signedStep;
    for (const { i, f } of inBrush) {
      const z = positions.getZ(i);
      const newZ = z + signedStep * f;
      const capped =
        direction > 0 ? Math.min(newZ, cap) : Math.max(newZ, cap);
      positions.setZ(i, clampHeight(capped));
    }
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
}
