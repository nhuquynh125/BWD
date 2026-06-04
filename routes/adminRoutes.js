const express = require('express');
const { requireAuth, requireAdmin } = require('../auth');
const { geminiChat } = require('../utils/aiConfig');
const { Post } = require('../db');
const { genAI } = require('../utils/aiConfig');

const router = express.Router();

router.get('/chart', requireAuth, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const labels = last7Days.map(d => d.toLocaleDateString('vi-VN'));
    
    let uCount = 100;
    let pCount = 300;
    const usersData = labels.map(() => { uCount += Math.floor(Math.random()*15); return uCount; });
    const postsData = labels.map(() => { pCount += Math.floor(Math.random()*40); return pCount; });
    
    const heritagePopularity = {
      labels: ['Hội An', 'Hạ Long', 'Huế', 'Tràng An', 'Phong Nha'],
      data: [120, 110, 85, 60, 45]
    };

    res.json({
      growth: {
        labels,
        datasets: [
          { label: 'Tăng trưởng Người dùng', data: usersData, borderColor: '#d4af37', backgroundColor: 'rgba(212, 175, 55, 0.1)', tension: 0.4, fill: true },
          { label: 'Bài viết mới', data: postsData, borderColor: '#667eea', backgroundColor: 'rgba(102, 126, 234, 0.1)', tension: 0.4, fill: true }
        ]
      },
      heritage: heritagePopularity
    });
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

router.post('/moderate', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!genAI) return res.status(500).json({error: 'Gemini chưa cấu hình'});
    const { postId } = req.body;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({error: 'Không tìm thấy'});
    
    const prompt = `Phân tích nội dung mạng xã hội sau xem có vi phạm tiêu chuẩn (độc hại, spam, thù địch). Trả về JSON: {"violation": true/false, "reason": "lý do"}. Nội dung: "${post.content}"`;
    const raw = await geminiChat([{ role: 'user', content: prompt }], "Bạn là hệ thống kiểm duyệt nội dung. Chỉ trả về JSON.", 500);
    const json = JSON.parse(raw.replace(/```json?|```/g, '').trim());
    
    res.json(json);
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

module.exports = router;
