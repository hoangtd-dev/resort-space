import "./style.css";

import { createScene } from "./scene/scene";
import { createCamera } from "./camera/camera";
import { createRenderer } from "./renderer/renderer";

const scene = createScene();
const camera = createCamera();
const renderer = createRenderer();

const threeJsElement = document.getElementById("threejs");
threeJsElement.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();
