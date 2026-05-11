import * as THREE from "three";
import { applyDefaultTerrain } from "./defaultTerrain";

export const LAND_SIZE = 400;
export const LAND_SEGMENTS = 200;

export function createLand() {
  const geometry = new THREE.PlaneGeometry(
    LAND_SIZE,
    LAND_SIZE,
    LAND_SEGMENTS,
    LAND_SEGMENTS,
  );

  const loader = new THREE.TextureLoader();
  const diffuse = loader.load(
    "/rocky_terrain/textures/rocky_terrain_02_diff_4k.jpg",
  );
  diffuse.wrapS = diffuse.wrapT = THREE.RepeatWrapping;
  diffuse.repeat.set(20, 20); // tile every 20 world units across the 400×400 land
  diffuse.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.MeshStandardMaterial({
    map: diffuse,
    vertexColors: true, // vertex colors multiply on top for height-based tinting
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
