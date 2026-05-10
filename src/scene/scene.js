import * as THREE from "three";

import { createGrid } from "./grid/grid";
import { createLand } from "./land/land";
import { createLights } from "./lights/lights";
import { createOcean } from "./ocean/ocean";
import { createResortBorder } from "./resortborder/resortborder";
import { createTrees } from "./trees/trees";

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9dd8f5);
  scene.fog = new THREE.Fog(0x9dd8f5, 450, 900);


  // scene.background = new THREE.Color(0x9bbcd4);

  //  distant terrain fades naturally
  // scene.fog = new THREE.FogExp2(0xb0c8d8, 0.005);

  scene.add(createOcean());
  scene.add(createLand());
  scene.add(createTrees());
  scene.add(createResortBorder());
  scene.add(createGrid());

  for (const light of createLights()) {
    scene.add(light);
  }

  return scene;
}
