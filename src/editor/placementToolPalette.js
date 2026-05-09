import * as THREE from "three";
import { OBJECT_CONFIGS } from "./objectConfig";
import { PATH_TYPES } from "./placementToolbar";

const PLACEMENT_OFF = "off";
const PLACEMENT_BUILDINGS = "buildings";
const PLACEMENT_TREES = "trees";
const PLACEMENT_PATH = "path";

export function createPlacementToolPalette({
  controls,
  pathState,
  objectState,
  placementState,
  onPathTypeChange,
  onObjectTypeChange,
  onActivate,
}) {
  const buildings = Object.entries(OBJECT_CONFIGS)
    .filter(([, c]) => c.category === "building")
    .map(([key, c]) => ({ key, label: c.label, thumb: c.thumb }));
  const trees = Object.entries(OBJECT_CONFIGS)
    .filter(([, c]) => c.category === "tree")
    .map(([key, c]) => ({ key, label: c.label, thumb: c.thumb }));
  const paths = Object.entries(PATH_TYPES).map(([key, c]) => ({
    key,
    label: c.label,
    thumb: c.thumb,
  }));

  const TOOLS = [
    {
      id: PLACEMENT_BUILDINGS,
      label: "Buildings",
      icon: buildingsIcon(),
      assets: buildings,
      mode: "object",
    },
    {
      id: PLACEMENT_TREES,
      label: "Trees",
      icon: treesIcon(),
      assets: trees,
      mode: "object",
    },
    {
      id: PLACEMENT_PATH,
      label: "Paths",
      icon: pathIcon(),
      assets: paths,
      mode: "path",
    },
  ];

  const paletteState = { activeBubble: PLACEMENT_OFF };
  const defaultLeftButton = controls.mouseButtons.LEFT ?? THREE.MOUSE.PAN;

  const root = document.createElement("div");
  root.className = "placement-palette";

  const popover = document.createElement("div");
  popover.className = "placement-popover";
  popover.style.display = "none";
  root.appendChild(popover);

  const bubbles = document.createElement("div");
  bubbles.className = "placement-bubbles";
  root.appendChild(bubbles);

  const buttons = new Map();
  for (const tool of TOOLS) {
    const btn = document.createElement("button");
    btn.className = "placement-bubble";
    btn.type = "button";
    btn.title = `${tool.label} — Click on terrain to place (Esc to exit)`;
    btn.innerHTML = tool.icon;
    btn.addEventListener("click", () => activate(tool.id));
    bubbles.appendChild(btn);
    buttons.set(tool.id, btn);
  }

  function activate(id) {
    const prev = paletteState.activeBubble;
    const next = prev === id ? PLACEMENT_OFF : id;
    if (next === prev) return;
    paletteState.activeBubble = next;

    if (prev === PLACEMENT_OFF && next !== PLACEMENT_OFF && onActivate) {
      onActivate();
    }
    applyState();
    render();
  }

  function deactivate() {
    if (paletteState.activeBubble === PLACEMENT_OFF) return;
    paletteState.activeBubble = PLACEMENT_OFF;
    applyState();
    render();
  }

  function applyState() {
    if (paletteState.activeBubble === PLACEMENT_OFF) {
      placementState.active = false;
      controls.mouseButtons.LEFT = defaultLeftButton;
      return;
    }

    const tool = TOOLS.find((t) => t.id === paletteState.activeBubble);
    placementState.active = true;
    placementState.mode = tool.mode;

    const validKeys = tool.assets.map((a) => a.key);
    if (tool.mode === "object") {
      if (!validKeys.includes(objectState.objectType)) {
        objectState.objectType = validKeys[0];
      }
      onObjectTypeChange();
    } else {
      if (!validKeys.includes(pathState.pathType)) {
        pathState.pathType = validKeys[0];
      }
      onPathTypeChange();
    }
    controls.mouseButtons.LEFT = null;
  }

  function selectAsset(key) {
    const tool = TOOLS.find((t) => t.id === paletteState.activeBubble);
    if (!tool) return;
    if (tool.mode === "object") {
      objectState.objectType = key;
      onObjectTypeChange();
    } else {
      pathState.pathType = key;
      onPathTypeChange();
    }
    render();
  }

  function render() {
    for (const [id, btn] of buttons) {
      btn.classList.toggle("active", paletteState.activeBubble === id);
    }
    const tool = TOOLS.find((t) => t.id === paletteState.activeBubble);
    if (!tool) {
      popover.style.display = "none";
      popover.innerHTML = "";
      return;
    }
    const selectedKey =
      tool.mode === "object" ? objectState.objectType : pathState.pathType;
    popover.style.display = "block";
    popover.innerHTML = popoverHTML(tool, selectedKey);
    wirePopover(popover, selectAsset);
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") deactivate();
  });

  render();

  return {
    element: root,
    deactivate,
    isActive: () => paletteState.activeBubble !== PLACEMENT_OFF,
    refresh: render,
  };
}

function popoverHTML(tool, selectedKey) {
  const items = tool.assets
    .map((asset) => {
      const thumbStyle = asset.thumb
        ? `background-image: url(${asset.thumb})`
        : "";
      return `
        <button type="button" class="placement-thumb ${asset.key === selectedKey ? "selected" : ""}" data-key="${asset.key}">
          <span class="placement-thumb-img" style="${thumbStyle}"></span>
          <span class="placement-thumb-label">${asset.label}</span>
        </button>`;
    })
    .join("");

  return `
    <div class="placement-popover-header">
      <span class="placement-popover-title">${tool.label}</span>
      <span class="placement-popover-hint">Click terrain to place · Esc to exit</span>
    </div>
    <div class="placement-grid">${items}</div>
    <div class="placement-popover-arrow"></div>
  `;
}

function wirePopover(popover, selectAsset) {
  for (const btn of popover.querySelectorAll(".placement-thumb")) {
    btn.addEventListener("click", () => selectAsset(btn.dataset.key));
  }
}

function buildingsIcon() {
  return `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="4" y="14" width="7" height="14" fill="currentColor" opacity="0.55"/>
    <rect x="13" y="6" width="7" height="22" fill="currentColor" opacity="0.55"/>
    <rect x="22" y="11" width="7" height="17" fill="currentColor" opacity="0.55"/>
    <rect x="6" y="17" width="2" height="2" fill="currentColor"/>
    <rect x="6" y="22" width="2" height="2" fill="currentColor"/>
    <rect x="15" y="9" width="2" height="2" fill="currentColor"/>
    <rect x="15" y="14" width="2" height="2" fill="currentColor"/>
    <rect x="15" y="19" width="2" height="2" fill="currentColor"/>
    <rect x="24" y="14" width="2" height="2" fill="currentColor"/>
    <rect x="24" y="19" width="2" height="2" fill="currentColor"/>
  </svg>`;
}

function treesIcon() {
  return `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M16 4 L8 18 L12 18 L6 26 L26 26 L20 18 L24 18 Z" fill="currentColor" opacity="0.55"/>
    <rect x="14" y="26" width="4" height="3" fill="currentColor"/>
  </svg>`;
}

function pathIcon() {
  return `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M5 28 Q12 22 14 16 Q16 10 24 4" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.55"/>
    <path d="M9 26 L12 22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M14 18 L17 14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M19 11 L22 7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`;
}
