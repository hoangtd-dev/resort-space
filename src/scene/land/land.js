import * as THREE from "three";

export const LAND_SIZE = 100;
export const LAND_SEGMENTS = 200;

export function createLand() {
  const geometry = new THREE.PlaneGeometry(
    LAND_SIZE,
    LAND_SIZE,
    LAND_SEGMENTS,
    LAND_SEGMENTS,
  );
  const material = new THREE.MeshStandardMaterial({
    color: 0x4f8a4f,
    side: THREE.DoubleSide,
  });
  const land = new THREE.Mesh(geometry, material);
  land.name = "land";
  land.rotation.x = -Math.PI / 2;
  land.receiveShadow = true;
  return land;
}
