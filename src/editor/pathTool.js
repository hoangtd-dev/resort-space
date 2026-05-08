import * as THREE from "three";
import {
  GRID_CELL_SIZE,
  PLACED_OFFSET,
  PREVIEW_OFFSET,
  toPlacementPoint,
  getCoveredCellKeys,
} from "./snapGrid";
import { PATH_TYPES } from "./placementToolbar";

export function createPathTool({ scene, occupiedCells, getSampleHeight }) {
  const pathState = { pathType: "stone" };

  // Path preview mesh
  const preview = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID_CELL_SIZE, GRID_CELL_SIZE),
    createTileMaterial(pathState.pathType, 0.55),
  );
  preview.rotation.x = -Math.PI / 2;
  preview.visible = false;
  preview.renderOrder = 500;
  preview.material.depthWrite = false;
  scene.add(preview);

  const placementLayer = new THREE.Group();
  placementLayer.name = "pathTiles";
  scene.add(placementLayer);

  // Public API
  function refreshPreviewMaterial() {
    preview.material.dispose();
    preview.material = createTileMaterial(pathState.pathType, 0.55);
    preview.material.depthWrite = false;
  }

  function clearTiles() {
    for (const child of placementLayer.children) {
      (child.userData.cellKeys || []).forEach((k) => occupiedCells.delete(k));
      child.geometry.dispose();
      child.material.dispose();
    }
    placementLayer.clear();
  }

  function placeTile(worldX, worldZ) {
    const { x, z } = toPlacementPoint(worldX, worldZ);
    const keys = getCoveredCellKeys(x, z, 1, 1);
    if (keys.some((k) => occupiedCells.has(k))) return;
    keys.forEach((k) => occupiedCells.add(k));
    const y = getSampleHeight()(x, z) + PLACED_OFFSET;
    const tile = new THREE.Mesh(
      new THREE.PlaneGeometry(GRID_CELL_SIZE, GRID_CELL_SIZE),
      createTileMaterial(pathState.pathType, 0.95),
    );
    tile.rotation.x = -Math.PI / 2;
    tile.position.set(x, y, z);
    tile.receiveShadow = true;
    tile.userData.cellKeys = keys;
    placementLayer.add(tile);
  }

  function updatePreview({ hasHit, lastHitWorld, placementState }) {
    if (!placementState.active || placementState.mode !== "path" || !hasHit) {
      preview.visible = false;
      return;
    }
    const { x, z } = toPlacementPoint(lastHitWorld.x, lastHitWorld.z);
    const blocked = getCoveredCellKeys(x, z, 1, 1).some((k) =>
      occupiedCells.has(k),
    );
    preview.material.color.setHex(
      blocked ? 0xff3333 : PATH_TYPES[pathState.pathType].color,
    );
    const y = getSampleHeight()(x, z) + PREVIEW_OFFSET;
    preview.position.set(x, y, z);
    preview.visible = true;
  }

  return {
    pathState,
    placeTile,
    clearTiles,
    refreshPreviewMaterial,
    updatePreview,
    preview,
  };
}

function createTileMaterial(type, opacity) {
  const color = PATH_TYPES[type]?.color ?? PATH_TYPES.stone.color;
  return new THREE.MeshStandardMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
    roughness: 0.95,
    metalness: 0.04,
  });
}
