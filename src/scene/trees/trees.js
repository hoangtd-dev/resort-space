import * as THREE from "three";
import { getTerrainHeight } from "../land/land";

// ── Resort area: trees are excluded from this rectangle ──────────────────────
// These must stay in sync with PAN_MIN / PAN_MAX in controls.js.
export const RESORT_X_MIN = -180;
export const RESORT_X_MAX =  180;
export const RESORT_Z_MIN = -270;
export const RESORT_Z_MAX =   50;

// ── Land bounds (world-space) ─────────────────────────────────────────────────
const LAND_X_HALF  = 450;   // ±450 in X
const LAND_Z_SHORE = 130;   // just inside the waterline
const LAND_Z_BACK  = -450;  // just inside the far inland edge
// Side-edge drop zone: terrain plunges below water beyond 75% of half-width.
const EDGE_DROP_X  = LAND_X_HALF * 0.72; // leave a small extra buffer

const TREE_COUNT   = 2500;
const FOREST_BUFFER = 15; // gap between resort border and first trees

export function createTrees() {
  const trunkGeo   = new THREE.CylinderGeometry(0.25, 0.35, 3, 6);
  const canopyGeo  = new THREE.ConeGeometry(3.2, 5.5, 7);
  const canopy2Geo = new THREE.ConeGeometry(2.2, 4.5, 7);

  const trunkMat  = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0x2a6b2a });

  const trunks   = new THREE.InstancedMesh(trunkGeo,   trunkMat,  TREE_COUNT);
  const canopies = new THREE.InstancedMesh(canopyGeo,  canopyMat, TREE_COUNT);
  const tops     = new THREE.InstancedMesh(canopy2Geo, canopyMat, TREE_COUNT);

  trunks.castShadow   = true;
  canopies.castShadow = true;

  const dummy = new THREE.Object3D();
  const treePositions = [];
  let placed = 0;
  let attempts = 0;

  while (placed < TREE_COUNT && attempts < TREE_COUNT * 12) {
    attempts++;

    const x = (Math.random() * 2 - 1) * LAND_X_HALF;
    const z = LAND_Z_BACK + Math.random() * (LAND_Z_SHORE - LAND_Z_BACK);

    // Skip side-edge drop zones (terrain plunges there)
    if (Math.abs(x) > EDGE_DROP_X) continue;

    // Skip sand / beach zone (t < 0.32 → worldZ > -52)
    if (z > -60) continue;

    // Skip inside resort area + buffer
    if (
      x > RESORT_X_MIN - FOREST_BUFFER && x < RESORT_X_MAX + FOREST_BUFFER &&
      z > RESORT_Z_MIN - FOREST_BUFFER && z < RESORT_Z_MAX + FOREST_BUFFER
    ) continue;

    const groundY = getTerrainHeight(x, z);
    // Skip submerged or barely-above-water spots
    if (groundY < 0.5) continue;

    const scale = 0.6 + Math.random() * 0.9;
    const rotY  = Math.random() * Math.PI * 2;

    // Trunk: base sits on ground
    dummy.position.set(x, groundY + 1.5 * scale, z);
    dummy.scale.setScalar(scale);
    dummy.rotation.y = rotY;
    dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);

    // Lower canopy
    dummy.position.set(x, groundY + 4.5 * scale, z);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    canopies.setMatrixAt(placed, dummy.matrix);

    // Upper (smaller) canopy
    dummy.position.set(x, groundY + 7.5 * scale, z);
    dummy.scale.setScalar(scale * 0.75);
    dummy.updateMatrix();
    tops.setMatrixAt(placed, dummy.matrix);

    treePositions.push({ x, z, scale, rotY });
    placed++;
  }

  trunks.instanceMatrix.needsUpdate   = true;
  canopies.instanceMatrix.needsUpdate = true;
  tops.instanceMatrix.needsUpdate     = true;

  // Trim unused instances
  trunks.count   = placed;
  canopies.count = placed;
  tops.count     = placed;

  const group = new THREE.Group();
  group.name = "trees";
  group.add(trunks, canopies, tops);

  // Store refs + positions so syncTreeHeights can rebuild matrices without re-sampling
  group.userData.trunks   = trunks;
  group.userData.canopies = canopies;
  group.userData.tops     = tops;
  group.userData.treePositions = treePositions;

  return group;
}

// Re-pin all tree instances to actual terrain heights using the provided sampler.
// Call this after any brush stroke that deforms the land mesh.
export function syncTreeHeights(group, sampleFn) {
  const { trunks, canopies, tops, treePositions } = group.userData;
  if (!trunks || !treePositions) return;

  const dummy = new THREE.Object3D();

  for (let i = 0; i < treePositions.length; i++) {
    const { x, z, scale, rotY } = treePositions[i];
    const groundY = sampleFn(x, z);

    dummy.rotation.y = rotY;

    dummy.position.set(x, groundY + 1.5 * scale, z);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, groundY + 4.5 * scale, z);
    dummy.updateMatrix();
    canopies.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, groundY + 7.5 * scale, z);
    dummy.scale.setScalar(scale * 0.75);
    dummy.updateMatrix();
    tops.setMatrixAt(i, dummy.matrix);
  }

  trunks.instanceMatrix.needsUpdate   = true;
  canopies.instanceMatrix.needsUpdate = true;
  tops.instanceMatrix.needsUpdate     = true;
}

