import * as THREE from "three";

export function createGrid() {
  const grid = new THREE.GridHelper(200, 40, 0xffffff, 0xffffff);
  grid.name = "grid";
  grid.material.transparent = true;
  grid.material.opacity = 0.22;
  grid.material.depthTest = false;
  grid.material.depthWrite = false;
  grid.renderOrder = 999;
  grid.position.y = 0.06;
  return grid;
}
