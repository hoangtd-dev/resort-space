const PRESETS = [
  { size: 400, label: "400×400" },
  { size: 500, label: "500×500" },
  { size: 600, label: "600×600" },
];

export function createResizePalette({ onResize, getCurrentSize }) {
  let open = false;

  const root = document.createElement("div");
  root.className = "resize-palette";

  const popover = document.createElement("div");
  popover.className = "resize-popover";
  popover.style.display = "none";
  root.appendChild(popover);

  const bubbles = document.createElement("div");
  bubbles.className = "resize-bubbles";
  root.appendChild(bubbles);

  const btn = document.createElement("button");
  btn.className = "resize-bubble";
  btn.type = "button";
  btn.title = "Resize terrain";
  btn.innerHTML = resizeIcon();
  btn.addEventListener("click", toggle);
  bubbles.appendChild(btn);

  function toggle() {
    open = !open;
    btn.classList.toggle("active", open);
    if (open) {
      renderPopover();
      popover.style.display = "block";
    } else {
      popover.style.display = "none";
    }
  }

  function renderPopover() {
    const current = getCurrentSize();
    const items = PRESETS.map(
      ({ size, label }) => `
      <button type="button"
        class="resize-preset-btn ${size === current ? "selected" : ""}"
        data-size="${size}">${label}</button>
    `,
    ).join("");

    popover.innerHTML = `
      <div class="resize-popover-header">
        <span class="resize-popover-title">Terrain Size</span>
      </div>
      <div class="resize-preset-grid">${items}</div>
      <div class="resize-popover-arrow"></div>
    `;

    for (const presetBtn of popover.querySelectorAll(".resize-preset-btn")) {
      presetBtn.addEventListener("click", () => {
        onResize(parseInt(presetBtn.dataset.size, 10));
        open = false;
        btn.classList.remove("active");
        popover.style.display = "none";
      });
    }
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) {
      open = false;
      btn.classList.remove("active");
      popover.style.display = "none";
    }
  });

  return { element: root };
}

function resizeIcon() {
  return `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="4" y="4" width="24" height="24" rx="2" fill="none" stroke="currentColor" stroke-width="2" opacity="0.55"/>
    <path d="M4 4 L12 4 M4 4 L4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M28 28 L20 28 M28 28 L28 20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M14 16 L18 16 M16 14 L16 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}
