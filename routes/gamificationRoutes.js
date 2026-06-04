/**
 * gamificationRoutes.js — LUNAR HERITAGE Phase 2
 * REST endpoints for leaderboard, user profile, point events, badge listing.
 */

const express = require('express');
const { requireAuth, optionalAuth } = require('../auth');
const { Badge, PointEvent, UserGamification } = require('../db');
const {
  awardPoints,
  getGamificationProfile,
  getLeaderboard,
  getUserRank,
  POINT_MAP,
} = require('../services/GamificationService');

const router = express.Router();

/* ─── GET /api/gamification/leaderboard ──────────────────────────────────── */
router.get('/leaderboard', optionalAuth, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const entries = await getLeaderboard(limit, skip);
    const total   = await UserGamification.countDocuments();

    res.json({ data: entries, page, limit, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /api/gamification/profile  (own profile) ──────────────────────── */
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const profile = await getGamificationProfile(req.user.userId);
    const rankInfo = await getUserRank(req.user.userId);
    res.json({ ...profile, ...rankInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /api/gamification/profile/:userId  (any user) ─────────────────── */
router.get('/profile/:userId', optionalAuth, async (req, res) => {
  try {
    const profile  = await getGamificationProfile(req.params.userId);
    const rankInfo = await getUserRank(req.params.userId);
    res.json({ ...profile, ...rankInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /api/gamification/events  (point history for current user) ─────── */
router.get('/events', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const events = await PointEvent.find({ userId: req.user.userId })
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();
    res.json({ data: events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /api/gamification/badges  (all badge definitions) ─────────────── */
router.get('/badges', optionalAuth, async (req, res) => {
  try {
    const badges = await Badge.find().lean();
    res.json({ data: badges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /api/gamification/rank  (current user's rank) ─────────────────── */
router.get('/rank', requireAuth, async (req, res) => {
  try {
    const rankInfo = await getUserRank(req.user.userId);
    res.json(rankInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── POST /api/gamification/award  (internal-use / test; admin only) ───── */
router.post('/award', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { userId, action, metadata } = req.body;
  if (!userId || !action) return res.status(400).json({ error: 'userId and action required' });
  if (!POINT_MAP[action]) return res.status(400).json({ error: `Unknown action: ${action}` });

  try {
    const result = await awardPoints(userId, action, metadata || {});
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── POST /api/gamification/daily-login  (call once per session) ─────────- */
router.post('/daily-login', requireAuth, async (req, res) => {
  try {
    const gam = await UserGamification.findOne({ userId: req.user.userId }).lean();
    if (gam?.lastActiveDate) {
      const diffMs   = Date.now() - new Date(gam.lastActiveDate).getTime();
      const diffHrs  = diffMs / (1000 * 60 * 60);
      if (diffHrs < 20) {
        return res.json({ skipped: true, message: 'Already logged today', totalPoints: gam.totalPoints });
      }
    }
    const result = await awardPoints(req.user.userId, 'daily_login', {});
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
