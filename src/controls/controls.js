import * as THREE from "three";
import { MapControls } from "three/addons/controls/MapControls.js";

// Resort area — camera is clamped here. Resize to taste.
export const PAN_MIN = new THREE.Vector3(-180, 0, -270);
export const PAN_MAX = new THREE.Vector3( 180, 0,   50);
const KEY_SPEED = 2;
const UP = new THREE.Vector3(0, 1, 0);

export function createControls(camera, domElement) {
  const controls = new MapControls(camera, domElement);

  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  controls.minDistance = 5;
  controls.maxDistance = 200;

  controls.maxPolarAngle = Math.PI / 2 - 0.25;

  controls.screenSpacePanning = false;

  controls.target.set(0, 0, 30);

  // Pan clamp — preserves camera→target offset.
  const delta = new THREE.Vector3();
  controls.addEventListener("change", () => {
    delta.copy(controls.target);
    controls.target.clamp(PAN_MIN, PAN_MAX);
    delta.sub(controls.target);
    camera.position.sub(delta);
  });

  // WASD camera movement — pans target along its own forward/right vectors.
  // MapControls.update() then reconciles camera position from target+offset.
  const keys = { w: false, a: false, s: false, d: false };
  const onKey = (down) => (e) => {
    const k = e.key.toLowerCase();
    if (k in keys) {
      keys[k] = down;
      e.preventDefault();
    }
  };
  window.addEventListener("keydown", onKey(true));
  window.addEventListener("keyup", onKey(false));

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const move = new THREE.Vector3();

  const originalUpdate = controls.update.bind(controls);
  controls.update = () => {
    applyKeys();
    return originalUpdate();
  };

  function applyKeys() {
    if (!keys.w && !keys.a && !keys.s && !keys.d) return;
    forward.subVectors(controls.target, camera.position);
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) return;
    forward.normalize();
    right.crossVectors(forward, UP).normalize();

    move.set(0, 0, 0);
    if (keys.w) move.add(forward);
    if (keys.s) move.sub(forward);
    if (keys.d) move.add(right);
    if (keys.a) move.sub(right);
    if (move.lengthSq() === 0) return;
    move.normalize().multiplyScalar(KEY_SPEED);

    controls.target.add(move);
    camera.position.add(move);
  }

  controls.update();

  return controls;
}
