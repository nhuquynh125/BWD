const express = require('express');
const bcrypt = require('bcryptjs');
const { requireAuth } = require('../auth');
const { User, Post, PostLike, Comment, Follow, Message, Lantern, UserSettings, AiChatHistory, Friendship, FriendRequest } = require('../db');
const { safeUser } = require('../utils/helpers');

const router = express.Router();

// Deactivate (soft delete)
router.post('/deactivate', requireAuth, async (req, res) => {
  await User.findByIdAndUpdate(req.user.userId, { is_active: false });
  res.json({ ok: true, message: 'Tài khoản đã tạm dừng' });
});

// Hard delete
router.delete('/', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy' });
    if (user.password_hash && password) {
      if (!await bcrypt.compare(password, user.password_hash))
        return res.status(401).json({ error: 'Mật khẩu không đúng' });
    }
    const uid = user._id;
    await Promise.all([
      Post.deleteMany({ user_id: uid }),
      PostLike.deleteMany({ user_id: uid }),
      Comment.deleteMany({ user_id: uid }),
      Follow.deleteMany({ $or: [{ follower_id: uid }, { following_id: uid }] }),
      Message.deleteMany({ $or: [{ sender_id: uid }, { receiver_id: uid }] }),
      Lantern.deleteMany({ user_id: uid }),
      UserSettings.deleteOne({ user_id: uid }),
      AiChatHistory.deleteMany({ user_id: uid }),
      User.findByIdAndDelete(uid),
    ]);
    res.json({ ok: true, message: 'Tài khoản đã bị xóa vĩnh viễn' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Export all user data
router.get('/export', requireAuth, async (req, res) => {
  try {
    const uid = req.user.userId;
    const [user, posts, msgs, lanterns, settings] = await Promise.all([
      User.findById(uid).lean(),
      Post.find({ user_id: uid }).lean(),
      Message.find({ $or: [{ sender_id: uid }, { receiver_id: uid }] }).lean(),
      Lantern.find({ user_id: uid }).lean(),
      UserSettings.findOne({ user_id: uid }).lean(),
    ]);
    const payload = {
      exported_at: new Date().toISOString(),
      user: safeUser(user, true),
      posts,
      messages: msgs,
      lanterns,
      settings,
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="lunar_heritage_data.json"');
    res.json(payload);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
