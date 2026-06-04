/**
 * auth.js – JWT middleware
 */
const jwt    = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
    console.error('❌  FATAL: JWT_SECRET environment variable is not set. Exiting.');
    process.exit(1);
}

const SECRET = process.env.JWT_SECRET;
const EXPIRE  = process.env.JWT_EXPIRE  || '7d';

function createToken(userId, username, role = 'user') {
    return jwt.sign({ userId, username, role }, SECRET, { expiresIn: EXPIRE });
}

function verifyToken(token) {
    try { return jwt.verify(token, SECRET); }
    catch { return null; }
}

/** Require valid JWT – 401 if missing */
function requireAuth(req, res, next) {
    const header  = req.headers.authorization || '';
    const token   = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
    req.user = payload;
    next();
}

/** Require admin role – 403 if not admin */
function requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
}

/** Optional JWT – attaches req.user if valid, continues regardless */
function optionalAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) req.user = verifyToken(token) || null;
    next();
}

module.exports = { createToken, verifyToken, requireAuth, requireAdmin, optionalAuth };
