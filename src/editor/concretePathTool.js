import * as THREE from "three";

const STRIP_LIFT = 0.08;
const SUB_STEP_LENGTH = 0.5; // world units between sections along path
const WIDTH_SUBDIV = 4;       // cross-width subdivisions (rails = WIDTH_SUBDIV + 1)
const MITER_LIMIT = 3.0;
const TEXTURE_TILE_LENGTH = 2.0; // world units per texture repeat along strip
const MIN_WAYPOINT_GAP = 0.2;

let concreteTextureCache = null;
let toonGradientCache = null;

export function createConcretePathTool({ scene, getSampleHeight }) {
  const concreteState = { width: 2.0 };

  const committedGroup = new THREE.Group();
  committedGroup.name = "concretePaths";
  scene.add(committedGroup);

  const previewGroup = new THREE.Group();
  previewGroup.name = "concretePathPreview";
  scene.add(previewGroup);

  let waypoints = []; // [{x, z}]
  let ghostMesh = null;
  let waypointMarkers = [];

  function isDrafting() { return waypoints.length > 0; }

  function addWaypoint(worldX, worldZ) {
    const last = waypoints[waypoints.length - 1];
    if (last) {
      const dx = worldX - last.x, dz = worldZ - last.z;
      if (Math.hypot(dx, dz) < MIN_WAYPOINT_GAP) return;
    }
    waypoints.push({ x: worldX, z: worldZ });
    refreshWaypointMarkers();
  }

  function undoLastWaypoint() {
    if (waypoints.length === 0) return;
    waypoints.pop();
    refreshWaypointMarkers();
    if (waypoints.length === 0) clearGhost();
  }

  function cancelDraft() {
    waypoints = [];
    clearGhost();
    refreshWaypointMarkers();
  }

  function commitDraft() {
    if (waypoints.length < 2) { cancelDraft(); return false; }
    const geom = buildStripGeometry(waypoints, concreteState.width, getSampleHeight, STRIP_LIFT);
    if (!geom) { cancelDraft(); return false; }
    const mesh = new THREE.Mesh(geom, createConcreteMaterial());
    mesh.receiveShadow = true;
    mesh.userData.kind = "concretePath";
    committedGroup.add(mesh);
    cancelDraft();
    return true;
  }

  function updateGhost({ hasHit, lastHitWorld, placementState }) {
    const showGhost =
      placementState.active &&
      placementState.mode === "concrete" &&
      placementState.action === "place" &&
      hasHit &&
      waypoints.length > 0;

    if (!showGhost) { clearGhost(); return; }

    const draftPoints = [...waypoints, { x: lastHitWorld.x, z: lastHitWorld.z }];
    const geom = buildStripGeometry(draftPoints, concreteState.width, getSampleHeight, STRIP_LIFT);
    if (!geom) { clearGhost(); return; }

    if (!ghostMesh) {
      ghostMesh = new THREE.Mesh(geom, createConcreteMaterial({ ghost: true }));
      previewGroup.add(ghostMesh);
    } else {
      ghostMesh.geometry.dispose();
      ghostMesh.geometry = geom;
    }
  }

  function clearGhost() {
    if (!ghostMesh) return;
    previewGroup.remove(ghostMesh);
    ghostMesh.geometry.dispose();
    ghostMesh.material.dispose();
    ghostMesh = null;
  }

  function refreshWaypointMarkers() {
    for (const m of waypointMarkers) {
      previewGroup.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    waypointMarkers = [];

    const sampler = getSampleHeight();
    for (const p of waypoints) {
      const geo = new THREE.SphereGeometry(0.18, 12, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffcc44,
        depthTest: false,
        transparent: true,
        opacity: 0.95,
      });
      const m = new THREE.Mesh(geo, mat);
      m.renderOrder = 9999;
      m.position.set(p.x, sampler(p.x, p.z) + STRIP_LIFT + 0.2, p.z);
      previewGroup.add(m);
      waypointMarkers.push(m);
    }
  }

  function removeByHitObject(obj) {
    let cur = obj;
    while (cur && cur.userData?.kind !== "concretePath") cur = cur.parent;
    if (!cur || cur.parent !== committedGroup) return false;
    committedGroup.remove(cur);
    cur.geometry.dispose();
    cur.material.dispose();
    return true;
  }

  function clearAll() {
    cancelDraft();
    while (committedGroup.children.length) {
      const m = committedGroup.children[0];
      committedGroup.remove(m);
      m.geometry?.dispose();
      m.material?.dispose();
    }
  }

  return {
    concreteState,
    isDrafting,
    addWaypoint,
    undoLastWaypoint,
    cancelDraft,
    commitDraft,
    updateGhost,
    removeByHitObject,
    clearAll,
    committedGroup,
  };
}

// ─── strip geometry ─────────────────────────────────────────────────────────

function buildStripGeometry(waypoints, width, getSampleHeight, lift) {
  if (waypoints.length < 2) return null;
  const sampler = getSampleHeight();
  const railsAcross = WIDTH_SUBDIV + 1;

  // Per-waypoint joint normals (in XZ plane), with miter at corners.
  const segDir = []; // unit dir per segment in XZ
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i], b = waypoints[i + 1];
    const dx = b.x - a.x, dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) return null;
    segDir.push({ x: dx / len, z: dz / len });
  }

  const jointOffset = []; // {x, z, scale} per waypoint — unit normal + miter scale
  for (let i = 0; i < waypoints.length; i++) {
    if (i === 0) {
      const d = segDir[0];
      jointOffset.push({ x: -d.z, z: d.x, scale: 1 });
    } else if (i === waypoints.length - 1) {
      const d = segDir[i - 1];
      jointOffset.push({ x: -d.z, z: d.x, scale: 1 });
    } else {
      const dPrev = segDir[i - 1], dNext = segDir[i];
      const nPrev = { x: -dPrev.z, z: dPrev.x };
      const nNext = { x: -dNext.z, z: dNext.x };
      let bx = nPrev.x + nNext.x, bz = nPrev.z + nNext.z;
      const blen = Math.hypot(bx, bz);
      if (blen < 1e-6) {
        jointOffset.push({ x: nPrev.x, z: nPrev.z, scale: 1 });
      } else {
        bx /= blen; bz /= blen;
        const cosHalf = bx * nPrev.x + bz * nPrev.z;
        const scale = Math.min(MITER_LIMIT, 1 / Math.max(0.1, cosHalf));
        jointOffset.push({ x: bx, z: bz, scale });
      }
    }
  }

  // Walk polyline, emit cross-sections at every sub-step.
  // Each section = { cx, cz, nx, nz, scale, arcLen } (center + normal direction).
  const sections = [];
  let arcLen = 0;

  // First waypoint section.
  {
    const p = waypoints[0], j = jointOffset[0];
    sections.push({ cx: p.x, cz: p.z, nx: j.x, nz: j.z, scale: j.scale, arcLen: 0 });
  }

  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i], b = waypoints[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.z - a.z);
    const subSteps = Math.max(1, Math.ceil(segLen / SUB_STEP_LENGTH));

    for (let s = 1; s <= subSteps; s++) {
      const t = s / subSteps;
      const cx = a.x + (b.x - a.x) * t;
      const cz = a.z + (b.z - a.z) * t;
      arcLen += segLen / subSteps;

      let nx, nz, scale;
      if (s === subSteps) {
        const j = jointOffset[i + 1];
        nx = j.x; nz = j.z; scale = j.scale;
      } else {
        const d = segDir[i];
        nx = -d.z; nz = d.x; scale = 1;
      }
      sections.push({ cx, cz, nx, nz, scale, arcLen });
    }
  }

  // Build vertices: each section emits railsAcross verts across the width.
  const positions = [];
  const uvs = [];
  for (const sec of sections) {
    for (let i = 0; i < railsAcross; i++) {
      const frac = i / WIDTH_SUBDIV;            // 0..1 across width (0 = R rail, 1 = L rail)
      const offMag = (frac - 0.5) * width * sec.scale;
      const vx = sec.cx + sec.nx * offMag;
      const vz = sec.cz + sec.nz * offMag;
      const vy = sampler(vx, vz) + lift;
      positions.push(vx, vy, vz);
      uvs.push(sec.arcLen / TEXTURE_TILE_LENGTH, frac);
    }
  }

  // Triangulate ribbon: sections × cross-rails grid.
  const indices = [];
  for (let k = 0; k < sections.length - 1; k++) {
    for (let i = 0; i < WIDTH_SUBDIV; i++) {
      const a = k * railsAcross + i;
      const b = a + 1;
      const c = (k + 1) * railsAcross + i;
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

// ─── material / texture ─────────────────────────────────────────────────────

function createConcreteMaterial({ ghost = false } = {}) {
  const mat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    map: getConcreteTexture(),
    gradientMap: getToonGradient(),
    side: THREE.DoubleSide,
    transparent: ghost,
    opacity: ghost ? 0.55 : 1.0,
    depthWrite: !ghost,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  if (ghost) mat.color.setHex(0xc8e8ff);
  return mat;
}

function getToonGradient() {
  if (toonGradientCache) return toonGradientCache;
  // 3-step gradient: shadow / mid / lit. Nearest filter -> hard cel bands.
  const data = new Uint8Array([90, 160, 230]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  toonGradientCache = tex;
  return tex;
}

function getConcreteTexture() {
  if (concreteTextureCache) return concreteTextureCache;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Flat base — no gradient (cartoon = solid fills).
  ctx.fillStyle = "#cfcabf";
  ctx.fillRect(0, 0, size, size);

  // A few chunky pebbles — bold shapes, not noise.
  const pebbleColors = ["#a9a39a", "#e2ddd3", "#8b867d"];
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = pebbleColors[i % pebbleColors.length];
    const r = 4 + Math.random() * 6;
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bold slab joints with hand-drawn jitter — the cartoon signature.
  ctx.strokeStyle = "#3a342c";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  drawJitteredLine(ctx, 0, size / 2, size, size / 2);
  drawJitteredLine(ctx, size / 2, 0, size / 2, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  concreteTextureCache = tex;
  return tex;
}

function drawJitteredLine(ctx, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const steps = Math.ceil(len / 8);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const jx = (Math.random() - 0.5) * 2.5;
    const jy = (Math.random() - 0.5) * 2.5;
    ctx.lineTo(x0 + dx * t + jx, y0 + dy * t + jy);
  }
  ctx.stroke();
}
