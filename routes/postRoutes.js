const express = require('express');
const logger = require('../utils/logger');
const { upload, validateImage } = require('../middlewares/upload');
const { requireAuth, optionalAuth, requireAdmin } = require('../auth');
const { Post, PostLike, Comment } = require('../db');
const { validateRequest, postCreateSchema, postLikeSchema, commentCreateSchema } = require('../schemas');

const router = express.Router();

async function enrichPost(p, meId) {
  const raw = p.toJSON ? p.toJSON() : p;
  raw.id           = raw._id?.toString() ?? raw.id;
  raw.likes_count  = await PostLike.countDocuments({ post_id: raw.id });
  raw.comments_count = await Comment.countDocuments({ post_id: raw.id });
  if (meId) raw.liked = !!(await PostLike.findOne({ user_id: meId, post_id: raw.id }));
  return raw;
}

router.get('/', optionalAuth, async (req, res) => {
  try {
    const skip  = parseInt(req.query.skip)  || 0;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const posts = await Post.find({ privacy: 'public' })
      .populate('user_id', 'username avatar_url')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const enriched = posts.map(p => {
      p.id = p._id?.toString();
      if (p.user_id) {
        p.username   = p.user_id.username;
        p.avatar_url = p.user_id.avatar_url;
        p.user_id    = p.user_id._id?.toString();
      }
      return p;
    });
    res.json({ posts: enriched, total: enriched.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireAuth, validateRequest(postCreateSchema), async (req, res) => {
  try {
    const { content, location, mood, privacy } = req.validatedBody;
    let post = await Post.create({
      user_id: req.user.userId,
      content: content.trim(),
      location: location || null,
      mood: mood || null,
      privacy,
    });
    post = await Post.findById(post._id).populate('user_id', 'username avatar_url').lean();
    post.id        = post._id?.toString();
    post.username   = post.user_id.username;
    post.avatar_url = post.user_id.avatar_url;
    post.user_id    = post.user_id._id?.toString();
    
    logger.info({ event: 'POST_CREATED', postId: post.id, userId: req.user.userId });
    res.json({ ok: true, post });
  } catch (e) { 
    logger.error({ event: 'POST_CREATE_ERROR', error: e.message });
    res.status(500).json({ error: e.message }); 
  }
});

router.post('/:id/image', requireAuth, upload.single('file'), validateImage, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Không có file' });
  const post = await Post.findById(req.params.id);
  if (!post || String(post.user_id) !== req.user.userId)
    return res.status(403).json({ error: 'Không có quyền' });
  const image_url = `/uploads/${req.file.filename}`;
  await Post.findByIdAndUpdate(req.params.id, { image_url });
  res.json({ ok: true, image_url });
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || String(post.user_id) !== req.user.userId)
      return res.status(403).json({ error: 'Không có quyền' });
    await Post.findByIdAndDelete(req.params.id);
    await PostLike.deleteMany({ post_id: req.params.id });
    await Comment.deleteMany({ post_id: req.params.id });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/all', requireAuth, async (req, res) => {
  const result = await Post.deleteMany({ user_id: req.user.userId });
  res.json({ ok: true, deleted: result.deletedCount });
});

router.post('/:id/like', requireAuth, validateRequest(postLikeSchema), async (req, res) => {
  try {
    const existing = await PostLike.findOne({ user_id: req.user.userId, post_id: req.params.id });
    if (existing) {
      await PostLike.deleteOne({ _id: existing._id });
      await Post.findByIdAndUpdate(req.params.id, { $inc: { likes_count: -1 } });
    } else {
      const emotion = req.validatedBody.emotion || '❤️';
      await PostLike.create({ user_id: req.user.userId, post_id: req.params.id, emotion });
      await Post.findByIdAndUpdate(req.params.id, { $inc: { likes_count: 1 } });
    }
    const p = await Post.findById(req.params.id);
    res.json({ ok: true, liked: !existing, likes_count: p?.likes_count ?? 0 });
  } catch (e) { 
    logger.error({ event: 'LIKE_ERROR', error: e.message });
    res.status(500).json({ error: e.message }); 
  }
});

// Comments
router.get('/:id/comments', requireAuth, async (req, res) => {
  try {
    const rows = await Comment.find({ post_id: req.params.id })
      .populate('user_id', 'username avatar_url')
      .sort({ created_at: 1 })
      .lean();
    const mapped = rows.map(c => {
      c.id = c._id?.toString();
      c.username   = c.user_id.username;
      c.avatar_url = c.user_id.avatar_url;
      c.user_id    = c.user_id._id?.toString();
      return c;
    });
    res.json({ comments: mapped });
  } catch (e) {
    logger.error({ event: 'GET_COMMENTS_ERROR', error: e.message });
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/comments', requireAuth, validateRequest(commentCreateSchema), async (req, res) => {
  try {
    const { content } = req.validatedBody;
    let c = await Comment.create({ 
      post_id: req.params.id, 
      user_id: req.user.userId, 
      content: content.trim() 
    });
    c = await Comment.findById(c._id).populate('user_id', 'username avatar_url').lean();
    c.id = c._id?.toString(); 
    c.username = c.user_id.username; 
    c.avatar_url = c.user_id.avatar_url; 
    c.user_id = c.user_id._id?.toString();
    
    logger.info({ event: 'COMMENT_CREATED', commentId: c.id, userId: req.user.userId });
    res.json({ ok: true, comment: c });
  } catch (e) {
    logger.error({ event: 'COMMENT_CREATE_ERROR', error: e.message });
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
