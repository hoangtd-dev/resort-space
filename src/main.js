import "./style.css";

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
