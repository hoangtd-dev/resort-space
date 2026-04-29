import * as THREE from "three";

export function createLand() {
  const geometry = new THREE.PlaneGeometry(100, 100);
  const material = new THREE.MeshStandardMaterial({
    color: 0x4f8a4f,
    side: THREE.DoubleSide,
  });
  const land = new THREE.Mesh(geometry, material);
  land.rotation.x = -Math.PI / 2;
  land.receiveShadow = true;
  return land;
}
