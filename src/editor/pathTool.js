import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  GRID_CELL_SIZE,
  PLACED_OFFSET,
  PREVIEW_OFFSET,
  toPlacementPoint,
} from "./snapGrid";
import { PATH_TYPES } from "./placementToolbar";
const textureCache = new Map();
const CHUNK_CELLS = 20;
const PATH_SUBDIV = 5;

export function createPathTool({ scene, occupiedCells, getSampleHeight, getHalfSize }) {
  const pathState = { pathType: "rock" };

  const pathCells = new Map();
  const chunkStore = new Map();
  const dirtyChunks = new Set();

  let strokeVisited = null;
  let lastStrokeCell = null;

  const preview = new THREE.Mesh(
    createPreviewGeometry(),
    createTileMaterial(pathState.pathType, { preview: true }),
  );
  preview.visible = false;
  preview.renderOrder = 500;
  scene.add(preview);

  const placementLayer = new THREE.Group();
  placementLayer.name = "pathTiles";
  scene.add(placementLayer);

  // ── Placement validation ─────────────────────────────────────────────────

  // Rejects tiles where < 3 of 4 corners are inside land bounds OR the
  // terrain height varies too much (cliff edge / steep drop-off).
  function hasSufficientCoverage(cx, cz) {
    if (getHalfSize) {
      const hs = getHalfSize();
      const half = GRID_CELL_SIZE / 2;
      let inside = 0;
      if (Math.abs(cx - half) <= hs && Math.abs(cz - half) <= hs) inside++;
      if (Math.abs(cx + half) <= hs && Math.abs(cz - half) <= hs) inside++;
      if (Math.abs(cx - half) <= hs && Math.abs(cz + half) <= hs) inside++;
      if (Math.abs(cx + half) <= hs && Math.abs(cz + half) <= hs) inside++;
      if (inside < 3) return false;
    }

    // Steep-slope guard: sample a 3×3 grid within the tile.
    const sampler = getSampleHeight();
    const half = GRID_CELL_SIZE / 2;
    let minH = Infinity, maxH = -Infinity;
    for (let si = 0; si <= 2; si++) {
      for (let sj = 0; sj <= 2; sj++) {
        const h = sampler(cx - half + si * half, cz - half + sj * half);
        if (h < minH) minH = h;
        if (h > maxH) maxH = h;
      }
    }
    return maxH - minH <= 5;
  }

  // ── Public API ───────────────────────────────────────────────────────────

  function refreshPreviewMaterial() {
    preview.material.dispose();
    preview.material = createTileMaterial(pathState.pathType, { preview: true });
  }

  function beginStroke() { strokeVisited = new Set(); lastStrokeCell = null; }
  function endStroke()   { strokeVisited = null;      lastStrokeCell = null; }

  function clearTiles() {
    for (const [cellKey] of pathCells) {
      const { x, z } = worldFromCellKey(cellKey);
      occupiedCells.delete(toOccupiedKey(x, z));
    }
    pathCells.clear();
    for (const chunk of chunkStore.values()) {
      for (const mesh of chunk.typeMeshes.values()) {
        placementLayer.remove(mesh);
        disposeMesh(mesh);
      }
    }
    chunkStore.clear();
    dirtyChunks.clear();
  }

  function removeTilesOutOfRange(halfSize) {
    let changed = false;
    for (const [cellKey] of Array.from(pathCells.entries())) {
      const { i, j, x, z } = cellFromCellKey(cellKey);
      if (Math.abs(x) > halfSize || Math.abs(z) > halfSize) {
        pathCells.delete(cellKey);
        occupiedCells.delete(toOccupiedKey(x, z));
        markCellAndNeighborsDirty(i, j);
        changed = true;
      }
    }
    if (changed) rebuildDirtyChunks();
  }

  function setPathAt(worldX, worldZ, type = pathState.pathType) {
    const cell = cellFromWorld(worldX, worldZ);
    const changed = applyStrokeLine(cell, (c) => setPathCell(c, type));
    if (changed) rebuildDirtyChunks();
    return changed;
  }

  function removePathAt(worldX, worldZ) {
    const cell = cellFromWorld(worldX, worldZ);
    const changed = applyStrokeLine(cell, removePathCell);
    if (changed) rebuildDirtyChunks();
    return changed;
  }

  function placeTile(worldX, worldZ) {
    return setPathAt(worldX, worldZ, pathState.pathType);
  }

  function updatePreview({ hasHit, lastHitWorld, placementState }) {
    if (
      !placementState.active ||
      placementState.action === "delete" ||
      placementState.mode !== "path" ||
      !hasHit
    ) {
      preview.visible = false;
      return;
    }

    const { x, z, cellKey } = cellFromWorld(lastHitWorld.x, lastHitWorld.z);
    const existing = pathCells.get(cellKey);
    const blocked =
      (!existing && occupiedCells.has(toOccupiedKey(x, z))) ||
      !hasSufficientCoverage(x, z);

    preview.material.color.setHex(
      blocked ? 0xff3333 : PATH_TYPES[pathState.pathType].color,
    );
    writePreviewToTerrain(preview.geometry, getSampleHeight, x, z);
    preview.visible = true;
  }

  // ── Chunk machinery ──────────────────────────────────────────────────────

  function markCellAndNeighborsDirty(i, j) {
    for (const [di, dj] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]) {
      dirtyChunks.add(`${Math.floor((i+di)/CHUNK_CELLS)},${Math.floor((j+dj)/CHUNK_CELLS)}`);
    }
  }

  function rebuildDirtyChunks() {
    for (const key of dirtyChunks) rebuildChunk(key);
    dirtyChunks.clear();
  }

  function rebuildChunk(chunkKey) {
    const [ciStr, cjStr] = chunkKey.split(",");
    const ci = Number(ciStr), cj = Number(cjStr);

    let chunk = chunkStore.get(chunkKey);
    if (!chunk) { chunk = { typeMeshes: new Map() }; chunkStore.set(chunkKey, chunk); }

    for (const mesh of chunk.typeMeshes.values()) { placementLayer.remove(mesh); disposeMesh(mesh); }
    chunk.typeMeshes.clear();

    for (const type of Object.keys(PATH_TYPES)) {
      const geometry = buildChunkGeometry(ci, cj, type);
      if (!geometry) continue;
      const mesh = new THREE.Mesh(geometry, createTileMaterial(type));
      mesh.receiveShadow = true;
      mesh.userData.chunkKey = chunkKey;
      mesh.userData.pathType = type;
      placementLayer.add(mesh);
      chunk.typeMeshes.set(type, mesh);
    }
  }

  function buildChunkGeometry(ci, cj, type) {
    const iStart = ci * CHUNK_CELLS, jStart = cj * CHUNK_CELLS;

    let hasAny = false;
    outer: for (let j = 0; j < CHUNK_CELLS; j++)
      for (let i = 0; i < CHUNK_CELLS; i++)
        if (pathCells.get(toCellKey(iStart + i, jStart + j)) === type) { hasAny = true; break outer; }
    if (!hasAny) return null;

    const gridCols = CHUNK_CELLS * PATH_SUBDIV + 1;
    const gridRows = CHUNK_CELLS * PATH_SUBDIV + 1;
    const positions = [], uvs = [];
    const sampler = getSampleHeight();

    for (let gj = 0; gj < gridRows; gj++) {
      for (let gi = 0; gi < gridCols; gi++) {
        const wx = (iStart + gi / PATH_SUBDIV) * GRID_CELL_SIZE;
        const wz = (jStart + gj / PATH_SUBDIV) * GRID_CELL_SIZE;
        positions.push(wx, sampler(wx, wz) + PLACED_OFFSET, wz);
        // World-space UVs — texture flows continuously across chunk edges.
        uvs.push(wx / GRID_CELL_SIZE, wz / GRID_CELL_SIZE);
      }
    }

    const indices = [];
    for (let j = 0; j < CHUNK_CELLS; j++) {
      for (let i = 0; i < CHUNK_CELLS; i++) {
        if (pathCells.get(toCellKey(iStart + i, jStart + j)) !== type) continue;
        for (let sy = 0; sy < PATH_SUBDIV; sy++) {
          for (let sx = 0; sx < PATH_SUBDIV; sx++) {
            const gi = i * PATH_SUBDIV + sx, gj = j * PATH_SUBDIV + sy;
            const a = gj * gridCols + gi;
            const b = a+1, c = a+gridCols, d = c+1;
            indices.push(a, b, d, a, d, c);
          }
        }
      }
    }
    if (indices.length === 0) return null;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv",       new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }

  // ── Stroke helpers ───────────────────────────────────────────────────────

  function applyStrokeLine(targetCell, applyCell) {
    const start = lastStrokeCell ?? targetCell;
    const points = rasterLine(start.i, start.j, targetCell.i, targetCell.j);
    let changed = false;
    for (const [i, j] of points) {
      const c = cellFromIndex(i, j);
      if (strokeVisited) {
        if (strokeVisited.has(c.cellKey)) continue;
        strokeVisited.add(c.cellKey);
      }
      changed = applyCell(c) || changed;
    }
    lastStrokeCell = targetCell;
    return changed;
  }

  function setPathCell(cell, type) {
    const { i, j, x, z, cellKey } = cell;
    const occupiedKey = toOccupiedKey(x, z);
    const existing = pathCells.get(cellKey);
    if (existing === type) return false;
    if (!existing && occupiedCells.has(occupiedKey)) return false;
    if (!hasSufficientCoverage(x, z)) return false;
    pathCells.set(cellKey, type);
    occupiedCells.add(occupiedKey);
    markCellAndNeighborsDirty(i, j);
    return true;
  }

  function removePathCell(cell) {
    const { i, j, x, z, cellKey } = cell;
    if (!pathCells.has(cellKey)) return false;
    pathCells.delete(cellKey);
    occupiedCells.delete(toOccupiedKey(x, z));
    markCellAndNeighborsDirty(i, j);
    return true;
  }

  return {
    pathState, placeTile, setPathAt, removePathAt,
    beginStroke, endStroke, clearTiles, removeTilesOutOfRange,
    refreshPreviewMaterial, updatePreview, preview,
  };
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

function toCellKey(i, j) { return `${i},${j}`; }

function cellFromWorld(worldX, worldZ) {
  const { x, z } = toPlacementPoint(worldX, worldZ);
  const half = GRID_CELL_SIZE / 2;
  const i = Math.round((x - half) / GRID_CELL_SIZE);
  const j = Math.round((z - half) / GRID_CELL_SIZE);
  return { i, j, x, z, cellKey: toCellKey(i, j) };
}

function cellFromIndex(i, j) {
  const { x, z } = worldFromCell(i, j);
  return { i, j, x, z, cellKey: toCellKey(i, j) };
}

function cellFromCellKey(cellKey) {
  const [iStr, jStr] = cellKey.split(",");
  const i = Number(iStr), j = Number(jStr);
  const { x, z } = worldFromCell(i, j);
  return { i, j, x, z, cellKey };
}

function worldFromCell(i, j) {
  const half = GRID_CELL_SIZE / 2;
  return { x: i * GRID_CELL_SIZE + half, z: j * GRID_CELL_SIZE + half };
}

function worldFromCellKey(cellKey) {
  const [iStr, jStr] = cellKey.split(",");
  return worldFromCell(Number(iStr), Number(jStr));
}

function toOccupiedKey(x, z) { return `${Math.round(x * 100)},${Math.round(z * 100)}`; }

function rasterLine(x0, y0, x1, y1) {
  const pts = [];
  let dx = Math.abs(x1-x0), sx = x0<x1?1:-1;
  let dy = -Math.abs(y1-y0), sy = y0<y1?1:-1;
  let err = dx+dy, x = x0, y = y0;
  while (true) {
    pts.push([x, y]);
    if (x===x1 && y===y1) break;
    const e2 = 2*err;
    if (e2>=dy) { err+=dy; x+=sx; }
    if (e2<=dx) { err+=dx; y+=sy; }
  }
  return pts;
}

function disposeMesh(mesh) {
  mesh.geometry?.dispose?.();
  if (Array.isArray(mesh.material)) mesh.material.forEach(m => m?.dispose?.());
  else mesh.material?.dispose?.();
}

// ── Material & Texture ────────────────────────────────────────────────────────

function createTileMaterial(type, { preview = false } = {}) {
  const mat = new THREE.MeshStandardMaterial({
    // PATH_TYPES colour is the base for all tiles — texture multiplies on top.
    // Without this, types that have no texture (dirt, water) appear white.
    color: PATH_TYPES[type]?.color ?? 0xffffff,
    transparent: true,
    opacity: preview ? 0.55 : 0.94,
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0.0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  if (preview) mat.renderOrder = 500;

  const texture = getPathTexture(type);
  if (texture) mat.map = texture;
  return mat;
}

function createPreviewGeometry() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(12, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1], 2));
  geo.setIndex([0,1,2,0,2,3]);
  return geo;
}

function writePreviewToTerrain(geometry, getSampleHeight, cx, cz) {
  const half = GRID_CELL_SIZE / 2;
  const x0=cx-half, x1=cx+half, z0=cz-half, z1=cz+half;
  const s = getSampleHeight();
  const p = geometry.attributes.position.array;
  p[0]=x0; p[1]=s(x0,z0)+PREVIEW_OFFSET; p[2]=z0;
  p[3]=x1; p[4]=s(x1,z0)+PREVIEW_OFFSET; p[5]=z0;
  p[6]=x1; p[7]=s(x1,z1)+PREVIEW_OFFSET; p[8]=z1;
  p[9]=x0; p[10]=s(x0,z1)+PREVIEW_OFFSET; p[11]=z1;
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
}

function getPathTexture(type) {
  if (textureCache.has(type)) return textureCache.get(type);

  let texture = null;
  const repeat = [1.5, 1.5];

  if (type === "rock") {
    texture = loadGLBTexture("/textures/paths/rock_path_round_wide.glb", buildStonePlaceholder);
  } else if (type === "sand") {
    texture = loadGLBTexture("/textures/paths/beach_sand_path.glb", buildSandTexture);
  } else if (type === "grass") {
    texture = buildGrassTexture();
    repeat[0] = repeat[1] = 2.0;
  } else if (type === "water") {
    texture = buildWaterTexture();
    repeat[0] = repeat[1] = 1.0;
  }

  if (texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(...repeat);
  }

  textureCache.set(type, texture);
  return texture;
}

// Loads a GLB, extracts the first mesh's base-colour map, and hot-swaps it
// into a placeholder texture that materials already reference — no chunk
// rebuild needed since Three.js re-uploads on the next render.
function loadGLBTexture(glbPath, fallbackFn) {
  const tex = fallbackFn();
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.5, 1.5);

  new GLTFLoader().load(glbPath, (gltf) => {
    let map = null;
    gltf.scene.traverse((child) => {
      if (!map && child.isMesh) {
        const mat = Array.isArray(child.material) ? child.material[0] : child.material;
        if (mat?.map) map = mat.map;
      }
    });
    if (map) {
      tex.image = map.image;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
    }
  });

  return tex;
}

// Warm-stone placeholder shown while the rock GLB is fetching.
function buildStonePlaceholder() {
  return solidCanvas(64, "#C8B89A");
}

// Manicured grass — flat base with subtle mow-stripe variation.
function buildGrassTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#5A9040";
  ctx.fillRect(0, 0, size, size);

  // Alternating mow stripes
  const stripeW = 32;
  for (let x = 0; x < size; x += stripeW * 2) {
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(x, 0, stripeW, size);
  }

  // Very fine surface noise
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    ctx.globalAlpha = 0.05 + Math.random() * 0.08;
    ctx.fillStyle = Math.random() > 0.5 ? "#4A7A32" : "#70B050";
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;

  return makeCanvasTexture(canvas);
}

// Shallow water with soft ripple lines.
function buildWaterTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#4090C8";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 40; i++) {
    const y = Math.random() * size;
    ctx.globalAlpha = 0.08 + Math.random() * 0.14;
    ctx.strokeStyle = Math.random() > 0.5 ? "#60B0E0" : "#2878AA";
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 20) {
      ctx.lineTo(x, y + (Math.random() - 0.5) * 5);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  return makeCanvasTexture(canvas);
}

// Sand fallback used while beach GLB loads.
function buildSandTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#D4B870";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    ctx.globalAlpha = 0.10 + Math.random() * 0.18;
    ctx.fillStyle = Math.random() > 0.5 ? "#BFA050" : "#ECD898";
    ctx.fillRect(x, y, Math.random() * 2 + 0.5, Math.random() * 1.5 + 0.5);
  }
  ctx.globalAlpha = 1;

  return makeCanvasTexture(canvas);
}

function solidCanvas(size, color) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  return makeCanvasTexture(canvas);
}

function makeCanvasTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
