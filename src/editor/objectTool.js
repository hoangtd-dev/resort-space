import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OBJECT_CONFIGS } from "./objectConfig";
import { generateThumb } from "./thumbGen";
import {
  GRID_CELL_SIZE,
  PREVIEW_OFFSET,
  snapForObject,
  getCoveredCellKeys,
} from "./snapGrid";
import { isPlacementAllowed } from "./placementZones";
import { createInstancer } from "./instancer";
import { OBJECT_SCALES } from "./objectScales";

export function createObjectTool({
  scene,
  land,
  occupiedCells,
  getSampleHeight,
  onThumbReady,
}) {
  const objectState = { objectType: Object.keys(OBJECT_CONFIGS)[0] };

  const gltfLoader = new GLTFLoader();
  const modelCache = new Map();
  const instancer = createInstancer(scene);
  let terrainDirty = false;


  // Footprint preview mesh
  const footprintPreview = new THREE.Mesh(
    buildFootprintGeometry(OBJECT_CONFIGS[objectState.objectType]),
    new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  footprintPreview.rotation.x = -Math.PI / 2;
  footprintPreview.visible = false;
  footprintPreview.renderOrder = 501;
  scene.add(footprintPreview);

  // Model loading
  function loadModel(config, onLoaded) {
    if (!modelCache.has(config.path)) {
      const entry = { loaded: false, model: null, callbacks: [] };
      modelCache.set(config.path, entry);
      gltfLoader.load(config.path, (gltf) => {
        fitModelToFootprint(gltf.scene, config.cols, config.rows);
        entry.model = gltf.scene;
        entry.loaded = true;

        if (!config.thumb) {
          try {
            const dataURL = generateThumb(gltf.scene);
            if (dataURL) {
              config.thumb = dataURL;
              onThumbReady?.();
            }
          } catch {
            // Thumbnail generation is non-critical
          }
        }

        instancer.initType(config.path, entry.model);

        for (const cb of entry.callbacks) cb();
        entry.callbacks = [];
      });
    }
    const entry = modelCache.get(config.path);
    if (onLoaded) {
      if (entry.loaded) onLoaded();
      else entry.callbacks.push(onLoaded);
    }
    return entry;
  }

  // Terrain flattening with feathered blend ring.
  // Vertices inside the footprint are set to targetH exactly.
  // Vertices in a 3-cell-wide ring outside the footprint blend smoothly
  // from targetH back to the existing terrain height, eliminating hard pad edges.
  function flattenTerrainUnder(cx, cz, cols, rows, targetH) {
    const positions = land.geometry.attributes.position;
    const { width, height, widthSegments, heightSegments } =
      land.geometry.parameters;
    const cw = width / widthSegments;
    const ch = height / heightSegments;
    const numCols = widthSegments + 1;
    const halfW = width / 2;
    const halfH = height / 2;
    const hw = (cols * GRID_CELL_SIZE) / 2;
    const hd = (rows * GRID_CELL_SIZE) / 2;
    const blendDist = cw * 3; // world-unit width of the soft blend ring

    const ixMin = Math.max(0, Math.floor((cx - hw - blendDist + halfW) / cw));
    const ixMax = Math.min(
      widthSegments,
      Math.ceil((cx + hw + blendDist + halfW) / cw),
    );
    const iyMin = Math.max(0, Math.floor((cz - hd - blendDist + halfH) / ch));
    const iyMax = Math.min(
      heightSegments,
      Math.ceil((cz + hd + blendDist + halfH) / ch),
    );

    for (let iy = iyMin; iy <= iyMax; iy++) {
      for (let ix = ixMin; ix <= ixMax; ix++) {
        const i = iy * numCols + ix;
        const vx = (ix / widthSegments - 0.5) * width;
        const vz = (iy / heightSegments - 0.5) * height;
        // Distance overflowing outside the footprint rectangle (0 inside).
        const ox = Math.max(0, Math.abs(vx - cx) - hw);
        const oz = Math.max(0, Math.abs(vz - cz) - hd);

        if (ox === 0 && oz === 0) {
          positions.setZ(i, targetH);
        } else {
          const d = Math.sqrt(ox * ox + oz * oz);
          if (d < blendDist) {
            const t = d / blendDist;
            const blend = t * t * (3 - 2 * t); // smoothstep 0→1
            positions.setZ(i, targetH + (positions.getZ(i) - targetH) * blend);
          }
        }
      }
    }
    positions.needsUpdate = true;
    terrainDirty = true;
  }

  function flushTerrainNormals() {
    if (!terrainDirty) return;
    terrainDirty = false;
    land.geometry.computeVertexNormals();
  }

  // Public API
  function refreshFootprint() {
    const config = OBJECT_CONFIGS[objectState.objectType];
    footprintPreview.geometry.dispose();
    footprintPreview.geometry = buildFootprintGeometry(config);
    loadModel(config);
  }

  function clearObjects() {
    occupiedCells.clear();
    instancer.clear();
  }

  function removeInstance(im, instanceId) {
    const hit = instancer.identify(im, instanceId);
    if (!hit) return false;
    const cellKeys = instancer.remove(hit.path, hit.idx);
    if (cellKeys) cellKeys.forEach((k) => occupiedCells.delete(k));
    return true;
  }

  function removeObjectsOutOfRange(halfSize) {
    const freed = instancer.removeWhere(
      ({ x, z }) => Math.abs(x) > halfSize || Math.abs(z) > halfSize,
    );
    freed.forEach((k) => occupiedCells.delete(k));
  }

  function placeObject(worldX, worldZ) {
    const type = objectState.objectType;
    const config = OBJECT_CONFIGS[type];
    const entry = loadModel(config);
    if (!entry.loaded) return;
    const { x, z } = snapForObject(worldX, worldZ, config.cols, config.rows);
    if (!isPlacementAllowed(type, x, z, getSampleHeight())) return;
    const keys = getCoveredCellKeys(x, z, config.cols, config.rows);
    if (keys.some((k) => occupiedCells.has(k))) return;
    keys.forEach((k) => occupiedCells.add(k));
    const scale = OBJECT_SCALES[type] ?? 1;
    const y = getSampleHeight()(x, z);
    if (config.cols > 1 || config.rows > 1)
      flattenTerrainUnder(x, z, config.cols * scale, config.rows * scale, y);
    instancer.add(config.path, x, y, z, keys, scale);
  }

  // yOverride: fixed world-Y for water objects (skips terrain sampling + flattening).
  function placeObjectOfType(type, wx, wz, yOverride = null) {
    const config = OBJECT_CONFIGS[type];
    if (!config) return;
    const { x, z } = snapForObject(wx, wz, config.cols, config.rows);
    if (!isPlacementAllowed(type, x, z, getSampleHeight())) return;
    const keys = getCoveredCellKeys(x, z, config.cols, config.rows);
    if (keys.some((k) => occupiedCells.has(k))) return;
    keys.forEach((k) => occupiedCells.add(k));
    const scale = OBJECT_SCALES[type] ?? 1;
    loadModel(config, () => {
      const y = yOverride !== null ? yOverride : getSampleHeight()(x, z);
      if (yOverride === null && (config.cols > 1 || config.rows > 1))
        flattenTerrainUnder(x, z, config.cols * scale, config.rows * scale, y);
      instancer.add(config.path, x, y, z, keys, scale);
    });
  }

  function updatePreview({ hasHit, lastHitWorld, placementState }) {
    if (
      !placementState.active ||
      placementState.action === "delete" ||
      placementState.mode !== "object" ||
      !hasHit
    ) {
      footprintPreview.visible = false;
      return;
    }
    const config = OBJECT_CONFIGS[objectState.objectType];
    const { x, z } = snapForObject(
      lastHitWorld.x,
      lastHitWorld.z,
      config.cols,
      config.rows,
    );
    const occupied = getCoveredCellKeys(x, z, config.cols, config.rows).some(
      (k) => occupiedCells.has(k),
    );
    const zoneBlocked = !isPlacementAllowed(
      objectState.objectType,
      x,
      z,
      getSampleHeight(),
    );
    const blocked = occupied || zoneBlocked;
    footprintPreview.material.color.setHex(blocked ? 0xff3333 : 0x4488ff);
    footprintPreview.position.set(
      x,
      getSampleHeight()(x, z) + PREVIEW_OFFSET,
      z,
    );
    footprintPreview.visible = true;
  }

  // Kick off load for the default object type
  loadModel(OBJECT_CONFIGS[objectState.objectType]);

  return {
    objectState,
    placeObject,
    placeObjectOfType,
    clearObjects,
    removeObjectsOutOfRange,
    refreshFootprint,
    removeInstance,
    flushTerrainNormals,
    getInstancedMeshes: () => instancer.getAllMeshes(),
    updatePreview,
    preview: footprintPreview,
  };
}

function buildFootprintGeometry(config) {
  return new THREE.PlaneGeometry(
    config.cols * GRID_CELL_SIZE,
    config.rows * GRID_CELL_SIZE,
  );
}

function fitModelToFootprint(model, cols, rows) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  if (size.x === 0 || size.z === 0) return;
  const scale = Math.min(
    (cols * GRID_CELL_SIZE * 0.9) / size.x,
    (rows * GRID_CELL_SIZE * 0.9) / size.z,
  );
  model.scale.setScalar(scale);
  box.setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;
}
