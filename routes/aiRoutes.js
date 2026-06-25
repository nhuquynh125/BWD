const express = require('express');
const fs = require('fs');
const { requireAuth, optionalAuth } = require('../auth');
const { upload, validateImage } = require('../middlewares/upload');
const { AiChatHistory } = require('../db');
const { genAI, GEMINI_MODEL, AI_SYS, geminiChat, sendAiError, executeGeminiWithRetry, FALLBACK_MODEL } = require('../utils/aiConfig');

const router = express.Router();

/* ─── POST /api/ai/reconstruct ─────────────────────────────────────────────
   Heritage image analysis + reconstruction plan via Gemini Vision.
   Accepts: multipart/form-data with field 'file' (JPEG/PNG/WebP, max 10MB)
   Returns: { analysis, raw, architectural_style, condition, reconstruction_plan, ... }
─────────────────────────────────────────────────────────────────────────── */
router.post('/reconstruct', optionalAuth, upload.single('file'), validateImage, async (req, res) => {
  if (!genAI) return res.status(503).json({ error: 'Gemini AI chưa được cấu hình (thiếu GEMINI_API_KEY)' });
  if (!req.file) return res.status(400).json({ error: 'Không có file ảnh' });

  const lang  = req.query.lang || req.body.lang || 'vi';  // 'vi' | 'en'
  const depth = req.body.depth || 'standard';             // 'standard' | 'detailed'

  try {
    const b64      = fs.readFileSync(req.file.path).toString('base64');
    const mimeType = req.file.mimetype;

    const userPrompt = lang === 'en'
      ? 'Analyze this heritage site image. Provide detailed architectural analysis and reconstruction recommendations in English. Return valid JSON only.'
      : 'Phân tích hình ảnh di sản này. Đưa ra phân tích kiến trúc chi tiết và đề xuất phục dựng bằng tiếng Việt. Chỉ trả về JSON hợp lệ.';

    const result = await executeGeminiWithRetry(async (attempt) => {
      const currentModelName = (attempt === 3 && GEMINI_MODEL !== FALLBACK_MODEL) ? FALLBACK_MODEL : GEMINI_MODEL;
      const model = genAI.getGenerativeModel({
        model: currentModelName,
        systemInstruction: AI_SYS.reconstruct,
        generationConfig: {
          maxOutputTokens: depth === 'detailed' ? 2000 : 1000,
          responseMimeType: 'application/json',
        }
      });
      return await model.generateContent([
        { inlineData: { data: b64, mimeType } },
        userPrompt
      ]);
    });

    const rawText = result.response.text();

    // Parse JSON — gracefully handle if model wraps in markdown
    let parsed = null;
    try {
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If JSON parsing fails, return raw text under analysis key
      parsed = null;
    }

    res.json({
      ok:    true,
      analysis: parsed
        ? (parsed.reconstruction_plan || parsed.historical_significance || rawText)
        : rawText,
      raw:   rawText,
      ...(parsed || {}),
    });
  } catch (e) {
    sendAiError(res, e);
  } finally {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
  }
});



router.post('/chat', optionalAuth, async (req, res) => {
  try {
    const reply = await geminiChat(req.body.messages || [], AI_SYS.chat, 800);
    res.json({ reply, model: GEMINI_MODEL });
  } catch (e) { sendAiError(res, e); }
});


router.post('/chat-stream', optionalAuth, async (req, res) => {
  if (!genAI) return res.status(500).end('Gemini chưa cấu hình');

  // Send SSE headers immediately — BEFORE awaiting the stream
  // so the response is writable even if the stream call throws.
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const messages = req.body.messages || [];
    if (!messages.length) {
      res.write(`data: ${JSON.stringify({ error: 'Không có tin nhắn' })}\n\n`);
      return res.end();
    }

    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content) }],
    }));
    const last = messages[messages.length - 1];

    let success = false;
    let attempt = 1;
    let maxRetries = 3;
    let delayMs = 1500;
    let chunksSent = 0;

    while (attempt <= maxRetries && !success) {
      try {
        const currentModelName = (attempt === 3 && GEMINI_MODEL !== FALLBACK_MODEL) ? FALLBACK_MODEL : GEMINI_MODEL;
        const model = genAI.getGenerativeModel({
          model: currentModelName,
          systemInstruction: AI_SYS.chat,
          generationConfig: { maxOutputTokens: 800 }
        });
        const chat = model.startChat({ history });
        const result = await chat.sendMessageStream(String(last.content));

        for await (const chunk of result.stream) {
          chunksSent++;
          let text = '';
          try { text = chunk.text(); } catch { /* skip malformed chunk */ }
          if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
        success = true;
      } catch (e) {
        const isRetryable = e.status === 503 || e.status === 429 || 
            (e.message && (e.message.includes('503') || e.message.includes('429') || e.message.includes('Service Unavailable') || e.message.includes('high demand')));
            
        // If we already sent chunks, it's too late to retry silently without duplicating text
        if (!isRetryable || attempt === maxRetries || chunksSent > 0) {
          throw e; 
        }
        attempt++;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
    res.end();
  }
});

router.post('/analyze-image', optionalAuth, upload.single('file'), validateImage, async (req, res) => {
  if (!genAI) return res.status(500).json({ error: 'Gemini chưa cấu hình' });
  if (!req.file) return res.status(400).json({ error: 'Không có file' });
  try {
    const b64    = fs.readFileSync(req.file.path).toString('base64');
    const result = await executeGeminiWithRetry(async (attempt) => {
      const currentModelName = (attempt === 3 && GEMINI_MODEL !== FALLBACK_MODEL) ? FALLBACK_MODEL : GEMINI_MODEL;
      const model  = genAI.getGenerativeModel({ model: currentModelName, systemInstruction: AI_SYS.image });
      return await model.generateContent([{ inlineData: { data: b64, mimeType: req.file.mimetype } }, 'Phân tích ảnh này.']);
    });
    res.json({ analysis: result.response.text() });
  } catch (e) { sendAiError(res, e); }
  finally { fs.unlink(req.file.path, () => {}); }
});

router.post('/itinerary', optionalAuth, async (req, res) => {
  const { destination, days = 3, budget = 'trung bình', interests = [], travelers = 'cặp đôi', start_from } = req.body;
  if (!destination) return res.status(400).json({ error: 'destination bắt buộc' });
  const prompt = `Điểm đến: ${destination} | Số ngày: ${days} | Ngân sách: ${budget} | Sở thích: ${interests.join(', ')} | Loại khách: ${travelers}${start_from ? ` | Xuất phát: ${start_from}` : ''}`;
  try {
    const raw = await geminiChat([{ role: 'user', content: prompt }], AI_SYS.itinerary, 8000, "application/json");
    try {
      const json = JSON.parse(raw.trim());
      res.json({ itinerary: json });
    } catch (parseError) {
      console.error("AI_RAW_OUTPUT:", raw);
      console.error("JSON_PARSE_ERROR:", parseError.message);
      res.json({ itinerary: { raw: raw } });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// AI chat history (per user, per session)
router.get('/history', requireAuth, async (req, res) => {
  const session = req.query.session || 'default';
  const history = await AiChatHistory.find({ user_id: req.user.userId, session_id: session })
    .sort({ created_at: 1 }).select('role content created_at -_id');
  res.json({ history });
});

router.post('/history', requireAuth, async (req, res) => {
  const { session_id = 'default', role, content } = req.body;
  if (!role || !content) return res.status(400).json({ error: 'role và content bắt buộc' });
  await AiChatHistory.create({ user_id: req.user.userId, session_id, role, content });
  res.json({ ok: true });
});

router.delete('/history', requireAuth, async (req, res) => {
  await AiChatHistory.deleteMany({ user_id: req.user.userId, session_id: req.query.session || 'default' });
  res.json({ ok: true });
});

module.exports = router;
