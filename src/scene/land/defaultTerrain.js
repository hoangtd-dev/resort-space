export function applyDefaultTerrain(land) {
  const geo = land.geometry;
  const pos = geo.attributes.position;
  const { width, height, widthSegments, heightSegments } = geo.parameters;
  const cols = widthSegments + 1;
  const rows = heightSegments + 1;

  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      const wx = (ix / widthSegments - 0.5) * width;
      const wz = (iy / heightSegments - 0.5) * height;
      pos.setZ(iy * cols + ix, computeHeight(wx, wz));
    }
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// Returns the terrain height at world position (wx, wz).
// Built from stacked Gaussian "bell" bumps — easy to add, move, or resize.
function computeHeight(wx, wz) {
  let h = 0;

  // Gentle base slope — back of the map is slightly higher than the front.
  h += 3 * ((wz + 50) / 100);

  // Each hill() call adds one smooth bump.
  // Arguments: hill(centerX, centerZ, radiusX, radiusZ)
  // Multiply by a number to control its peak height.
  h += 13 * hill(wx, wz,   5,  10, 22, 17); // main central plateau
  h +=  7 * hill(wx, wz, -14,   6, 16, 14); // left wing
  h +=  6 * hill(wx, wz,  26,   2, 13, 20); // right ridge
  h +=  4 * hill(wx, wz,   2,  33, 28,  9); // back tree line
  h +=  4 * hill(wx, wz, -40,  -4,  9, 14); // far-left edge
  h +=  3 * hill(wx, wz,  36,  17, 10, 12); // right-back bump
  h -=  2 * hill(wx, wz, -10, -25, 14, 10); // front-left dip

  // Add slight surface roughness so the ground isn't perfectly smooth.
  h += roughness(wx, wz);

  return Math.max(0, h); // never go below ground level
}

// Smooth bell-shaped bump centred at (cx, cz) with radii (rx, rz).
// Returns 1 at the centre and fades to 0 at the edges.
function hill(wx, wz, cx, cz, rx, rz) {
  const dx = (wx - cx) / rx;
  const dz = (wz - cz) / rz;
  return Math.exp(-(dx * dx + dz * dz) / 2);
}

// Layered sine waves that add subtle, organic surface variation.
function roughness(wx, wz) {
  const k = 0.075;
  return (
    Math.sin(wx * k * 1.7 + wz * k * 0.9) * 1.1 +
    Math.sin(wx * k * 0.8 - wz * k * 2.1) * 0.7 +
    Math.sin(wx * k * 3.2 + wz * k * 1.4) * 0.45 +
    Math.cos(wx * k * 2.4 - wz * k * 0.8) * 0.55
  );
}
