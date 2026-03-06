import "./style.css";

import { createScene } from "./scene/scene";
import { createCamera } from "./camera/camera";
import { createRenderer } from "./renderer/renderer";

const scene = createScene();
const camera = createCamera();
const renderer = createRenderer();

document.body.appendChild(renderer.domElement);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();
