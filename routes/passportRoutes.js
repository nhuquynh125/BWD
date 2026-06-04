const express = require('express');
const { requireAuth, optionalAuth } = require('../auth');
const { User } = require('../db');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).lean();
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' });
    res.json({ passport: user.passport || [], points: user.points || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/leaderboard', optionalAuth, async (req, res) => {
  try {
    const users = await User.find({ is_active: true })
      .sort({ points: -1 })
      .limit(10)
      .select('username avatar_url points')
      .lean();
    const mapped = users.map(u => ({
      id: u._id.toString(),
      username: u.username,
      avatar_url: u.avatar_url,
      points: u.points || 0
    }));
    res.json({ leaderboard: mapped });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
