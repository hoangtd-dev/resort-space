import * as THREE from "three";
import GUI from "lil-gui";

import {
  applyCircleBrush,
  applyCircleBrushLevelLift,
  applyCircleBrushLevelOnly,
  applyCircleBrushLiftSmooth,
} from "./brush";

const ALGO_NAIVE = "naive";
const ALGO_LEVEL_LIFT = "levelLift";
const ALGO_LIFT_SMOOTH = "liftSmooth";

const RING_SEGMENTS = 96;
const SURFACE_OFFSET = 0.05;

const TOOL_OFF = "off";
const TOOL_HILL = "hill";

const ACTION_MAKE = "make";
const ACTION_LEVEL = "level";

const COLOR_MAKE_OUTER = 0xffff00;
const COLOR_MAKE_INNER = 0xff8800;
const COLOR_LEVEL_OUTER = 0x66ff66;
const COLOR_LEVEL_INNER = 0x009933;

const PREVIEW_OFFSET = 0.06;
const PLACED_OFFSET = 0.05;
const DEFAULT_TILE_SIZE = 4;

const PATH_TYPES = {
  stone: { label: "Stone", color: 0x8f959d },
  grass: { label: "Grass", color: 0x6ea05e },
  dirt: { label: "Dirt", color: 0x7a5230 },
  sand: { label: "Sand", color: 0xd7be82 },
  water: { label: "Water", color: 0x3d89c7 },
};

export function createTerrainEditor({ scene, camera, controls, renderer }) {
  const land = scene.getObjectByName("land");
  if (!land) throw new Error("terrainEditor: scene has no object named 'land'");

  const sampleHeight = makeHeightSampler(land);

  const hillState = {
    tool: TOOL_OFF,
    hillAction: ACTION_MAKE,
    makeAlgo: ALGO_LIFT_SMOOTH,
    size: 8,
    hardness: 0.3,
    strength: 4,
    levelSpeed: 3,
    smoothness: 5,
  };

  const pathState = {
    enabled: true,
    pathType: "stone",
    tileSize: DEFAULT_TILE_SIZE,
    snap: true,
  };

  const indicator = createDonutIndicator(RING_SEGMENTS);
  indicator.visible = false;
  scene.add(indicator);
  const outerRing = indicator.children[0];
  const innerRing = indicator.children[1];

  const placementLayer = new THREE.Group();
  placementLayer.name = "pathTiles";
  scene.add(placementLayer);

  const pathPreview = new THREE.Mesh(
    new THREE.PlaneGeometry(pathState.tileSize, pathState.tileSize),
    createTileMaterial(pathState.pathType, 0.55),
  );
  pathPreview.rotation.x = -Math.PI / 2;
  pathPreview.visible = false;
  pathPreview.renderOrder = 500;
  pathPreview.material.depthWrite = false;
  scene.add(pathPreview);

  const toolbar = createPathToolbar(pathState, {
    onTypeChange: refreshPathPreviewMaterial,
    onSizeChange: rebuildPathPreviewGeometry,
    onClear: clearTiles,
  });
  document.body.appendChild(toolbar);

  const gui = new GUI({ title: "Terrain — off" });

  gui
    .add({ toggle: () => toggleTool(TOOL_HILL) }, "toggle")
    .name("Hill");

  const hillFolder = gui.addFolder("Hill action");
  hillFolder
    .add(hillState, "hillAction", { "Make Hill": ACTION_MAKE, Level: ACTION_LEVEL })
    .name("Action")
    .onChange(refreshIndicatorColor);
  hillFolder
    .add(hillState, "makeAlgo", {
      "Naive (just lift)": ALGO_NAIVE,
      "Level → Lift": ALGO_LEVEL_LIFT,
      "Lift + Smooth": ALGO_LIFT_SMOOTH,
    })
    .name("Make algorithm");
  hillFolder.add(hillState, "smoothness", 0, 20, 0.5).name("smoothness");

  gui.add(hillState, "size", 1, 30, 0.5);
  gui.add(hillState, "hardness", 0, 1, 0.05);

  gui.add({ reset: () => resetTerrain() }, "reset").name("Reset Terrain");

  function resetTerrain() {
    const positions = land.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) positions.setZ(i, 0);
    positions.needsUpdate = true;
    land.geometry.computeVertexNormals();
    clearTiles();
  }

  function toggleTool(t) {
    hillState.tool = hillState.tool === t ? TOOL_OFF : t;
    gui.title(
      `Terrain — ${hillState.tool}${
        hillState.tool === TOOL_OFF ? "" : " (hold Shift to paint)"
      }`,
    );
    if (hillState.tool === TOOL_OFF) {
      indicator.visible = false;
      controls.enabled = true;
      isShiftDown = false;
      isPainting = false;
    } else {
      refreshIndicatorColor();
    }
  }

  function refreshIndicatorColor() {
    if (hillState.tool === TOOL_HILL && hillState.hillAction === ACTION_LEVEL) {
      outerRing.material.color.setHex(COLOR_LEVEL_OUTER);
      innerRing.material.color.setHex(COLOR_LEVEL_INNER);
    } else {
      outerRing.material.color.setHex(COLOR_MAKE_OUTER);
      innerRing.material.color.setHex(COLOR_MAKE_INNER);
    }
  }

  function refreshPathPreviewMaterial() {
    pathPreview.material.dispose();
    pathPreview.material = createTileMaterial(pathState.pathType, 0.55);
    pathPreview.material.depthWrite = false;
  }

  function rebuildPathPreviewGeometry() {
    pathPreview.geometry.dispose();
    pathPreview.geometry = new THREE.PlaneGeometry(
      pathState.tileSize,
      pathState.tileSize,
    );
  }

  function clearTiles() {
    while (placementLayer.children.length > 0) {
      const child = placementLayer.children.pop();
      child.geometry.dispose();
      child.material.dispose();
    }
  }

  function placeTile(worldX, worldZ) {
    const { x, z } = toPlacementPoint(
      worldX,
      worldZ,
      pathState.tileSize,
      pathState.snap,
    );
    const y = sampleHeight(x, z) + PLACED_OFFSET;

    const tile = new THREE.Mesh(
      new THREE.PlaneGeometry(pathState.tileSize, pathState.tileSize),
      createTileMaterial(pathState.pathType, 0.95),
    );

    tile.rotation.x = -Math.PI / 2;
    tile.position.set(x, y, z);
    tile.receiveShadow = true;
    placementLayer.add(tile);
  }

  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();
  const lastHitWorld = new THREE.Vector3();
  let pointerOnCanvas = false;
  let hasHit = false;
  let isShiftDown = false;
  let isPainting = false;

  const canvas = renderer.domElement;

  canvas.addEventListener("pointerenter", () => (pointerOnCanvas = true));
  canvas.addEventListener("pointerleave", () => {
    pointerOnCanvas = false;
    hasHit = false;
    pathPreview.visible = false;
    if (hillState.tool !== TOOL_HILL) indicator.visible = false;
  });
  canvas.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  });
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button !== 0 || !hasHit) return;

      if (hillState.tool !== TOOL_OFF && isShiftDown) {
        isPainting = true;
        e.preventDefault();
        return;
      }

      if (pathState.enabled) {
        placeTile(lastHitWorld.x, lastHitWorld.z);
        e.preventDefault();
      }
    },
    { capture: true },
  );
  window.addEventListener("pointerup", () => (isPainting = false));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Shift" && hillState.tool !== TOOL_OFF) {
      isShiftDown = true;
      controls.enabled = false;
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "Shift") {
      isShiftDown = false;
      isPainting = false;
      controls.enabled = true;
    }
  });

  const clock = new THREE.Clock();

  function updatePathPreview() {
    if (!pathState.enabled || !hasHit) {
      pathPreview.visible = false;
      return;
    }

    const { x, z } = toPlacementPoint(
      lastHitWorld.x,
      lastHitWorld.z,
      pathState.tileSize,
      pathState.snap,
    );
    const y = sampleHeight(x, z) + PREVIEW_OFFSET;
    pathPreview.position.set(x, y, z);
    pathPreview.visible = true;
  }

  function updateHillTool(dt) {
    if (hillState.tool === TOOL_OFF) {
      indicator.visible = false;
      return;
    }

    indicator.visible = hasHit;
    if (hasHit) {
      const outer = hillState.size;
      const inner = Math.max(hillState.size * (1 - hillState.hardness), 0.001);
      writeRingPoints(
        outerRing,
        lastHitWorld.x,
        lastHitWorld.z,
        outer,
        sampleHeight,
      );
      writeRingPoints(
        innerRing,
        lastHitWorld.x,
        lastHitWorld.z,
        inner,
        sampleHeight,
      );

      if (isPainting && isShiftDown && hillState.tool === TOOL_HILL) {
        const hitLocal = land.worldToLocal(lastHitWorld.clone());
        const params = {
          size: hillState.size,
          hardness: hillState.hardness,
          strength: hillState.strength,
          levelSpeed: hillState.levelSpeed,
          smoothness: hillState.smoothness,
          direction: 1,
          dt,
        };
        if (hillState.hillAction === ACTION_LEVEL) {
          applyCircleBrushLevelOnly(land.geometry, hitLocal, params);
        } else if (hillState.makeAlgo === ALGO_LEVEL_LIFT) {
          applyCircleBrushLevelLift(land.geometry, hitLocal, params);
        } else if (hillState.makeAlgo === ALGO_LIFT_SMOOTH) {
          applyCircleBrushLiftSmooth(land.geometry, hitLocal, params);
        } else {
          applyCircleBrush(land.geometry, hitLocal, params);
        }
      }
    }
  }

  function update() {
    const dt = clock.getDelta();

    if (pointerOnCanvas) {
      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObject(land);
      hasHit = hits.length > 0;
      if (hasHit) {
        lastHitWorld.copy(hits[0].point);
      }
    }

    updatePathPreview();
    updateHillTool(dt);
  }

  return { update };
}

function createDonutIndicator(segments) {
  const group = new THREE.Group();
  group.name = "brushIndicator";
  group.add(makeRingLine(COLOR_MAKE_OUTER, segments));
  group.add(makeRingLine(COLOR_MAKE_INNER, segments));
  return group;
}

function makeRingLine(color, segments) {
  const positions = new Float32Array(segments * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
  });
  const line = new THREE.LineLoop(geo, mat);
  line.renderOrder = 999;
  return line;
}

function writeRingPoints(line, cx, cz, radius, sampleHeight) {
  const arr = line.geometry.attributes.position.array;
  const segments = arr.length / 3;
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const x = cx + Math.cos(a) * radius;
    const z = cz + Math.sin(a) * radius;
    arr[i * 3] = x;
    arr[i * 3 + 1] = sampleHeight(x, z) + SURFACE_OFFSET;
    arr[i * 3 + 2] = z;
  }
  line.geometry.attributes.position.needsUpdate = true;
  line.geometry.computeBoundingSphere();
}

function toPlacementPoint(worldX, worldZ, tileSize, snap) {
  if (!snap) return { x: worldX, z: worldZ };
  return {
    x: Math.round(worldX / tileSize) * tileSize,
    z: Math.round(worldZ / tileSize) * tileSize,
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

function createPathToolbar(state, callbacks) {
  const toolbar = document.createElement("div");
  toolbar.className = "path-toolbar";

  const title = document.createElement("div");
  title.className = "path-toolbar-title";
  title.textContent = "Path Placement";
  toolbar.appendChild(title);

  const controls = document.createElement("div");
  controls.className = "path-toolbar-controls";

  const enabledLabel = document.createElement("label");
  enabledLabel.className = "path-toolbar-field";
  enabledLabel.textContent = "Tool";
  const enabledToggle = document.createElement("button");
  enabledToggle.type = "button";
  enabledToggle.textContent = "Enabled";
  enabledToggle.className = "path-toggle active";
  enabledToggle.addEventListener("click", () => {
    state.enabled = !state.enabled;
    enabledToggle.textContent = state.enabled ? "Enabled" : "Disabled";
    enabledToggle.classList.toggle("active", state.enabled);
  });
  enabledLabel.appendChild(enabledToggle);
  controls.appendChild(enabledLabel);

  const typeLabel = document.createElement("label");
  typeLabel.className = "path-toolbar-field";
  typeLabel.textContent = "Type";
  const typeSelect = document.createElement("select");
  for (const [key, value] of Object.entries(PATH_TYPES)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = value.label;
    if (key === state.pathType) option.selected = true;
    typeSelect.appendChild(option);
  }
  typeSelect.addEventListener("change", () => {
    state.pathType = typeSelect.value;
    callbacks.onTypeChange();
  });
  typeLabel.appendChild(typeSelect);
  controls.appendChild(typeLabel);

  const sizeLabel = document.createElement("label");
  sizeLabel.className = "path-toolbar-field";
  sizeLabel.textContent = "Tile Size";
  const sizeRange = document.createElement("input");
  sizeRange.type = "range";
  sizeRange.min = "1";
  sizeRange.max = "10";
  sizeRange.step = "1";
  sizeRange.value = String(state.tileSize);
  const sizeValue = document.createElement("span");
  sizeValue.className = "path-size-value";
  sizeValue.textContent = `${state.tileSize}m`;
  sizeRange.addEventListener("input", () => {
    state.tileSize = Number(sizeRange.value);
    sizeValue.textContent = `${state.tileSize}m`;
    callbacks.onSizeChange();
  });
  sizeLabel.appendChild(sizeRange);
  sizeLabel.appendChild(sizeValue);
  controls.appendChild(sizeLabel);

  const snapLabel = document.createElement("label");
  snapLabel.className = "path-toolbar-field path-check";
  const snapToggle = document.createElement("input");
  snapToggle.type = "checkbox";
  snapToggle.checked = state.snap;
  snapToggle.addEventListener("change", () => {
    state.snap = snapToggle.checked;
  });
  const snapText = document.createElement("span");
  snapText.textContent = "Grid Snap";
  snapLabel.appendChild(snapToggle);
  snapLabel.appendChild(snapText);
  controls.appendChild(snapLabel);

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "path-clear";
  clearButton.textContent = "Clear Paths";
  clearButton.addEventListener("click", callbacks.onClear);
  controls.appendChild(clearButton);

  toolbar.appendChild(controls);
  return toolbar;
}

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

    const z0 = z00 * (1 - u) + z10 * u;
    const z1 = z01 * (1 - u) + z11 * u;
    return z0 * (1 - v) + z1 * v;
  };
}
