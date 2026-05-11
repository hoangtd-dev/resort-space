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

  // Object layer
  const objectLayer = new THREE.Group();
  objectLayer.name = "placedObjects";
  scene.add(objectLayer);

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
    const ixMax = Math.min(widthSegments, Math.ceil((cx + hw + blendDist + halfW) / cw));
    const iyMin = Math.max(0, Math.floor((cz - hd - blendDist + halfH) / ch));
    const iyMax = Math.min(heightSegments, Math.ceil((cz + hd + blendDist + halfH) / ch));

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
    land.geometry.computeVertexNormals();
  }

  // Placement helpers
  function spawnInstance(config, wrapper, x, z) {
    const y = getSampleHeight()(x, z);
    flattenTerrainUnder(x, z, config.cols, config.rows, y);
    wrapper.position.set(x, y, z);
    const instance = modelCache.get(config.path).model.clone(true);
    instance.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    wrapper.add(instance);
  }

  // Public API
  function refreshFootprint() {
    const config = OBJECT_CONFIGS[objectState.objectType];
    footprintPreview.geometry.dispose();
    footprintPreview.geometry = buildFootprintGeometry(config);
    loadModel(config);
  }

  function clearObjects() {
    for (const child of objectLayer.children) {
      (child.userData.cellKeys || []).forEach((k) => occupiedCells.delete(k));
      child.traverse((node) => {
        if (node.isMesh) node.geometry.dispose();
      });
    }
    objectLayer.clear();
  }

  function removeObjectsOutOfRange(halfSize) {
    const toRemove = [];
    for (const child of objectLayer.children) {
      if (Math.abs(child.position.x) > halfSize || Math.abs(child.position.z) > halfSize) {
        toRemove.push(child);
      }
    }
    for (const child of toRemove) {
      (child.userData.cellKeys || []).forEach((k) => occupiedCells.delete(k));
      child.traverse((node) => {
        if (node.isMesh) node.geometry.dispose();
      });
      objectLayer.remove(child);
    }
  }

  function placeObject(worldX, worldZ) {
    const config = OBJECT_CONFIGS[objectState.objectType];
    const entry = loadModel(config);
    if (!entry.loaded) return;
    const { x, z } = snapForObject(worldX, worldZ, config.cols, config.rows);
    const keys = getCoveredCellKeys(x, z, config.cols, config.rows);
    if (keys.some((k) => occupiedCells.has(k))) return;
    keys.forEach((k) => occupiedCells.add(k));
    const wrapper = new THREE.Group();
    wrapper.userData.cellKeys = keys;
    objectLayer.add(wrapper);
    spawnInstance(config, wrapper, x, z);
  }

  function placeObjectOfType(type, wx, wz) {
    const config = OBJECT_CONFIGS[type];
    if (!config) return;
    const { x, z } = snapForObject(wx, wz, config.cols, config.rows);
    const keys = getCoveredCellKeys(x, z, config.cols, config.rows);
    if (keys.some((k) => occupiedCells.has(k))) return;
    keys.forEach((k) => occupiedCells.add(k));
    const wrapper = new THREE.Group();
    wrapper.userData.cellKeys = keys;
    objectLayer.add(wrapper);
    loadModel(config, () => spawnInstance(config, wrapper, x, z));
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
    const blocked = getCoveredCellKeys(x, z, config.cols, config.rows).some(
      (k) => occupiedCells.has(k),
    );
    footprintPreview.material.color.setHex(blocked ? 0xff3333 : 0x4488ff);
    footprintPreview.position.set(
      x,
      getSampleHeight()(x, z) + PREVIEW_OFFSET,
      z,
    );
    footprintPreview.visible = true;
  }

  function removeByHitObject(hitObject) {
    const root = findPlacementRoot(hitObject);
    if (!root) return false;
    (root.userData.cellKeys || []).forEach((k) => occupiedCells.delete(k));
    root.traverse((node) => {
      if (node.isMesh) node.geometry?.dispose?.();
    });
    objectLayer.remove(root);
    return true;
  }

  function findPlacementRoot(obj) {
    let cur = obj;
    while (cur && cur.parent && cur.parent !== objectLayer) cur = cur.parent;
    return cur && cur.parent === objectLayer ? cur : null;
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
    removeByHitObject,
    updatePreview,
    preview: footprintPreview,
    objectLayer,
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
