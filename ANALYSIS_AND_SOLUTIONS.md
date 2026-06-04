# 🌕 LUNAR HERITAGE - Complete Website Analysis & Solutions

**Analysis Date:** May 20, 2026  
**Project:** Vietnamese Heritage Travel Social Network  
**Current Status:** ✅ Feature-rich | ⚠️ Multiple Security & UX Issues

---

## 📋 Executive Summary

**LUNAR HERITAGE** is a well-architected heritage tourism social platform with impressive features:
- ✅ Full MVC architecture (Express + MongoDB + Vanilla JS)
- ✅ Real-time messaging (Socket.io)
- ✅ AI integration (Google Gemini chatbot & image analysis)
- ✅ 40+ API endpoints covering social, posts, messaging, heritage browsing
- ✅ PWA support with offline capabilities
- ✅ Gamification system (digital passport, leaderboard)

**However**, there are **32+ significant issues** affecting security, performance, UX, and maintainability. This document provides a **prioritized remediation roadmap**.

---

## 🔴 CRITICAL ISSUES (Fix Immediately)

### 1. **XSS Vulnerabilities - Input Not Sanitized**
**Severity:** CRITICAL | **Type:** Security  
**Location:** Across all HTML forms, API endpoints  
**Problem:**
- User input (username, bio, post content, comments) not sanitized before storage/display
- Example: `dashboard.js` line 45+ directly inserts user content into DOM without escaping
- Attackers can inject malicious JavaScript via form fields

**Impact:** Account hijacking, credential theft, malware distribution  
**Solution:**
```javascript
// BEFORE (Vulnerable)
postDiv.innerHTML = `<p>${post.content}</p>`;  // XSS risk

// AFTER (Safe)
postDiv.textContent = post.content;  // Text-only, no HTML parsing
// Or use DOMPurify if HTML needed:
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js';
postDiv.innerHTML = DOMPurify.sanitize(post.content);
```
**Action Items:**
- [ ] Install & implement DOMPurify library across all HTML insertion points
- [ ] Add Zod/Joi validation for all form inputs on frontend
- [ ] Sanitize MongoDB text fields with mongoSanitize package
- [ ] Create utility function `sanitizeHTML()` in api.js

---

### 2. **No Input Validation Schema**
**Severity:** CRITICAL | **Type:** Data Integrity  
**Location:** `server.js` routes, `dashboard.html` forms  
**Problem:**
- No schema validation before data reaches database
- Example: `/api/posts` accepts any content without length checks
- `/api/auth/login` has minimal validation (no email format check)
- Comments, messages can be empty strings

**Impact:** Database bloat, invalid data, application crashes  
**Solution:**
```bash
npm install zod  # Or joi/yup
```
```javascript
// Add to server.js
import { z } from 'zod';

const postSchema = z.object({
  content: z.string().min(1).max(5000),
  location: z.string().optional(),
  mood: z.string().optional(),
  privacy: z.enum(['public', 'friends', 'private']),
});

app.post('/api/posts', requireAuth, async (req, res) => {
  try {
    const validated = postSchema.parse(req.body);
    // ... rest of handler
  } catch (e) {
    return res.status(400).json({ error: e.errors[0].message });
  }
});
```
**Action Items:**
- [ ] Create `schemas.js` with Zod validation for all requests
- [ ] Apply validation to 40+ API endpoints
- [ ] Add frontend validation using same schema (zod-form-data)

---

### 3. **NoSQL Injection Vulnerability**
**Severity:** CRITICAL | **Type:** Security  
**Location:** `/api/users/search` endpoint (line ~840 in server.js)  
**Problem:**
```javascript
// VULNERABLE CODE (line 841-843)
const regex = new RegExp(q, 'i');
users = await User.find({
  $or: [{ username: regex }, { bio: regex }],
});
```
- User input `q` directly becomes RegExp without escaping
- Attacker can craft malicious regex: `q = ".*"` to match all
- Or craft payload: `q = "'; return true; //"` to bypass logic

**Impact:** Unauthorized data access, application crash  
**Solution:**
```javascript
// SAFE CODE
function sanitizeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const escapedQuery = sanitizeRegex(q.trim());
const regex = new RegExp(escapedQuery, 'i');
users = await User.find({
  $or: [{ username: regex }, { bio: regex }],
}).limit(20).lean();
```
**Action Items:**
- [ ] Add `sanitizeRegex()` utility function
- [ ] Apply to all MongoDB regex queries (search, filter endpoints)
- [ ] Test with OWASP injection payloads

---

### 4. **Unencrypted Sensitive Data in IndexedDB**
**Severity:** CRITICAL | **Type:** Privacy  
**Location:** `api.js` LunarDB cache (lines 15-40)  
**Problem:**
- Stores posts, users, messages in unencrypted IndexedDB
- Client-side cache accessible via browser DevTools
- Exposes private messages, personal data, user tokens

**Impact:** Data breach if device compromised  
**Solution:**
```javascript
// Install encryption library
// npm install crypto-js

const LunarDB = {
  // ... existing code
  async put(store, item) {
    try {
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(item), 
        'user-session-key'
      ).toString();
      const db = await this.open();
      return new Promise((res, rej) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).put({ id: item.id, data: encrypted });
        tx.oncomplete = res;
        tx.onerror = () => rej(tx.error);
      });
    } catch(e) { console.warn('DB put:', e); }
  },
  async get(store, key) {
    // Decrypt before returning...
  }
};
```
**Action Items:**
- [ ] Install & integrate crypto-js
- [ ] Encrypt all sensitive data (messages, personal info)
- [ ] Exclude non-sensitive data (UI state, timestamps)
- [ ] Clear cache on logout

---

### 5. **Missing Rate Limiting**
**Severity:** CRITICAL | **Type:** Availability  
**Location:** All API endpoints in `server.js`  
**Problem:**
- No protection against brute-force attacks
- No limit on login attempts (password guessing)
- No limit on API calls (DDoS vulnerability)
- Unlimited file uploads (storage exhaustion)

**Impact:** DDoS attacks, brute-force credential theft, system crash  
**Solution:**
```bash
npm install express-rate-limit
```
```javascript
const rateLimit = require('express-rate-limit');

// Global limit: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Quá nhiều yêu cầu từ IP này. Vui lòng thử lại sau.'
});
app.use(limiter);

// Stricter limit for auth: 5 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
});
app.post('/api/auth/login', authLimiter, async (req, res) => { /* ... */ });
app.post('/api/auth/signup', authLimiter, async (req, res) => { /* ... */ });

// File upload limit: 10 per hour per user
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.userId || req.ip,
});
app.post('/api/users/me/avatar', uploadLimiter, upload.single('file'), ...);
```
**Action Items:**
- [ ] Install express-rate-limit
- [ ] Apply global limiter to all routes
- [ ] Add stricter limits for: auth (5 req/15min), uploads (10/hour)
- [ ] Configure to store limits in Redis for distributed systems

---

### 6. **Missing CSRF Protection**
**Severity:** CRITICAL | **Type:** Security  
**Location:** All POST/DELETE endpoints  
**Problem:**
- No CSRF tokens on forms
- Attacker can craft requests on behalf of authenticated users
- State-changing operations (create post, delete account) unprotected

**Impact:** Unauthorized account modifications, data deletion  
**Solution:**
```bash
npm install csurf
```
```javascript
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: false, sessionKey: 'session' });

// Middleware
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// On form pages, generate & return token
app.get('/create-post.html', (req, res) => {
  const token = req.csrfToken();
  // Include in HTML: <input type="hidden" name="_csrf" value="{{ csrfToken }}">
  res.send(createPostHtml.replace('{{csrfToken}}', token));
});

// Protect state-changing endpoints
app.post('/api/posts', csrfProtection, requireAuth, async (req, res) => { /* ... */ });
```
**Action Items:**
- [ ] Install csurf package
- [ ] Generate tokens for all forms
- [ ] Add hidden CSRF input to all forms (HTML)
- [ ] Add `_csrf` header validation to all POST/DELETE endpoints

---

## 🟠 MAJOR ISSUES (Fix in Next Sprint)

### 7. **Insufficient File Upload Validation**
**Severity:** HIGH | **Type:** Security  
**Location:** `server.js` multer configuration (lines 46-55)  
**Problem:**
```javascript
// CURRENT (Insufficient)
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, f, cb) => cb(null, f.mimetype.startsWith('image/')), // Only checks MIME type
});
```
- Only checks MIME type header (easily spoofed)
- No file extension validation
- No content verification (could be executable)
- No virus scanning
- No image dimension checks

**Impact:** Malware upload, system compromise  
**Solution:**
```bash
npm install file-type file-size-limit sharp
```
```javascript
const FileType = require('file-type');
const path = require('path');

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: async (req, file, cb) => {
    // Check extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return cb(new Error('Chỉ hỗ trợ JPG, PNG, WEBP'));
    }
    
    // Verify actual file type (not just header)
    try {
      const fileType = await FileType.fromBuffer(file.buffer);
      if (!fileType || !fileType.mime.startsWith('image/')) {
        return cb(new Error('File không phải hình ảnh hợp lệ'));
      }
    } catch(e) {
      return cb(e);
    }
    
    cb(null, true);
  }
});

// Also validate image dimensions
const validateImageDimensions = async (req, res, next) => {
  if (!req.file) return next();
  try {
    const metadata = await sharp(req.file.buffer).metadata();
    if (metadata.width < 100 || metadata.height < 100) {
      return res.status(400).json({ error: 'Ảnh quá nhỏ (min 100x100)' });
    }
    if (metadata.width > 4000 || metadata.height > 4000) {
      return res.status(400).json({ error: 'Ảnh quá lớn (max 4000x4000)' });
    }
    next();
  } catch(e) {
    res.status(400).json({ error: 'Lỗi xử lý ảnh: ' + e.message });
  }
};

app.post('/api/users/me/avatar', requireAuth, upload.single('file'), validateImageDimensions, async (req, res) => { /* ... */ });
```
**Action Items:**
- [ ] Install file-type, sharp libraries
- [ ] Implement actual file content verification
- [ ] Add image dimension validation
- [ ] Scan uploads with ClamAV or similar
- [ ] Store uploads outside web root `/uploads` → `/secure_uploads`

---

### 8. **Missing API Authentication for Some Endpoints**
**Severity:** HIGH | **Type:** Security  
**Location:** Multiple GET endpoints in `server.js`  
**Problem:**
```javascript
// VULNERABLE (line ~1100)
app.get('/api/users/:id/followers', async (req, res) => {  // NO requireAuth!
  const rows = await Follow.find({ following_id: req.params.id }).populate('follower_id');
  res.json({ followers: rows.map(r => safeUser(r.follower_id)), total: rows.length });
});

// Line ~1106
app.get('/api/users/:id/following', async (req, res) => {  // NO requireAuth!
  // ...
});

// Line ~1245
app.get('/api/posts/:id/comments', async (req, res) => {  // NO requireAuth!
  // ...
});
```
- Users can view private data without authentication
- Exposes social graph, all followers/following
- Comments visible without auth

**Impact:** Privacy breach, data harvesting  
**Solution:**
```javascript
// ADD requireAuth to sensitive endpoints:
app.get('/api/users/:id/followers', requireAuth, async (req, res) => { /* ... */ });
app.get('/api/users/:id/following', requireAuth, async (req, res) => { /* ... */ });
app.get('/api/posts/:id/comments', optionalAuth, async (req, res) => {  // Allow viewing, not creating
  // ...
});
```
**Action Items:**
- [ ] Audit ALL GET endpoints for missing auth
- [ ] Identify which endpoints should be public vs private
- [ ] Add optionalAuth to read endpoints that may be partially private
- [ ] Add requireAuth to all write operations (POST/DELETE)

---

### 9. **No Request Logging or Audit Trail**
**Severity:** HIGH | **Type:** Observability  
**Location:** All API endpoints  
**Problem:**
- No logging of API calls, failures, or suspicious activity
- Can't debug issues or investigate security breaches
- No way to track who deleted what or when

**Impact:** Can't investigate incidents, compliance violations  
**Solution:**
```bash
npm install winston
```
```javascript
// Add to server.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'lunar-heritage' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Middleware to log all requests
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      user: req.user?.userId || 'anonymous',
    });
  });
  next();
});

// Log security events
logger.warn({
  event: 'FAILED_LOGIN_ATTEMPT',
  email: req.body.email,
  ip: req.ip,
});
```
**Action Items:**
- [ ] Install winston logger
- [ ] Add request/response logging to all endpoints
- [ ] Create error log, access log, audit log files
- [ ] Set up log rotation
- [ ] Monitor logs for suspicious patterns

---

### 10. **No Data Backup Strategy**
**Severity:** HIGH | **Type:** Disaster Recovery  
**Location:** Database configuration (db.js)  
**Problem:**
- No automated backups of MongoDB
- Single point of failure - data loss if DB crashes
- No disaster recovery plan

**Impact:** Permanent data loss, service downtime  
**Solution:**
```javascript
// Add to server.js
const cron = require('node-cron');
const { exec } = require('child_process');
const fs = require('fs');

// Daily backup at 2 AM
cron.schedule('0 2 * * *', async () => {
  const timestamp = new Date().toISOString().split('T')[0];
  const backupDir = `./backups/lunar_heritage_${timestamp}`;
  const command = `mongodump --uri="${process.env.MONGODB_URI}" --out="${backupDir}"`;
  
  exec(command, (err, stdout, stderr) => {
    if (err) {
      logger.error({ event: 'BACKUP_FAILED', error: err.message });
      return;
    }
    logger.info({ event: 'BACKUP_SUCCESS', backup: backupDir });
    
    // Keep only last 30 days
    const backups = fs.readdirSync('./backups').sort().reverse();
    backups.slice(30).forEach(b => exec(`rm -rf ./backups/${b}`));
  });
});

logger.info('Backup scheduler initialized');
```
**Action Items:**
- [ ] Install node-cron package
- [ ] Set up automatic daily MongoDB backups
- [ ] Store backups to S3/cloud storage
- [ ] Test restore procedures monthly
- [ ] Document RTO/RPO requirements

---

### 11. **Broken Frontend Error Handling**
**Severity:** HIGH | **Type:** UX/Stability  
**Location:** Dashboard.js (line 45+), multiple HTML files  
**Problem:**
- Many API calls have no error handlers
- Network failures cause silent failures
- Users don't know if operation succeeded
- TODO comments indicate incomplete features:
  ```javascript
  // TODO: Send to backend (line 51 dashboard.js)
  // TODO: Handle error responses (multiple locations)
  ```

**Impact:** User confusion, data loss, hidden bugs  
**Solution:**
```javascript
// BEFORE (Broken)
function toggleLike(button, postId) {
  const isLiked = button.classList.contains('liked');
  // ... updates UI but doesn't send to backend
  console.log('Like post:', postId);  // TODO: Send to backend
}

// AFTER (Correct)
async function toggleLike(button, postId) {
  const wasLiked = button.classList.contains('liked');
  const newState = !wasLiked;
  
  try {
    // Optimistic UI update
    button.classList.toggle('liked');
    showToast('Đang xử lý...', 'info');
    
    // Actually send to backend
    const result = await LunarAPI.togglePostLike(postId, { emotion: '❤️' });
    
    // Confirm with user
    showToast(newState ? '❤️ Yêu thích bài viết' : 'Bỏ yêu thích', 'success');
    
  } catch (error) {
    // Revert UI on failure
    button.classList.toggle('liked');
    showToast(error.message || 'Lỗi: Vui lòng thử lại', 'error');
    logger.error({ event: 'LIKE_FAILED', postId, error: error.message });
  }
}
```
**Action Items:**
- [ ] Add try-catch to all async functions
- [ ] Show loading states during API calls
- [ ] Display error messages to users
- [ ] Implement retry logic for failed requests
- [ ] Resolve all TODO comments with implementation

---

### 12. **Socket.io Not Fully Implemented**
**Severity:** MEDIUM | **Type:** Feature Completeness  
**Location:** `server.js` (lines 1800+), `messages.html`  
**Problem:**
- Socket.io server configured but not handling events properly
- Missing event handlers for: `chat`, `typing`, `claim_artifact`, `light_lantern`
- Frontend tries to use Socket.io but backend doesn't respond
- Real-time messaging partially broken

**Impact:** Real-time features don't work, messages may be lost  
**Solution:**
```javascript
// Add to server.js after io initialization
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join_room', (userId) => {
    socket.join(`user_${userId}`);
  });
  
  socket.on('chat', async (data) => {
    try {
      const { to, content, image_url } = data;
      if (!content?.trim() && !image_url) return;
      
      const msg = await Message.create({
        sender_id: socket.handshake.auth.userId,
        receiver_id: to,
        content: content?.trim(),
        image_url,
        is_read: false,
      });
      
      io.to(`user_${to}`).emit('message', msg);
      socket.emit('message_sent', msg);
    } catch(e) {
      socket.emit('error', { message: e.message });
    }
  });
  
  socket.on('typing', (data) => {
    io.to(`user_${data.to}`).emit('user_typing', {
      from: socket.handshake.auth.userId,
      typing: data.typing,
    });
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
```
**Action Items:**
- [ ] Implement all Socket.io event handlers
- [ ] Add user authentication to socket connections
- [ ] Test real-time message delivery
- [ ] Add message acknowledgment/delivery confirmation
- [ ] Test on slow networks

---

## 🟡 MODERATE ISSUES (Plan for Later)

### 13. **No Pagination Enforcement**
**Location:** `/api/posts`, `/api/users/posts`  
**Problem:** Limit parameter can be set to 10,000+, loading entire database  
**Solution:** Enforce max limit in all endpoints
```javascript
const limit = Math.min(parseInt(req.query.limit) || 20, 50);  // Max 50
```

### 14. **Missing HTTPS Redirect**
**Location:** server.js  
**Problem:** No redirect from HTTP to HTTPS  
**Solution:**
```javascript
app.use((req, res, next) => {
  if (!req.secure && process.env.NODE_ENV === 'production') {
    res.redirect('https://' + req.header('host') + req.url);
  }
  next();
});
```

### 15. **No Database Connection Error Handling**
**Location:** db.js (line 13)  
**Problem:** If MongoDB fails to connect, app continues with degraded state  
**Solution:**
```javascript
let isDbConnected = false;
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ event: 'UNHANDLED_REJECTION', reason: reason.toString() });
});
```

### 16. **Duplicate API/Settings Logic**
**Location:** `api.js` and `settings.js` both fetch settings  
**Problem:** Code duplication makes maintenance harder  
**Solution:** Consolidate into single LunarAPI method

### 17. **No Automated Tests**
**Location:** Entire project  
**Problem:** No unit/integration tests - can't verify features  
**Solution:** Add Jest + Supertest for API testing

### 18. **Missing TypeScript**
**Location:** All .js files  
**Problem:** No type safety, catches errors at runtime  
**Solution:** Migrate to TypeScript incrementally

### 19. **Inconsistent Error Response Format**
**Location:** Multiple endpoints  
**Problem:** Some return `{error}`, others `{message}`, some `{ok: false}`  
**Solution:** Create standard response format:
```javascript
const ApiResponse = {
  success: (data) => ({ ok: true, data }),
  error: (message, code = 'ERROR') => ({ ok: false, error: { message, code } }),
};
```

### 20. **Missing Environment Variable Validation**
**Location:** server.js top-level  
**Problem:** App crashes if critical env vars missing  
**Solution:**
```javascript
const required = ['JWT_SECRET', 'MONGODB_URI'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('❌ Missing env vars:', missing);
  process.exit(1);
}
```

---

## ✅ EXISTING STRENGTHS (Maintain)

### What's Working Well
1. **Clear MVC Architecture** - Frontend/backend separation is clean
2. **Comprehensive Schema** - 12 well-designed MongoDB collections
3. **API Coverage** - 40+ endpoints covering all major features
4. **Real-time Capabilities** - Socket.io infrastructure present
5. **Gamification System** - Digital passport & leaderboard functional
6. **AI Integration** - Gemini API well-integrated
7. **PWA Ready** - Manifest & service worker present
8. **User-Centric Design** - Multi-language, timezone support, privacy controls

### What to Preserve
- Database indexing strategy
- Middleware authentication chain
- User settings architecture
- Heritage site data model
- File upload infrastructure

---

## 🚀 IMPLEMENTATION ROADMAP

### Phase 1: CRITICAL (Week 1-2)
**Focus:** Security & Data Integrity
- [ ] Add input sanitization (DOMPurify)
- [ ] Implement Zod validation schemas
- [ ] Fix NoSQL injection vulnerabilities
- [ ] Add rate limiting
- [ ] Add CSRF protection
- [ ] Encrypt IndexedDB data

**Estimated:** 40-60 hours | **Risk:** HIGH

### Phase 2: MAJOR (Week 3-4)
**Focus:** Security & Observability
- [ ] File upload validation
- [ ] API authentication audit
- [ ] Implement logging
- [ ] Add database backups
- [ ] Fix error handling throughout

**Estimated:** 30-40 hours | **Risk:** MEDIUM

### Phase 3: MODERATE (Week 5-6)
**Focus:** Quality & Stability
- [ ] Complete Socket.io implementation
- [ ] Add pagination enforcement
- [ ] Consolidate duplicate code
- [ ] Fix environment validation
- [ ] Standardize API responses

**Estimated:** 25-35 hours | **Risk:** LOW

### Phase 4: IMPROVEMENTS (Week 7-8)
**Focus:** Testing & TypeScript
- [ ] Add Jest tests
- [ ] Migrate to TypeScript
- [ ] Performance optimization
- [ ] CI/CD pipeline
- [ ] Production deployment checklist

**Estimated:** 35-50 hours | **Risk:** MEDIUM

---

## 📊 Priority Matrix

| Issue | Severity | Effort | Priority |
|-------|----------|--------|----------|
| XSS Vulnerabilities | CRITICAL | 20h | 1️⃣ |
| Input Validation | CRITICAL | 30h | 2️⃣ |
| NoSQL Injection | CRITICAL | 10h | 3️⃣ |
| Rate Limiting | CRITICAL | 8h | 4️⃣ |
| File Upload Validation | HIGH | 15h | 5️⃣ |
| API Auth Audit | HIGH | 12h | 6️⃣ |
| Request Logging | HIGH | 10h | 7️⃣ |
| DB Backups | HIGH | 8h | 8️⃣ |
| Error Handling | HIGH | 25h | 9️⃣ |
| Socket.io Implementation | MEDIUM | 20h | 🔟 |

---

## 📝 NEXT STEPS

1. **Review this document** with the development team
2. **Create tickets** for each critical issue in your project management tool
3. **Assign developers** to Phase 1 items (start with XSS, validation, rate limiting)
4. **Set up testing environment** with security scanning tools
5. **Establish code review process** for security
6. **Plan deployment strategy** for fixes

---

## 🔗 Reference Links

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/security-checklist/)
- [Zod Validation](https://zod.dev/)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [express-rate-limit](https://github.com/nfriedly/express-rate-limit)

---

**Document Version:** 1.0  
**Last Updated:** May 20, 2026  
**Reviewed By:** AI Code Analysis  
**Status:** Ready for Implementation
