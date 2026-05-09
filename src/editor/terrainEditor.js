import * as THREE from "three";

import { GRID_CELL_SIZE } from "./snapGrid";
import { createHillTool, HILL_TOOL_OFF } from "./hillTool";
import { createHillToolPalette } from "./hillToolPalette";
import { createPathTool } from "./pathTool";
import { createObjectTool } from "./objectTool";
import { createPlacementToolPalette } from "./placementToolPalette";
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

  // Unified placement mode (driven by bubble palette — disabled until armed)
  const placementState = { active: false, mode: "path", action: "place" };

  // Forward refs for cross-tool exclusivity (palette deactivates hill etc.)
  let placementPalette;

  // Tools
  const hillTool = createHillTool({
    scene,
    land,
    camera,
    controls,
    renderer,
    getSampleHeight,
    onActivate: () => placementPalette?.deactivate(),
  });

  const hillPalette = createHillToolPalette({
    state: hillTool.state,
    setActiveTool: hillTool.setActiveTool,
    setOnActiveToolChange: hillTool.setOnActiveToolChange,
  });

  const pathTool = createPathTool({
    scene,
    occupiedCells,
    getSampleHeight,
    getHalfSize: () => land.geometry.parameters.width / 2,
  });
  const objectTool = createObjectTool({
    scene,
    land,
    occupiedCells,
    getSampleHeight,
  });

  placementPalette = createPlacementToolPalette({
    controls,
    pathState: pathTool.pathState,
    objectState: objectTool.objectState,
    placementState,
    onPathTypeChange: () => pathTool.refreshPreviewMaterial(),
    onObjectTypeChange: () => objectTool.refreshFootprint(),
    onActivate: () => hillTool.setActiveTool(HILL_TOOL_OFF),
  });

  // Grid helper (kept for future re-wiring; not currently surfaced in UI)
  let gridHelper = scene.getObjectByName("grid");
  if (gridHelper) gridHelper.visible = false;

  // Bottom-left palette row: placement + hill bubbles on a single line.
  const bottomLeftStack = document.createElement("div");
  bottomLeftStack.className = "bottom-left-stack";
  bottomLeftStack.appendChild(placementPalette.element);
  bottomLeftStack.appendChild(hillPalette.element);
  document.body.appendChild(bottomLeftStack);

  // Default layout
  initDefaultLayout();

  // Raycasting state
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();
  const lastHitWorld = new THREE.Vector3();
  let pointerOnCanvas = false;
  let hasHit = false;
  let isPointerDown = false;

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
    isPointerDown = true;
    // Hill tool captures LMB via its own listener (capture phase) when armed.
    // Skip placement entirely while a hill tool is active.
    if (hillTool.isActive()) return;
    if (placementState.active) {
      if (placementState.mode === "path") pathTool.beginStroke();
      if (placementState.action === "delete") {
        deleteAtPointer();
      } else if (placementState.mode === "object") {
        objectTool.placeObject(lastHitWorld.x, lastHitWorld.z);
      } else {
        pathTool.setPathAt(lastHitWorld.x, lastHitWorld.z);
      }
      e.preventDefault();
    }
  });
  window.addEventListener("pointerup", () => {
    if (!isPointerDown) return;
    isPointerDown = false;
    pathTool.endStroke();
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

  function deleteAtPointer() {
    if (placementState.mode === "path") {
      pathTool.removePathAt(lastHitWorld.x, lastHitWorld.z);
      return;
    }

    const objectHits = raycaster.intersectObjects(
      objectTool.objectLayer.children,
      true,
    );
    const objectHit = objectHits[0];
    if (!objectHit) return;
    objectTool.removeByHitObject(objectHit.object);
  }

  function resizeLand(newSize) {
    const gridWasVisible = gridHelper ? gridHelper.visible : false;

    const oldSample = sampleHeight;
    const newGeom = new THREE.PlaneGeometry(
      newSize,
      newSize,
      newSize * 2,
      newSize * 2,
    );
    const newPos = newGeom.attributes.position;
    for (let i = 0; i < newPos.count; i++) {
      const h = oldSample(newPos.getX(i), -newPos.getY(i));
      if (h !== 0) newPos.setZ(i, h);
    }
    newPos.needsUpdate = true;
    newGeom.computeVertexNormals();

    land.geometry.dispose();
    land.geometry = newGeom;
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
    gridHelper.visible = gridWasVisible;
    scene.add(gridHelper);

    // Remove only items that now fall outside the new land bounds.
    const half = newSize / 2;
    pathTool.removeTilesOutOfRange(half);
    objectTool.removeObjectsOutOfRange(half);
  }

  function initDefaultLayout() {
    // Objects first so their footprints block any conflicting path tiles.
    for (const { type, wx, wz } of DEFAULT_OBJECTS) {
      objectTool.placeObjectOfType(type, wx, wz);
    }
    for (const { wx, wz, type } of DEFAULT_PATHS) {
      pathTool.setPathAt(wx, wz, type);
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

    if (
      isPointerDown &&
      hasHit &&
      placementState.active &&
      placementState.mode === "path" &&
      !hillTool.isActive()
    ) {
      if (placementState.action === "delete") {
        pathTool.removePathAt(lastHitWorld.x, lastHitWorld.z);
      } else {
        pathTool.setPathAt(lastHitWorld.x, lastHitWorld.z);
      }
    }
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
