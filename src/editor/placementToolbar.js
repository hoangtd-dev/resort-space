import * as THREE from "three";
import { OBJECT_CONFIGS } from "./objectConfig";

export const PATH_TYPES = {
  rock: {
    label: "Rock Path",
    color: 0xb8b0a0,
    thumb: "/models/nature/bundle/PathRocks_Diffuse.png",
  },
  grass: {
    label: "Grass",
    color: 0x88c455,
    thumb: "/textures/paths/grass_path_color.png",
  },
  sand: {
    label: "Sand",
    color: 0xe0d070,
    thumb: "/textures/paths/sand_path_color.png",
  },
  water: {
    label: "Water",
    color: 0x55aae0,
    thumb: "/textures/paths/sand_path_normalGL.png",
  },
};

const LAND_SIZES = [
  ["100 × 100", 100],
  ["150 × 150", 150],
  ["200 × 200", 200],
  ["300 × 300", 300],
];

export function createPlacementToolbar(
  pathState,
  objectState,
  placementState,
  callbacks,
) {
  const toolbar = document.createElement("div");
  toolbar.className = "path-toolbar";

  const header = document.createElement("div");
  header.className = "path-toolbar-header";

  const titleWrap = document.createElement("div");
  const title = document.createElement("div");
  title.className = "path-toolbar-title";
  title.textContent = "WORLD BUILDER";
  const subtitle = document.createElement("div");
  subtitle.className = "path-toolbar-subtitle";
  subtitle.textContent = "Place or remove paths and props";
  titleWrap.appendChild(title);
  titleWrap.appendChild(subtitle);

  const indicator = document.createElement("button");
  indicator.type = "button";
  indicator.className = "path-mode-indicator";
  indicator.textContent = "Place";

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

  header.appendChild(titleWrap);
  header.appendChild(indicator);
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
  enabledToggle.className = "path-toggle active";
  enabledToggle.textContent = "Enabled";
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
  modeRow.appendChild(placeBtn);
  modeRow.appendChild(deleteBtn);
  modeWrap.appendChild(modeRow);
  controlsTop.appendChild(modeWrap);

  body.appendChild(controlsTop);

  const utilityRow = document.createElement("div");
  utilityRow.className = "path-toolbar-controls";

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "path-clear";
  clearBtn.textContent = "Clear All Placed";
  clearBtn.addEventListener("click", callbacks.onClearAll);
  utilityRow.appendChild(clearBtn);

  const sizeSelect = document.createElement("select");
  LAND_SIZES.forEach(([label, val]) => {
    const opt = document.createElement("option");
    opt.value = String(val);
    opt.textContent = label;
    if (val === 100) opt.selected = true;
    sizeSelect.appendChild(opt);
  });
  sizeSelect.addEventListener("change", () =>
    callbacks.onLandResize(Number(sizeSelect.value)),
  );
  utilityRow.appendChild(sizeSelect);

  const gridLabel = document.createElement("label");
  gridLabel.className = "path-grid-toggle";
  const gridCheckbox = document.createElement("input");
  gridCheckbox.type = "checkbox";
  gridCheckbox.checked = false;
  gridCheckbox.addEventListener("change", () =>
    callbacks.onGridToggle(gridCheckbox.checked),
  );
  const gridText = document.createElement("span");
  gridText.textContent = "Grid";
  gridLabel.appendChild(gridCheckbox);
  gridLabel.appendChild(gridText);
  utilityRow.appendChild(gridLabel);

  body.appendChild(utilityRow);

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

  const sections = [
    {
      heading: "Objects",
      entries: Object.entries(OBJECT_CONFIGS).map(([key, value]) => ({
        kind: "object", key, label: value.label, thumb: value.thumb ?? null, color: 0x5f9a57,
      })),
    },
    {
      heading: "Paths",
      entries: Object.entries(PATH_TYPES).map(([key, value]) => ({
        kind: "path", key, label: value.label, thumb: value.thumb, color: value.color,
      })),
    },
  ];

  for (const section of sections) {
    const header = document.createElement("div");
    header.className = "path-palette-section";
    header.textContent = section.heading;
    palette.appendChild(header);

    for (const entry of section.entries) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "path-palette-btn";
      btn.dataset.key = entry.key;
      btn.dataset.kind = entry.kind;
      btn.dataset.label = entry.label.toLowerCase();
      btn.dataset.section = section.heading;
      btn.style.borderColor = `${new THREE.Color(entry.color).getStyle()}`;

      const thumb = document.createElement("span");
      thumb.className = "path-palette-thumb";
      if (entry.thumb) thumb.style.backgroundImage = `url(${entry.thumb})`;
      const label = document.createElement("span");
      label.className = "path-palette-label";
      label.textContent = entry.label;
      btn.appendChild(thumb);
      btn.appendChild(label);

      btn.addEventListener("click", () => {
        placementState.mode = entry.kind;
        if (entry.kind === "path") {
          pathState.pathType = entry.key;
          callbacks.onPathTypeChange();
        } else {
          objectState.objectType = entry.key;
          callbacks.onObjectTypeChange();
        }
        for (const b of buttons) {
          b.classList.toggle(
            "active",
            b.dataset.key === entry.key && b.dataset.kind === entry.kind,
          );
        }
      });

      buttons.push(btn);
      palette.appendChild(btn);
    }
  }

  search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    for (const btn of buttons) {
      btn.style.display = btn.dataset.label.includes(q) ? "" : "none";
    }
    // Hide a section header when every button in that section is hidden.
    for (const header of palette.querySelectorAll(".path-palette-section")) {
      const sectionBtns = buttons.filter(b => b.dataset.section === header.textContent);
      header.style.display = sectionBtns.every(b => b.style.display === "none") ? "none" : "";
    }
  });

  paletteWrap.appendChild(paletteTitle);
  paletteWrap.appendChild(search);
  paletteWrap.appendChild(palette);
  body.appendChild(paletteWrap);

  toolbar.appendChild(body);

  function syncModeButtons() {
    placeBtn.classList.toggle("active", placementState.action === "place");
    deleteBtn.classList.toggle("active", placementState.action === "delete");
    indicator.textContent = placementState.action === "delete" ? "Delete" : "Place";
  }

  enabledToggle.addEventListener("click", () => {
    placementState.active = !placementState.active;
    enabledToggle.textContent = placementState.active ? "Enabled" : "Disabled";
    enabledToggle.classList.toggle("active", placementState.active);
  });

  placeBtn.addEventListener("click", () => {
    placementState.action = "place";
    syncModeButtons();
  });

  deleteBtn.addEventListener("click", () => {
    placementState.action = "delete";
    syncModeButtons();
  });

  const initial = buttons.find((b) => b.dataset.kind === "path" && b.dataset.key === pathState.pathType);
  if (initial) initial.classList.add("active");
  syncModeButtons();

  return toolbar;
}
