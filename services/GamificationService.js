/**
 * GamificationService.js — LUNAR HERITAGE Phase 2
 * Handles points awarding, badge checking, and leaderboard operations.
 * Uses atomic MongoDB operations (no Redis required — scales via MongoDB index).
 */

const { User, Badge, PointEvent, UserGamification } = require('../db');

// ── Point map ─────────────────────────────────────────────────────────────────
const POINT_MAP = {
  site_visit:    50,
  first_visit:   150,   // bonus for first time at any site
  comment:       10,
  share:         20,
  quiz_complete: 100,
  booking:       200,
  daily_login:   5,
};

// ── Internal: badge checker ────────────────────────────────────────────────────
async function checkAndAwardBadges(userId, gamification, metadata, io) {
  try {
    const allBadges   = await Badge.find().lean();
    const alreadySet  = new Set(gamification.badges.map(b => b.badgeId.toString()));
    const userVisits  = await User.findById(userId).select('passport').lean();
    const visitCount  = userVisits?.passport?.length ?? 0;

    for (const badge of allBadges) {
      if (alreadySet.has(badge._id.toString())) continue;

      let earned = false;
      const { type, threshold, siteSlug } = badge.criteria;

      switch (type) {
        case 'visit_count':
          earned = visitCount >= threshold;
          break;
        case 'site_specific':
          earned = userVisits?.passport?.some(v => v.artifactId === siteSlug) ?? false;
          break;
        case 'points_threshold':
          earned = gamification.totalPoints >= threshold;
          break;
        case 'streak':
          earned = gamification.streakDays >= threshold;
          break;
      }

      if (earned) {
        await UserGamification.findOneAndUpdate(
          { userId },
          { $push: { badges: { badgeId: badge._id, siteSlug: metadata.siteSlug || null } } }
        );
        // Emit real-time notification
        if (io) {
          io.to(`user:${userId}`).emit('badge_earned', {
            badge: {
              id:          badge._id,
              slug:        badge.slug,
              name:        badge.name,
              description: badge.description,
              iconUrl:     badge.iconUrl,
              rarity:      badge.rarity,
            }
          });
        }
      }
    }
  } catch (err) {
    console.error('[GamificationService] badge check error:', err.message);
  }
}

// ── Streak helper ────────────────────────────────────────────────────────────
function computeStreak(lastActiveDate, currentStreakDays) {
  if (!lastActiveDate) return 1;
  const now       = new Date();
  const last      = new Date(lastActiveDate);
  const diffDays  = Math.floor((now - last) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return currentStreakDays;   // same day, no change
  if (diffDays === 1) return currentStreakDays + 1; // consecutive day
  return 1; // streak broken
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Award points to a user for a given action.
 * @param {string|ObjectId} userId
 * @param {string} action   - key in POINT_MAP
 * @param {object} metadata - optional context (siteSlug, etc.)
 * @param {SocketIO.Server} [io]  - for real-time updates
 * @returns {Promise<{totalPoints, pointsGained, weeklyPoints}>}
 */
async function awardPoints(userId, action, metadata = {}, io = null) {
  const points = POINT_MAP[action] ?? 0;
  if (!points) return null;

  // 1. Update UserGamification atomically
  let gamification = await UserGamification.findOne({ userId });
  const newStreak  = computeStreak(gamification?.lastActiveDate, gamification?.streakDays ?? 0);

  const updated = await UserGamification.findOneAndUpdate(
    { userId },
    {
      $inc: { totalPoints: points, weeklyPoints: points, monthlyPoints: points },
      $set: { lastActiveDate: new Date(), streakDays: newStreak }
    },
    { new: true, upsert: true }
  );

  // 2. Also sync points to the User model (used by passport leaderboard)
  await User.findByIdAndUpdate(userId, { $inc: { points } });

  // 3. Immutable event log
  await PointEvent.create({ userId, points, action, metadata });

  // 4. Check badges asynchronously (non-blocking)
  checkAndAwardBadges(userId, updated, metadata, io).catch(() => {});

  // 5. Real-time update
  if (io) {
    io.to(`user:${userId}`).emit('points_update', {
      totalPoints:  updated.totalPoints,
      pointsGained: points,
      weeklyPoints: updated.weeklyPoints,
      streakDays:   newStreak,
      action,
    });
  }

  return {
    totalPoints:  updated.totalPoints,
    pointsGained: points,
    weeklyPoints: updated.weeklyPoints,
  };
}

/**
 * Get full gamification profile for a user.
 */
async function getGamificationProfile(userId) {
  const gam = await UserGamification.findOne({ userId })
    .populate('badges.badgeId')
    .lean();

  if (!gam) {
    return { totalPoints: 0, weeklyPoints: 0, monthlyPoints: 0, badges: [], streakDays: 0 };
  }

  return {
    totalPoints:   gam.totalPoints,
    weeklyPoints:  gam.weeklyPoints,
    monthlyPoints: gam.monthlyPoints,
    streakDays:    gam.streakDays,
    lastActiveDate: gam.lastActiveDate,
    badges: (gam.badges || []).map(b => ({
      earnedAt: b.earnedAt,
      siteSlug: b.siteSlug,
      ...(b.badgeId && typeof b.badgeId === 'object' ? {
        id:          b.badgeId._id,
        slug:        b.badgeId.slug,
        name:        b.badgeId.name,
        description: b.badgeId.description,
        iconUrl:     b.badgeId.iconUrl,
        rarity:      b.badgeId.rarity,
      } : {}),
    })),
  };
}

/**
 * Get leaderboard (top N users by total points).
 * Pure MongoDB — no Redis needed for early-stage usage.
 */
async function getLeaderboard(limit = 20, skip = 0) {
  const entries = await UserGamification.find()
    .sort({ totalPoints: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // Hydrate with user info
  const userIds = entries.map(e => e.userId);
  const users   = await User.find({ _id: { $in: userIds } })
    .select('username avatar_url')
    .lean();

  const userMap = {};
  users.forEach(u => { userMap[u._id.toString()] = u; });

  return entries.map((e, i) => {
    const u = userMap[e.userId.toString()];
    return {
      rank:        skip + i + 1,
      userId:      e.userId,
      username:    u?.username ?? 'Ẩn danh',
      avatar_url:  u?.avatar_url ?? null,
      totalPoints: e.totalPoints,
      weeklyPoints: e.weeklyPoints,
      streakDays:  e.streakDays,
      badgeCount:  (e.badges || []).length,
    };
  });
}

/**
 * Get a user's rank on the leaderboard.
 */
async function getUserRank(userId) {
  const gam = await UserGamification.findOne({ userId }).lean();
  if (!gam) return { rank: null, totalPoints: 0 };

  const rank = await UserGamification.countDocuments({
    totalPoints: { $gt: gam.totalPoints }
  }) + 1;

  return { rank, totalPoints: gam.totalPoints };
}

module.exports = { awardPoints, getGamificationProfile, getLeaderboard, getUserRank, POINT_MAP };
