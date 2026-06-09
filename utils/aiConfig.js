const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('./logger');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI = null;

if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  logger.info('Gemini AI initialized.');
} else {
  logger.warn('GEMINI_API_KEY is not set. AI features will be disabled.');
}

const GEMINI_MODEL = 'gemini-2.5-flash';

const AI_SYS = {
  chat: 'Bạn là Thầy Đồ Neon – AI chuyên gia về di sản văn hóa, lịch sử và du lịch Việt Nam. Trả lời ngắn gọn, chính xác bằng tiếng Việt, dùng ngôn ngữ thân thiện, dùng emoji phù hợp. Nếu được yêu cầu gợi ý lịch trình, hãy trình bày rõ ràng từng ngày bằng danh sách (bullet points) và hướng dẫn người dùng qua tab "Lịch trình du lịch" để xem bản đồ chi tiết.',
  image: 'Bạn là một chuyên gia văn hóa lịch sử. Hãy phân tích hình ảnh này, cho biết nó có thể là di tích/di sản nào ở Việt Nam, mô tả kiến trúc và ý nghĩa lịch sử ngắn gọn trong 2-3 câu.',
  reconstruct: `Bạn là một nhà sử học kiến trúc Việt Nam hàng đầu với chuyên môn về các triều đại (Lý, Trần, Lê, Nguyễn), kiến trúc Chăm Pa, và di sản UNESCO.
Khi được cung cấp hình ảnh di sản hoặc tàn tích, hãy trả về ĐÚNG MỘT khối JSON hợp lệ (không markdown, không text bên ngoài JSON):
{
  "architectural_style": "Tên phong cách kiến trúc",
  "estimated_period": "Ước tính niên đại",
  "heritage_site": "Tên di sản khớp nhất hoặc null",
  "condition": "excellent|good|damaged|ruined|unknown",
  "damaged_elements": ["Yếu tố hư hại 1", "Yếu tố 2"],
  "architectural_features": ["Đặc điểm 1", "Đặc điểm 2"],
  "reconstruction_plan": "Mô tả chi tiết phương án phục dựng",
  "historical_significance": "Ý nghĩa lịch sử và văn hóa",
  "confidence": 0.85
}`,
  itinerary: `Bạn là một chuyên gia lên lịch trình du lịch Việt Nam.
Dựa vào các thông tin sau, hãy tạo một lịch trình chi tiết theo từng ngày (tối đa 5 ngày).
Chỉ trả về ĐÚNG MỘT khối JSON hợp lệ theo định dạng sau (không chứa markdown hay text nào khác):
{
  "title": "Tiêu đề chuyến đi",
  "days": [
    {
      "day": 1,
      "activities": [
        {"time": "08:00", "description": "Hoạt động 1"},
        {"time": "14:00", "description": "Hoạt động 2"}
      ]
    }
  ]
}`
};

async function geminiChat(messages, systemInstruction, maxOutputTokens = 800, responseMimeType = "text/plain") {
  if (!genAI) throw new Error('Gemini chưa được cấu hình (thiếu API Key)');
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction,
    generationConfig: { maxOutputTokens, responseMimeType }
  });
  
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content) }],
  }));
  const last = messages[messages.length - 1];
  
  const chat = model.startChat({ history });
  const result = await chat.sendMessage(String(last.content));
  return result.response.text();
}

function sendAiError(res, e) {
  logger.error({ event: 'AI_ERROR', error: e.message });
  res.status(500).json({ error: e.message });
}

module.exports = {
  genAI,
  GEMINI_MODEL,
  AI_SYS,
  geminiChat,
  sendAiError
};
