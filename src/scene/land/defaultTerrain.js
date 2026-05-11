import * as THREE from "three";

export function applyDefaultTerrain(land) {
  const geo = land.geometry;
  const pos = geo.attributes.position;
  const { width, height, widthSegments, heightSegments } = geo.parameters;
  const cols = widthSegments + 1;
  const rows = heightSegments + 1;

  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      const i = iy * cols + ix;
      const wx = (ix / widthSegments - 0.5) * width;
      const wz = (iy / heightSegments - 0.5) * height;
      pos.setZ(i, computeHeight(wx, wz));
    }
  }

  smoothTerrain(pos, cols, rows, 2);
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  applyVertexColors(land);
}

// ─── Height field ────────────────────────────────────────────────────────────

function computeHeight(wx, wz) {
  // Subtle north-south base slope.
  let h = 2.5 * ((wz + 200) / 400);

  // Upper zone — broad, high hilltops for luxury villas / scenic buildings.
  h += 18 * hill(wx, wz,   0,  25, 65, 52); // main summit
  h += 10 * hill(wx, wz, -30,   8, 50, 40); // secondary left peak
  h +=  8 * hill(wx, wz,  38,   5, 45, 38); // right shoulder ridge

  // Mid terrace — wide elevated plateau for hotel and social areas.
  h +=  5 * hill(wx, wz,   5,  -8, 80, 60);

  // Coastal depression — gentle dip toward the front shoreline.
  h -=  1.5 * hill(wx, wz,   0, -30, 90, 50);

  h += roughness(wx, wz);

  const mask = islandMask(wx, wz);
  // Sink=0.7 pushes the outer rim to y=-0.7, below ocean at y=-0.5,
  // so no visible blue gaps appear inside the land boundary.
  return (Math.max(0, h) + 0.7) * mask - 0.7;
}

function islandMask(wx, wz) {
  const angle = Math.atan2(wz, wx);
  const dist = Math.sqrt(wx * wx + wz * wz);

  // Organically irregular coastline: a mix of low-frequency angular harmonics
  // produces coves, headlands, and a naturally uneven silhouette.
  const r =
    148 +
    18 * Math.sin(angle * 2.0 + 0.4) +
    12 * Math.sin(angle * 3.3 - 0.9) +
     8 * Math.cos(angle * 4.7 + 1.6) +
     5 * Math.sin(angle * 6.1 - 0.3);

  // Variable feathering: narrow zones create cliff-like transitions,
  // wider zones create gradual sandy beaches.
  const feather = 18 + 10 * Math.sin(angle * 2.5 + 1.0);

  const coastMask = 1.0 - smoothstep(r - feather, r, dist);
  // Right edge: straight vertical border.
  const rightMask = 1.0 - smoothstep(140, 162, wx);
  return Math.min(coastMask, rightMask);
}

// Low-frequency micro-roughness — just enough to break visual uniformity.
function roughness(wx, wz) {
  const k = 0.018;
  return (
    Math.sin(wx * k * 1.6 + wz * k * 0.7) * 0.35 +
    Math.sin(wx * k * 0.9 - wz * k * 1.8) * 0.25 +
    Math.cos(wx * k * 2.3 + wz * k * 1.1) * 0.18
  );
}

function hill(wx, wz, cx, cz, rx, rz) {
  const dx = (wx - cx) / rx;
  const dz = (wz - cz) / rz;
  return Math.exp(-(dx * dx + dz * dz) / 2);
}

// ─── Terrain smoothing ───────────────────────────────────────────────────────

// Box-filter smoothing pass — eliminates any residual jagged transitions
// from the height field without eroding hill shape significantly.
function smoothTerrain(pos, cols, rows, iterations) {
  const scratch = new Float32Array(pos.count);
  for (let iter = 0; iter < iterations; iter++) {
    for (let iy = 0; iy < rows; iy++) {
      for (let ix = 0; ix < cols; ix++) {
        const i = iy * cols + ix;
        let sum = pos.getZ(i) * 4; // centre weighted 4×
        let w = 4;
        if (ix > 0)        { sum += pos.getZ(i - 1);    w++; }
        if (ix < cols - 1) { sum += pos.getZ(i + 1);    w++; }
        if (iy > 0)        { sum += pos.getZ(i - cols); w++; }
        if (iy < rows - 1) { sum += pos.getZ(i + cols); w++; }
        scratch[i] = sum / w;
      }
    }
    for (let i = 0; i < pos.count; i++) pos.setZ(i, scratch[i]);
  }
}

// ─── Vertex colours ──────────────────────────────────────────────────────────

// Blend zones (sRGB 0-1 values, matching conventional hex-picker perception).
const SAND   = [0.82, 0.72, 0.55]; // warm beach
const SHORE  = [0.56, 0.74, 0.40]; // coastal grass
const GRASS  = [0.38, 0.58, 0.26]; // main terrain
const HILL   = [0.30, 0.50, 0.22]; // hillside
const SUMMIT = [0.24, 0.40, 0.17]; // highland
const ROCK   = [0.50, 0.46, 0.40]; // steep slope / cliff face

function applyVertexColors(land) {
  const geo = land.geometry;
  const pos = geo.attributes.position;
  const normals = geo.attributes.normal;
  const count = pos.count;

  let col = geo.attributes.color;
  if (!col) {
    col = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
    geo.setAttribute("color", col);
  }

  for (let i = 0; i < count; i++) {
    const h = pos.getZ(i);
    // nz = 1 → flat; approaches 0 → vertical cliff.
    const nz = normals ? normals.getZ(i) : 1;
    const slope = 1 - nz;

    // Height-based colour band.
    let c;
    if      (h < 0.5) c = lerp3(SAND,  SHORE,  Math.max(0, h / 0.5));
    else if (h < 3.0) c = lerp3(SHORE, GRASS,  (h - 0.5) / 2.5);
    else if (h < 9.0) c = lerp3(GRASS, HILL,   (h - 3.0) / 6.0);
    else              c = lerp3(HILL,  SUMMIT,  Math.min(1, (h - 9.0) / 6.0));

    // Slope overlay: steep faces tint toward rocky grey.
    const sf = smoothstep01(Math.max(0, (slope - 0.25) / 0.45));
    c = lerp3(c, ROCK, sf * 0.65);

    col.setXYZ(i, c[0], c[1], c[2]);
  }

  col.needsUpdate = true;
}

// ─── Maths helpers ───────────────────────────────────────────────────────────

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function smoothstep01(t) {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}

function lerp3(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}
