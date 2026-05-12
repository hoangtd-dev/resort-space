import * as THREE from "three";
import { applyDefaultTerrain } from "./defaultTerrain";

export const LAND_SIZE = 400;
export const LAND_SEGMENTS = 200;

export function createLand() {
  const geometry = new THREE.PlaneGeometry(
    LAND_SIZE,
    LAND_SIZE,
    LAND_SEGMENTS,
    LAND_SEGMENTS,
  );

  const loader = new THREE.TextureLoader();

  const rockTex = loader.load(
    "/rocky_terrain/textures/rocky_terrain_02_diff_4k.jpg",
  );
  rockTex.wrapS = rockTex.wrapT = THREE.RepeatWrapping;
  rockTex.repeat.set(20, 20);
  rockTex.colorSpace = THREE.SRGBColorSpace;

  const sandTex = loader.load(
    "/textures/sand/sand/textures/gravelly_sand_diff_4k.jpg",
  );
  sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping;
  sandTex.repeat.set(20, 20);
  sandTex.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.MeshStandardMaterial({
    map: rockTex,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.sandMap = { value: sandTex };

    // Pass local Z (= terrain height before plane rotation) to fragment shader
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      "#include <common>\nvarying float vTerrainHeight;",
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvTerrainHeight = position.z;",
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      "#include <common>\nuniform sampler2D sandMap;\nvarying float vTerrainHeight;",
    );

    // Blend sand (low) → rock (high) based on terrain height
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `
      #ifdef USE_MAP
        vec4 rockSample = texture2D(map, vMapUv);
        vec4 sandSample = texture2D(sandMap, vMapUv);
        float blend = smoothstep(0.5, 2.5, vTerrainHeight);
        diffuseColor *= mix(sandSample, rockSample, blend);
      #endif
      `,
    );
  };

  const land = new THREE.Mesh(geometry, material);
  land.name = "land";
  land.rotation.x = -Math.PI / 2;
  land.receiveShadow = true;
  applyDefaultTerrain(land);
  return land;
}
