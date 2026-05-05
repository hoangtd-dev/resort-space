# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Computer graphics course assignment: build a resort landscape using Three.js. Vanilla JS (no TypeScript, no framework), Vite-bundled, ES modules.

## Commands

```bash
npm install      # install deps (three, vite)
npm run dev      # start Vite dev server with HMR
npm run build    # production build to dist/
npm run preview  # serve built dist/
```

No lint, no test runner configured.

## Architecture

Entry: `index.html` mounts `<div id="threejs">` and loads `src/main.js` as a module.

`src/main.js` is the composition root. It wires three factory functions and runs the render loop:

- `src/scene/scene.js` → `createScene()` returns the `THREE.Scene`. Add meshes, lights, helpers here.
- `src/camera/camera.js` → `createCamera()` returns a `PerspectiveCamera` (75° fov, near 0.1, far 1000).
- `src/renderer/renderer.js` → `createRenderer()` returns a `WebGLRenderer` (antialias on, sized to window).
- `src/controls/controls.js` → `createControls(camera, domElement)` returns `OrbitControls` (damping on, polar-clamped above ground, distance 5–200). Must be `update()`-d each frame because damping is enabled.
- `src/editor/terrainEditor.js` → `createTerrainEditor({ scene, camera, controls, renderer })` returns `{ update }`. Owns a `lil-gui` panel and the brush indicator. Must be `update()`-d each frame.

### Land editor

The ground plane is `PlaneGeometry(100, 100, 200, 200)` — 200×200 segments are required for deformation. The mesh is tagged `name = "land"` so the editor finds it via `scene.getObjectByName("land")`. Don't rename.

Editor flow:
- Click **Lift Up** or **Lift Down** in the GUI to arm a tool (click again to disarm). Title shows current state.
- Brush indicator (yellow ring or square) follows the cursor on terrain whenever a tool is armed.
- Hold **Shift** with a tool armed → OrbitControls disabled, LMB-drag deforms terrain.
- Release Shift → controls re-enabled.

Brush math lives in `applyBrush()`. It iterates all 40k position attributes per stroke frame, computes a smooth `smoothstep`-based falloff, and writes back to local `Z` (which becomes world `Y` after the plane's `-π/2` X-rotation). `computeVertexNormals()` runs every brush frame — fine at this resolution; if a future feature pushes resolution higher, throttle this.

To add new editor tools (flatten, smooth, paint texture), extend `state.tool` and add a corresponding branch in `applyBrush` (or a sibling function). Keep all editor UI in one `lil-gui` panel.

The render loop is a vanilla `requestAnimationFrame` in `main.js` — no animation mixer / clock yet.

### Adding scene content (team-friendly pattern)

Each scene element lives in its own folder under `src/scene/<thing>/<thing>.js`, exporting a `create<Thing>()` factory that returns a `THREE.Object3D` (or array of them, like `lights.js`). `scene.js` is the only place that imports those factories and adds them to the scene graph. This lets multiple people work on different objects in parallel without touching shared files.

Examples already wired:
- `src/scene/land/land.js` — ground plane
- `src/scene/lights/lights.js` — ambient + directional sun (returns array)

To add a new element (e.g. a villa): create `src/scene/villa/villa.js` exporting `createVilla()`, then add one import + one `scene.add(createVilla())` line in `scene.js`. No edits to `main.js` needed.

Keep `main.js` as a thin composition layer (scene + camera + renderer + render loop + resize).

## Conventions

- ES module imports use extension-less specifiers (`./scene/scene`, not `./scene/scene.js`) — Vite resolves these.
- `style.css` zeroes body margin and hides overflow so the canvas fills the viewport. Renderer is appended to `#threejs`, not to `body`.
- No resize handler yet — camera aspect and renderer size are set once at startup.
