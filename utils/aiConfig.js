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
  chat: 'Bạn là hướng dẫn viên du lịch chuyên nghiệp của Lunar Heritage. Chỉ trả lời các câu hỏi liên quan đến du lịch, văn hóa, lịch sử và di sản Việt Nam. Trả lời ngắn gọn, súc tích (dưới 200 chữ), dùng ngôn ngữ thân thiện, có thể dùng emoji.',
  image: 'Bạn là một chuyên gia văn hóa lịch sử. Hãy phân tích hình ảnh này, cho biết nó có thể là di tích/di sản nào ở Việt Nam, mô tả kiến trúc và ý nghĩa lịch sử ngắn gọn trong 2-3 câu.',
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
