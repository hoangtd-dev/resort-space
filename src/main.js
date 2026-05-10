import "./style.css";
import * as THREE from "three";

import { createScene } from "./scene/scene";
import { createCamera } from "./camera/camera";
import { createRenderer } from "./renderer/renderer";
import { createControls } from "./controls/controls";
import { createTerrainEditor } from "./editor/terrainEditor";
import { updateLand } from "./scene/land/land";

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

const land = scene.getObjectByName("land");

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  controls.update();
  terrainEditor.update();

  const ocean = scene.getObjectByName("ocean");
  if (ocean) ocean.material.uniforms.time.value += dt;

  if (land) updateLand(land, dt);

  renderer.render(scene, camera);
}

animate();
