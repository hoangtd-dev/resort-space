import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const SIZE = 128;
const cache = new Map();
const loader = new GLTFLoader();

export function generateThumbnail(modelPath) {
  if (cache.has(modelPath)) return cache.get(modelPath);

  const promise = new Promise((resolve) => {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(SIZE, SIZE);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 2000);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sun = new THREE.DirectionalLight(0xffeedd, 1.4);
    sun.position.set(3, 5, 4);
    scene.add(sun);

    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;
        scene.add(model);

        // Centre and frame the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;

        model.position.sub(center);
        model.position.y += size.y / 2; // sit on ground

        const dist = maxDim * 1.5;
        camera.position.set(dist, dist * 0.65, dist);
        camera.lookAt(0, size.y * 0.35, 0);

        renderer.render(scene, camera);
        const dataURL = renderer.domElement.toDataURL("image/webp", 0.85);

        renderer.dispose();
        resolve(dataURL);
      },
      undefined,
      () => resolve(null), // on error just return null
    );
  });

  cache.set(modelPath, promise);
  return promise;
}
