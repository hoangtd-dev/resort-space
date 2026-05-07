import * as THREE from "three";
import GUI from "lil-gui";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

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
const TILE_SEGMENTS = 24;
const GRASS_TINT = 0x5fae4a;
const WATER_TINT = 0x4ea7de;

const PATH_TYPES = {
  rock: {
    label: "Rock Path",
    color: 0xa29d92,
    mode: "object",
    thumb: "/models/nature/bundle/PathRocks_Diffuse.png",
  },
  grassObject: {
    label: "Grass Clumps",
    color: 0x6ea05e,
    mode: "object",
    thumb: "/models/nature/bundle/Leaves.png",
  },
  flowerObject: {
    label: "Flowers",
    color: 0xe08ab6,
    mode: "object",
    thumb: "/models/nature/bundle/Flowers.png",
  },
  bushObject: {
    label: "Bushes",
    color: 0x5f9a57,
    mode: "object",
    thumb: "/models/nature/bundle/Leaves_NormalTree_C.png",
  },
  treeObject: {
    label: "Trees",
    color: 0x4b8450,
    mode: "object",
    thumb: "/models/nature/bundle/Bark_NormalTree.png",
  },
  fernObject: {
    label: "Ferns",
    color: 0x5f9150,
    mode: "object",
    thumb: "/models/nature/bundle/Leaves.png",
  },
  mushroomObject: {
    label: "Mushrooms",
    color: 0x9f7f63,
    mode: "object",
    thumb: "/models/nature/bundle/Mushrooms.png",
  },
  pebbleObject: {
    label: "Pebbles",
    color: 0x909090,
    mode: "object",
    thumb: "/models/nature/bundle/Rocks_Diffuse.png",
  },
  cloverObject: {
    label: "Clover",
    color: 0x6da85b,
    mode: "object",
    thumb: "/models/nature/bundle/Leaves.png",
  },
  dirt: { label: "Dirt", color: 0x7a5230, mode: "tile", thumb: "/models/nature/bundle/Rocks_Desert_Diffuse.png" },
  sand: { label: "Sand", color: 0xd7be82, mode: "object", thumb: "/textures/paths/sand_path_color.png" },
  water: { label: "Water", color: 0x3d89c7, mode: "object", thumb: "/textures/paths/sand_path_normalGL.png" },
};

const OBJECT_TYPE_URLS = {
  rock: ["/textures/paths/rock_path_round_wide.glb"],
  grassObject: [
    "/models/nature/bundle/Grass_Common_Short.gltf",
    "/models/nature/bundle/Grass_Common_Tall.gltf",
    "/models/nature/bundle/Grass_Wispy_Short.gltf",
    "/models/nature/bundle/Grass_Wispy_Tall.gltf",
  ],
  flowerObject: [
    "/models/nature/bundle/Flower_3_Group.gltf",
    "/models/nature/bundle/Flower_4_Group.gltf",
  ],
  bushObject: [
    "/models/nature/bundle/Bush_Common.gltf",
    "/models/nature/bundle/Bush_Common_Flowers.gltf",
  ],
  treeObject: [
    "/models/nature/bundle/CommonTree_1.gltf",
    "/models/nature/bundle/CommonTree_2.gltf",
  ],
  fernObject: ["/models/nature/bundle/Fern_1.gltf"],
  mushroomObject: [
    "/models/nature/bundle/Mushroom_Common.gltf",
    "/models/nature/bundle/Mushroom_Laetiporus.gltf",
  ],
  pebbleObject: [
    "/models/nature/bundle/Pebble_Round_1.gltf",
    "/models/nature/bundle/Pebble_Round_2.gltf",
    "/models/nature/bundle/Pebble_Square_1.gltf",
    "/models/nature/bundle/Pebble_Square_2.gltf",
  ],
  cloverObject: [
    "/models/nature/bundle/Clover_1.gltf",
    "/models/nature/bundle/Clover_2.gltf",
  ],
  sand: ["/models/nature/bundle/beach_sand_substance.glb"],
  water: ["/models/nature/bundle/water_animation.glb"],
};

export function createTerrainEditor({ scene, camera, controls, renderer }) {
  const land = scene.getObjectByName("land");
  if (!land) throw new Error("terrainEditor: scene has no object named 'land'");

  const sampleHeight = makeHeightSampler(land);
  const textureLoader = new THREE.TextureLoader();
  const gltfLoader = new GLTFLoader();
  const pathTextures = loadPathTextures(textureLoader);
  const objectLibrary = {};
  let resortSeeded = false;

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
    pathType: "rock",
    mode: "place",
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
    createTileGeometry(pathState.tileSize),
    createTileMaterial(pathState.pathType, 0.55, pathState.tileSize, pathTextures),
  );
  pathPreview.rotation.x = -Math.PI / 2;
  pathPreview.visible = false;
  pathPreview.renderOrder = 500;
  pathPreview.material.depthWrite = false;
  scene.add(pathPreview);

  const objectPreview = new THREE.Group();
  objectPreview.visible = false;
  scene.add(objectPreview);
  let objectPreviewInstance = null;

  for (const [type, urls] of Object.entries(OBJECT_TYPE_URLS)) {
    loadObjectModels(gltfLoader, urls, (models) => {
      objectLibrary[type] = models;
      if (pathState.pathType === type) refreshObjectPreview();
      trySeedStarterResort();
    });
  }

  const toolbar = createPathToolbar(pathState, {
    onTypeChange: () => {
      refreshPathPreviewMaterial();
      refreshObjectPreview();
    },
    onSizeChange: rebuildPathPreviewGeometry,
    onClear: clearTiles,
    onModeChange: updateDeleteModeUI,
  });
  document.body.appendChild(toolbar);

  const deleteModeBanner = document.createElement("div");
  deleteModeBanner.className = "delete-mode-banner";
  deleteModeBanner.textContent = "Delete Mode: Click any placed item to remove";
  document.body.appendChild(deleteModeBanner);

  const deleteModePopup = document.createElement("div");
  deleteModePopup.className = "delete-mode-popup";
  deleteModePopup.textContent = "DELETE MODE ACTIVE";
  document.body.appendChild(deleteModePopup);
  updateDeleteModeUI();

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

  function getObjectModels(type) {
    return objectLibrary[type] || [];
  }

  function getObjectTint(type) {
    if (type === "grassObject") return GRASS_TINT;
    if (type === "water") return WATER_TINT;
    return null;
  }

  function getTypeScaleMultiplier(type) {
    const scales = {
      grassObject: 0.5,
      flowerObject: 0.75,
      bushObject: 0.9,
      treeObject: 1.6,
      fernObject: 0.65,
      mushroomObject: 0.85,
      pebbleObject: 0.9,
      cloverObject: 0.55,
      sand: 2.5,
      water: 3.2,
    };
    return scales[type] ?? 1;
  }

  function getTypeYOffset(type) {
    const offsets = {
      water: 0.015,
    };
    return offsets[type] ?? 0;
  }

  function updateDeleteModeUI() {
    const active = pathState.enabled && pathState.mode === "delete";
    document.body.classList.toggle("delete-mode-active", active);
    deleteModeBanner.classList.toggle("visible", active);
    deleteModePopup.classList.toggle("visible", active);
    const modeIndicator = document.querySelector(".path-mode-indicator");
    if (modeIndicator) modeIndicator.textContent = active ? "Delete" : "Place";
  }

  function refreshObjectPreview() {
    if (objectPreviewInstance) {
      objectPreview.remove(objectPreviewInstance);
      disposePathObject(objectPreviewInstance);
      objectPreviewInstance = null;
    }

    if (PATH_TYPES[pathState.pathType]?.mode !== "object") return;
    const variants = getObjectModels(pathState.pathType);
    if (variants.length === 0) return;

    const variant = variants[0];
    objectPreviewInstance = createModelInstance(
      variant.root,
      true,
      getObjectTint(pathState.pathType),
    );
    objectPreviewInstance.scale.setScalar(
      pathState.tileSize *
        variant.unitScale *
        getTypeScaleMultiplier(pathState.pathType),
    );
    objectPreview.add(objectPreviewInstance);
  }

  function refreshPathPreviewMaterial() {
    if (PATH_TYPES[pathState.pathType]?.mode === "object") return;
    pathPreview.material.dispose();
    pathPreview.material = createTileMaterial(
      pathState.pathType,
      0.55,
      pathState.tileSize,
      pathTextures,
    );
    pathPreview.material.depthWrite = false;
  }

  function rebuildPathPreviewGeometry() {
    if (PATH_TYPES[pathState.pathType]?.mode === "object") {
      if (objectPreviewInstance) {
        const variants = getObjectModels(pathState.pathType);
        if (variants.length > 0) {
          objectPreviewInstance.scale.setScalar(
            pathState.tileSize *
              variants[0].unitScale *
              getTypeScaleMultiplier(pathState.pathType),
          );
        }
      }
      return;
    }

    pathPreview.geometry.dispose();
    pathPreview.geometry = createTileGeometry(pathState.tileSize);
    refreshPathPreviewMaterial();
  }

  function clearTiles() {
    while (placementLayer.children.length > 0) {
      const child = placementLayer.children.pop();
      disposePathObject(child);
    }
  }

  function findPlacementRoot(obj) {
    let cur = obj;
    while (cur && cur.parent && cur.parent !== placementLayer) cur = cur.parent;
    return cur && cur.parent === placementLayer ? cur : null;
  }

  function deleteAtPointer() {
    const hits = raycaster.intersectObjects(placementLayer.children, true);
    if (hits.length === 0) return;
    const root = findPlacementRoot(hits[0].object);
    if (!root) return;
    placementLayer.remove(root);
    disposePathObject(root);
  }

  function placeTile(worldX, worldZ) {
    return placeAssetAt(pathState.pathType, worldX, worldZ, {
      randomYaw: true,
      randomVariant: true,
    });
  }

  function placeAssetAt(type, worldX, worldZ, opts = {}) {
    const { x, z } = toPlacementPoint(
      worldX,
      worldZ,
      pathState.tileSize,
      pathState.snap,
    );
    const y = sampleHeight(x, z) + PLACED_OFFSET;

    if (PATH_TYPES[type]?.mode === "object") {
      const variants = getObjectModels(type);
      if (variants.length === 0) return;
      const index = opts.randomVariant
        ? Math.floor(Math.random() * variants.length)
        : (opts.variantIndex ?? 0) % variants.length;
      const variant = variants[index];
      const pathObject = createModelInstance(
        variant.root,
        false,
        getObjectTint(type),
      );
      pathObject.position.set(x, y + getTypeYOffset(type), z);
      if (opts.randomYaw) {
        pathObject.rotation.y = Math.random() * Math.PI * 2;
      } else if (typeof opts.yaw === "number") {
        pathObject.rotation.y = opts.yaw;
      }
      pathObject.scale.setScalar(
        pathState.tileSize *
          variant.unitScale *
          getTypeScaleMultiplier(type),
      );
      placementLayer.add(pathObject);
      return pathObject;
    }

    const tile = new THREE.Mesh(
      createTileGeometry(pathState.tileSize),
      createTileMaterial(
        type,
        0.95,
        pathState.tileSize,
        pathTextures,
      ),
    );

    tile.rotation.x = -Math.PI / 2;
    tile.position.set(x, y, z);
    tile.castShadow = true;
    tile.receiveShadow = true;
    placementLayer.add(tile);
    return tile;
  }

  function sculptStarterHill(cx, cz, radius, height) {
    const positions = land.geometry.attributes.position;
    const r2 = radius * radius;
    for (let i = 0; i < positions.count; i++) {
      const dx = positions.getX(i) - cx;
      const dy = positions.getY(i) - cz;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const t = 1 - d2 / r2;
      const current = positions.getZ(i);
      positions.setZ(i, current + height * t * t);
    }
    positions.needsUpdate = true;
    land.geometry.computeVertexNormals();
  }

  function placeStarterFootpath() {
    const points = [
      [-20, -12], [-16, -9], [-12, -6], [-8, -3], [-4, -1], [0, 1], [4, 3],
      [8, 5], [12, 7], [16, 9], [20, 11],
    ];
    for (const [x, z] of points) {
      placeAssetAt("rock", x, z, { randomYaw: false, yaw: 0.15, randomVariant: true });
    }
  }

  function placeStarterNature() {
    const trees = [[-16, 14], [-8, 18], [0, 20], [10, 17], [18, 13]];
    for (const [x, z] of trees) {
      placeAssetAt("treeObject", x, z, { randomYaw: true, randomVariant: true });
    }
    const flowers = [[-18, -7], [-13, -4], [-6, -1], [2, 3], [9, 6], [15, 9], [19, 12]];
    for (const [x, z] of flowers) {
      placeAssetAt("flowerObject", x, z, { randomYaw: true, randomVariant: true });
    }
    const grass = [[-15, -1], [-9, 2], [-2, 5], [6, 9], [13, 11], [20, 14]];
    for (const [x, z] of grass) {
      placeAssetAt("grassObject", x, z, { randomYaw: true, randomVariant: true });
    }
    const bushes = [[-12, 12], [-3, 15], [7, 16], [15, 14]];
    for (const [x, z] of bushes) {
      placeAssetAt("bushObject", x, z, { randomYaw: true, randomVariant: true });
    }
  }

  function placeStarterWaterAndSand() {
    const waterPoints = [[-28, 10], [-22, 14], [-16, 18]];
    for (const [x, z] of waterPoints) {
      placeAssetAt("water", x, z, { randomYaw: false, yaw: -0.42, randomVariant: true });
    }
    const sandPoints = [[-31, 8], [-27, 14], [-23, 20], [-19, 23], [-14, 21], [-11, 17]];
    for (const [x, z] of sandPoints) {
      placeAssetAt("sand", x, z, { randomYaw: false, yaw: -0.42, randomVariant: true });
    }
  }

  function trySeedStarterResort() {
    if (resortSeeded) return;
    const required = ["rock", "treeObject", "flowerObject", "water", "sand"];
    for (const key of required) {
      if (!objectLibrary[key] || objectLibrary[key].length === 0) return;
    }
    resortSeeded = true;
    sculptStarterHill(8, 6, 30, 6.5);
    // placeStarterFootpath();
    // placeStarterWaterAndSand();
    placeStarterNature();
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
    objectPreview.visible = false;
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
        if (pathState.mode === "delete") {
          deleteAtPointer();
        } else {
          placeTile(lastHitWorld.x, lastHitWorld.z);
        }
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
    if (!pathState.enabled || !hasHit || pathState.mode === "delete") {
      pathPreview.visible = false;
      objectPreview.visible = false;
      return;
    }

    const { x, z } = toPlacementPoint(
      lastHitWorld.x,
      lastHitWorld.z,
      pathState.tileSize,
      pathState.snap,
    );
    const y = sampleHeight(x, z) + PREVIEW_OFFSET;

    if (PATH_TYPES[pathState.pathType]?.mode === "object" && objectPreviewInstance) {
      pathPreview.visible = false;
      objectPreview.visible = true;
      objectPreview.position.set(x, y, z);
    } else {
      objectPreview.visible = false;
      pathPreview.position.set(x, y, z);
      pathPreview.visible = true;
    }
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
      if (hasHit) lastHitWorld.copy(hits[0].point);
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

function createTileGeometry(tileSize) {
  const geometry = new THREE.PlaneGeometry(tileSize, tileSize, TILE_SEGMENTS, TILE_SEGMENTS);
  ensureUv2(geometry);
  return geometry;
}

function loadObjectModels(gltfLoader, urls, onReady) {
  const models = [];
  let remaining = urls.length;
  if (remaining === 0) {
    onReady(models);
    return;
  }
  for (const url of urls) {
    loadObjectModelTemplate(gltfLoader, url, (root, unitScale) => {
      models.push({ root, unitScale });
      remaining -= 1;
      if (remaining === 0) onReady(models);
    });
  }
}

function loadObjectModelTemplate(gltfLoader, url, onReady) {
  gltfLoader.load(url, (gltf) => {
    const root = gltf.scene;
    root.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    root.position.x -= center.x;
    root.position.z -= center.z;
    root.position.y -= box.min.y;

    const footprint = Math.max(size.x, size.z, 0.0001);
    const unitScale = 1 / footprint;

    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    onReady(root, unitScale);
  });
}

function createModelInstance(templateRoot, preview, tintHex = null) {
  const instance = templateRoot.clone(true);
  const tintColor = tintHex == null ? null : new THREE.Color(tintHex);
  instance.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.material = obj.material.clone();
    obj.material.vertexColors = false;
    if (obj.material.color) obj.material.color.setHex(0xffffff);
    obj.castShadow = true;
    obj.receiveShadow = true;
    if (obj.material.map) {
      obj.material.map.colorSpace = THREE.SRGBColorSpace;
      obj.material.map.needsUpdate = true;
      // Most foliage in this pack uses alpha cutout textures.
      obj.material.transparent = true;
      obj.material.alphaTest = 0.35;
      obj.material.side = THREE.DoubleSide;
    }
    if (tintColor && obj.material.color) {
      obj.material.color.lerp(tintColor, 0.7);
    }
    if (preview) {
      obj.material.transparent = true;
      obj.material.opacity = 0.6;
      obj.material.depthWrite = false;
    }
  });
  return instance;
}

function createProceduralObjectTemplate(type) {
  if (type === "sand") {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.58, 0.12, 20),
      new THREE.MeshStandardMaterial({
        color: 0xd7be82,
        roughness: 0.95,
        metalness: 0.02,
      }),
    );
    base.position.y = 0.06;
    group.add(base);
    for (let i = 0; i < 3; i++) {
      const lump = new THREE.Mesh(
        new THREE.SphereGeometry(0.12 + i * 0.02, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0xcfb577,
          roughness: 0.98,
          metalness: 0.01,
        }),
      );
      lump.position.set(-0.15 + i * 0.15, 0.11, 0.08 - i * 0.07);
      lump.scale.y = 0.45;
      group.add(lump);
    }
    return { root: group, unitScale: 1 };
  }

  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.62, 0.06, 24),
    new THREE.MeshStandardMaterial({
      color: 0x4ea7de,
      transparent: true,
      opacity: 0.7,
      roughness: 0.2,
      metalness: 0.05,
    }),
  );
  water.position.y = 0.03;
  return { root: water, unitScale: 1 };
}

function disposePathObject(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.geometry?.dispose?.();
    if (Array.isArray(obj.material)) {
      for (const mat of obj.material) mat?.dispose?.();
    } else {
      obj.material?.dispose?.();
    }
  });
}

function loadPathTextures(textureLoader) {
  const base = "/textures/paths";
  const texturedTypes = ["stone", "sand", "grass"];
  const out = {};

  for (const type of texturedTypes) {
    const color = textureLoader.load(`${base}/${type}_path_color.png`);
    const normal = textureLoader.load(`${base}/${type}_path_normalGL.png`);
    const roughness = textureLoader.load(`${base}/${type}_path_roughness.png`);
    const ao = textureLoader.load(`${base}/${type}_path_ambientOcclusion.png`);

    for (const tex of [color, normal, roughness, ao]) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = tex === color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    }

    out[type] = { color, normal, roughness, ao };
  }

  return out;
}

function setTextureRepeat(textures, tileSize) {
  const repeats = Math.max(tileSize / 2, 1);
  textures.color.repeat.set(repeats, repeats);
  textures.normal.repeat.set(repeats, repeats);
  textures.roughness.repeat.set(repeats, repeats);
  textures.ao.repeat.set(repeats, repeats);
}

function createTileMaterial(type, opacity, tileSize, pathTextures) {
  const color = PATH_TYPES[type]?.color ?? PATH_TYPES.stone.color;
  const material = new THREE.MeshStandardMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
    roughness: 0.95,
    metalness: 0.04,
  });

  const textures = pathTextures?.[type];
  if (textures) {
    setTextureRepeat(textures, tileSize);
    material.map = textures.color;
    material.normalMap = textures.normal;
    material.roughnessMap = textures.roughness;
    material.aoMap = textures.ao;
    material.normalScale.set(1.6, 1.6);
    material.roughness = 0.92;
  }

  return material;
}

function ensureUv2(geometry) {
  if (!geometry.attributes.uv || geometry.attributes.uv2) return;
  geometry.setAttribute("uv2", new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
}

function createPathToolbar(state, callbacks) {
  const toolbar = document.createElement("div");
  toolbar.className = "path-toolbar";

  const header = document.createElement("div");
  header.className = "path-toolbar-header";
  const title = document.createElement("div");
  title.className = "path-toolbar-title";
  title.textContent = "World Builder";
  const subtitle = document.createElement("div");
  subtitle.className = "path-toolbar-subtitle";
  subtitle.textContent = "Place or remove paths and props";
  const left = document.createElement("div");
  left.appendChild(title);
  left.appendChild(subtitle);
  const collapse = document.createElement("button");
  collapse.type = "button";
  collapse.className = "path-toolbar-collapse";
  collapse.textContent = "Collapse";
  collapse.addEventListener("click", () => {
    toolbar.classList.toggle("collapsed");
    collapse.textContent = toolbar.classList.contains("collapsed")
      ? "Expand"
      : "Collapse";
  });
  header.appendChild(left);
  const modeIndicator = document.createElement("div");
  modeIndicator.className = "path-mode-indicator";
  modeIndicator.textContent = "Place";
  header.appendChild(modeIndicator);
  header.appendChild(collapse);
  toolbar.appendChild(header);

  const body = document.createElement("div");
  body.className = "path-toolbar-body";

  const controlsTop = document.createElement("div");
  controlsTop.className = "path-controls-top";

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
  controlsTop.appendChild(enabledLabel);

  const modeWrap = document.createElement("div");
  modeWrap.className = "path-toolbar-field";
  modeWrap.textContent = "Mode";
  const modeRow = document.createElement("div");
  modeRow.className = "path-mode-row";
  const placeBtn = document.createElement("button");
  placeBtn.type = "button";
  placeBtn.className = "path-mode-btn active";
  placeBtn.textContent = "Place";
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "path-mode-btn";
  deleteBtn.textContent = "Delete";
  function syncModeButtons() {
    placeBtn.classList.toggle("active", state.mode === "place");
    deleteBtn.classList.toggle("active", state.mode === "delete");
  }
  placeBtn.addEventListener("click", () => {
    state.mode = "place";
    syncModeButtons();
    callbacks.onTypeChange();
  });
  deleteBtn.addEventListener("click", () => {
    state.mode = "delete";
    syncModeButtons();
    callbacks.onTypeChange();
  });
  modeRow.appendChild(placeBtn);
  modeRow.appendChild(deleteBtn);
  modeWrap.appendChild(modeRow);
  controlsTop.appendChild(modeWrap);

  const sizeWrap = document.createElement("div");
  sizeWrap.className = "path-toolbar-field";
  sizeWrap.textContent = "Size";
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
  sizeWrap.appendChild(sizeRange);
  sizeWrap.appendChild(sizeValue);
  controlsTop.appendChild(sizeWrap);

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
  controlsTop.appendChild(snapLabel);

  body.appendChild(controlsTop);

  const paletteWrap = document.createElement("div");
  paletteWrap.className = "path-palette-wrap";
  const paletteTitle = document.createElement("div");
  paletteTitle.className = "path-palette-title";
  paletteTitle.textContent = "Assets";
  const search = document.createElement("input");
  search.type = "text";
  search.placeholder = "Search assets...";
  search.className = "path-search";
  const palette = document.createElement("div");
  palette.className = "path-palette";
  const buttons = [];

  for (const [key, value] of Object.entries(PATH_TYPES)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "path-palette-btn";
    btn.dataset.type = key;
    btn.dataset.label = value.label.toLowerCase();
    btn.style.borderColor = `${new THREE.Color(value.color).getStyle()}`;
    const thumb = document.createElement("span");
    thumb.className = "path-palette-thumb";
    if (value.thumb) thumb.style.backgroundImage = `url(${value.thumb})`;
    const label = document.createElement("span");
    label.className = "path-palette-label";
    label.textContent = value.label;
    btn.appendChild(thumb);
    btn.appendChild(label);
    if (key === state.pathType) btn.classList.add("active");
    btn.addEventListener("click", () => {
      state.pathType = key;
      for (const b of buttons) b.classList.toggle("active", b.dataset.type === key);
      callbacks.onTypeChange();
    });
    buttons.push(btn);
    palette.appendChild(btn);
  }

  search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    for (const btn of buttons) {
      const visible = btn.dataset.label.includes(q);
      btn.style.display = visible ? "" : "none";
    }
  });

  paletteWrap.appendChild(paletteTitle);
  paletteWrap.appendChild(search);
  paletteWrap.appendChild(palette);
  body.appendChild(paletteWrap);

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "path-clear";
  clearButton.textContent = "Clear All Placed";
  clearButton.addEventListener("click", callbacks.onClear);
  const actions = document.createElement("div");
  actions.className = "path-actions";
  actions.appendChild(clearButton);
  body.appendChild(actions);

  toolbar.appendChild(body);
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
