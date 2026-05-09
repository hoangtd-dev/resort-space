import * as THREE from "three";

let cache = null;

export function getToonGradient() {
  if (cache) return cache;
  const data = new Uint8Array([90, 160, 230]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  cache = tex;
  return tex;
}
