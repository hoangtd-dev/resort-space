import * as THREE from "three";

import { createLand } from "./land/land";
import { createLights } from "./lights/lights";
import { createOcean } from "./ocean/ocean";
import { createGrid } from "./grid/grid";

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  scene.add(createOcean());
  scene.add(createLand());
  scene.add(createGrid());

  for (const light of createLights()) {
    scene.add(light);
  }

  return scene;
}
