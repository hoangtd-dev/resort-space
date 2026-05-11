import * as THREE from "three";

// Singleton offscreen renderer — shared across all thumb renders.
let _renderer = null;

function getRenderer() {
  if (_renderer) return _renderer;
  _renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  _renderer.setSize(80, 80);
  _renderer.setPixelRatio(1);
  _renderer.shadowMap.enabled = false;
  return _renderer;
}

export function generateThumb(modelScene) {
  let renderer;
  try { renderer = getRenderer(); } catch { return null; }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2c3440);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const sun = new THREE.DirectionalLight(0xffeedd, 1.1);
  sun.position.set(2, 3, 2);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xaaccff, 0.3);
  fill.position.set(-1, 1, -1);
  scene.add(fill);

  const model = modelScene.clone(true);

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim === 0) return null;

  model.scale.setScalar(1 / maxDim);
  box.setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  box.setFromObject(model);
  model.position.y -= box.min.y; // rest on ground

  scene.add(model);

  const scaledH = size.y / maxDim;
  const dist = 1.7;
  const camera = new THREE.PerspectiveCamera(42, 1, 0.001, 1000);
  camera.position.set(dist * 0.75, dist * 0.85, dist * 1.05);
  camera.lookAt(0, scaledH * 0.35, 0);

  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL("image/png");

  // Clean up cloned model to avoid memory leaks
  model.traverse((node) => {
    if (node.isMesh) node.geometry?.dispose?.();
  });

  return dataURL;
}
