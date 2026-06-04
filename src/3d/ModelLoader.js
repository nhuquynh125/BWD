/**
 * ModelLoader.js — LUNAR HERITAGE Phase 2
 * Three.js performance layer: Draco LOD, instancing, optimised render loop.
 *
 * Usage (ES module via importmap / bundler):
 *   import { loadModelForDevice, buildLOD, createInstancedGroup } from './src/3d/ModelLoader.js';
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';
import { GLTFLoader }  from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/loaders/DRACOLoader.js';
import { LOD }         from 'https://cdn.jsdelivr.net/npm/three@0.165.0/src/objects/LOD.js';

/* ─── Draco setup ─────────────────────────────────────────── */
const dracoLoader = new DRACOLoader();
// Draco WASM decoders — hosted on CDN; swap for /static/draco/ in production
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

/* ─── Device tier detection ────────────────────────────────── */
/**
 * Returns 'low' | 'mid' | 'high' based on hardware concurrency + user agent.
 */
export function detectDeviceTier() {
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency || 2;

  // Probe WebGL2 renderer string for discrete GPU hint
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
      const isHighGPU = /GeForce|Radeon|RTX|GTX|RX\s/i.test(renderer);
      if (isHighGPU) return 'high';
    }
  } catch (_) {}

  if (isMobile && cores <= 4) return 'low';
  if (cores <= 8)             return 'mid';
  return 'high';
}

/* ─── Progressive model loader ─────────────────────────────── */
/**
 * Loads the appropriate Draco-compressed LOD model based on device tier.
 * @param {string} basePath  e.g. '/models/hoi-an'  → loads hoi-an_lod0.glb etc.
 * @returns {Promise<THREE.Group>}
 */
export function loadModelForDevice(basePath) {
  const tier   = detectDeviceTier();
  const lodMap = { low: 'lod2', mid: 'lod1', high: 'lod0' };
  const url    = `${basePath}_${lodMap[tier]}.glb`;

  return new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => resolve(gltf.scene),
      (xhr)  => {
        if (xhr.lengthComputable) {
          const pct = Math.round((xhr.loaded / xhr.total) * 100);
          window.dispatchEvent(new CustomEvent('model-progress', { detail: { url, pct } }));
        }
      },
      reject
    );
  });
}

/* ─── Runtime LOD builder ──────────────────────────────────── */
/**
 * Builds a Three.js LOD object from three pre-loaded meshes.
 * @param {THREE.Object3D} high   Full-detail mesh
 * @param {THREE.Object3D} mid    Medium mesh
 * @param {THREE.Object3D} low    Low-poly mesh
 * @param {number[]} distances    Switch distances, default [0, 50, 150]
 * @returns {THREE.LOD}
 */
export function buildLOD(high, mid, low, distances = [0, 50, 150]) {
  const lod = new LOD();
  lod.addLevel(high, distances[0]);
  lod.addLevel(mid,  distances[1]);
  lod.addLevel(low,  distances[2]);
  return lod;
}

/* ─── InstancedMesh helper ─────────────────────────────────── */
/**
 * Creates a single InstancedMesh from an array of object definitions.
 * Ideal for repeating elements: roof tiles, pillars, lanterns.
 *
 * @param {THREE.BufferGeometry} geometry
 * @param {THREE.Material} material
 * @param {{ x:number, y:number, z:number, rx?:number, ry?:number, rz?:number, s?:number }[]} positions
 * @returns {THREE.InstancedMesh}
 */
export function createInstancedGroup(geometry, material, positions) {
  const dummy   = new THREE.Object3D();
  const mesh    = new THREE.InstancedMesh(geometry, material, positions.length);
  mesh.frustumCulled = true;

  positions.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    if (p.rx !== undefined) dummy.rotation.set(p.rx, p.ry ?? 0, p.rz ?? 0);
    if (p.s  !== undefined) dummy.scale.setScalar(p.s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });

  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

/* ─── Demand-driven render loop ────────────────────────────── */
/**
 * Returns a render loop that only renders when something changes.
 * Pass the returned `markDirty` function to OrbitControls' 'change' listener.
 *
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @param {THREE.LOD[]} [lodObjects]   Optional array of LOD objects to update
 * @returns {{ start: Function, markDirty: Function, stop: Function }}
 */
export function createDemandRenderer(renderer, scene, camera, lodObjects = []) {
  let needsRender = true;
  let rafId       = null;

  function loop() {
    rafId = requestAnimationFrame(loop);
    if (!needsRender) return;
    lodObjects.forEach(lod => lod.update(camera));
    renderer.render(scene, camera);
    needsRender = false;
  }

  function markDirty() { needsRender = true; }

  return {
    start:     () => { needsRender = true; loop(); },
    markDirty,
    stop:      () => { if (rafId) cancelAnimationFrame(rafId); }
  };
}

/* ─── Texture optimisation helper ──────────────────────────── */
/**
 * Applies best-practice settings to a texture for heritage visuals.
 * @param {THREE.Texture} texture
 * @param {THREE.WebGLRenderer} renderer
 * @returns {THREE.Texture}
 */
export function optimizeTexture(texture, renderer) {
  texture.anisotropy     = renderer.capabilities.getMaxAnisotropy();
  texture.generateMipmaps = true;
  texture.minFilter      = THREE.LinearMipmapLinearFilter;
  texture.magFilter      = THREE.LinearFilter;
  texture.needsUpdate    = true;
  return texture;
}
