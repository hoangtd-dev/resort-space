import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PATH_TYPES } from "./placementToolbar";

const MASK_RES = 1024;
const OVERLAY_LIFT = 0.05;
const TEXTURE_REPEAT = 50;
const BRUSH_SPRITE_SIZE = 128;

const sharedTextureCache = new Map();
const SPRAY_PATH_TYPES = ["rock", "grass", "sand"];

export function createSprayPathTool({ scene, land, getSampleHeight, getHalfSize }) {
  const sprayState = {
    pathType: "rock",
    radius: 3.0,
    strength: 0.85,
  };

  const overlays = new Map();
  const masks = new Map();

  for (const type of SPRAY_PATH_TYPES) {
    const { canvas, ctx, texture } = createMaskCanvas();
    masks.set(type, { canvas, ctx, texture, hasContent: false });

    const overlay = createOverlayMesh(land, type, texture);
    overlay.name = `sprayPath:${type}`;
    overlay.userData.landVersion = land.geometry.attributes.position.version;
    overlays.set(type, overlay);
    scene.add(overlay);
  }

  const brushSprite = createBrushSprite();
  const cursor = createCursorRing();
  scene.add(cursor);

  function syncOverlayHeights() {
    const landPos = land.geometry.attributes.position;
    for (const [type, overlay] of overlays) {
      // Only spend cycles syncing overlays that the user has actually painted
      // on. Empty overlays render fully transparent — terrain drift on them is
      // invisible.
      if (!masks.get(type).hasContent) continue;
      if (overlay.userData.landVersion === landPos.version) continue;
      overlay.userData.landVersion = landPos.version;

      const op = overlay.geometry.attributes.position;
      if (op.count !== landPos.count) {
        overlay.geometry.dispose();
        overlay.geometry = land.geometry.clone();
      } else {
        for (let i = 0; i < landPos.count; i++) {
          op.setZ(i, landPos.getZ(i));
        }
        op.needsUpdate = true;
        overlay.geometry.computeVertexNormals();
      }
    }
  }

  function rebuildForLandResize() {
    const v = land.geometry.attributes.position.version;
    for (const overlay of overlays.values()) {
      overlay.geometry.dispose();
      overlay.geometry = land.geometry.clone();
      overlay.userData.landVersion = v;
    }
  }

  function worldToCanvasPx(worldX, worldZ) {
    const half = getHalfSize();
    const u = (worldX + half) / (2 * half);
    const v = (worldZ + half) / (2 * half);
    return { px: u * MASK_RES, py: v * MASK_RES };
  }

  function brushRadiusPx() {
    const half = getHalfSize();
    return (sprayState.radius / (2 * half)) * MASK_RES;
  }

  function spray(worldX, worldZ, { erase = false } = {}) {
    const mask = masks.get(sprayState.pathType);
    if (!mask) return;
    const { ctx, texture } = mask;
    const { px, py } = worldToCanvasPx(worldX, worldZ);
    const r = brushRadiusPx();

    ctx.save();
    ctx.globalCompositeOperation = erase ? "destination-out" : "source-over";
    ctx.globalAlpha = sprayState.strength;
    ctx.drawImage(brushSprite, px - r, py - r, r * 2, r * 2);
    ctx.restore();

    texture.needsUpdate = true;
    if (!erase) mask.hasContent = true;
  }

  function clearAll() {
    for (const mask of masks.values()) {
      mask.ctx.clearRect(0, 0, MASK_RES, MASK_RES);
      mask.texture.needsUpdate = true;
      mask.hasContent = false;
    }
  }

  function updateCursor({ hasHit, lastHitWorld, placementState }) {
    const visible =
      placementState.active &&
      placementState.mode === "spray" &&
      hasHit;
    cursor.visible = visible;
    if (!visible) return;

    const sampler = getSampleHeight();
    cursor.position.set(
      lastHitWorld.x,
      sampler(lastHitWorld.x, lastHitWorld.z) + 0.15,
      lastHitWorld.z,
    );
    cursor.scale.setScalar(sprayState.radius);
    const erase = placementState.action === "delete";
    cursor.material.color.setHex(
      erase ? 0xff5555 : PATH_TYPES[sprayState.pathType]?.color ?? 0xffffff,
    );
  }

  function setRadius(r) { sprayState.radius = Math.max(0.5, Math.min(20, r)); }
  function setStrength(s) { sprayState.strength = Math.max(0.05, Math.min(1, s)); }

  return {
    sprayState,
    spray,
    clearAll,
    updateCursor,
    syncOverlayHeights,
    rebuildForLandResize,
    setRadius,
    setStrength,
    cursor,
  };
}

// ─── helpers ────────────────────────────────────────────────────────────────

function createMaskCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = MASK_RES;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, MASK_RES, MASK_RES);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return { canvas, ctx, texture };
}

function createOverlayMesh(land, type, alphaMap) {
  const geometry = land.geometry.clone();
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: getSharedPathTexture(type),
    alphaMap,
    transparent: true,
    alphaTest: 0.0,
    depthWrite: false,
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0.0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = OVERLAY_LIFT;
  mesh.receiveShadow = true;
  return mesh;
}

function createBrushSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = BRUSH_SPRITE_SIZE;
  const ctx = c.getContext("2d");
  const r = BRUSH_SPRITE_SIZE / 2;

  // Solid white core (70% radius), then quick feather to edge.
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0.0, "rgba(255,255,255,1.0)");
  grad.addColorStop(0.65, "rgba(255,255,255,1.0)");
  grad.addColorStop(0.85, "rgba(255,255,255,0.55)");
  grad.addColorStop(1.0, "rgba(255,255,255,0.0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, BRUSH_SPRITE_SIZE, BRUSH_SPRITE_SIZE);

  // Add speckle noise inside core for grainy spray feel.
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 60; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = Math.random() * r * 0.85;
    const x = r + Math.cos(a) * rr;
    const y = r + Math.sin(a) * rr;
    ctx.globalAlpha = 0.05 + Math.random() * 0.1;
    ctx.beginPath();
    ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return c;
}

function createCursorRing() {
  const geo = new THREE.RingGeometry(0.95, 1.0, 64);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
  });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 9999;
  m.visible = false;
  return m;
}

// ─── shared textures (rock/sand/grass/water) ────────────────────────────────

function getSharedPathTexture(type) {
  if (sharedTextureCache.has(type)) return sharedTextureCache.get(type);

  let texture = null;
  if (type === "rock") {
    texture = loadGLBTexture("/textures/paths/rock_path_round_wide.glb", buildStonePlaceholder);
  } else if (type === "sand") {
    texture = loadGLBTexture("/textures/paths/beach_sand_path.glb", buildSandTexture);
  } else if (type === "grass") {
    texture = buildGrassTexture();
  } else if (type === "water") {
    texture = buildWaterTexture();
  }

  if (texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(TEXTURE_REPEAT, TEXTURE_REPEAT);
  }

  sharedTextureCache.set(type, texture);
  return texture;
}

function loadGLBTexture(glbPath, fallbackFn) {
  const tex = fallbackFn();
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(TEXTURE_REPEAT, TEXTURE_REPEAT);

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

function buildStonePlaceholder() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#988470"; ctx.fillRect(0, 0, size, size);

  // Cobblestones.
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = 6 + Math.random() * 10;
    ctx.globalAlpha = 0.55 + Math.random() * 0.35;
    ctx.fillStyle = ["#7A6850", "#A89678", "#C8B898", "#5E4E38"][Math.floor(Math.random() * 4)];
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.7 + Math.random() * 0.4), Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mortar shadows.
  for (let i = 0; i < 200; i++) {
    ctx.globalAlpha = 0.08 + Math.random() * 0.12;
    ctx.fillStyle = "#3A2E20";
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;
  return makeCanvasTexture(canvas);
}

function buildGrassTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#5A9040"; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    ctx.globalAlpha = 0.05 + Math.random() * 0.08;
    ctx.fillStyle = Math.random() > 0.5 ? "#4A7A32" : "#70B050";
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;
  return makeCanvasTexture(canvas);
}

function buildWaterTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Base gradient — deeper at top, lighter at bottom for depth feel.
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, "#2878AA");
  grad.addColorStop(1, "#4FA8D8");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, size, size);

  // Caustic ripples — bright wavy lines that read at distance.
  for (let i = 0; i < 80; i++) {
    const y = Math.random() * size;
    ctx.globalAlpha = 0.18 + Math.random() * 0.25;
    ctx.strokeStyle = Math.random() > 0.4 ? "#A8D8F0" : "#80C0E8";
    ctx.lineWidth = 1.5 + Math.random() * 2.5;
    ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 12) {
      ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 4 + (Math.random() - 0.5) * 3);
    }
    ctx.stroke();
  }

  // Highlight specks — sun glints.
  for (let i = 0; i < 60; i++) {
    ctx.globalAlpha = 0.25 + Math.random() * 0.4;
    ctx.fillStyle = "#E8F4FF";
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 0.5 + Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return makeCanvasTexture(canvas);
}

function buildSandTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#D4B870"; ctx.fillRect(0, 0, size, size);

  // Fine grain.
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    ctx.globalAlpha = 0.15 + Math.random() * 0.25;
    ctx.fillStyle = Math.random() > 0.5 ? "#A0855A" : "#F0DDA0";
    ctx.fillRect(x, y, Math.random() * 1.5 + 0.4, Math.random() * 1.5 + 0.4);
  }

  // Pebbles — readable at distance.
  for (let i = 0; i < 30; i++) {
    ctx.globalAlpha = 0.5 + Math.random() * 0.3;
    ctx.fillStyle = ["#8E7848", "#B89868", "#E8D098"][Math.floor(Math.random() * 3)];
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 1.5 + Math.random() * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wind ripple lines.
  for (let i = 0; i < 8; i++) {
    const y = Math.random() * size;
    ctx.globalAlpha = 0.08 + Math.random() * 0.12;
    ctx.strokeStyle = "#806840";
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 8) {
      ctx.lineTo(x, y + Math.sin(x * 0.08 + i * 2) * 3);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return makeCanvasTexture(canvas);
}

function solidCanvas(size, color) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color; ctx.fillRect(0, 0, size, size);
  return makeCanvasTexture(canvas);
}

function makeCanvasTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
