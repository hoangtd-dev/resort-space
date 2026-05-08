import * as THREE from "three";

export function createOcean() {
  const geo = new THREE.PlaneGeometry(1200, 1200);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x40b8e8,
    roughness: 0.4,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "ocean";
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.5;
  mesh.receiveShadow = true;
  return mesh;
}
