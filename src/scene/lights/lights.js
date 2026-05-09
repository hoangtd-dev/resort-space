import * as THREE from "three";

export function createLights() {

  const hemi = new THREE.HemisphereLight(0x96c8e8, 0x9c7c50, 0.65);

  // Primary sun 
  const sun = new THREE.DirectionalLight(0xffe4a0, 2.8);
  sun.position.set(60, 40, 25);
  sun.castShadow = true;

  // soft shadow map covering the full island
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.left   = -90;
  sun.shadow.camera.right  =  90;
  sun.shadow.camera.top    =  90;
  sun.shadow.camera.bottom = -90;
  sun.shadow.camera.near   = 1;
  sun.shadow.camera.far    = 350;
  sun.shadow.bias           = -0.0004;
  sun.shadow.normalBias     =  0.02;

  const fill = new THREE.DirectionalLight(0xc0d8f8, 0.4);
  fill.position.set(-50, 25, -30);

  return [hemi, sun, fill];
}
