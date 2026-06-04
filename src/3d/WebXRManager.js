/**
 * WebXRManager.js — LUNAR HERITAGE Phase 2 / Module 5
 * Extends an existing Three.js renderer/scene with WebXR support.
 * Handles: VR button injection, AR button + hit-testing, controller setup,
 * teleportation, and hand-tracking fallback.
 *
 * Usage:
 *   import { WebXRManager } from './src/3d/WebXRManager.js';
 *   const xrManager = new WebXRManager(renderer, scene, camera, {
 *     mode: 'vr',           // 'vr' | 'ar' | 'auto'
 *     navMeshObjects: [],   // THREE.Object3D[] for teleport raycasting
 *     domOverlayRoot: '#ar-overlay'
 *   });
 *   await xrManager.init();
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';
import { VRButton }  from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/webxr/VRButton.js';
import { ARButton }  from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/webxr/ARButton.js';
import { XRControllerModelFactory } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/webxr/XRControllerModelFactory.js';

/* ════════════════════════════════════════════════════════════════
   WebXRManager
   ════════════════════════════════════════════════════════════════ */
export class WebXRManager {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene}         scene
   * @param {THREE.Camera}        camera
   * @param {object}              [opts]
   * @param {string} [opts.mode='auto']          'vr' | 'ar' | 'auto'
   * @param {THREE.Object3D[]} [opts.navMeshObjects=[]]  Teleport targets
   * @param {string|null} [opts.domOverlayRoot=null]     CSS selector for AR DOM overlay
   * @param {Function} [opts.onSessionStart]    Called when XR session starts
   * @param {Function} [opts.onSessionEnd]      Called when XR session ends
   * @param {Function} [opts.onTeleport]        Called with (position) after teleport
   */
  constructor(renderer, scene, camera, opts = {}) {
    this.renderer       = renderer;
    this.scene          = scene;
    this.camera         = camera;
    this.mode           = opts.mode           ?? 'auto';
    this.navMeshObjects = opts.navMeshObjects  ?? [];
    this.domOverlayRoot = opts.domOverlayRoot  ?? null;
    this.onSessionStart = opts.onSessionStart  ?? null;
    this.onSessionEnd   = opts.onSessionEnd    ?? null;
    this.onTeleport     = opts.onTeleport      ?? null;

    this._button          = null;
    this._controllers     = [];
    this._controllerGrips = [];
    this._raycaster       = new THREE.Raycaster();
    this._tempMatrix      = new THREE.Matrix4();

    // AR hit-test
    this._hitTestSource   = null;
    this._hitTestActive   = false;
    this._reticle         = null;      // placement indicator mesh

    // Teleport target indicator
    this._teleportTarget  = null;
    this._teleportPending = false;

    // Session state
    this.isPresenting = false;
    this._session     = null;
  }

  /* ── Public API ────────────────────────────────────────────── */

  /**
   * Initialise WebXR: enables renderer.xr, detects supported modes,
   * injects the appropriate button, and sets up controllers.
   * @returns {Promise<{supported: boolean, mode: string}>}
   */
  async init() {
    this.renderer.xr.enabled = true;

    const vrSupported = await this._checkSupport('immersive-vr');
    const arSupported = await this._checkSupport('immersive-ar');

    let activeMode = this.mode;
    if (activeMode === 'auto') {
      activeMode = arSupported ? 'ar' : vrSupported ? 'vr' : 'none';
    }

    if (activeMode === 'vr' && vrSupported) {
      this._injectVRButton();
    } else if (activeMode === 'ar' && arSupported) {
      this._injectARButton();
    } else {
      console.warn('[WebXRManager] No XR mode supported or mode=none. Showing info button.');
      this._injectUnsupportedNotice();
    }

    this._setupControllers();
    this._setupSessionEvents();
    this._buildReticle();
    this._buildTeleportIndicator();

    return { supported: activeMode !== 'none', mode: activeMode };
  }

  /**
   * Must be called inside the render loop (replaces requestAnimationFrame).
   * @param {XRFrame|null}  frame   — provided by renderer.setAnimationLoop
   */
  onFrame(frame) {
    if (!frame) return;

    // AR: hit-test placement
    if (this._hitTestActive && this._hitTestSource) {
      const refSpace = this.renderer.xr.getReferenceSpace();
      const results  = frame.getHitTestResults(this._hitTestSource);

      if (results.length > 0) {
        const pose = results[0].getPose(refSpace);
        if (this._reticle) {
          this._reticle.visible = true;
          this._reticle.matrix.fromArray(pose.transform.matrix);
        }
      } else if (this._reticle) {
        this._reticle.visible = false;
      }
    }
  }

  /**
   * Place an object at the current AR hit-test position.
   * @param {THREE.Object3D} object  — the model to place
   */
  placeObjectAtHit(object) {
    if (!this._reticle?.visible) return false;
    object.position.setFromMatrixPosition(this._reticle.matrix);
    object.visible = true;
    this.scene.add(object);
    return true;
  }

  /**
   * Attach a 3D model to the VR user's hand/controller.
   * @param {THREE.Object3D} model
   * @param {0|1}           controllerIndex  0 = left, 1 = right
   */
  attachToController(model, controllerIndex = 0) {
    const ctrl = this._controllers[controllerIndex];
    if (ctrl) ctrl.add(model);
  }

  /** Set the list of meshes that teleportation will raycast against */
  setNavMesh(objects) {
    this.navMeshObjects = Array.isArray(objects) ? objects : [objects];
  }

  /** End the current XR session programmatically */
  async exitXR() {
    if (this._session) {
      await this._session.end();
    }
  }

  /** Get the underlying XR session (null if not presenting) */
  getSession() { return this._session; }

  /* ── Private: button injection ─────────────────────────────── */

  _injectVRButton() {
    const btn = VRButton.createButton(this.renderer);
    btn.id = 'xr-vr-button';
    document.body.appendChild(btn);
    this._button = btn;
  }

  _injectARButton() {
    const opts = {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay', 'hand-tracking'],
    };
    if (this.domOverlayRoot) {
      const rootEl = typeof this.domOverlayRoot === 'string'
        ? document.querySelector(this.domOverlayRoot)
        : this.domOverlayRoot;
      if (rootEl) opts.domOverlay = { root: rootEl };
    }
    const btn = ARButton.createButton(this.renderer, opts);
    btn.id = 'xr-ar-button';
    document.body.appendChild(btn);
    this._button = btn;
  }

  _injectUnsupportedNotice() {
    const div = document.createElement('div');
    div.id = 'xr-unsupported';
    div.textContent = 'WebXR not supported on this device/browser.';
    Object.assign(div.style, {
      position: 'fixed', bottom: '20px', left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,.7)', color: '#fff',
      padding: '10px 20px', borderRadius: '6px',
      fontFamily: 'sans-serif', fontSize: '14px', zIndex: '9999'
    });
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 5000);
  }

  /* ── Private: controllers ──────────────────────────────────── */

  _setupControllers() {
    const factory = new XRControllerModelFactory();

    for (let i = 0; i < 2; i++) {
      const ctrl = this.renderer.xr.getController(i);
      ctrl.addEventListener('selectstart', (e) => this._onSelectStart(e, i));
      ctrl.addEventListener('selectend',   (e) => this._onSelectEnd(e, i));
      this.scene.add(ctrl);
      this._controllers.push(ctrl);

      // Visual controller grip (hand model)
      const grip = this.renderer.xr.getControllerGrip(i);
      grip.add(factory.createControllerModel(grip));
      this.scene.add(grip);
      this._controllerGrips.push(grip);

      // Ray line
      const ray = this._buildControllerRay();
      ctrl.add(ray);
    }
  }

  _buildControllerRay() {
    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({
      color: 0xc0c0ff, linewidth: 1, transparent: true, opacity: 0.6
    }));
    line.name      = 'controller-ray';
    line.scale.z   = 5;
    return line;
  }

  _onSelectStart(event, index) {
    const ctrl = this._controllers[index];
    this._tempMatrix.identity().extractRotation(ctrl.matrixWorld);
    this._raycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
    this._raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this._tempMatrix);

    if (this.navMeshObjects.length) {
      const hits = this._raycaster.intersectObjects(this.navMeshObjects, true);
      if (hits.length > 0) {
        this._teleportPending = true;
        if (this._teleportTarget) {
          this._teleportTarget.position.copy(hits[0].point);
          this._teleportTarget.visible = true;
        }
      }
    }

    // AR: place object on first select
    if (this._hitTestActive && this._reticle?.visible) {
      window.dispatchEvent(new CustomEvent('xr-select-ar', {
        detail: { matrix: this._reticle.matrix.clone() }
      }));
    }
  }

  _onSelectEnd(event, index) {
    if (this._teleportPending) {
      this._doTeleport();
    }
    if (this._teleportTarget) this._teleportTarget.visible = false;
    this._teleportPending = false;
  }

  _doTeleport() {
    if (!this._teleportTarget) return;
    const targetPos = this._teleportTarget.position;
    const offset    = this.camera.position.clone().sub(
      new THREE.Vector3().setFromMatrixPosition(this.renderer.xr.getReferenceSpace()?.getOffsetReferenceSpace?.() || this.camera.matrixWorld)
    );

    // Move the XR reference space
    const session = this.renderer.xr.getSession();
    if (session) {
      this.renderer.xr.getReferenceSpace().then?.(refSpace => {
        const newPos  = new XRRigidTransform({ x: targetPos.x, y: 0, z: targetPos.z });
        const bounded = refSpace.getOffsetReferenceSpace(newPos);
        this.renderer.xr.setReferenceSpace(bounded);
      });
    }

    // Fallback: move camera directly (non-WebXR contexts)
    this.camera.position.set(targetPos.x, this.camera.position.y, targetPos.z);

    if (this.onTeleport) this.onTeleport(targetPos.clone());
  }

  /* ── Private: session events ───────────────────────────────── */

  _setupSessionEvents() {
    this.renderer.xr.addEventListener('sessionstart', async () => {
      this.isPresenting = true;
      this._session     = this.renderer.xr.getSession();

      // Set up AR hit-test source
      if (this._session?.requestHitTestSource) {
        try {
          const viewerSpace    = await this._session.requestReferenceSpace('viewer');
          this._hitTestSource  = await this._session.requestHitTestSource({ space: viewerSpace });
          this._hitTestActive  = true;
        } catch (e) {
          // Hit-test not available in VR mode — expected
          this._hitTestActive = false;
        }
      }

      if (this.onSessionStart) this.onSessionStart(this._session);
    });

    this.renderer.xr.addEventListener('sessionend', () => {
      this.isPresenting     = false;
      this._session         = null;
      this._hitTestSource   = null;
      this._hitTestActive   = false;
      if (this._reticle)    this._reticle.visible        = false;
      if (this._teleportTarget) this._teleportTarget.visible = false;

      if (this.onSessionEnd) this.onSessionEnd();
    });
  }

  /* ── Private: helper meshes ────────────────────────────────── */

  _buildReticle() {
    const geo = new THREE.RingGeometry(0.12, 0.15, 32).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    this._reticle = new THREE.Mesh(geo, mat);
    this._reticle.matrixAutoUpdate = false;
    this._reticle.visible          = false;
    this.scene.add(this._reticle);
  }

  _buildTeleportIndicator() {
    const geo = new THREE.CylinderGeometry(0.25, 0.25, 0.01, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.6 });
    this._teleportTarget = new THREE.Mesh(geo, mat);
    this._teleportTarget.visible = false;
    this.scene.add(this._teleportTarget);
  }

  /* ── Private: support check ────────────────────────────────── */

  async _checkSupport(mode) {
    if (!navigator.xr) return false;
    try {
      return await navigator.xr.isSessionSupported(mode);
    } catch {
      return false;
    }
  }
}

/* ════════════════════════════════════════════════════════════════
   Standalone helpers
   ════════════════════════════════════════════════════════════════ */

/**
 * Quick check: is WebXR immersive-vr or immersive-ar available?
 * @returns {Promise<{vr: boolean, ar: boolean}>}
 */
export async function checkXRSupport() {
  if (!navigator.xr) return { vr: false, ar: false };
  const [vr, ar] = await Promise.all([
    navigator.xr.isSessionSupported('immersive-vr').catch(() => false),
    navigator.xr.isSessionSupported('immersive-ar').catch(() => false),
  ]);
  return { vr, ar };
}

/**
 * Enable WebXR on a renderer and return the XR animation loop function.
 * Drop-in replacement for requestAnimationFrame.
 *
 * @param {THREE.WebGLRenderer} renderer
 * @param {Function} renderFn   (timestamp, frame) => void
 */
export function enableXRRenderLoop(renderer, renderFn) {
  renderer.xr.enabled = true;
  renderer.setAnimationLoop(renderFn);
  return () => renderer.setAnimationLoop(null);  // returns a "stop" function
}
