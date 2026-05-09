import * as THREE from "three";

const COLOR = 0xd4c5a9;
const LIFT = 0.06;
const FEATHER = 2.5;

function makeMaterial() {
  return new THREE.MeshStandardMaterial({
    color: COLOR,
    roughness: 0.92,
    metalness: 0.0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -4,
  });
}

function gradeSpline(land, waypoints, halfWidth) {
  const pos = land.geometry.attributes.position;
  const { width: lW, height: lH, widthSegments: wS, heightSegments: hS } =
    land.geometry.parameters;
  const cw = lW / wS;
  const ch = lH / hS;
  const cols = wS + 1;
  const hLW = lW / 2;
  const hLH = lH / 2;

  const curve = new THREE.CatmullRomCurve3(
    waypoints.map(({ x, z }) => new THREE.Vector3(x, 0, z)),
  );

  const outer = halfWidth + FEATHER;
  const steps = Math.ceil(curve.getLength() / 0.2);
  const vertCount = cols * (hS + 1);
  const bestW = new Float32Array(vertCount);
  const bestH = new Float32Array(vertCount);

  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const pt = curve.getPoint(t);
    const ci = clampIdx(pt.z, hLH, ch, hS) * cols + clampIdx(pt.x, hLW, cw, wS);
    const centerH = pos.getZ(ci);

    const ixMin = Math.max(0, Math.floor((pt.x - outer + hLW) / cw));
    const ixMax = Math.min(wS, Math.ceil((pt.x + outer + hLW) / cw));
    const iyMin = Math.max(0, Math.floor((pt.z - outer + hLH) / ch));
    const iyMax = Math.min(hS, Math.ceil((pt.z + outer + hLH) / ch));

    for (let iy = iyMin; iy <= iyMax; iy++) {
      for (let ix = ixMin; ix <= ixMax; ix++) {
        const vx = ix * cw - hLW;
        const vz = iy * ch - hLH;
        const dist = Math.hypot(vx - pt.x, vz - pt.z);
        if (dist >= outer) continue;
        const w = dist <= halfWidth ? 1.0 : 1.0 - (dist - halfWidth) / FEATHER;
        const vi = iy * cols + ix;
        if (w > bestW[vi]) {
          bestW[vi] = w;
          bestH[vi] = centerH;
        }
      }
    }
  }

  for (let vi = 0; vi < vertCount; vi++) {
    const w = bestW[vi];
    if (w > 0) {
      const cur = pos.getZ(vi);
      pos.setZ(vi, cur + w * (bestH[vi] - cur));
    }
  }
  pos.needsUpdate = true;
}

function gradeDisc(land, cx, cz, radius) {
  const pos = land.geometry.attributes.position;
  const { width: lW, height: lH, widthSegments: wS, heightSegments: hS } =
    land.geometry.parameters;
  const cw = lW / wS;
  const ch = lH / hS;
  const cols = wS + 1;
  const hLW = lW / 2;
  const hLH = lH / 2;

  const ci = clampIdx(cz, hLH, ch, hS) * cols + clampIdx(cx, hLW, cw, wS);
  const centerH = pos.getZ(ci);
  const outer = radius + FEATHER;

  const ixMin = Math.max(0, Math.floor((cx - outer + hLW) / cw));
  const ixMax = Math.min(wS, Math.ceil((cx + outer + hLW) / cw));
  const iyMin = Math.max(0, Math.floor((cz - outer + hLH) / ch));
  const iyMax = Math.min(hS, Math.ceil((cz + outer + hLH) / ch));

  for (let iy = iyMin; iy <= iyMax; iy++) {
    for (let ix = ixMin; ix <= ixMax; ix++) {
      const vx = ix * cw - hLW;
      const vz = iy * ch - hLH;
      const dist = Math.hypot(vx - cx, vz - cz);
      if (dist >= outer) continue;
      const w = dist <= radius ? 1.0 : 1.0 - (dist - radius) / FEATHER;
      const vi = iy * cols + ix;
      const cur = pos.getZ(vi);
      pos.setZ(vi, cur + w * (centerH - cur));
    }
  }
  pos.needsUpdate = true;
}

function clampIdx(world, half, cellSize, max) {
  return Math.min(max, Math.max(0, Math.round((world + half) / cellSize)));
}

function buildRibbon(waypoints, width, sh) {
  const curve = new THREE.CatmullRomCurve3(
    waypoints.map(({ x, z }) => new THREE.Vector3(x, 0, z)),
  );
  const N = Math.max(8, Math.ceil(curve.getLength() / 0.25));
  const W = 8;
  const half = width / 2;
  const pos = [];
  const idx = [];

  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const pt = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const len = Math.hypot(tan.x, tan.z) || 1;
    const nx = -tan.z / len;
    const nz =  tan.x / len;

    for (let w = 0; w <= W; w++) {
      const f = (w / W) * 2 - 1;
      const vx = pt.x + nx * f * half;
      const vz = pt.z + nz * f * half;
      pos.push(vx, sh(vx, vz) + LIFT, vz);
    }
  }

  for (let i = 0; i < N; i++) {
    for (let w = 0; w < W; w++) {
      const a = i * (W + 1) + w;
      const b = a + 1;
      const c = (i + 1) * (W + 1) + w;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function buildFilledCircle(cx, cz, radius, sh) {
  const rings = Math.max(10, Math.ceil(radius / 0.3));
  const segs = 72;
  const pos = [];
  const idx = [];

  pos.push(cx, sh(cx, cz) + LIFT, cz);

  for (let r = 1; r <= rings; r++) {
    const rr = (r / rings) * radius;
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      const px = cx + Math.cos(a) * rr;
      const pz = cz + Math.sin(a) * rr;
      pos.push(px, sh(px, pz) + LIFT, pz);
    }
  }

  for (let s = 0; s < segs; s++) {
    idx.push(0, 1 + s, 1 + ((s + 1) % segs));
  }

  for (let r = 0; r < rings - 1; r++) {
    for (let s = 0; s < segs; s++) {
      const ns = (s + 1) % segs;
      const a = 1 + r * segs + s;
      const b = 1 + r * segs + ns;
      const c = 1 + (r + 1) * segs + s;
      const d = 1 + (r + 1) * segs + ns;
      idx.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

const SPLINES = [
  { pts: [{ x: 2, z: 8 }, { x: -5, z: 8 }, { x: -15, z: 7.5 }], w: 5 },
  { pts: [{ x: 8, z: 8 }, { x: 18, z: 2 }, { x: 25, z: 0 }, { x: 25, z: -10 }], w: 5 },
  { pts: [{ x: 5, z: 12 }, { x: 3, z: 22 }, { x: 0, z: 32.5 }], w: 5 },
];

export function createStaticPaths(scene, land, sampleHeight) {
  for (const { pts, w } of SPLINES) gradeSpline(land, pts, w / 2);
  gradeDisc(land, 5, 8, 12);
  land.geometry.computeVertexNormals();

  const group = new THREE.Group();
  group.name = "staticPaths";
  const mat = makeMaterial();

  for (const { pts, w } of SPLINES) {
    group.add(new THREE.Mesh(buildRibbon(pts, w, sampleHeight), mat));
  }
  group.add(new THREE.Mesh(buildFilledCircle(5, 8, 12, sampleHeight), mat));

  scene.add(group);
  return group;
}
