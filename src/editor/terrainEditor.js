import * as THREE from "three";

import { GRID_CELL_SIZE } from "./snapGrid";
import { createHillTool } from "./hillTool";
import { createPathTool } from "./pathTool";
import { createObjectTool } from "./objectTool";
import { createPlacementToolbar } from "./placementToolbar";
import { applyDefaultTerrain } from "../scene/land/defaultTerrain";
import { DEFAULT_PATHS, DEFAULT_OBJECTS } from "../scene/land/defaultLayout";

export function createTerrainEditor({ scene, camera, controls, renderer }) {
  const land = scene.getObjectByName("land");
  if (!land) throw new Error("terrainEditor: scene has no object named 'land'");

  // Shared mutable sampler — recreated on resize
  let sampleHeight = makeHeightSampler(land);
  const getSampleHeight = () => sampleHeight;

  // Shared occupancy grid — passed by reference to all tools
  const occupiedCells = new Set();

  // Unified placement mode
  const placementState = { active: false, mode: "path" };

  // Tools
  const hillTool = createHillTool({
    scene,
    land,
    camera,
    controls,
    renderer,
    getSampleHeight,
    onReset: resetTerrain,
  });

  const pathTool = createPathTool({ scene, occupiedCells, getSampleHeight });
  const objectTool = createObjectTool({
    scene,
    land,
    occupiedCells,
    getSampleHeight,
  });

  // Grid helper
  let gridHelper = scene.getObjectByName("grid");
  if (gridHelper) gridHelper.visible = false;

  // Toolbar
  const toolbar = createPlacementToolbar(
    pathTool.pathState,
    objectTool.objectState,
    placementState,
    {
      onPathTypeChange: () => pathTool.refreshPreviewMaterial(),
      onObjectTypeChange: () => objectTool.refreshFootprint(),
      onClearAll: clearAll,
      onGridToggle: (visible) => {
        if (gridHelper) gridHelper.visible = visible;
      },
      onLandResize: (size) => resizeLand(size),
    },
  );
  document.body.appendChild(toolbar);

  // Default layout
  initDefaultLayout();

  // Raycasting state
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();
  const lastHitWorld = new THREE.Vector3();
  let pointerOnCanvas = false;
  let hasHit = false;

  const canvas = renderer.domElement;

  canvas.addEventListener("pointerenter", () => (pointerOnCanvas = true));
  canvas.addEventListener("pointerleave", () => {
    pointerOnCanvas = false;
    hasHit = false;
    pathTool.preview.visible = false;
    objectTool.preview.visible = false;
  });
  canvas.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  });
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || !hasHit) return;
    // Hill tool captures shift+LMB via its own listener (capture phase).
    // Only handle placement if hill tool is not painting.
    if (hillTool.isActive() && hillTool.isShiftHeld()) return;
    if (placementState.active) {
      if (placementState.mode === "object")
        objectTool.placeObject(lastHitWorld.x, lastHitWorld.z);
      else pathTool.placeTile(lastHitWorld.x, lastHitWorld.z);
      e.preventDefault();
    }
  });

  const clock = new THREE.Clock();

  // Terrain helpers
  function resetTerrain() {
    applyDefaultTerrain(land);
    pathTool.clearTiles();
  }

  function clearAll() {
    pathTool.clearTiles();
    objectTool.clearObjects();
  }

  function resizeLand(newSize) {
    land.geometry.dispose();
    land.geometry = new THREE.PlaneGeometry(
      newSize,
      newSize,
      newSize * 2,
      newSize * 2,
    );
    sampleHeight = makeHeightSampler(land);

    const divisions = Math.round((newSize * 2) / GRID_CELL_SIZE);
    if (gridHelper) {
      scene.remove(gridHelper);
      gridHelper.geometry.dispose();
      gridHelper.material.dispose();
    }
    gridHelper = new THREE.GridHelper(
      newSize * 2,
      divisions,
      0xffffff,
      0xffffff,
    );
    gridHelper.name = "grid";
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.22;
    gridHelper.material.depthTest = false;
    gridHelper.material.depthWrite = false;
    gridHelper.renderOrder = 999;
    gridHelper.position.y = 0.06;
    scene.add(gridHelper);

    clearAll();
    occupiedCells.clear();
  }

  function initDefaultLayout() {
    for (const [wx, wz] of DEFAULT_PATHS) {
      const saved = pathTool.pathState.pathType;
      pathTool.pathState.pathType = "stone";
      pathTool.placeTile(wx, wz);
      pathTool.pathState.pathType = saved;
    }
    for (const { type, wx, wz } of DEFAULT_OBJECTS) {
      objectTool.placeObjectOfType(type, wx, wz);
    }
  }

  // Render loop
  function update() {
    const dt = clock.getDelta();

    if (pointerOnCanvas) {
      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObject(land);
      hasHit = hits.length > 0;
      if (hasHit) lastHitWorld.copy(hits[0].point);
    }

    pathTool.updatePreview({ hasHit, lastHitWorld, placementState });
    objectTool.updatePreview({ hasHit, lastHitWorld, placementState });
    hillTool.update(dt, { hasHit, lastHitWorld });
  }

  return { update };
}

// Height sampler

function makeHeightSampler(land) {
  const positions = land.geometry.attributes.position;
  const { width, height, widthSegments, heightSegments } =
    land.geometry.parameters;
  const cw = width / widthSegments;
  const ch = height / heightSegments;
  const cols = widthSegments + 1;
  const halfW = width / 2;
  const halfH = height / 2;

  return function sample(worldX, worldZ) {
    const ixF = (worldX + halfW) / cw;
    const iyF = (halfH + worldZ) / ch;
    if (ixF < 0 || ixF >= widthSegments) return 0;
    if (iyF < 0 || iyF >= heightSegments) return 0;
    const ix = Math.floor(ixF);
    const iy = Math.floor(iyF);
    const u = ixF - ix;
    const v = iyF - iy;
    const z00 = positions.getZ(iy * cols + ix);
    const z10 = positions.getZ(iy * cols + ix + 1);
    const z01 = positions.getZ((iy + 1) * cols + ix);
    const z11 = positions.getZ((iy + 1) * cols + ix + 1);
    return (z00 * (1 - u) + z10 * u) * (1 - v) + (z01 * (1 - u) + z11 * u) * v;
  };
}
