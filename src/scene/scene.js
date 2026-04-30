import * as THREE from "three";

import { createLand } from "./land/land";
import { createLights } from "./lights/lights";

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  scene.add(createLand());

  for (const light of createLights()) {
    scene.add(light);
  }

  return scene;
}
