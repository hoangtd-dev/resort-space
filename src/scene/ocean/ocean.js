import * as THREE from "three";

export function createOcean() {
  const geo = new THREE.PlaneGeometry(1200, 1200);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1e6e9c,  
    roughness: 0.12,
    metalness: 0.25,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "ocean";
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.5;
  mesh.receiveShadow = true;
  return mesh;
}
