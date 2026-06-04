const express = require('express');
const { requireAuth } = require('../auth');
const { Friendship, FriendRequest } = require('../db');
const { friendPair, areFriends, friendshipStatus } = require('../utils/helpers');

const router = express.Router();

router.get('/status/:id', requireAuth, async (req, res) => {
  const status = await friendshipStatus(req.user.userId, req.params.id);
  res.json({ status });
});

router.post('/request/:id', requireAuth, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.user.userId)
      return res.status(400).json({ error: 'Không thể kết bạn với chính mình' });
    if (await areFriends(req.user.userId, targetId))
      return res.json({ ok: true, status: 'friends' });
    const incoming = await FriendRequest.findOne({ sender_id: targetId, receiver_id: req.user.userId, status: 'pending' });
    if (incoming) {
      const [low, high] = friendPair(req.user.userId, targetId);
      await Friendship.create({ user_low: low, user_high: high }).catch(() => {});
      await FriendRequest.deleteOne({ _id: incoming._id });
      return res.json({ ok: true, status: 'friends' });
    }
    await FriendRequest.create({ sender_id: req.user.userId, receiver_id: targetId }).catch(() => {});
    res.json({ ok: true, status: 'outgoing' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/accept/:id', requireAuth, async (req, res) => {
  try {
    const requesterId = req.params.id;
    const req_ = await FriendRequest.findOne({ sender_id: requesterId, receiver_id: req.user.userId, status: 'pending' });
    if (!req_) return res.status(404).json({ error: 'Không có lời mời' });
    const [low, high] = friendPair(req.user.userId, requesterId);
    await Friendship.create({ user_low: low, user_high: high }).catch(() => {});
    await FriendRequest.deleteOne({ _id: req_._id });
    res.json({ ok: true, status: 'friends' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAuth, async (req, res) => {
  const [low, high] = friendPair(req.user.userId, req.params.id);
  await Friendship.deleteOne({ user_low: low, user_high: high });
  await FriendRequest.deleteMany({
    $or: [
      { sender_id: req.user.userId, receiver_id: req.params.id },
      { sender_id: req.params.id,   receiver_id: req.user.userId },
    ],
  });
  res.json({ ok: true, status: 'none' });
});

module.exports = router;
