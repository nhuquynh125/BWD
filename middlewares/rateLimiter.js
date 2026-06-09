const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Tăng lên 1000 cho dev
  message: 'Quá nhiều yêu cầu từ IP này. Vui lòng thử lại sau.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Tăng lên 50 cho dev
  skipSuccessfulRequests: true,
  message: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.',
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.userId || (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'),
  message: 'Quá nhiều upload. Tối đa 10 file/giờ.',
});

module.exports = { globalLimiter, authLimiter, uploadLimiter };
