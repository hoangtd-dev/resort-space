import * as THREE from "three";

// Baseline world Z where the beach front sits.
const SHORE_Z = 140.0;

export function createOcean() {
  const geo = new THREE.PlaneGeometry(1200, 1200);

  const mat = new THREE.ShaderMaterial({
    fog: true,
    uniforms: {
      ...THREE.UniformsLib.fog,
      time:         { value: 0 },
      colorShallow: { value: new THREE.Color(0x72e8d5) },
      colorMid:     { value: new THREE.Color(0x38c8d8) },
      colorDeep:    { value: new THREE.Color(0x28afc5) },
      shoreZ:       { value: SHORE_Z },
    },
    vertexShader: /* glsl */`
      #include <fog_pars_vertex>
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */`
      #include <fog_pars_fragment>
      uniform float time;
      uniform vec3  colorShallow;
      uniform vec3  colorMid;
      uniform vec3  colorDeep;
      uniform float shoreZ;
      varying vec3  vWorldPos;

      // --- helpers ---
      float waveNoise(vec2 p, float spd, float frq) {
        return sin(p.x * frq       + time * spd) *
               cos(p.y * frq * 0.7 + time * spd * 0.8);
      }

      // Organic shore: the baseline shoreZ shifted by multi-freq X noise.
      // This makes foam / shallow zone follow a wavy coastline shape.
      float organicShoreZ(float x) {
        return shoreZ
          + sin(x * 0.030)        * 14.0
          + sin(x * 0.072 + 1.3)  *  7.0
          + sin(x * 0.015 - 0.8)  *  5.0;
      }

      void main() {
        float oShore = organicShoreZ(vWorldPos.x);

        // depth: 0 = near organic shore, 1 = deep ocean
        float depth = clamp((oShore - vWorldPos.z) / 280.0, 0.0, 1.0);

        // --- base water color ---
        float n1 = waveNoise(vWorldPos.xz,              0.35, 0.045) * 0.5 + 0.5;
        float n2 = waveNoise(vWorldPos.xz * 1.8 + 37.3, 0.20, 0.025) * 0.5 + 0.5;
        float pattern = smoothstep(0.25, 0.75, n1 * 0.55 + n2 * 0.45);

        vec3 base = depth < 0.5
          ? mix(colorShallow, colorMid,  depth * 2.0)
          : mix(colorMid,     colorDeep, (depth - 0.5) * 2.0);

        float noiseStr = 0.18 * (1.0 - depth * 0.7);
        vec3 color = mix(base, colorShallow * 1.1, pattern * noiseStr);

        // --- wave flow lines (subtle animated bands) ---
        float wl1 = sin(vWorldPos.x * 0.055 - vWorldPos.z * 0.04 + time * 0.5);
        float wl2 = sin(vWorldPos.x * 0.030 + vWorldPos.z * 0.03 + time * 0.35) * 0.6;
        float waveLine = smoothstep(0.72, 0.90, (wl1 + wl2) * 0.5 + 0.5);
        color = mix(color, color * 1.35, waveLine * 0.45 * (1.0 - depth * 0.5));

        gl_FragColor = vec4(color, 1.0);
        #include <fog_fragment>
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "ocean";
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0;
  return mesh;
}
