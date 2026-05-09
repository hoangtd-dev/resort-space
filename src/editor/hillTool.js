import * as THREE from "three";
import {
  applyCircleBrushLevelOnly,
  applyCircleBrushLiftSmooth,
} from "./brush";

export const HILL_TOOL_OFF = "off";
export const HILL_TOOL_HILL_UP = "hillUp";
export const HILL_TOOL_HILL_DOWN = "hillDown";
export const HILL_TOOL_LEVEL_UP = "levelUp";
export const HILL_TOOL_LEVEL_DOWN = "levelDown";

const RING_COLOR_OUTER = 0x66ff99;
const RING_COLOR_INNER = 0x009933;
const RING_SEGMENTS = 96;
const SURFACE_OFFSET = 0.05;

export function createHillTool({
  scene,
  land,
  controls,
  renderer,
  getSampleHeight,
  onActivate,
}) {
  const canvas = renderer.domElement;

  const state = {
    activeTool: HILL_TOOL_OFF,
    size: 8,
    hardness: 0.3,
    strength: 4,
    smoothness: 5,
  };

  let isPainting = false;
  let onActiveToolChange = null;

  const indicator = createDonutIndicator(RING_SEGMENTS);
  indicator.visible = false;
  scene.add(indicator);
  const outerRing = indicator.children[0];
  const innerRing = indicator.children[1];

  // Default LEFT binding for restoration on disarm.
  const defaultLeftButton = controls.mouseButtons.LEFT ?? THREE.MOUSE.PAN;

  function setActiveTool(t) {
    const prev = state.activeTool;
    const next = prev === t ? HILL_TOOL_OFF : t;
    if (next === prev) return;
    state.activeTool = next;

    // Notify exclusivity hook (other tools deactivate) BEFORE we set our
    // controls.LEFT so their cleanup doesn't override us.
    if (prev === HILL_TOOL_OFF && next !== HILL_TOOL_OFF && onActivate) {
      onActivate();
    }

    if (next === HILL_TOOL_OFF) {
      indicator.visible = false;
      isPainting = false;
      controls.mouseButtons.LEFT = defaultLeftButton;
    } else {
      controls.mouseButtons.LEFT = null;
    }
    if (onActiveToolChange) onActiveToolChange();
  }

  function setOnActiveToolChange(cb) {
    onActiveToolChange = cb;
  }

  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button !== 0 || state.activeTool === HILL_TOOL_OFF) return;
      isPainting = true;
      e.preventDefault();
      e.stopPropagation();
    },
    { capture: true },
  );

  window.addEventListener("pointerup", () => {
    isPainting = false;
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.activeTool !== HILL_TOOL_OFF) {
      setActiveTool(HILL_TOOL_OFF);
    }
  });

  function update(dt, { hasHit, lastHitWorld }) {
    if (state.activeTool === HILL_TOOL_OFF) {
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

    if (!isPainting) return;

    const hitLocal = land.worldToLocal(lastHitWorld.clone());
    const direction =
      state.activeTool === HILL_TOOL_HILL_DOWN ||
      state.activeTool === HILL_TOOL_LEVEL_DOWN
        ? -1
        : 1;
    const params = {
      size: state.size,
      hardness: state.hardness,
      strength: state.strength,
      smoothness: state.smoothness,
      direction,
      dt,
    };

    if (
      state.activeTool === HILL_TOOL_HILL_UP ||
      state.activeTool === HILL_TOOL_HILL_DOWN
    ) {
      applyCircleBrushLiftSmooth(land.geometry, hitLocal, params);
    } else {
      applyCircleBrushLevelOnly(land.geometry, hitLocal, params);
    }
  }

  return {
    state,
    setActiveTool,
    setOnActiveToolChange,
    isActive: () => state.activeTool !== HILL_TOOL_OFF,
    update,
  };
}

function createDonutIndicator(segments) {
  const group = new THREE.Group();
  group.name = "brushIndicator";
  group.add(makeRingLine(RING_COLOR_OUTER, segments));
  group.add(makeRingLine(RING_COLOR_INNER, segments));
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
