# 🏛️ Phase 2 & 3 Implementation Tasks

## Module 1 — Three.js Performance (LOD + Draco)
- [x] Enhance `ModelLoader.js` with KTX2 texture support + InstancedMesh helpers
- [x] Create `src/3d/SceneOptimizer.js` — frustum culling, smart render loop, LOD runtime switching

## Module 2 — i18n
- [x] Expand locale JSON files with missing gamification/booking/AR keys
- [x] Add language-aware API endpoint to `heritageRoutes.js` (multilingual content)
- [x] Wire `data-i18n` attributes into `di-san.html`
- [x] Wire `data-i18n` attributes into `explore.html`

## Module 3 — Gamification
- [x] Create `routes/gamificationRoutes.js` — REST endpoints for leaderboard, profile, events
- [x] Register gamification routes in `server.js`
- [x] Create `leaderboard.html` — premium real-time leaderboard UI with Socket.io
- [x] Create `leaderboard.css` — styling for leaderboard page
- [x] Wire points events into postRoutes/heritageRoutes (site_visit, comment, daily_login)

## Module 4 — Booking
- [x] Create `routes/bookingRoutes.js` — CRUD booking endpoints + webhook handler
- [x] Register booking routes in `server.js`
- [x] Create `booking.html` — tour booking UI page
- [x] Create `booking.css` — booking page styling
- [x] Add booking gamification hook (award 200pts on confirmed booking)

## Module 5 — WebXR (AR/VR)
- [x] Enhance `src/3d/ModelLoader.js` with WebXR VR/AR helper functions
- [x] Create `src/3d/WebXRManager.js` — VR button, controller setup, teleportation
- [x] Create `ar-view.html` — marker-based AR viewer page using MindAR/AR.js
- [x] Create `ar-view.css` — AR page styling

## Module 6 — AI Heritage Reconstruction
- [x] Enhance `routes/aiRoutes.js` with `/reconstruct` endpoint (Gemini Vision + generation)
- [x] Create `reconstruction.html` — AI reconstruction upload + result UI
- [x] Create `reconstruction.css` — AI page styling

## Infrastructure / Wiring
- [x] Add node-cron weekly/monthly leaderboard reset to `server.js`
- [x] Seed default badges into MongoDB via `seed-badges.js`
- [x] Register all new routes in `server.js`

---
✅ **All Phase 2 & 3 tasks complete.**
