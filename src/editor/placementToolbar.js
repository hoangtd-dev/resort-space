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
  sand: {
    label: "Sand",
    color: 0xe0d070,
    thumb: svgThumb(
      `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
        <rect width="64" height="64" fill="#e0d070"/>
        <circle cx="10" cy="12" r="1.4" fill="#c8b850" opacity="0.7"/>
        <circle cx="24" cy="8"  r="1.2" fill="#c8b850" opacity="0.6"/>
        <circle cx="38" cy="14" r="1.5" fill="#c8b850" opacity="0.7"/>
        <circle cx="54" cy="10" r="1.2" fill="#c8b850" opacity="0.6"/>
        <circle cx="18" cy="26" r="1.3" fill="#c8b850" opacity="0.7"/>
        <circle cx="34" cy="30" r="1.5" fill="#c8b850" opacity="0.7"/>
        <circle cx="50" cy="24" r="1.2" fill="#c8b850" opacity="0.6"/>
        <circle cx="8"  cy="42" r="1.4" fill="#c8b850" opacity="0.7"/>
        <circle cx="22" cy="46" r="1.2" fill="#c8b850" opacity="0.6"/>
        <circle cx="44" cy="40" r="1.5" fill="#c8b850" opacity="0.7"/>
        <circle cx="58" cy="44" r="1.2" fill="#c8b850" opacity="0.6"/>
        <circle cx="14" cy="56" r="1.3" fill="#c8b850" opacity="0.7"/>
        <circle cx="36" cy="58" r="1.4" fill="#c8b850" opacity="0.7"/>
        <circle cx="56" cy="56" r="1.2" fill="#c8b850" opacity="0.6"/>
      </svg>`,
    ),
  },
  water: {
    label: "Water",
    color: 0x55aae0,
    thumb: svgThumb(
      `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
        <rect width="64" height="64" fill="#55aae0"/>
        <path d="M0 18 Q16 12 32 18 Q48 24 64 18" stroke="#2d88c0" stroke-width="2.2" fill="none"/>
        <path d="M0 32 Q16 26 32 32 Q48 38 64 32" stroke="#2d88c0" stroke-width="2.2" fill="none"/>
        <path d="M0 46 Q16 40 32 46 Q48 52 64 46" stroke="#2d88c0" stroke-width="2.2" fill="none"/>
        <path d="M0 58 Q16 52 32 58 Q48 64 64 58" stroke="#2d88c0" stroke-width="2.2" fill="none"/>
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
