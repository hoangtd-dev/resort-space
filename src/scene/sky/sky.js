import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";

export function createSky(renderer) {
  const sky = new Sky();
  sky.scale.setScalar(10000);

  const sun = new THREE.Vector3();
  const uniforms = sky.material.uniforms;
  uniforms["turbidity"].value = 4;
  uniforms["rayleigh"].value = 1.2;
  uniforms["mieCoefficient"].value = 0.005;
  uniforms["mieDirectionalG"].value = 0.8;

  // Sun at ~45° elevation, slightly to the right
  const phi = THREE.MathUtils.degToRad(90 - 45);
  const theta = THREE.MathUtils.degToRad(170);
  sun.setFromSphericalCoords(1, phi, theta);
  uniforms["sunPosition"].value.copy(sun);

  return { sky, sun };
}
