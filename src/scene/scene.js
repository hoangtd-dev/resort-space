import * as THREE from "three";

import { createBeachfront } from "./beachfront/beachfront";
import { createGrid } from "./grid/grid";
import { createLights } from "./lights/lights";
import { createOcean } from "./ocean/ocean";
import { createResortBorder } from "./resortborder/resortborder";

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9dd8f5);
  scene.fog = new THREE.Fog(0x9dd8f5, 110, 400);

  scene.add(createOcean());
  scene.add(createBeachfront());
  scene.add(createResortBorder());
  scene.add(createGrid());

  for (const light of createLights()) {
    scene.add(light);
  }

  return scene;
}
