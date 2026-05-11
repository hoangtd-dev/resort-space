import * as THREE from "three";

const PATH_WIDTH = 2.0;   // world units — resort walkway width
const PATH_RAISE = 0.10;  // lift above terrain to prevent z-fighting

// Control points as [wx, wz] arrays — heights sampled from terrain.
const PATH_DEFS = [
  // 1. Main resort promenade: beach entrance → fountain plaza → north terrace
  {
    control: [
      [ 12, -54], [ 10, -40], [  8, -26], [  7, -10],
      [  6,   4], [  7,  18], [  8,  28], [  5,  42],
    ],
    samples: 80,
  },

  // 2. West branch: main junction → west building cluster
  {
    control: [
      [  6,   4], [ -4,   4], [-14,   4], [-22,   8],
      [-28,  14], [-32,  20],
    ],
    samples: 50,
  },

  // 3. East wing: main junction → east building cluster
  {
    control: [
      [  7, -10], [ 16,  -8], [ 25,  -3], [ 36,   4],
      [ 44,   8], [ 50,  10],
    ],
    samples: 50,
  },

  // 4. Beach promenade: east-west walk through the beachfront activity zone
  {
    control: [
      [-24, -88], [-10, -88], [  2, -87], [ 12, -87],
      [ 26, -87], [ 38, -84],
    ],
    samples: 50,
  },
];

export function createPaths(land) {
  const group = new THREE.Group();
  group.name = "paths";

  const mat = new THREE.MeshStandardMaterial({
    color: 0xd0bfa0,
    roughness: 0.95,
    metalness: 0.0,
  });

  for (const def of PATH_DEFS) {
    const mesh = buildPathMesh(land, def.control, def.samples, mat);
    if (mesh) group.add(mesh);
  }

  return group;
}

// ─── Path mesh construction ──────────────────────────────────────────────────

function buildPathMesh(land, controlXZ, samples, mat) {
  // Lift control points to terrain height
  const ctrl3d = controlXZ.map(([x, z]) =>
    new THREE.Vector3(x, sampleHeight(land, x, z), z),
  );

  const curve = new THREE.CatmullRomCurve3(ctrl3d, false, "catmullrom", 0.5);
  const pts = curve.getPoints(samples);

  // Re-snap each sampled point to actual terrain height
  for (const p of pts) p.y = sampleHeight(land, p.x, p.z);

  // Moving-average smoothing along the path (5-tap) to reduce sharp dips
  const rawY = pts.map((p) => p.y);
  for (let i = 0; i < pts.length; i++) {
    let sum = 0, w = 0;
    for (let j = Math.max(0, i - 2); j <= Math.min(pts.length - 1, i + 2); j++) {
      sum += rawY[j]; w++;
    }
    pts[i].y = sum / w;
  }

  // Build ribbon geometry
  const N = pts.length;
  const verts = new Float32Array(N * 2 * 3);
  const idxs  = [];

  for (let i = 0; i < N; i++) {
    const p    = pts[i];
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(N - 1, i + 1)];

    // Tangent projected onto XZ plane
    const tx = next.x - prev.x;
    const tz = next.z - prev.z;
    const tlen = Math.sqrt(tx * tx + tz * tz) || 1;

    // Right-hand perpendicular
    const rx =  tz / tlen;
    const rz = -tx / tlen;

    const hw = PATH_WIDTH / 2;
    const y  = p.y + PATH_RAISE;

    const vi = i * 6;
    verts[vi    ] = p.x - rx * hw;  verts[vi + 1] = y;  verts[vi + 2] = p.z - rz * hw;
    verts[vi + 3] = p.x + rx * hw;  verts[vi + 4] = y;  verts[vi + 5] = p.z + rz * hw;

    if (i > 0) {
      const b = (i - 1) * 2;
      idxs.push(b, b + 1, b + 2,  b + 1, b + 3, b + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idxs);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

// ─── Terrain height sampler ──────────────────────────────────────────────────

function sampleHeight(land, wx, wz) {
  const geo = land.geometry;
  const pos = geo.attributes.position;
  const { width, height, widthSegments, heightSegments } = geo.parameters;

  // Map world coords to fractional grid indices
  const u = (wx / width  + 0.5) * widthSegments;
  const v = (wz / height + 0.5) * heightSegments;

  const ix = Math.max(0, Math.min(widthSegments - 1, Math.floor(u)));
  const iz = Math.max(0, Math.min(heightSegments - 1, Math.floor(v)));
  const fu = u - ix;
  const fv = v - iz;

  const cols = widthSegments + 1;
  const h00  = pos.getZ( iz      * cols +  ix     );
  const h10  = pos.getZ( iz      * cols + (ix + 1));
  const h01  = pos.getZ((iz + 1) * cols +  ix     );
  const h11  = pos.getZ((iz + 1) * cols + (ix + 1));

  return h00 * (1 - fu) * (1 - fv)
       + h10 *      fu  * (1 - fv)
       + h01 * (1 - fu) *      fv
       + h11 *      fu  *      fv;
}
