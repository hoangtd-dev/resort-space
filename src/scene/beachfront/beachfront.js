import * as THREE from "three";

export const BEACHFRONT_WIDTH = 900;
export const BEACHFRONT_DEPTH = 300;
const WIDTH_SEGMENTS = 300;
const DEPTH_SEGMENTS = 300;

const C_DRY_SAND = new THREE.Color(0xf5dfa0);
const C_LAWN = new THREE.Color(0x78c850);
const C_JUNGLE = new THREE.Color(0x3d8c3a);

// Depth fractions (t = 0 at ocean front, 1 at inland back)
const T_DRY_END = 0.22;
const T_SAND_TO_LAWN_END = 0.32;
const T_LAWN_END = 0.7;

// --- Foam / wet-sand shader tunables ---
// shoreBaseZ should match ocean.js SHORE_Z so foam follows the visible coastline.
const FOAM_DEFAULTS = {
  shoreBaseZ: 140.0,
  reachBase: 20.0,
  reachAmp1: 5.0,
  reachAmp2: 2.5,
  waveSpeed1: 0.55,
  waveSpeed2: 0.27,
  waveK1: 0.022,
  waveK2: 0.013,
  wetFalloff: 6.0,
  foamWidth: 1.8,
  wetDarken: 0.55,
};
const WET_TINT = new THREE.Color(0x110a02);

export function createBeachfront() {
  const geo = new THREE.PlaneGeometry(
    BEACHFRONT_WIDTH,
    BEACHFRONT_DEPTH,
    WIDTH_SEGMENTS,
    DEPTH_SEGMENTS,
  );

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const ly = pos.getY(i);

    // After rotation.x = -π/2, local +y maps to world -z (inland).
    const t = (ly + BEACHFRONT_DEPTH / 2) / BEACHFRONT_DEPTH;

    pos.setZ(i, computeHeight(t, lx, ly));

    pickColor(t, tmp);
    colors[i * 3 + 0] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }

  pos.needsUpdate = true;
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  });

  patchFoamShader(mat);

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "beachfront";
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0, -10);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

// Advance shader time uniform — call from animate loop.
export function updateBeachfront(mesh, dt) {
  const shader = mesh.material.userData.shader;
  if (shader) shader.uniforms.time.value += dt;
}

function patchFoamShader(mat) {
  const uniforms = {
    time: { value: 0 },
    shoreBaseZ: { value: FOAM_DEFAULTS.shoreBaseZ },
    reachBase: { value: FOAM_DEFAULTS.reachBase },
    reachAmp1: { value: FOAM_DEFAULTS.reachAmp1 },
    reachAmp2: { value: FOAM_DEFAULTS.reachAmp2 },
    waveSpeed1: { value: FOAM_DEFAULTS.waveSpeed1 },
    waveSpeed2: { value: FOAM_DEFAULTS.waveSpeed2 },
    waveK1: { value: FOAM_DEFAULTS.waveK1 },
    waveK2: { value: FOAM_DEFAULTS.waveK2 },
    wetFalloff: { value: FOAM_DEFAULTS.wetFalloff },
    foamWidth: { value: FOAM_DEFAULTS.foamWidth },
    wetDarken: { value: FOAM_DEFAULTS.wetDarken },
    wetTint: { value: WET_TINT },
  };

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        "void main() {",
        /* glsl */ `
        varying vec3 vWorldPos;
        void main() {
        `,
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `
        #include <begin_vertex>
        vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        /* glsl */ `
        uniform float time;
        uniform float shoreBaseZ;
        uniform float reachBase;
        uniform float reachAmp1;
        uniform float reachAmp2;
        uniform float waveSpeed1;
        uniform float waveSpeed2;
        uniform float waveK1;
        uniform float waveK2;
        uniform float wetFalloff;
        uniform float foamWidth;
        uniform float wetDarken;
        uniform vec3  wetTint;
        varying vec3  vWorldPos;

        // Match ocean.js organicShoreZ — keeps foam aligned with visible water edge.
        float organicShoreOffset(float x) {
          return sin(x * 0.030)        * 14.0
               + sin(x * 0.072 + 1.3)  *  7.0
               + sin(x * 0.015 - 0.8)  *  5.0;
        }

        void main() {
        `,
      )
      .replace(
        "#include <color_fragment>",
        /* glsl */ `
        #include <color_fragment>
        {
          float shore = shoreBaseZ + organicShoreOffset(vWorldPos.x);
          // d > 0 = inland of shore line, d < 0 = ocean side
          float d = shore - vWorldPos.z;

          // Wave reach: how far inland the wave currently pushes (animated).
          float reach = reachBase
            + sin(time * waveSpeed1 + vWorldPos.x * waveK1)        * reachAmp1
            + sin(time * waveSpeed2 + vWorldPos.x * waveK2 + 1.7)  * reachAmp2;

          // Wet sand mask — 1 inside reach, 0 beyond, soft edge.
          float wet = 1.0 - smoothstep(reach - wetFalloff, reach + wetFalloff, d);

          // Foam crest — Gaussian peak at d ≈ reach.
          float dx = (d - reach) / foamWidth;
          float foam = exp(-dx * dx);

          // Mottled break-up so foam edge looks frothy, not a clean stripe.
          float m = sin(vWorldPos.x * 0.45 + time * 1.4) * cos(d * 0.75 - time * 0.9)
                  + sin(vWorldPos.x * 1.05 - d * 0.5 + time * 0.5) * 0.5;
          m = m * 0.5 + 0.5;
          foam *= smoothstep(0.30, 0.90, m);

          // Don't paint on submerged geometry (front edge dips below water).
          float above = smoothstep(-0.4, 0.3, vWorldPos.y);
          wet  *= above;
          foam *= above;

          // Limit wet zone to actual sand strip — don't darken lawn/jungle.
          float sandZone = 1.0 - smoothstep(50.0, 65.0, d);
          wet *= sandZone;

          vec3 wetColor = diffuseColor.rgb * wetDarken + wetTint;
          diffuseColor.rgb = mix(diffuseColor.rgb, wetColor, wet);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), foam);
        }
        `,
      );

    mat.userData.shader = shader;
  };
}

// Flat-zone baseline must sit above ocean (y=0) so roughness noise doesn't punch through.
const FLAT_LIFT = 0.6;

function computeHeight(t, lx, ly) {
  let h;
  if (t < 0.25) {
    h = FLAT_LIFT;
  } else if (t < 0.3) {
    h = FLAT_LIFT + (2 - FLAT_LIFT) * smoothstep((t - 0.25) / 0.05);
  } else {
    h = 2 + 13 * smoothstep((t - 0.6) / 0.4);
  }
  h += roughness(lx, ly) * 0.25;

  // Front edge dips below ocean so the water plane covers it.
  // Dip magnitude scaled to land at h ≈ -1.5 even with FLAT_LIFT.
  if (t < 0.08) {
    const dip = smoothstep(0.08, 0.0, t);
    h -= dip * (FLAT_LIFT + 1.5);
  }

  // Side edges plunge below ocean level so no water shows underneath.
  const xAbs = Math.abs(lx);
  const xThreshold = BEACHFRONT_WIDTH * 0.5 * 0.75;
  if (xAbs > xThreshold) {
    const drop = smoothstep((xAbs - xThreshold) / (BEACHFRONT_WIDTH * 0.5 - xThreshold));
    h -= drop * (h + 4);
  }

  return h;
}

function pickColor(t, out) {
  if (t < T_DRY_END) {
    return out.copy(C_DRY_SAND);
  }
  if (t < T_SAND_TO_LAWN_END) {
    return out.copy(C_DRY_SAND).lerp(C_LAWN, (t - T_DRY_END) / (T_SAND_TO_LAWN_END - T_DRY_END));
  }
  if (t < T_LAWN_END) {
    return out.copy(C_LAWN);
  }
  return out.copy(C_LAWN).lerp(C_JUNGLE, (t - T_LAWN_END) / (1 - T_LAWN_END));
}

// GLSL-style smoothstep: 1-arg form clamps x to [0,1]; 3-arg form remaps x from [edge0, edge1].
function smoothstep(edge0OrX, edge1, x) {
  let t;
  if (edge1 === undefined) {
    t = Math.max(0, Math.min(1, edge0OrX));
  } else {
    t = Math.max(0, Math.min(1, (x - edge0OrX) / (edge1 - edge0OrX)));
  }
  return t * t * (3 - 2 * t);
}

function roughness(x, y) {
  const k = 0.08;
  return (
    Math.sin(x * k * 1.3 + y * k * 0.7) * 0.5 +
    Math.sin(x * k * 0.6 - y * k * 1.9) * 0.3 +
    Math.cos(x * k * 2.7 + y * k * 1.1) * 0.2
  );
}
