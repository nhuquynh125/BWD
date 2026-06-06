const express = require('express');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const { createToken } = require('../auth');
const { User, UserSettings } = require('../db');
const { validateRequest, authSignupSchema, authLoginSchema } = require('../schemas');
const { authLimiter } = require('../middlewares/rateLimiter');
const { safeUser } = require('../utils/helpers');

const router = express.Router();

async function ensureSettings(userId) {
  let s = await UserSettings.findOne({ user_id: userId });
  if (!s) s = await UserSettings.create({ user_id: userId });
  return s;
}

router.post('/signup', authLimiter, validateRequest(authSignupSchema), async (req, res) => {
  try {
    const { username, email, password } = req.validatedBody;
    
    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(409).json({ error: 'Email đã tồn tại' });

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ 
      username: username.trim(), 
      email: email.toLowerCase().trim(), 
      password_hash: hash 
    });
    
    await ensureSettings(user._id);
    
    logger.info({ event: 'USER_SIGNUP', username, email: user.email });
    res.json({ 
      ok: true, 
      token: createToken(user._id, user.username, user.role || 'user'), 
      user: safeUser(user, true) 
    });
  } catch (e) { 
    logger.error({ event: 'SIGNUP_ERROR', error: e.message });
    res.status(500).json({ error: e.message }); 
  }
});

router.post('/login', authLimiter, validateRequest(authLoginSchema), async (req, res) => {
  try {
    const { email, password } = req.validatedBody;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      logger.warn({ event: 'LOGIN_FAILED', email, reason: 'EMAIL_NOT_FOUND', ip: req.ip });
      return res.status(401).json({ error: 'Email không tồn tại' });
    }
    if (!await bcrypt.compare(password, user.password_hash)) {
      logger.warn({ event: 'LOGIN_FAILED', email, reason: 'WRONG_PASSWORD', ip: req.ip });
      return res.status(401).json({ error: 'Mật khẩu không đúng' });
    }
    
    await ensureSettings(user._id);
    logger.info({ event: 'USER_LOGIN', username: user.username, email: user.email });
    
    res.json({ 
      ok: true, 
      token: createToken(user._id, user.username, user.role || 'user'), 
      user: safeUser(user, true) 
    });
  } catch (e) { 
    logger.error({ event: 'LOGIN_ERROR', error: e.message });
    res.status(500).json({ error: e.message }); 
  }
});

module.exports = router;
