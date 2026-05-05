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

export function createTerrainEditor({ scene, camera, controls, renderer }) {
  const land = scene.getObjectByName("land");
  if (!land) throw new Error("terrainEditor: scene has no object named 'land'");

  const sampleHeight = makeHeightSampler(land);

  const state = {
    tool: TOOL_OFF,
    hillAction: ACTION_MAKE,
    makeAlgo: ALGO_LIFT_SMOOTH,
    size: 8,
    hardness: 0.3,
    strength: 4,
    levelSpeed: 3,
    smoothness: 5,
  };

  const indicator = createDonutIndicator(RING_SEGMENTS);
  indicator.visible = false;
  scene.add(indicator);
  const outerRing = indicator.children[0];
  const innerRing = indicator.children[1];

  const gui = new GUI({ title: "Terrain — off" });

  gui
    .add({ toggle: () => toggleTool(TOOL_HILL) }, "toggle")
    .name("Hill");

  const hillFolder = gui.addFolder("Hill action");
  hillFolder
    .add(state, "hillAction", { "Make Hill": ACTION_MAKE, Level: ACTION_LEVEL })
    .name("Action")
    .onChange(refreshIndicatorColor);
  hillFolder
    .add(state, "makeAlgo", {
      "Naive (just lift)": ALGO_NAIVE,
      "Level → Lift": ALGO_LEVEL_LIFT,
      "Lift + Smooth": ALGO_LIFT_SMOOTH,
    })
    .name("Make algorithm");
  hillFolder.add(state, "smoothness", 0, 20, 0.5).name("smoothness");

  gui.add(state, "size", 1, 30, 0.5);
  gui.add(state, "hardness", 0, 1, 0.05);

  gui.add({ reset: () => resetTerrain() }, "reset").name("Reset Terrain");

  function resetTerrain() {
    const positions = land.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) positions.setZ(i, 0);
    positions.needsUpdate = true;
    land.geometry.computeVertexNormals();
  }

  function toggleTool(t) {
    state.tool = state.tool === t ? TOOL_OFF : t;
    gui.title(
      `Terrain — ${state.tool}${
        state.tool === TOOL_OFF ? "" : " (hold Shift to paint)"
      }`,
    );
    if (state.tool === TOOL_OFF) {
      indicator.visible = false;
      controls.enabled = true;
      isShiftDown = false;
      isPainting = false;
    } else {
      refreshIndicatorColor();
    }
  }

  function refreshIndicatorColor() {
    if (state.tool === TOOL_HILL && state.hillAction === ACTION_LEVEL) {
      outerRing.material.color.setHex(COLOR_LEVEL_OUTER);
      innerRing.material.color.setHex(COLOR_LEVEL_INNER);
    } else {
      outerRing.material.color.setHex(COLOR_MAKE_OUTER);
      innerRing.material.color.setHex(COLOR_MAKE_INNER);
    }
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
  });
  canvas.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  });
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button === 0 && state.tool !== TOOL_OFF && isShiftDown) {
      isPainting = true;
      e.preventDefault();
    }
  });
  window.addEventListener("pointerup", () => (isPainting = false));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Shift" && state.tool !== TOOL_OFF) {
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

  function update() {
    const dt = clock.getDelta();

    if (state.tool === TOOL_OFF) {
      indicator.visible = false;
      return;
    }

    if (pointerOnCanvas) {
      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObject(land);
      if (hits.length > 0) {
        lastHitWorld.copy(hits[0].point);
        hasHit = true;
      }
    }

    indicator.visible = hasHit;
    if (hasHit) {
      const outer = state.size;
      const inner = Math.max(state.size * (1 - state.hardness), 0.001);
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

      if (isPainting && isShiftDown && state.tool === TOOL_HILL) {
        const hitLocal = land.worldToLocal(lastHitWorld.clone());
        const params = {
          size: state.size,
          hardness: state.hardness,
          strength: state.strength,
          levelSpeed: state.levelSpeed,
          smoothness: state.smoothness,
          direction: 1,
          dt,
        };
        if (state.hillAction === ACTION_LEVEL) {
          applyCircleBrushLevelOnly(land.geometry, hitLocal, params);
        } else if (state.makeAlgo === ALGO_LEVEL_LIFT) {
          applyCircleBrushLevelLift(land.geometry, hitLocal, params);
        } else if (state.makeAlgo === ALGO_LIFT_SMOOTH) {
          applyCircleBrushLiftSmooth(land.geometry, hitLocal, params);
        } else {
          applyCircleBrush(land.geometry, hitLocal, params);
        }
      }
    }
  }

  return { update };
}

// Donut indicator: two LineLoops in world-space coords. Each frame we resample
// terrain heights along the ring so it visibly drapes over the surface.
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

// Bilinear height sampler for a PlaneGeometry-based ground rotated -π/2 on X.
//
// The plane stores vertices in local space (x, y) with z = height. After the
// land mesh's -π/2 X rotation, world Y = local Z (height) and world Z = -local Y.
// Vertex grid layout (Three.js PlaneGeometry):
//   ix = 0..wSeg, iy = 0..hSeg
//   localX = ix*cw - w/2,  localY = h/2 - iy*ch
//   index  = iy * (wSeg+1) + ix
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
