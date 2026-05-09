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

  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

function computeHeight(wx, wz) {
  let h = 0;

  // Gentle slope scaled to the 400-unit land extent.
  h += 3 * ((wz + 200) / 400);

  h += 13 * hill(wx, wz,   5,  10, 22, 17); // main central plateau
  h +=  7 * hill(wx, wz, -14,   6, 16, 14); // left wing
  h +=  6 * hill(wx, wz,  26,   2, 13, 20); // right ridge
  h +=  4 * hill(wx, wz,   2,  33, 28,  9); // back tree line
  h +=  4 * hill(wx, wz, -40,  -4,  9, 14); // far-left edge
  h +=  3 * hill(wx, wz,  36,  17, 10, 12); // right-back bump
  h -=  2 * hill(wx, wz, -10, -25, 14, 10); // front-left dip

  h += roughness(wx, wz);

  const mask = islandMask(wx, wz);
  // Sink = 0.7: outer edge lands at y = -0.7 (hidden under ocean at y = -0.5),
  // while the transition zone stays above ocean for mask > 0.29, preventing
  // any visible blue patches inside the land.
  return (Math.max(0, h) + 0.7) * mask - 0.7;
}

function islandMask(wx, wz) {
  const dist = Math.sqrt(wx * wx + wz * wz);
  // Rounded natural coastline for most of the island.
  const ovalMask = 1.0 - smoothstep(130, 175, dist);
  // Right edge: straight vertical border — no curve, no hills.
  const rightMask = 1.0 - smoothstep(140, 165, wx);
  return Math.min(ovalMask, rightMask);
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function hill(wx, wz, cx, cz, rx, rz) {
  const dx = (wx - cx) / rx;
  const dz = (wz - cz) / rz;
  return Math.exp(-(dx * dx + dz * dz) / 2);
}

function roughness(wx, wz) {
  const k = 0.075;
  return (
    Math.sin(wx * k * 1.7 + wz * k * 0.9) * 1.1 +
    Math.sin(wx * k * 0.8 - wz * k * 2.1) * 0.7 +
    Math.sin(wx * k * 3.2 + wz * k * 1.4) * 0.45 +
    Math.cos(wx * k * 2.4 - wz * k * 0.8) * 0.55
  );
}
