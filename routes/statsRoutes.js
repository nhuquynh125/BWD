const express = require('express');
const { User, Post, Lantern, Message } = require('../db');

const router = express.Router();

router.get('/', async (_, res) => {
  try {
    const [users, posts, lanterns, messages] = await Promise.all([
      User.countDocuments({ is_active: true }),
      Post.countDocuments(),
      Lantern.countDocuments(),
      Message.countDocuments(),
    ]);
    res.json({ users, posts, lanterns, messages, total_lanterns: lanterns });
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

module.exports = router;
