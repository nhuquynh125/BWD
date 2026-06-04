const express = require('express');
const { requireAuth } = require('../auth');
const { upload, validateImage } = require('../middlewares/upload');
const { Message, User } = require('../db');
const { safeUser } = require('../utils/helpers');

const router = express.Router();

router.get('/history/:userId', requireAuth, async (req, res) => {
  try {
    const skip  = parseInt(req.query.skip)  || 0;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const messages = await Message.find({
      $or: [
        { sender_id: req.user.userId, receiver_id: req.params.userId },
        { sender_id: req.params.userId, receiver_id: req.user.userId }
      ]
    }).sort({ created_at: -1 }).skip(skip).limit(limit).lean();
    res.json({ messages: messages.reverse().map(m => ({ ...m, id: m._id?.toString() })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const uid = req.user.userId;
    const msgs = await Message.find({ $or: [{ sender_id: uid }, { receiver_id: uid }] })
      .sort({ created_at: -1 }).lean();
    const map = new Map();
    for (const m of msgs) {
      const otherId = String(m.sender_id) === uid ? String(m.receiver_id) : String(m.sender_id);
      if (!map.has(otherId)) map.set(otherId, m);
    }
    const convos = [];
    for (const [otherId, lastMsg] of map.entries()) {
      const user = await User.findById(otherId);
      if (user) convos.push({ user: safeUser(user), last_message: lastMsg });
    }
    res.json({ conversations: convos });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/image', requireAuth, upload.single('file'), validateImage, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Không có file' });
  res.json({ ok: true, image_url: `/uploads/${req.file.filename}` });
});

module.exports = router;
