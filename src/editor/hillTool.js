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

const TOOL_OFF = "off";
const TOOL_HILL = "hill";

const ACTION_MAKE = "make";
const ACTION_LEVEL = "level";

const COLOR_MAKE_OUTER = 0xffff00;
const COLOR_MAKE_INNER = 0xff8800;
const COLOR_LEVEL_OUTER = 0x66ff66;
const COLOR_LEVEL_INNER = 0x009933;

const RING_SEGMENTS = 96;
const SURFACE_OFFSET = 0.05;

export function createHillTool({
  scene,
  land,
  camera,
  controls,
  renderer,
  getSampleHeight,
  onReset,
}) {
  const canvas = renderer.domElement;

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

  let isShiftDown = false;
  let isPainting = false;

  // Brush indicator
  const indicator = createDonutIndicator(RING_SEGMENTS);
  indicator.visible = false;
  scene.add(indicator);
  const outerRing = indicator.children[0];
  const innerRing = indicator.children[1];

  // lil-gui panel
  const gui = new GUI({ title: "Terrain — off" });

  gui.add({ toggle: () => toggleTool(TOOL_HILL) }, "toggle").name("Hill");

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
  gui.add({ reset: () => onReset() }, "reset").name("Reset Terrain");

  // Internal helpers
  function toggleTool(t) {
    state.tool = state.tool === t ? TOOL_OFF : t;
    gui.title(
      `Terrain — ${state.tool}${state.tool === TOOL_OFF ? "" : " (hold Shift to paint)"}`,
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

  // Input
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button !== 0 || state.tool === TOOL_OFF || !isShiftDown) return;
      isPainting = true;
      e.preventDefault();
    },
    { capture: true },
  );

  window.addEventListener("pointerup", () => {
    isPainting = false;
  });

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

  // Per-frame update
  function update(dt, { hasHit, lastHitWorld }) {
    if (state.tool === TOOL_OFF) {
      indicator.visible = false;
      return;
    }

    indicator.visible = hasHit;
    if (!hasHit) return;

    const sampleHeight = getSampleHeight();
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

    if (isPainting && isShiftDown) {
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

  return {
    isActive: () => state.tool !== TOOL_OFF,
    isShiftHeld: () => isShiftDown,
    update,
  };
}

// Private helpers

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
