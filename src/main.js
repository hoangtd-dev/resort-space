import "./style.css";

import { DefaultLoadingManager } from "three";
import { createScene } from "./scene/scene";
import { createCamera } from "./camera/camera";
import { createRenderer } from "./renderer/renderer";
import { createControls } from "./controls/controls";
import { createTerrainEditor } from "./editor/terrainEditor";

const scene = createScene();
const camera = createCamera();
const renderer = createRenderer();

const threeJsElement = document.getElementById("threejs");
threeJsElement.appendChild(renderer.domElement);

const controls = createControls(camera, renderer.domElement);

const terrainEditor = createTerrainEditor({
  scene,
  camera,
  controls,
  renderer,
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  terrainEditor.update();
  renderer.render(scene, camera);
}

animate();

// ── Splash screen ────────────────────────────────────────────────────────────
const splash = document.getElementById("splash");
const splashStart = Date.now();
const MIN_SPLASH_MS = 3200; // minimum display so the animation breathes
let splashDismissed = false;

function dismissSplash() {
  if (splashDismissed) return;
  splashDismissed = true;
  const wait = Math.max(0, MIN_SPLASH_MS - (Date.now() - splashStart));
  setTimeout(() => {
    splash.classList.add("hidden");
    splash.addEventListener("transitionend", () => splash.remove(), { once: true });
  }, wait);
}

// Primary trigger: fired by THREE once all TextureLoader / GLTFLoader items resolve.
DefaultLoadingManager.onLoad = dismissSplash;

// Fallback: if nothing async was loaded (all procedural), dismiss after the minimum wait.
setTimeout(dismissSplash, MIN_SPLASH_MS + 1500);
