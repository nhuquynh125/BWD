const express = require('express');
const { requireAuth } = require('../auth');
const { UserSettings } = require('../db');
const { validateRequest, settingsUpdateSchema } = require('../schemas');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    let s = await UserSettings.findOne({ user_id: req.user.userId });
    if (!s) s = await UserSettings.create({ user_id: req.user.userId });
    res.json({ settings: s });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/', requireAuth, validateRequest(settingsUpdateSchema), async (req, res) => {
  try {
    const s = await UserSettings.findOneAndUpdate(
      { user_id: req.user.userId },
      req.validatedBody,
      { new: true, upsert: true }
    );
    logger.info({ event: 'SETTINGS_UPDATED', userId: req.user.userId });
    res.json({ ok: true, settings: s });
  } catch (e) { 
    logger.error({ event: 'SETTINGS_UPDATE_ERROR', error: e.message });
    res.status(500).json({ error: e.message }); 
  }
});

module.exports = router;
