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
  toolbar.appendChild(body);

  function syncModeButtons() {
    placeBtn.classList.toggle("active", placementState.action === "place");
    deleteBtn.classList.toggle("active", placementState.action === "delete");
    indicator.textContent =
      placementState.action === "delete" ? "Delete" : "Place";
  }

  placeBtn.addEventListener("click", () => {
    placementState.action = "place";
    syncModeButtons();
  });

  deleteBtn.addEventListener("click", () => {
    placementState.action = "delete";
    syncModeButtons();
  });

  syncModeButtons();

  return toolbar;
}
