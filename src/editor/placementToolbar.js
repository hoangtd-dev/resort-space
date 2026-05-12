function svgThumb(svg) {
  return "data:image/svg+xml;base64," + btoa(svg);
}

export const PATH_TYPES = {
  rock: {
    label: "Rock Path",
    color: 0xb8b0a0,
    thumb: svgThumb(
      `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
        <rect width="64" height="64" fill="#b8b0a0"/>
        <ellipse cx="16" cy="22" rx="11" ry="7" fill="#a8a098" stroke="#888078" stroke-width="1"/>
        <ellipse cx="46" cy="18" rx="10" ry="7" fill="#c0b8a8" stroke="#888078" stroke-width="1"/>
        <ellipse cx="30" cy="40" rx="13" ry="8" fill="#a8a098" stroke="#888078" stroke-width="1"/>
        <ellipse cx="12" cy="52" rx="9" ry="6" fill="#c0b8a8" stroke="#888078" stroke-width="1"/>
        <ellipse cx="52" cy="48" rx="10" ry="7" fill="#b0a898" stroke="#888078" stroke-width="1"/>
      </svg>`,
    ),
  },
  grass: {
    label: "Grass",
    color: 0x88c455,
    thumb: svgThumb(
      `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
        <rect width="64" height="64" fill="#88c455"/>
        <path d="M8 62 Q9 48 7 36 M16 62 Q18 52 15 40 M24 62 Q26 50 25 38 M32 62 Q33 49 31 37 M40 62 Q42 50 41 38 M48 62 Q50 51 47 39 M56 62 Q58 49 55 37"
              stroke="#5a9e30" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      </svg>`,
    ),
  },
  road: {
    label: "Road",
    color: 0xb8b8b8,
    thumb: svgThumb(
      `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
        <rect width="64" height="64" fill="#686868"/>
        <line x1="0" y1="20" x2="64" y2="20" stroke="#888" stroke-width="1.5"/>
        <line x1="0" y1="44" x2="64" y2="44" stroke="#888" stroke-width="1.5"/>
        <line x1="32" y1="0"  x2="32" y2="8"  stroke="#fff" stroke-width="3" stroke-linecap="round"/>
        <line x1="32" y1="18" x2="32" y2="26" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
        <line x1="32" y1="36" x2="32" y2="44" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
        <line x1="32" y1="54" x2="32" y2="62" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
    ),
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
