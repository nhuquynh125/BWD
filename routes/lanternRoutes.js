const express = require('express');
const { optionalAuth, requireAuth } = require('../auth');
const { Lantern } = require('../db');

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  const skip  = parseInt(req.query.skip)  || 0;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const rows  = await Lantern.find().populate('user_id', 'username').sort({ created_at: -1 }).skip(skip).limit(limit).lean();
  const mapped = rows.map(l => {
    l.id = l._id?.toString();
    l.username = l.user_id?.username ?? null;
    if (l.user_id) l.user_id = l.user_id._id?.toString();
    return l;
  });
  res.json({ lanterns: mapped });
});

router.post('/', requireAuth, async (req, res) => {
  const { name, story, heritage } = req.body;
  if (!name || !story) return res.status(400).json({ error: 'Thiếu tên hoặc câu chuyện' });
  let l = await Lantern.create({ user_id: req.user.userId, name, story, heritage: heritage || null });
  l = await Lantern.findById(l._id).populate('user_id', 'username').lean();
  l.id = l._id?.toString(); l.username = l.user_id?.username ?? null;
  if (l.user_id) l.user_id = l.user_id._id?.toString();
  res.json({ ok: true, lantern: l });
});

module.exports = router;
