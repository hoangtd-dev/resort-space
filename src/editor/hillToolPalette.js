import {
  HILL_TOOL_HILL_UP,
  HILL_TOOL_HILL_DOWN,
  HILL_TOOL_LEVEL_UP,
  HILL_TOOL_LEVEL_DOWN,
} from "./hillTool";

const TOOLS = [
  {
    id: HILL_TOOL_HILL_UP,
    label: "Hills Up",
    showRoundness: true,
    icon: hillIcon("up"),
  },
  {
    id: HILL_TOOL_LEVEL_UP,
    label: "Level Up",
    showRoundness: false,
    icon: levelIcon("up"),
  },
  {
    id: HILL_TOOL_HILL_DOWN,
    label: "Hills Down",
    showRoundness: true,
    icon: hillIcon("down"),
  },
  {
    id: HILL_TOOL_LEVEL_DOWN,
    label: "Level Down",
    showRoundness: false,
    icon: levelIcon("down"),
  },
];

export function createHillToolPalette({
  state,
  setActiveTool,
  setOnActiveToolChange,
}) {
  const root = document.createElement("div");
  root.className = "hill-palette";

  const popover = document.createElement("div");
  popover.className = "hill-popover";
  popover.style.display = "none";
  root.appendChild(popover);

  const bubbles = document.createElement("div");
  bubbles.className = "hill-bubbles";
  root.appendChild(bubbles);

  const buttons = new Map();

  for (const tool of TOOLS) {
    const btn = document.createElement("button");
    btn.className = "hill-bubble";
    btn.type = "button";
    btn.title = `${tool.label} — Click & drag (Esc to exit)`;
    btn.innerHTML = tool.icon;
    btn.addEventListener("click", () => {
      setActiveTool(tool.id);
    });
    bubbles.appendChild(btn);
    buttons.set(tool.id, btn);
  }

  function render() {
    for (const [id, btn] of buttons) {
      btn.classList.toggle("active", state.activeTool === id);
    }

    const tool = TOOLS.find((t) => t.id === state.activeTool);
    if (!tool) {
      popover.style.display = "none";
      popover.innerHTML = "";
      return;
    }

    popover.style.display = "block";
    popover.innerHTML = popoverHTML(tool, state);
    wirePopover(popover, state);
  }

  if (setOnActiveToolChange) setOnActiveToolChange(render);
  render();

  return { element: root, refresh: render };
}

function popoverHTML(tool, state) {
  const roundnessRow = tool.showRoundness
    ? `
      <label class="hill-popover-row">
        <span class="hill-popover-label">Roundness</span>
        <input type="range" min="0" max="20" step="0.5" value="${state.smoothness}" data-field="smoothness">
        <span class="hill-popover-value" data-out="smoothness">${fmt(state.smoothness)}</span>
      </label>`
    : "";

  return `
    <div class="hill-popover-header">
      <span class="hill-popover-title">${tool.label}</span>
      <span class="hill-popover-hint">Click &amp; drag · Esc to exit</span>
    </div>
    <label class="hill-popover-row">
      <span class="hill-popover-label">Brush size</span>
      <input type="range" min="1" max="30" step="0.5" value="${state.size}" data-field="size">
      <span class="hill-popover-value" data-out="size">${fmt(state.size)}</span>
    </label>
    <label class="hill-popover-row">
      <span class="hill-popover-label">Hardness</span>
      <input type="range" min="0" max="1" step="0.05" value="${state.hardness}" data-field="hardness">
      <span class="hill-popover-value" data-out="hardness">${fmt(state.hardness)}</span>
    </label>
    ${roundnessRow}
    <div class="hill-popover-arrow"></div>
  `;
}

function wirePopover(popover, state) {
  for (const input of popover.querySelectorAll("input[type=range]")) {
    const field = input.dataset.field;
    input.addEventListener("input", () => {
      const val = parseFloat(input.value);
      state[field] = val;
      const out = popover.querySelector(`[data-out="${field}"]`);
      if (out) out.textContent = fmt(val);
    });
  }
}

function fmt(v) {
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
}

function hillIcon(direction) {
  const arrow = arrowPath(direction);
  return `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M3 25 L11 12 L16 18 L21 9 L29 25 Z" fill="currentColor" opacity="0.55"/>
      ${arrow}
    </svg>`;
}

function levelIcon(direction) {
  const arrow = arrowPath(direction);
  return `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M3 25 L9 14 L23 14 L29 25 Z" fill="currentColor" opacity="0.55"/>
      <path d="M9 14 L23 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
      ${arrow}
    </svg>`;
}

function arrowPath(direction) {
  if (direction === "up") {
    return `<path d="M16 3 L11 8 L14 8 L14 12 L18 12 L18 8 L21 8 Z" fill="currentColor"/>`;
  }
  return `<path d="M16 12 L21 7 L18 7 L18 3 L14 3 L14 7 L11 7 Z" fill="currentColor"/>`;
}
