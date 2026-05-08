import { MapControls } from "three/addons/controls/MapControls.js";

export function createControls(camera, domElement) {
  const controls = new MapControls(camera, domElement);

  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  controls.minDistance = 5;
  controls.maxDistance = 200;

  controls.maxPolarAngle = Math.PI / 2 - 0.05;

  controls.screenSpacePanning = false;

  controls.target.set(0, 0, 0);
  controls.update();

  return controls;
}
