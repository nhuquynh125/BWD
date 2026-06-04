/**
 * SceneOptimizer.js — LUNAR HERITAGE Phase 2
 * Runtime scene optimization: frustum culling manager, LOD switcher,
 * demand-render loop, draw-call budget, and stats overlay.
 *
 * Usage:
 *   import { SceneOptimizer } from './src/3d/SceneOptimizer.js';
 *   const optimizer = new SceneOptimizer(renderer, scene, camera);
 *   optimizer.start();
 */

/* ── Minimal THREE shim — works whether THREE is global or ESM ── */
function getThree() {
  if (typeof THREE !== 'undefined') return THREE;
  throw new Error('[SceneOptimizer] THREE.js not found. Import or load it before this module.');
}

/* ════════════════════════════════════════════════════════════════
   SceneOptimizer
   ════════════════════════════════════════════════════════════════ */
export class SceneOptimizer {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene}         scene
   * @param {THREE.Camera}        camera
   * @param {object}              [opts]
   * @param {number}  [opts.targetFPS=60]          Target frame-rate budget
   * @param {boolean} [opts.adaptivePixelRatio=true] Auto-lower pixel ratio on slow frames
   * @param {boolean} [opts.showStats=false]         Show debug HUD
   * @param {number}  [opts.frustumMargin=0]         Extra frustum margin (world units)
   */
  constructor(renderer, scene, camera, opts = {}) {
    const THREE = getThree();

    this.renderer  = renderer;
    this.scene     = scene;
    this.camera    = camera;

    this.targetFPS         = opts.targetFPS         ?? 60;
    this.adaptivePixelRatio = opts.adaptivePixelRatio ?? true;
    this.showStats          = opts.showStats          ?? false;
    this.frustumMargin      = opts.frustumMargin      ?? 0;

    this._frustum    = new THREE.Frustum();
    this._projScreen = new THREE.Matrix4();
    this._lodObjects = [];      // { lod, distances }
    this._rafId      = null;
    this._dirty      = true;   // demand-render flag

    // Frame-rate tracker
    this._frameTimes = [];
    this._lastTime   = 0;
    this._slowFrames = 0;

    // Stats overlay
    this._statsEl = null;
    if (this.showStats) this._buildStatsEl();

    // Mark dirty on orbit/controls change (wired externally)
    this._boundMark = () => { this._dirty = true; };
  }

  /* ── Public API ────────────────────────────────────────────── */

  /** Register an LOD object so it gets camera-updated every frame */
  registerLOD(lodObject) {
    this._lodObjects.push(lodObject);
    this._dirty = true;
    return this;
  }

  /** Unregister an LOD object */
  removeLOD(lodObject) {
    this._lodObjects = this._lodObjects.filter(l => l !== lodObject);
  }

  /**
   * Connect to OrbitControls (or any EventDispatcher).
   * Marks the renderer dirty whenever the controls emit 'change'.
   */
  connectControls(controls) {
    controls.addEventListener('change', this._boundMark);
    return this;
  }

  disconnectControls(controls) {
    controls.removeEventListener('change', this._boundMark);
  }

  /** Mark the scene dirty — next RAF will render a frame */
  markDirty() { this._dirty = true; }

  /** Start the optimised render loop */
  start() {
    const loop = (time) => {
      this._rafId = requestAnimationFrame(loop);
      this._onFrame(time);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  /** Stop the render loop */
  stop() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /** Force a one-shot render without starting the loop */
  renderOnce() {
    this._updateLODs();
    this._applyFrustumCulling();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Apply frustum culling manually to an array of objects.
   * Useful for objects outside the scene graph.
   * @param {THREE.Object3D[]} objects
   */
  cullObjects(objects) {
    this._updateFrustum();
    objects.forEach(obj => {
      if (!obj.geometry) return;
      obj.geometry.computeBoundingSphere();
      const sphere = obj.geometry.boundingSphere.clone()
        .applyMatrix4(obj.matrixWorld);
      obj.visible = this._frustum.intersectsSphere(sphere);
    });
  }

  /**
   * Returns current draw-call stats from the renderer.
   * @returns {{ calls: number, triangles: number, points: number }}
   */
  getDrawStats() {
    const info = this.renderer.info.render;
    return { calls: info.calls, triangles: info.triangles, points: info.points };
  }

  /* ── Internal ──────────────────────────────────────────────── */

  _onFrame(time) {
    if (!this._dirty) return;

    // 1. Update LOD levels based on camera distance
    this._updateLODs();

    // 2. Frustum culling pass
    this._applyFrustumCulling();

    // 3. Render
    this.renderer.render(this.scene, this.camera);
    this._dirty = false;

    // 4. Adaptive pixel ratio
    if (this.adaptivePixelRatio) this._adaptPixelRatio(time);

    // 5. Stats HUD
    if (this.showStats && this._statsEl) this._updateStats(time);
  }

  _updateLODs() {
    this._lodObjects.forEach(lod => {
      if (typeof lod.update === 'function') lod.update(this.camera);
    });
  }

  _updateFrustum() {
    this._projScreen.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this._frustum.setFromProjectionMatrix(this._projScreen);
  }

  _applyFrustumCulling() {
    this._updateFrustum();
    this.scene.traverse(obj => {
      if (!obj.isMesh) return;
      if (!obj.geometry) return;
      // Skip instanced meshes — they manage their own culling
      if (obj.isInstancedMesh) return;

      if (!obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere();
      if (!obj.geometry.boundingSphere) return;

      const sphere = obj.geometry.boundingSphere.clone()
        .applyMatrix4(obj.matrixWorld);
      // Expand sphere by frustumMargin to avoid pop-in
      sphere.radius += this.frustumMargin;
      obj.visible = this._frustum.intersectsSphere(sphere);
    });
  }

  _adaptPixelRatio(time) {
    if (!this._lastTime) { this._lastTime = time; return; }
    const delta = time - this._lastTime;
    this._lastTime = time;
    this._frameTimes.push(delta);
    if (this._frameTimes.length > 30) this._frameTimes.shift();

    const avg = this._frameTimes.reduce((a, b) => a + b, 0) / this._frameTimes.length;
    const fps = 1000 / avg;

    if (fps < this.targetFPS * 0.7) {
      this._slowFrames++;
      if (this._slowFrames > 10) {
        const current = this.renderer.getPixelRatio();
        if (current > 1) {
          this.renderer.setPixelRatio(Math.max(1, current - 0.25));
          this._slowFrames = 0;
        }
      }
    } else if (fps > this.targetFPS * 0.95) {
      this._slowFrames = 0;
      const current = this.renderer.getPixelRatio();
      const max = Math.min(window.devicePixelRatio, 2);
      if (current < max) {
        this.renderer.setPixelRatio(Math.min(max, current + 0.25));
      }
    }
  }

  _buildStatsEl() {
    const el = document.createElement('div');
    el.id = 'scene-optimizer-stats';
    Object.assign(el.style, {
      position: 'fixed', top: '8px', left: '8px',
      background: 'rgba(0,0,0,.75)', color: '#0f0',
      fontFamily: 'monospace', fontSize: '11px',
      padding: '6px 10px', borderRadius: '4px',
      zIndex: '99999', pointerEvents: 'none',
      lineHeight: '1.6'
    });
    document.body.appendChild(el);
    this._statsEl = el;
  }

  _updateStats(time) {
    const stats = this.getDrawStats();
    const avg = this._frameTimes.length
      ? this._frameTimes.reduce((a, b) => a + b, 0) / this._frameTimes.length
      : 0;
    this._statsEl.innerHTML =
      `FPS: ${avg ? (1000 / avg).toFixed(1) : '—'}<br>` +
      `Calls: ${stats.calls}<br>` +
      `Tris: ${(stats.triangles / 1000).toFixed(1)}k<br>` +
      `LODs: ${this._lodObjects.length}<br>` +
      `DPR: ${this.renderer.getPixelRatio().toFixed(2)}`;
  }
}

/* ════════════════════════════════════════════════════════════════
   Standalone helpers (no class required)
   ════════════════════════════════════════════════════════════════ */

/**
 * Quick frustum-cull pass — checks every Mesh in scene.
 * Call once per frame BEFORE rendering.
 * @param {THREE.Scene}  scene
 * @param {THREE.Camera} camera
 */
export function quickFrustumCull(scene, camera) {
  const THREE = getThree();
  const frustum    = new THREE.Frustum();
  const projScreen = new THREE.Matrix4();
  projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projScreen);

  scene.traverse(obj => {
    if (!obj.isMesh || obj.isInstancedMesh) return;
    if (!obj.geometry) return;
    if (!obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere();
    if (!obj.geometry.boundingSphere) return;
    const s = obj.geometry.boundingSphere.clone().applyMatrix4(obj.matrixWorld);
    obj.visible = frustum.intersectsSphere(s);
  });
}

/**
 * Demand-render factory — returns a { start, markDirty, stop } controller.
 * Render only happens when markDirty() is called.
 *
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene}         scene
 * @param {THREE.Camera}        camera
 * @param {THREE.LOD[]}         [lodObjects]
 */
export function createDemandRender(renderer, scene, camera, lodObjects = []) {
  let dirty = true;
  let rafId = null;

  function loop() {
    rafId = requestAnimationFrame(loop);
    if (!dirty) return;
    lodObjects.forEach(l => l.update(camera));
    renderer.render(scene, camera);
    dirty = false;
  }

  return {
    start:     () => { dirty = true; if (!rafId) loop(); },
    stop:      () => { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } },
    markDirty: () => { dirty = true; },
  };
}

/**
 * Recursively set frustumCulled = true on all meshes in an object.
 * @param {THREE.Object3D} root
 */
export function enableFrustumCulling(root) {
  root.traverse(obj => {
    if (obj.isMesh) obj.frustumCulled = true;
  });
}

/**
 * Merge geometries in a group to reduce draw calls.
 * NOTE: materials must be the same (or use a MeshMaterial array).
 * Returns a single Mesh or null on failure.
 *
 * @param {THREE.Object3D} group
 * @param {THREE.Material} material
 * @returns {THREE.Mesh|null}
 */
export function mergeGroupGeometries(group, material) {
  try {
    const THREE = getThree();
    // Dynamic import only if BufferGeometryUtils is available
    if (!THREE.BufferGeometryUtils) {
      console.warn('[SceneOptimizer] THREE.BufferGeometryUtils not available. Include it for mergeGroupGeometries.');
      return null;
    }
    const geos = [];
    group.traverse(obj => {
      if (obj.isMesh && obj.geometry) {
        const cloned = obj.geometry.clone();
        cloned.applyMatrix4(obj.matrixWorld);
        geos.push(cloned);
      }
    });
    if (!geos.length) return null;
    const merged = THREE.BufferGeometryUtils.mergeGeometries(geos);
    return new THREE.Mesh(merged, material);
  } catch (e) {
    console.error('[SceneOptimizer] mergeGroupGeometries error:', e);
    return null;
  }
}
