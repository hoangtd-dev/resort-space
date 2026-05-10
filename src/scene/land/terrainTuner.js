import GUI from "lil-gui";
import { LAND_CONFIG, applyLandTerrain, rebuildLandGeometry } from "./land";

export function createTerrainTuner(land) {
  const gui = new GUI({ title: "Terrain Tuner", width: 290 });
  gui.domElement.style.position = "fixed";
  gui.domElement.style.top = "12px";
  gui.domElement.style.right = "12px";

  const cfg = structuredClone(LAND_CONFIG);

  function applyHeight() {
    Object.assign(LAND_CONFIG, cfg);
    applyLandTerrain(land);
  }

  function applyDepth() {
    LAND_CONFIG.depth = cfg.depth;
    rebuildLandGeometry(land);
  }

  gui.add(cfg, "depth", 100, 900, 10).name("Inland depth").onFinishChange(applyDepth);
  gui.add(cfg, "beachRampEndT", 0.03, 0.25, 0.01).name("Beach ramp end t").onChange(applyHeight);

  const f1 = gui.addFolder("Level 1 (lower slope)");
  f1.add(cfg, "l1EndT", 0.10, 0.45, 0.01).name("End t").onChange(applyHeight);
  f1.add(cfg, "l1Height", 1, 200, 1).name("Height").onChange(applyHeight);

  const f2 = gui.addFolder("Level 2 (mid slope)");
  f2.add(cfg, "l2EndT", 0.15, 0.60, 0.01).name("End t").onChange(applyHeight);
  f2.add(cfg, "l2Height", 1, 300, 1).name("Height").onChange(applyHeight);

  const f3 = gui.addFolder("Level 3 (upper / peak)");
  f3.add(cfg, "l3EndT", 0.20, 0.80, 0.01).name("End t").onChange(applyHeight);
  f3.add(cfg, "l3Height", 1, 400, 1).name("Height (peak)").onChange(applyHeight);

  gui.add({
    print() {
      const c = LAND_CONFIG;
      const lines = [
        "// paste into LAND_CONFIG in land.js",
        `depth:         ${c.depth},`,
        `beachRampEndT: ${c.beachRampEndT},`,
        `l1EndT:        ${c.l1EndT},`,
        `l1Height:      ${c.l1Height},`,
        `l2EndT:        ${c.l2EndT},`,
        `l2Height:      ${c.l2Height},`,
        `l3EndT:        ${c.l3EndT},`,
        `l3Height:      ${c.l3Height},`,
      ].join("\n");
      console.log(lines);
      showOverlay(lines);
    },
  }, "print").name("⎘ Print config");

  return gui;
}

function showOverlay(text) {
  let box = document.getElementById("terrain-tuner-print");
  if (!box) {
    box = document.createElement("pre");
    box.id = "terrain-tuner-print";
    Object.assign(box.style, {
      position: "fixed", bottom: "80px", right: "12px",
      background: "#111d", color: "#9f9", padding: "10px 14px",
      borderRadius: "6px", fontSize: "12px", fontFamily: "monospace",
      whiteSpace: "pre", zIndex: "9999", userSelect: "all",
      maxWidth: "320px", lineHeight: "1.6",
    });
    document.body.appendChild(box);
  }
  box.textContent = text;
  box.style.display = "block";
  clearTimeout(box._hide);
  box._hide = setTimeout(() => (box.style.display = "none"), 15000);
}
