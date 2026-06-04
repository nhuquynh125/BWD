const express = require('express');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const { upload, validateImage } = require('../middlewares/upload');
const { requireAuth, optionalAuth } = require('../auth');
const { User, Post, PostLike, Comment, Follow, Message, Lantern, UserSettings, AiChatHistory, Friendship, FriendRequest } = require('../db');
const { validateRequest, userUpdateSchema, passwordChangeSchema, userSearchSchema } = require('../schemas');
const { safeUser, friendshipStatus, friendPair, areFriends } = require('../utils/helpers');

const router = express.Router();

async function ensureSettings(userId) {
  let s = await UserSettings.findOne({ user_id: userId });
  if (!s) s = await UserSettings.create({ user_id: userId });
  return s;
}

// Me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const u = await User.findById(req.user.userId);
    u ? res.json(safeUser(u, true)) : res.status(404).json({ error: 'Không tìm thấy' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/me', requireAuth, validateRequest(userUpdateSchema), async (req, res) => {
  try {
    const validated = req.validatedBody;
    const user = await User.findByIdAndUpdate(req.user.userId, validated, { new: true });
    res.json({ ok: true, user: safeUser(user, true) });
  } catch (e) { 
    logger.error({ event: 'PROFILE_UPDATE_ERROR', error: e.message });
    res.status(500).json({ error: e.message }); 
  }
});

// Avatar
router.post('/me/avatar', requireAuth, upload.single('file'), validateImage, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Không có file' });
  const avatar_url = `/uploads/${req.file.filename}`;
  await User.findByIdAndUpdate(req.user.userId, { avatar_url });
  res.json({ ok: true, avatar_url });
});

router.delete('/me/avatar', requireAuth, async (req, res) => {
  await User.findByIdAndUpdate(req.user.userId, { avatar_url: null });
  res.json({ ok: true });
});

// Cover
router.post('/me/cover', requireAuth, upload.single('file'), validateImage, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Không có file' });
  const cover_url = `/uploads/${req.file.filename}`;
  await User.findByIdAndUpdate(req.user.userId, { cover_url });
  res.json({ ok: true, cover_url });
});

router.delete('/me/cover', requireAuth, async (req, res) => {
  await User.findByIdAndUpdate(req.user.userId, { cover_url: null });
  res.json({ ok: true });
});

// Password
router.post('/me/password', requireAuth, validateRequest(passwordChangeSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.validatedBody;
    const user = await User.findById(req.user.userId);
    if (!await bcrypt.compare(currentPassword, user.password_hash)) {
      logger.warn({ event: 'PASSWORD_CHANGE_FAILED', userId: user._id, reason: 'WRONG_PASSWORD' });
      return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(req.user.userId, { password_hash: hash });
    logger.info({ event: 'PASSWORD_CHANGED', userId: user._id });
    res.json({ ok: true });
  } catch (e) { 
    logger.error({ event: 'PASSWORD_CHANGE_ERROR', error: e.message });
    res.status(500).json({ error: e.message }); 
  }
});

// Search
router.get('/search', requireAuth, validateRequest(userSearchSchema), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().substring(0, 100);
    let users;
    if (!q) {
      users = await User.find({ _id: { $ne: req.user.userId }, is_active: true }).limit(20).lean();
      users = users.sort(() => Math.random() - 0.5).slice(0, 8);
    } else {
      const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedQuery, 'i');
      users = await User.find({
        _id: { $ne: req.user.userId },
        is_active: true,
        $or: [{ username: regex }, { bio: regex }],
      }).limit(20).lean();
    }
    const results = await Promise.all(
      users.map(async u => ({
        ...safeUser(u),
        friendship_status: await friendshipStatus(req.user.userId, u._id),
      }))
    );
    res.json({ users: results });
  } catch (e) { 
    logger.error({ event: 'SEARCH_ERROR', error: e.message });
    res.status(500).json({ error: e.message }); 
  }
});

// Public profile
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    if (req.params.id === 'search' || req.params.id === 'me') return; // Handled above
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error: 'Không tìm thấy' });
    const priv = req.user && String(req.user.userId) === String(req.params.id);
    const [fwrs, fwing, postCnt] = await Promise.all([
      Follow.countDocuments({ following_id: u._id }),
      Follow.countDocuments({ follower_id: u._id }),
      Post.countDocuments({ user_id: u._id }),
    ]);
    res.json({ ...safeUser(u, priv), followers: fwrs, following: fwing, posts_count: postCnt });
  } catch (e) { res.status(404).json({ error: 'Không tìm thấy' }); }
});

// Stats
router.get('/me/stats', requireAuth, async (req, res) => {
  try {
    const uid = req.user.userId;
    const [postCnt, followers, following, likes, comments] = await Promise.all([
      Post.countDocuments({ user_id: uid }),
      Follow.countDocuments({ following_id: uid }),
      Follow.countDocuments({ follower_id: uid }),
      PostLike.countDocuments({ user_id: uid }),
      Comment.countDocuments({ user_id: uid }),
    ]);
    const ownPosts = await Post.find({ user_id: uid }, '_id').lean();
    const ownPostIds = ownPosts.map(p => p._id);
    const likesReceived = await PostLike.countDocuments({ post_id: { $in: ownPostIds } });
    const commentsReceived = await Comment.countDocuments({ post_id: { $in: ownPostIds } });
    res.json({ posts: postCnt, followers, following, likes_given: likes, comments_given: comments, likes_received: likesReceived, comments_received: commentsReceived });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Follows
router.post('/:id/follow', requireAuth, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.user.userId) return res.status(400).json({ error: 'Không thể tự follow' });
    const existing = await Follow.findOne({ follower_id: req.user.userId, following_id: targetId });
    if (existing) {
      await Follow.deleteOne({ _id: existing._id });
      res.json({ ok: true, following: false });
    } else {
      await Follow.create({ follower_id: req.user.userId, following_id: targetId });
      res.json({ ok: true, following: true });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/followers', requireAuth, async (req, res) => {
  try {
    const rows = await Follow.find({ following_id: req.params.id }).populate('follower_id');
    res.json({ followers: rows.map(r => safeUser(r.follower_id)), total: rows.length });
  } catch (e) {
    logger.error({ event: 'GET_FOLLOWERS_ERROR', error: e.message });
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id/following', requireAuth, async (req, res) => {
  try {
    const rows = await Follow.find({ follower_id: req.params.id }).populate('following_id');
    res.json({ following: rows.map(r => safeUser(r.following_id)), total: rows.length });
  } catch (e) {
    logger.error({ event: 'GET_FOLLOWING_ERROR', error: e.message });
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
