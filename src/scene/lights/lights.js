import * as THREE from "three";

export function createLights() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);

  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(20, 30, 10);
  sun.castShadow = true;

  return [ambient, sun];
}
