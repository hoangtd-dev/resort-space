import * as THREE from "three";

import { createLand } from "./land/land";
import { createGrid } from "./grid/grid";
import { createLights } from "./lights/lights";
import { createOcean } from "./ocean/ocean";
import { createResortBorder } from "./resortborder/resortborder";
export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9dd8f5);
  scene.fog = new THREE.Fog(0x9dd8f5, 450, 900);

  scene.add(createOcean());
  scene.add(createLand());
  scene.add(createResortBorder());
  scene.add(createGrid());

  for (const light of createLights()) {
    scene.add(light);
  }

  return scene;
}
