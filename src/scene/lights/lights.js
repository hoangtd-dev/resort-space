import * as THREE from "three";

export function createLights() {
  // Cool ambient to fill shadows with a slight sky tint
  const ambient = new THREE.AmbientLight(0xc8e0f0, 1.2);

  // Warm sun from upper-right
  const sun = new THREE.DirectionalLight(0xfff4d6, 2.5);
  sun.position.set(60, 80, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 500;
  sun.shadow.camera.left = -150;
  sun.shadow.camera.right = 150;
  sun.shadow.camera.top = 150;
  sun.shadow.camera.bottom = -150;
  sun.shadow.bias = -0.001;

  return [ambient, sun];
}
