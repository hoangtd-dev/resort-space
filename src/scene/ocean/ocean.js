import * as THREE from "three";
import { getToonGradient } from "../../utils/toonGradient";

export function createOcean() {
  const geo = new THREE.PlaneGeometry(1200, 1200);
  const mat = new THREE.MeshToonMaterial({
    color: 0x4cc4e8,
    gradientMap: getToonGradient(),
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "ocean";
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.5;
  mesh.receiveShadow = true;
  return mesh;
}
