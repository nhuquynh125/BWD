# 🏛️ Vietnamese Cultural Heritage Platform — Phase 2 & 3 Technical Architecture

## Overview

This document provides a complete technical architecture blueprint for the next two development phases of the 3D Vietnamese Cultural Heritage Web Platform. The architecture is designed around your existing stack: **MongoDB + Three.js + Socket.io + Leaflet.js**.

---

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Three.js │  │  WebXR   │  │   i18n   │  │Gamifica- │  │ AI Recon │  │
│  │ (LOD+    │  │ (AR/VR)  │  │(react-i18│  │  tion UI │  │  Upload  │  │
│  │ Draco)   │  │          │  │  next)   │  │          │  │          │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
└───────┼─────────────┼─────────────┼──────────────┼─────────────┼────────┘
        │             │             │              │             │
┌───────▼─────────────▼─────────────▼──────────────▼─────────────▼────────┐
│                         API GATEWAY (Express.js)                          │
│  Auth Middleware │ Rate Limiting │ WebSocket Hub │ Webhook Handler         │
└────────┬────────────────────────────────────────────────────────────────-┘
         │
┌────────▼──────────────────────────────────────────────────────────────--┐
│                       MICROSERVICE MODULES                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Heritage │  │Gamifica- │  │ Booking  │  │   AI     │  │  i18n    │ │
│  │ 3D Svc   │  │tion Svc  │  │  Svc     │  │ Recon Svc│  │  Cache   │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
└────────┬──────────────────────────────────────────────────────────────--┘
         │
┌────────▼──────────────────────────────────────────────────────────────--┐
│              DATA LAYER                                                   │
│  MongoDB Atlas  │  Redis Cache  │  CDN (Cloudflare R2)  │  S3/MinIO      │
└──────────────────────────────────────────────────────────────────────---┘
```

---

## Module 1 — Three.js Performance Optimization

### Strategy: Progressive Enhancement Pipeline

The goal is a "graceful degradation" approach: serve the best quality model the device can handle.

```
Device Capability Detection
        │
   ┌────▼──────┐    ┌────────────┐    ┌──────────────┐
   │ Low-End   │    │  Mid-Range │    │  High-End    │
   │ Mobile    │    │  Desktop   │    │  Desktop/GPU │
   │ LOD-2     │    │  LOD-1     │    │  LOD-0 Full  │
   │ (Draco XL)│    │  (Draco M) │    │  (Draco S)   │
   └───────────┘    └────────────┘    └──────────────┘
```

### Step 1: GLTF/GLB Compression with Draco

**Tools Required:**
- `gltf-pipeline` (CLI) — offline compression
- `@gltf-transform/cli` — advanced compression
- `three/examples/jsm/loaders/DRACOLoader` — client-side decoder

**Offline Asset Pipeline (run once per model):**
```bash
# Install tools
npm install -g @gltf-transform/cli

# Compress with Draco + texture optimization
gltf-transform optimize input.glb output_lod0.glb \
  --draco.method edgebreaker \
  --texture-compress webp \
  --texture-size 2048

# Generate LOD variants
gltf-transform simplify output_lod0.glb output_lod1.glb --ratio 0.5
gltf-transform simplify output_lod0.glb output_lod2.glb --ratio 0.15
```

**Client-Side Loader (`src/3d/ModelLoader.js`):**
```javascript
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const dracoLoader = new DRACOLoader();
// Host decoders on your CDN for better caching
dracoLoader.setDecoderPath('/static/draco/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

export function detectDeviceTier() {
  const gl = document.createElement('canvas').getContext('webgl2');
  const renderer = gl?.getParameter(gl.RENDERER) || '';
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const hardwareConcurrency = navigator.hardwareConcurrency || 2;
  
  if (isMobile && hardwareConcurrency <= 4) return 'low';
  if (hardwareConcurrency <= 8)             return 'mid';
  return 'high';
}

export function loadModelForDevice(basePath) {
  const tier = detectDeviceTier();
  const lodMap = { low: 'lod2', mid: 'lod1', high: 'lod0' };
  const url = `${basePath}_${lodMap[tier]}.glb`;
  
  return new Promise((resolve, reject) => {
    gltfLoader.load(url, resolve, undefined, reject);
  });
}
```

### Step 2: Level of Detail (LOD) at Runtime

```javascript
import { LOD } from 'three';

export function buildLOD(highMesh, midMesh, lowMesh) {
  const lod = new LOD();
  lod.addLevel(highMesh, 0);    // < 50 units  → full detail
  lod.addLevel(midMesh,  50);   // 50–150 units → medium
  lod.addLevel(lowMesh,  150);  // > 150 units  → low poly
  return lod;
}

// In your animation loop:
function animate() {
  requestAnimationFrame(animate);
  lod.update(camera);  // ← crucial: updates which LOD level is visible
  renderer.render(scene, camera);
}
```

### Step 3: Frustum Culling + Instancing

```javascript
// Enable frustum culling (default is true, but confirm it's set)
mesh.frustumCulled = true;

// For repeating objects (trees, pillars, roof tiles), use InstancedMesh
const count = 500;
const dummy = new THREE.Object3D();
const instancedMesh = new THREE.InstancedMesh(geometry, material, count);

heritageObjects.forEach((obj, i) => {
  dummy.position.set(obj.x, obj.y, obj.z);
  dummy.updateMatrix();
  instancedMesh.setMatrixAt(i, dummy.matrix);
});
instancedMesh.instanceMatrix.needsUpdate = true;
```

### Step 4: Efficient Render Loop

```javascript
// Avoid unnecessary re-renders — only render on change
let needsRender = true;

controls.addEventListener('change', () => { needsRender = true; });
window.addEventListener('resize', () => { needsRender = true; });

function renderLoop() {
  requestAnimationFrame(renderLoop);
  if (!needsRender) return;
  renderer.render(scene, camera);
  needsRender = false;
}
renderLoop();
```

### Step 5: Texture Optimization

```javascript
// Use KTX2 compressed textures for GPU-native decompression
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

const ktx2Loader = new KTX2Loader()
  .setTranscoderPath('/static/basis/')
  .detectSupport(renderer);

// Always set anisotropy for heritage detail textures
texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

// Use mipmaps — Three.js generates them automatically
texture.generateMipmaps = true;
texture.minFilter = THREE.LinearMipmapLinearFilter;
```

---

## Module 2 — Internationalization (i18n)

### Recommended Library: `i18next` + `i18next-http-backend`

**Why:** Framework-agnostic, works with vanilla JS and any Node.js framework, supports dynamic backend content interpolation, and lazy loads language files.

### Step 1: Project Structure

```
/locales
├── vi/
│   ├── common.json          # UI strings (buttons, nav)
│   ├── heritage.json        # Heritage site descriptions
│   ├── gamification.json    # Badge names, reward messages
│   └── booking.json         # Booking flow strings
└── en/
    ├── common.json
    ├── heritage.json
    ├── gamification.json
    └── booking.json
```

**`/locales/vi/heritage.json`:**
```json
{
  "site_intro": "Chào mừng đến với {{siteName}}",
  "founded_year": "Được xây dựng năm {{year}}",
  "description": "{{description}}",
  "explore_3d": "Khám phá mô hình 3D",
  "book_tour": "Đặt tour tham quan"
}
```

**`/locales/en/heritage.json`:**
```json
{
  "site_intro": "Welcome to {{siteName}}",
  "founded_year": "Built in {{year}}",
  "description": "{{description}}",
  "explore_3d": "Explore 3D Model",
  "book_tour": "Book a Tour"
}
```

### Step 2: MongoDB Schema for Multilingual Content

```javascript
// models/HeritageSite.js
const HeritageSiteSchema = new Schema({
  slug: { type: String, unique: true },          // e.g., "hoi-an-ancient-town"
  location: { type: { type: String }, coordinates: [Number] },
  coverImage: String,
  model3dPath: String,

  // 🔑 Multilingual content embedded as a map
  content: {
    type: Map,
    of: new Schema({
      name:        String,
      description: String,
      history:     String,
      tags:        [String]
    })
  }
});

// Example document:
// {
//   slug: "hoi-an-ancient-town",
//   content: {
//     "vi": { name: "Phố cổ Hội An", description: "...", history: "..." },
//     "en": { name: "Hoi An Ancient Town", description: "...", history: "..." }
//   }
// }
```

### Step 3: API — Language-Aware Endpoint

```javascript
// routes/heritage.js
router.get('/sites/:slug', async (req, res) => {
  const lang = req.query.lang || req.headers['accept-language']?.slice(0, 2) || 'vi';
  const supported = ['vi', 'en'];
  const safeLang = supported.includes(lang) ? lang : 'vi';

  const site = await HeritageSite.findOne({ slug: req.params.slug });
  if (!site) return res.status(404).json({ error: 'Not found' });

  // Return only the requested language, with fallback to Vietnamese
  const localizedContent = site.content.get(safeLang) || site.content.get('vi');
  
  res.json({ ...site.toObject(), content: localizedContent, lang: safeLang });
});
```

### Step 4: Client-Side Init

```javascript
import i18next from 'i18next';
import HttpBackend from 'i18next-http-backend';

await i18next.use(HttpBackend).init({
  lng: localStorage.getItem('lang') || 'vi',
  fallbackLng: 'vi',
  ns: ['common', 'heritage', 'gamification', 'booking'],
  defaultNS: 'common',
  backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' }
});

// Language switcher
document.getElementById('lang-toggle').addEventListener('click', () => {
  const newLang = i18next.language === 'vi' ? 'en' : 'vi';
  i18next.changeLanguage(newLang);
  localStorage.setItem('lang', newLang);
  // Trigger UI re-render
  renderPage();
});
```

---

## Module 3 — Gamification System

### MongoDB Schema Design

```javascript
// models/User.js (add to existing schema)
const BadgeSchema = new Schema({
  badgeId:   { type: Schema.Types.ObjectId, ref: 'Badge' },
  earnedAt:  { type: Date, default: Date.now },
  siteSlug:  String    // which site triggered this badge
});

const UserGamificationSchema = new Schema({
  userId:        { type: Schema.Types.ObjectId, ref: 'User', unique: true },
  totalPoints:   { type: Number, default: 0, index: true },  // ← indexed for leaderboard
  weeklyPoints:  { type: Number, default: 0 },
  monthlyPoints: { type: Number, default: 0 },
  badges:        [BadgeSchema],
  visitedSites:  [{ siteSlug: String, visitedAt: Date }],
  streakDays:    { type: Number, default: 0 },
  lastActiveDate: Date
});

// models/Badge.js
const BadgeSchema = new Schema({
  slug:        { type: String, unique: true },  // e.g., "hoi-an-explorer"
  name:        { type: Map, of: String },        // multilingual
  description: { type: Map, of: String },
  iconUrl:     String,
  rarity:      { type: String, enum: ['common', 'rare', 'epic', 'legendary'] },
  criteria: {
    type:      { type: String, enum: ['visit_count', 'site_specific', 'streak', 'points_threshold'] },
    threshold: Number,
    siteSlug:  String
  }
});

// models/PointEvent.js — immutable audit log
const PointEventSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: 'User' },
  points:    Number,
  action:    { type: String, enum: ['site_visit', 'comment', 'share', 'quiz_complete', 'booking', 'daily_login'] },
  metadata:  Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now, expires: '90d' }  // TTL index
});
```

### Points Logic & Badge Award Service

```javascript
// services/GamificationService.js
const POINT_MAP = {
  site_visit:      50,
  comment:         10,
  share:           20,
  quiz_complete:   100,
  booking:         200,
  daily_login:     5,
  first_visit:     150  // bonus for first time at any site
};

export async function awardPoints(userId, action, metadata = {}) {
  const points = POINT_MAP[action] ?? 0;
  if (!points) return;

  // 1. Atomic increment — safe for concurrent requests
  const updated = await UserGamification.findOneAndUpdate(
    { userId },
    {
      $inc: { totalPoints: points, weeklyPoints: points, monthlyPoints: points },
      $set: { lastActiveDate: new Date() }
    },
    { new: true, upsert: true }
  );

  // 2. Log the event
  await PointEvent.create({ userId, points, action, metadata });

  // 3. Check badge eligibility async (non-blocking)
  checkAndAwardBadges(userId, updated, metadata);

  // 4. Emit real-time update to connected client
  io.to(`user:${userId}`).emit('points_update', {
    totalPoints: updated.totalPoints,
    pointsGained: points,
    action
  });

  return updated;
}

async function checkAndAwardBadges(userId, userGamification, metadata) {
  const allBadges = await Badge.find();
  const alreadyEarned = new Set(userGamification.badges.map(b => b.badgeId.toString()));

  for (const badge of allBadges) {
    if (alreadyEarned.has(badge._id.toString())) continue;

    let earned = false;
    switch (badge.criteria.type) {
      case 'visit_count':
        earned = userGamification.visitedSites.length >= badge.criteria.threshold;
        break;
      case 'site_specific':
        earned = userGamification.visitedSites.some(v => v.siteSlug === badge.criteria.siteSlug);
        break;
      case 'points_threshold':
        earned = userGamification.totalPoints >= badge.criteria.threshold;
        break;
    }

    if (earned) {
      await UserGamification.findOneAndUpdate(
        { userId },
        { $push: { badges: { badgeId: badge._id, siteSlug: metadata.siteSlug } } }
      );
      // Notify user in real-time
      io.to(`user:${userId}`).emit('badge_earned', { badge });
    }
  }
}
```

### Efficient Real-Time Leaderboard

```javascript
// ✅ Strategy: Redis Sorted Set for O(log N) rank updates + MongoDB for persistence

import redis from 'ioredis';
const redisClient = new redis(process.env.REDIS_URL);

const LEADERBOARD_KEY = 'leaderboard:alltime';

// Update Redis when points are awarded
export async function updateLeaderboard(userId, totalPoints) {
  await redisClient.zadd(LEADERBOARD_KEY, totalPoints, userId.toString());
}

// GET /api/leaderboard?page=1&limit=20
export async function getLeaderboard(page = 1, limit = 20) {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  // Get top users with scores (descending)
  const entries = await redisClient.zrevrangebyscore(
    LEADERBOARD_KEY, '+inf', '-inf',
    'WITHSCORES', 'LIMIT', start, limit
  );

  // Hydrate with user info from MongoDB
  const userIds = entries.filter((_, i) => i % 2 === 0);
  const scores  = entries.filter((_, i) => i % 2 !== 0);

  const users = await User.find({ _id: { $in: userIds } })
    .select('displayName avatar');

  return userIds.map((id, i) => ({
    rank: start + i + 1,
    userId: id,
    score: parseInt(scores[i]),
    ...users.find(u => u._id.toString() === id)?.toObject()
  }));
}

// Get a specific user's rank
export async function getUserRank(userId) {
  const rank = await redisClient.zrevrank(LEADERBOARD_KEY, userId.toString());
  const score = await redisClient.zscore(LEADERBOARD_KEY, userId.toString());
  return { rank: rank + 1, score: parseInt(score) };
}
```

> [!TIP]
> **Reset weekly/monthly leaderboards** using a cron job (node-cron):
> `0 0 * * 1` — resets weekly; `0 0 1 * *` — resets monthly.
> Store snapshots in MongoDB before resetting for historical records.

---

## Module 4 — Booking Integration

### Architecture: Adapter Pattern for External APIs

```
Client → /api/booking → BookingService → AdapterFactory → [TicketBox API / Klook API / Custom]
                                       ↓
                              WebhookHandler ← [Payment Gateway Callback]
                                       ↓
                                BookingModel (MongoDB)
```

### MongoDB Schema

```javascript
// models/Booking.js
const BookingSchema = new Schema({
  userId:        { type: Schema.Types.ObjectId, ref: 'User', index: true },
  siteSlug:      { type: String, index: true },
  externalRef:   String,           // ID from external API (TicketBox, Klook, etc.)
  provider:      { type: String, enum: ['ticketbox', 'klook', 'direct'] },
  
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'refunded', 'failed'],
    default: 'pending',
    index: true
  },
  
  tourDate:      Date,
  participants:  Number,
  totalAmount:   Number,
  currency:      { type: String, default: 'VND' },
  
  payment: {
    provider:    String,           // 'vnpay', 'momo', 'stripe'
    transactionId: String,
    paidAt:      Date,
    status:      String
  },
  
  statusHistory: [{
    status:    String,
    changedAt: { type: Date, default: Date.now },
    reason:    String
  }],
  
  metadata:      Schema.Types.Mixed,   // Provider-specific data
}, { timestamps: true });

// Compound index for common queries
BookingSchema.index({ userId: 1, status: 1, createdAt: -1 });
```

### Secure API Integration Layer

```javascript
// services/booking/AdapterFactory.js
import { TicketBoxAdapter } from './adapters/TicketBoxAdapter.js';
import { KlookAdapter }     from './adapters/KlookAdapter.js';
import { DirectAdapter }    from './adapters/DirectAdapter.js';

const adapters = {
  ticketbox: new TicketBoxAdapter(),
  klook:     new KlookAdapter(),
  direct:    new DirectAdapter()
};

export const BookingAdapterFactory = {
  get(provider) {
    const adapter = adapters[provider];
    if (!adapter) throw new Error(`Unknown booking provider: ${provider}`);
    return adapter;
  }
};

// services/booking/adapters/TicketBoxAdapter.js
export class TicketBoxAdapter {
  constructor() {
    // ✅ Secrets ONLY on server — never exposed to client
    this.apiKey    = process.env.TICKETBOX_API_KEY;
    this.apiSecret = process.env.TICKETBOX_API_SECRET;
    this.baseUrl   = 'https://api.ticketbox.vn/v2';
  }

  async createBooking({ siteSlug, tourDate, participants, userId }) {
    const signature = this.#sign({ siteSlug, tourDate, participants });
    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Signature':   signature,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({ event_id: siteSlug, date: tourDate, qty: participants })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new BookingProviderError(error.message, response.status);
    }
    return response.json();
  }

  // HMAC-SHA256 request signing
  #sign(payload) {
    const crypto = await import('crypto');
    return crypto.createHmac('sha256', this.apiSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }
}
```

### Webhook Handler (Idempotent)

```javascript
// routes/webhooks.js
import crypto from 'crypto';

// ✅ Idempotent: safe to receive the same webhook multiple times
router.post('/webhooks/payment/:provider', express.raw({ type: 'application/json' }), async (req, res) => {
  const provider = req.params.provider;
  
  // 1. Verify webhook signature FIRST
  if (!verifyWebhookSignature(req, provider)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Acknowledge immediately — process async to avoid timeout
  res.status(200).json({ received: true });

  const event = JSON.parse(req.body);
  
  try {
    await processWebhookEvent(provider, event);
  } catch (err) {
    console.error('[Webhook] Processing failed, will retry:', err);
    // Queue for retry (Bull/BullMQ recommended)
  }
});

async function processWebhookEvent(provider, event) {
  const { transactionId, status, externalRef } = normalizeWebhookPayload(provider, event);

  // Upsert — idempotent update
  const booking = await Booking.findOneAndUpdate(
    { externalRef },
    {
      $set:  { status, 'payment.transactionId': transactionId, 'payment.status': status },
      $push: { statusHistory: { status, reason: `Webhook from ${provider}` } }
    },
    { new: true }
  );

  if (booking) {
    // Award gamification points for completed bookings
    if (status === 'confirmed') {
      await awardPoints(booking.userId, 'booking', { siteSlug: booking.siteSlug });
    }
    // Notify user via Socket.io
    io.to(`user:${booking.userId}`).emit('booking_update', { bookingId: booking._id, status });
  }
}

function verifyWebhookSignature(req, provider) {
  const secret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`];
  const header = req.headers['x-webhook-signature'];
  const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}
```

---

## Module 5 — AR/VR with WebXR

### Architecture: Three.js → WebXR Extension

> [!IMPORTANT]
> Your existing Three.js scene can be extended to WebXR with **minimal refactoring** — WebXR works directly with your existing renderer.

### Step 1: Enable WebXR on Three.js Renderer

```javascript
// Modify your existing renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.xr.enabled = true;  // ← Single line to unlock WebXR

// Add VR button (only appears on compatible devices/browsers)
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
document.body.appendChild(VRButton.createButton(renderer));

// Update your render loop for XR
renderer.setAnimationLoop(() => {
  // renderer.setAnimationLoop replaces requestAnimationFrame for XR
  renderer.render(scene, camera);
});
```

### Step 2: VR Controllers (Hand Tracking)

```javascript
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

const controllerModelFactory = new XRControllerModelFactory();
const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);

// Controller grip for hand models
const grip1 = renderer.xr.getControllerGrip(0);
grip1.add(controllerModelFactory.createControllerModel(grip1));
scene.add(grip1);

// Teleportation interaction
controller1.addEventListener('selectstart', onSelectStart);

function onSelectStart(event) {
  const controller = event.target;
  // Raycast to find teleportation target
  const raycaster = new THREE.Raycaster();
  raycaster.setFromXRController(controller);
  const intersects = raycaster.intersectObjects(navMesh);
  if (intersects.length > 0) {
    teleportUser(intersects[0].point);
  }
}
```

### Step 3: AR with WebXR Hit Testing (Mobile)

```javascript
// AR Button — automatically detects AR support
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
document.body.appendChild(ARButton.createButton(renderer, {
  requiredFeatures: ['hit-test'],
  optionalFeatures: ['dom-overlay'],
  domOverlay: { root: document.getElementById('ar-overlay') }
}));

let hitTestSource = null;
renderer.xr.addEventListener('sessionstart', async () => {
  const session = renderer.xr.getSession();
  const viewerRefSpace = await session.requestReferenceSpace('viewer');
  hitTestSource = await session.requestHitTestSource({ space: viewerRefSpace });
});

// In render loop — place heritage 3D model in real world
renderer.setAnimationLoop((timestamp, frame) => {
  if (frame && hitTestSource) {
    const refSpace = renderer.xr.getReferenceSpace();
    const hitTestResults = frame.getHitTestResults(hitTestSource);
    
    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
      const pose = hit.getPose(refSpace);
      heritageModel.visible = true;
      heritageModel.matrix.fromArray(pose.transform.matrix);
    }
  }
  renderer.render(scene, camera);
});
```

### Step 4: AR.js for Monument Recognition (Marker-Based)

Use **AR.js** for QR/marker-based AR (works without WebXR on older devices):

```html
<!-- Marker-based AR — scan QR code at heritage site to show 3D overlay -->
<script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
<script src="https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.js"></script>

<a-scene embedded arjs="sourceType: webcam; debugUIEnabled: false;">
  <a-assets>
    <a-asset-item id="hoi-an-model" src="/models/hoi-an_lod1.glb"></a-asset-item>
  </a-assets>
  
  <!-- Each heritage site gets a unique Hiro marker pattern -->
  <a-marker preset="hiro" id="marker-hoi-an">
    <a-gltf-model src="#hoi-an-model" scale="0.1 0.1 0.1"></a-gltf-model>
  </a-marker>
  
  <a-entity camera></a-entity>
</a-scene>
```

### Step 5: MindAR for Image Tracking (Monument Recognition)

```html
<!-- MindAR: Point camera at a heritage site image/poster → 3D model appears -->
<script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.2/dist/mindar-image-three.prod.js"></script>

<script>
const mindarThree = new window.MINDAR.IMAGE.MindARThree({
  container: document.querySelector('#ar-container'),
  imageTargetSrc: '/ar-targets/heritage-sites.mind',  // pre-compiled target file
});

const { renderer, scene, camera } = mindarThree;

const anchor = mindarThree.addAnchor(0);  // 0 = first image target
anchor.group.add(heritageModel);          // attach your existing Three.js model

await mindarThree.start();
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
</script>
```

> [!TIP]
> **Compile image targets** using the MindAR compiler tool: https://hiukim.github.io/mind-ar-js-doc/tools/compile
> You can add photographs of each heritage site as recognition targets.

---

## Module 6 — AI Heritage Reconstruction

### System Architecture

```
User Upload (Image)
      │
      ▼
[Client] ──── multipart/form-data ────► [Node.js API]
                                               │
                                    ┌──────────▼──────────┐
                                    │  Image Preprocessor  │
                                    │  (Sharp.js)          │
                                    │  - Resize to 1024px  │
                                    │  - Convert to PNG    │
                                    └──────────┬──────────┘
                                               │
                          ┌────────────────────▼──────────────────────┐
                          │           AI Backend Router                 │
                          │                                             │
                    ┌─────▼──────┐  ┌─────────────┐  ┌──────────────┐│
                    │ OpenAI     │  │ Stable       │  │ Replicate    ││
                    │ Vision API │  │ Diffusion    │  │ API          ││
                    │ (Analysis) │  │ (Generation) │  │ (ControlNet) ││
                    └─────┬──────┘  └──────┬──────┘  └──────┬───────┘│
                          └────────────────┼─────────────────┘        │
                                           │                           │
                                    ┌──────▼──────┐                   │
                                    │   Result     │                   │
                                    │   Storage    │                   │
                                    │ (S3/Cloudflare R2)               │
                                    └──────┬──────┘                   │
                                           │                           │
                                    [Client receives result URL]
```

### Step 1: Image Upload & Preprocessing

```javascript
// routes/ai-reconstruction.js
import multer  from 'multer';
import sharp   from 'sharp';
import { v4 as uuid } from 'uuid';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },   // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  }
});

router.post('/reconstruct', upload.single('image'), async (req, res) => {
  try {
    const jobId = uuid();
    
    // Preprocess with Sharp
    const processedBuffer = await sharp(req.file.buffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();

    // Upload original to storage
    const originalUrl = await uploadToStorage(req.file.buffer, `originals/${jobId}.png`);

    // Queue the AI job (BullMQ — non-blocking response)
    await reconstructionQueue.add('reconstruct', {
      jobId,
      userId: req.user.id,
      originalUrl,
      imageBuffer: processedBuffer.toString('base64'),
      mode: req.body.mode || 'full'  // 'sketch', 'colorize', 'full'
    });

    res.json({ jobId, status: 'processing', message: 'Reconstruction started' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

### Step 2: AI Processing Worker

```javascript
// workers/reconstructionWorker.js
import { Worker } from 'bullmq';
import OpenAI from 'openai';
import Replicate from 'replicate';

const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

const worker = new Worker('reconstruction', async (job) => {
  const { jobId, userId, imageBuffer, mode, originalUrl } = job.data;
  
  // Phase 1: Analyze damage with GPT-4 Vision
  const analysis = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `You are an expert Vietnamese architectural historian. 
                 Analyze this damaged/ruined heritage site image.
                 Identify: 1) Architectural style (Nguyen Dynasty, Cham, etc.)
                 2) Damaged/missing elements 3) Reconstruction suggestions.
                 Output a detailed text prompt for Stable Diffusion to reconstruct it.`
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${imageBuffer}` }
        }
      ]
    }],
    max_tokens: 500
  });

  const reconstructionPrompt = analysis.choices[0].message.content;

  // Phase 2: Generate reconstruction with ControlNet (preserves structure)
  const output = await replicate.run(
    'jagilley/controlnet-scribble:435061a1b5a4c1e26740464bf786efdbd0fafbf021d7463c73efa4b5b3f0a7a0',
    {
      input: {
        image: `data:image/png;base64,${imageBuffer}`,
        prompt: `${reconstructionPrompt}, Vietnamese traditional architecture, 
                 ancient temple, ornate details, dramatic lighting, photorealistic, 
                 8k resolution, architectural visualization`,
        negative_prompt: 'modern, ruins, damage, broken, crumbling',
        num_inference_steps: 30,
        guidance_scale: 7.5,
        strength: 0.8
      }
    }
  );

  // Upload result
  const resultUrl = await uploadToStorage(output[0], `reconstructions/${jobId}.png`);

  // Save to MongoDB
  await Reconstruction.create({ jobId, userId, originalUrl, resultUrl, prompt: reconstructionPrompt });

  // Notify client via Socket.io
  io.to(`user:${userId}`).emit('reconstruction_complete', { jobId, resultUrl, prompt: reconstructionPrompt });

  return { resultUrl };
}, { connection: redisConnection, concurrency: 2 });
```

### Step 3: Client-Side UI

```javascript
// Real-time progress tracking via Socket.io
socket.on('reconstruction_complete', ({ jobId, resultUrl, prompt }) => {
  if (jobId === currentJobId) {
    document.getElementById('ai-result-img').src = resultUrl;
    document.getElementById('ai-analysis').textContent = prompt;
    document.getElementById('result-panel').classList.add('visible');
    
    // Allow user to download or share
    document.getElementById('download-btn').href = resultUrl;
  }
});

// Upload form
async function submitForReconstruction(imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('mode', 'full');

  const res = await fetch('/api/ai/reconstruct', {
    method: 'POST',
    body: formData,
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });

  const { jobId } = await res.json();
  currentJobId = jobId;
  showLoadingUI();  // Display progress animation while processing
}
```

### AI Model Comparison

| Model | Speed | Quality | Cost | Best For |
|-------|-------|---------|------|----------|
| **Stable Diffusion XL + ControlNet** (Replicate) | ~30s | ⭐⭐⭐⭐⭐ | ~$0.02/image | Full reconstruction |
| **DALL-E 3** (OpenAI) | ~15s | ⭐⭐⭐⭐ | ~$0.04/image | Concept sketches |
| **Midjourney API** | ~60s | ⭐⭐⭐⭐⭐ | Subscription | Artistic renders |
| **Open-source SD** (self-hosted) | ~5s (GPU) | ⭐⭐⭐⭐ | Server cost | High volume |

> [!NOTE]
> **Recommended approach:** Start with **Replicate API** (no GPU server needed). Scale to self-hosted Stable Diffusion on a GPU server (RunPod.io ~$0.20/hr) when volume grows.

---

## Implementation Roadmap

### Phase 2 (Months 1–3)

| Month | Focus | Deliverables |
|-------|-------|-------------|
| Month 1 | Performance + i18n | Draco-compressed models, LOD system, EN/VI translations |
| Month 2 | Gamification | Points engine, badges, Redis leaderboard |
| Month 3 | Booking | API adapters, webhook handlers, booking UI |

### Phase 3 (Months 4–6)

| Month | Focus | Deliverables |
|-------|-------|-------------|
| Month 4 | WebXR VR | VR mode, controller navigation |
| Month 5 | AR (MindAR) | Monument recognition, marker-based AR |
| Month 6 | AI Reconstruction | Upload UI, AI pipeline, result gallery |

---

## Recommended Additional Dependencies

```json
{
  "dependencies": {
    "i18next": "^23.x",
    "i18next-http-backend": "^2.x",
    "ioredis": "^5.x",
    "bullmq": "^5.x",
    "sharp": "^0.33.x",
    "openai": "^4.x",
    "replicate": "^0.29.x",
    "multer": "^1.x",
    "node-cron": "^3.x",
    "three": "^0.165.x"
  }
}
```

## Open Questions for Review

> [!IMPORTANT]
> **Booking Provider:** Do you have existing contracts/accounts with TicketBox.vn, Klook, or another Vietnamese booking partner? Or should we design a direct booking system with VNPay/MoMo payment integration?

> [!IMPORTANT]
> **AI Budget:** The AI Reconstruction feature has per-image API costs. Should we implement user quotas (e.g., 3 free reconstructions/month, premium unlimited), or is this an admin-only tool?

> [!IMPORTANT]
> **Infrastructure:** Do you have a Redis instance available? (Needed for leaderboard + job queues.) If not, Redis Cloud free tier (30MB) covers early-stage usage well.

> [!NOTE]
> **AR Strategy:** For the AR monument recognition, are users expected to scan physical markers/QR codes at the site (AR.js marker-based), or point their camera at a monument photo and have it recognized (MindAR image tracking)? Both approaches are covered above but require different target compilation workflows.
