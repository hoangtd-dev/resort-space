import * as THREE from "three";
import { PAN_MIN, PAN_MAX } from "../../controls/controls";

export function createResortBorder() {
  const { x: minX, z: minZ } = PAN_MIN;
  const { x: maxX, z: maxZ } = PAN_MAX;
  const y = 18;

  const points = [
    new THREE.Vector3(minX, y, minZ),
    new THREE.Vector3(maxX, y, minZ),
    new THREE.Vector3(maxX, y, maxZ),
    new THREE.Vector3(minX, y, maxZ),
  ];

  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineDashedMaterial({
    color: 0xffdd00,
    dashSize: 3,
    gapSize: 2,
    linewidth: 1,
    fog: false,
  });

  const line = new THREE.LineLoop(geo, mat);
  line.computeLineDistances();
  line.name = "resortBorder";
  return line;
}
