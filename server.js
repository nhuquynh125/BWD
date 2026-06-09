/**
 * LUNAR HERITAGE API SERVER (Refactored)
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');

const { initDb } = require('./db');
const logger = require('./utils/logger');
const { globalLimiter } = require('./middlewares/rateLimiter');
const initSocket = require('./utils/socket');
const { genAI } = require('./utils/aiConfig');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const accountRoutes = require('./routes/accountRoutes');
const postRoutes = require('./routes/postRoutes');
const friendRoutes = require('./routes/friendRoutes');
const messageRoutes = require('./routes/messageRoutes');
const lanternRoutes = require('./routes/lanternRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const heritageRoutes = require('./routes/heritageRoutes');
const passportRoutes = require('./routes/passportRoutes');
const aiRoutes = require('./routes/aiRoutes');
const adminRoutes        = require('./routes/adminRoutes');
const statsRoutes        = require('./routes/statsRoutes');
const gamificationRoutes = require('./routes/gamificationRoutes');
const bookingRoutes      = require('./routes/bookingRoutes');
const cron               = require('node-cron');
const { UserGamification } = require('./db');

const app = express();
const server = http.createServer(app);

// CORS configuration (Security Fix)
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'];
const corsOptions = {
  origin: function (origin, callback) {
    // Cho phép mọi origin để hỗ trợ deploy trên Vercel
    callback(null, true);
  },
  credentials: true
};
app.use(cors(corsOptions));
const io = socketIo(server, { cors: { origin: true, credentials: true } });

// Middlewares
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(globalLimiter);

// CSRF Protection Middleware
const csrfProtection = csurf({ 
  cookie: { 
    httpOnly: true, 
    secure: true, 
    sameSite: 'none' 
  } 
});
app.use(csrfProtection);

// CSRF Token endpoint
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// CSRF Error Handler
app.use((err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[DEV] CSRF token validation failed, but bypassing for development.');
    return next(); // Bypass error in dev
  }
  res.status(403).json({ error: 'CSRF token validation failed' });
});

// Make sure uploads directory exists and is static
const UPLOAD = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD, { recursive: true });
app.use('/uploads', express.static(UPLOAD));

// Basic logging middleware
app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url, ip: req.ip });
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/lanterns', lanternRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/heritage', heritageRoutes);
app.use('/api/passport', passportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/booking', bookingRoutes);

// Health check
app.get('/api/health', (_, res) =>
  res.json({ ok: true, ai: genAI ? 'Gemini ✅' : '⚠️ GEMINI_API_KEY missing' }));

// Init Socket
initSocket(io);

// ── Cron Jobs ─────────────────────────────────────────────────────────────
// Reset weekly points every Monday at 00:00
cron.schedule('0 0 * * 1', async () => {
  try {
    await UserGamification.updateMany({}, { $set: { weeklyPoints: 0 } });
    logger.info('[CRON] Weekly leaderboard reset done');
  } catch (e) { logger.error('[CRON] Weekly reset failed:', e.message); }
});

// Reset monthly points on the 1st of each month at 00:00
cron.schedule('0 0 1 * *', async () => {
  try {
    await UserGamification.updateMany({}, { $set: { monthlyPoints: 0 } });
    logger.info('[CRON] Monthly leaderboard reset done');
  } catch (e) { logger.error('[CRON] Monthly reset failed:', e.message); }
});

// Boot
const PORT = process.env.PORT || 3000;
initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`\n🌕  LUNAR HERITAGE API SERVER
   http://localhost:${PORT}
   DB : MongoDB Mongoose ✅
   AI : Gemini ${genAI ? '✅' : '❌ (set GEMINI_API_KEY)'}\n`);
  });
}).catch(err => {
  console.error("Database connection failed", err);
  process.exit(1);
});
