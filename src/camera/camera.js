import * as THREE from "three";

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    600,
  );

  // Ocean side, looking inland toward the beach.
  // Strip front edge is at world z ≈ +90; camera sits beyond it at z=160.
  camera.position.set(0, 50, 200);
  camera.lookAt(0, 0, 30);

  return camera;
}
