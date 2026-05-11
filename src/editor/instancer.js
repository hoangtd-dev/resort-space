import * as THREE from "three";

const MAX_INSTANCES = 1000;

export function createInstancer(scene) {
  // path → { meshes: InstancedMesh[], instances: Array<{x, y, z, cellKeys}> }
  const typeMap = new Map();

  // Called once per object type after the GLTF master model is fitted and ready.
  // Bakes each sub-mesh's local transform into its geometry so a single
  // instance matrix (translation only) correctly positions the whole object.
  function initType(path, masterModel, castShadow = true) {
    if (typeMap.has(path)) return;
    const meshes = [];
    masterModel.updateWorldMatrix(true, true);
    masterModel.traverse((node) => {
      if (!node.isMesh) return;
      const geo = node.geometry.clone();
      geo.applyMatrix4(node.matrixWorld);
      const im = new THREE.InstancedMesh(geo, node.material, MAX_INSTANCES);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.count = 0;
      im.castShadow = castShadow;
      im.receiveShadow = true;
      im.frustumCulled = false;
      scene.add(im);
      meshes.push(im);
    });
    typeMap.set(path, { meshes, instances: [] });
  }

  function add(path, x, y, z, cellKeys, scale = 1) {
    const data = typeMap.get(path);
    if (!data) return -1;
    const idx = data.instances.length;
    if (idx >= MAX_INSTANCES) return -1;
    const mat = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion(),
      new THREE.Vector3(scale, scale, scale),
    );
    for (const im of data.meshes) {
      im.setMatrixAt(idx, mat);
      im.count = idx + 1;
      im.instanceMatrix.needsUpdate = true;
    }
    data.instances.push({ x, y, z, cellKeys });
    return idx;
  }

  // Swap-removes instance at idx with the last one (O(1)).
  // Returns the removed instance's cellKeys, or null if not found.
  function remove(path, idx) {
    const data = typeMap.get(path);
    if (!data || idx < 0 || idx >= data.instances.length) return null;
    const last = data.instances.length - 1;
    const removed = data.instances[idx];
    if (idx !== last) {
      const mat = new THREE.Matrix4();
      for (const im of data.meshes) {
        im.getMatrixAt(last, mat);
        im.setMatrixAt(idx, mat);
        im.instanceMatrix.needsUpdate = true;
      }
      data.instances[idx] = data.instances[last];
    }
    for (const im of data.meshes) {
      im.count = last;
      im.instanceMatrix.needsUpdate = true;
    }
    data.instances.pop();
    return removed.cellKeys;
  }

  function clear() {
    for (const data of typeMap.values()) {
      for (const im of data.meshes) {
        im.count = 0;
        im.instanceMatrix.needsUpdate = true;
      }
      data.instances = [];
    }
  }

  // Given a raycaster hit on an InstancedMesh, resolve path + idx.
  function identify(im, instanceId) {
    for (const [path, data] of typeMap) {
      if (data.meshes.includes(im)) return { path, idx: instanceId };
    }
    return null;
  }

  function removeWhere(predicate) {
    const freed = [];
    for (const [path, data] of typeMap) {
      let i = 0;
      while (i < data.instances.length) {
        if (predicate(data.instances[i])) {
          const cellKeys = remove(path, i);
          if (cellKeys) freed.push(...cellKeys);
        } else {
          i++;
        }
      }
    }
    return freed;
  }

  function getAllMeshes() {
    const all = [];
    for (const data of typeMap.values()) all.push(...data.meshes);
    return all;
  }

  return { initType, add, remove, removeWhere, clear, identify, getAllMeshes };
}
