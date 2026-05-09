import * as THREE from "three";
import { applyDefaultTerrain } from "./defaultTerrain";

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
    color: 0x4a7040,  // natural muted green — less cartoon, catches directional light well
    roughness: 0.92,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const land = new THREE.Mesh(geometry, material);
  land.name = "land";
  land.rotation.x = -Math.PI / 2;
  land.receiveShadow = true;
  applyDefaultTerrain(land);
  return land;
}
