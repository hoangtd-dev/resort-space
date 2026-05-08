import { OBJECT_CONFIGS } from "./objectConfig";

export const PATH_TYPES = {
  stone: { label: "Stone", color: 0x8f959d },
  grass: { label: "Grass", color: 0x6ea05e },
  dirt: { label: "Dirt", color: 0x7a5230 },
  sand: { label: "Sand", color: 0xd7be82 },
  water: { label: "Water", color: 0x3d89c7 },
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

  const title = document.createElement("div");
  title.className = "path-toolbar-title";
  title.textContent = "Placement";
  toolbar.appendChild(title);

  const row = document.createElement("div");
  row.className = "path-toolbar-controls";

  // Enable toggle
  const enableBtn = document.createElement("button");
  enableBtn.type = "button";
  enableBtn.className = "path-toggle";
  enableBtn.textContent = "Disabled";
  row.appendChild(enableBtn);

  // Mode dropdown
  const modeSelect = document.createElement("select");
  [
    ["path", "Path"],
    ["object", "Object"],
  ].forEach(([val, label]) => {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = label;
    if (val === placementState.mode) opt.selected = true;
    modeSelect.appendChild(opt);
  });
  row.appendChild(modeSelect);

  // Type dropdown (rebuilds when mode changes)
  const typeSelect = document.createElement("select");
  function rebuildTypeSelect() {
    typeSelect.innerHTML = "";
    if (placementState.mode === "path") {
      for (const [key, val] of Object.entries(PATH_TYPES)) {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = val.label;
        if (key === pathState.pathType) opt.selected = true;
        typeSelect.appendChild(opt);
      }
    } else {
      for (const [key, cfg] of Object.entries(OBJECT_CONFIGS)) {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = cfg.label;
        if (key === objectState.objectType) opt.selected = true;
        typeSelect.appendChild(opt);
      }
    }
  }
  rebuildTypeSelect();
  row.appendChild(typeSelect);

  // Clear all
  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "path-clear";
  clearBtn.textContent = "Clear All";
  clearBtn.addEventListener("click", callbacks.onClearAll);
  row.appendChild(clearBtn);

  // Land size
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
  row.appendChild(sizeSelect);

  // Grid toggle
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
  row.appendChild(gridLabel);

  toolbar.appendChild(row);

  // Events
  enableBtn.addEventListener("click", () => {
    placementState.active = !placementState.active;
    enableBtn.textContent = placementState.active ? "Enabled" : "Disabled";
    enableBtn.classList.toggle("active", placementState.active);
  });

  modeSelect.addEventListener("change", () => {
    placementState.mode = modeSelect.value;
    rebuildTypeSelect();
  });

  typeSelect.addEventListener("change", () => {
    if (placementState.mode === "path") {
      pathState.pathType = typeSelect.value;
      callbacks.onPathTypeChange();
    } else {
      objectState.objectType = typeSelect.value;
      callbacks.onObjectTypeChange();
    }
  });

  return toolbar;
}
