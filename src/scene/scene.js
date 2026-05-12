import * as THREE from "three";

import { createLand } from "./land/land";
import { createLights } from "./lights/lights";
import { createOcean } from "./ocean/ocean";
import { createGrid } from "./grid/grid";


export function createScene() {
  const scene = new THREE.Scene();

  scene.background = new THREE.Color(0x9bbcd4);

  //  distant terrain fades naturally
  scene.fog = new THREE.FogExp2(0xb0c8d8, 0.005);

  scene.add(createOcean());

  const land = createLand();
  scene.add(land);

  scene.add(createGrid());

  for (const light of createLights()) {
    scene.add(light);
  }

  return scene;
}
