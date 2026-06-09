/**
 * api.js – LUNAR HERITAGE Frontend Client v2
 * Includes: REST API, IndexedDB cache (LunarDB), WebSocket manager (LunarWS)
 */

const API_BASE = (() => {
    const h = window.location.hostname;
    // Chạy local
    if (h === 'localhost' || h === '127.0.0.1') return `http://${h}:3000`;
    if (h === '') return 'http://localhost:3000';
    // Môi trường Deploy: Trỏ thẳng tới backend trên Render
    return 'https://bwd-backend-vffv.onrender.com';
})();

// ══════════════════════════════════════════════════════════
//  IndexedDB Cache Layer
// ══════════════════════════════════════════════════════════
const LunarDB = {
    _db: null, DB_NAME: 'LunarHeritage', DB_VER: 2,
    async open() {
        if (this._db) return this._db;
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.DB_NAME, this.DB_VER);
            req.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('posts')) { const s = db.createObjectStore('posts', { keyPath: 'id' }); s.createIndex('created_at', 'created_at'); }
                if (!db.objectStoreNames.contains('users')) db.createObjectStore('users', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('messages')) { const s = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true }); s.createIndex('convo', 'convo_key'); }
                if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: 'id', autoIncrement: true });
            };
            req.onsuccess = e => { this._db = e.target.result; resolve(this._db); };
            req.onerror = () => reject(req.error);
        });
    },
    SECRET: 'lunar-heritage-local-secret-key-2026',
    _encrypt(item) {
        if (!window.CryptoJS) return item;
        try {
            const str = JSON.stringify(item);
            const enc = window.CryptoJS.AES.encrypt(str, this.SECRET).toString();
            return { id: item.id || item._id, _encrypted: enc };
        } catch(e) { return item; }
    },
    _decrypt(item) {
        if (!item || !item._encrypted || !window.CryptoJS) return item;
        try {
            const dec = window.CryptoJS.AES.decrypt(item._encrypted, this.SECRET).toString(window.CryptoJS.enc.Utf8);
            return JSON.parse(dec);
        } catch(e) { return item; }
    },
    async put(store, item) { try { const db = await this.open(); const encItem = this._encrypt(item); return new Promise((res,rej) => { const tx=db.transaction(store,'readwrite'); tx.objectStore(store).put(encItem); tx.oncomplete=res; tx.onerror=()=>rej(tx.error); }); } catch(e) { console.warn('DB put:',e); } },
    async putMany(store, items) { try { const db = await this.open(); return new Promise((res,rej) => { const tx=db.transaction(store,'readwrite'); const os=tx.objectStore(store); items.forEach(i=>os.put(this._encrypt(i))); tx.oncomplete=res; tx.onerror=()=>rej(tx.error); }); } catch(e) { console.warn('DB putMany:',e); } },
    async get(store, key) { try { const db = await this.open(); return new Promise((res,rej) => { const req=db.transaction(store,'readonly').objectStore(store).get(key); req.onsuccess=()=>res(this._decrypt(req.result)); req.onerror=()=>rej(req.error); }); } catch(e) { return null; } },
    async getAll(store) { try { const db = await this.open(); return new Promise((res,rej) => { const req=db.transaction(store,'readonly').objectStore(store).getAll(); req.onsuccess=()=>res(req.result ? req.result.map(i => this._decrypt(i)) : []); req.onerror=()=>rej(req.error); }); } catch(e) { return []; } },
    async delete(store, key) { try { const db = await this.open(); return new Promise((res,rej) => { const tx=db.transaction(store,'readwrite'); tx.objectStore(store).delete(key); tx.oncomplete=res; tx.onerror=()=>rej(tx.error); }); } catch(e) { console.warn('DB delete:',e); } },
    async saveDraft(content, location, mood) { return this.put('drafts', { content, location, mood, saved_at: new Date().toISOString() }); },
    async getDrafts() { return this.getAll('drafts'); },
};

// ══════════════════════════════════════════════════════════
//  Auth Helpers
// ══════════════════════════════════════════════════════════
const Auth = {
    getToken: () => localStorage.getItem('lh_token'),
    setToken: t => localStorage.setItem('lh_token', t),
    getUser:  () => { try { return JSON.parse(localStorage.getItem('lh_user')||'null'); } catch { return null; } },
    setUser:  u => localStorage.setItem('lh_user', JSON.stringify(u)),
    clear:    () => { localStorage.removeItem('lh_token'); localStorage.removeItem('lh_user'); },
    isLogged: () => !!localStorage.getItem('lh_token'),
};

// ══════════════════════════════════════════════════════════
//  Core Fetch
// ══════════════════════════════════════════════════════════
let csrfToken = null;
async function fetchCsrfToken() {
    if (csrfToken) return;
    try {
        const res = await fetch(`${API_BASE}/api/csrf-token`, { credentials: 'include' });
        const data = await res.json();
        csrfToken = data.csrfToken;
    } catch (e) {
        console.warn('Failed to fetch CSRF token', e);
    }
}
// Initialize CSRF
fetchCsrfToken();

async function apiFetch(path, opts = {}) {
    // Ensure we have token for non-GET requests
    if (!csrfToken && opts.method && opts.method !== 'GET') {
        await fetchCsrfToken();
    }
    
    const token = Auth.getToken();
    const headers = { 'Content-Type': 'application/json', ...opts.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (csrfToken && opts.method && opts.method !== 'GET') headers['X-CSRF-Token'] = csrfToken;
    if (opts.body instanceof FormData) delete headers['Content-Type'];

    // Important for CSRF cookies
    opts.credentials = 'include';

    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 12000);

    try {
        const res = await fetch(`${API_BASE}${path}`, { ...opts, headers, signal: controller.signal });
        clearTimeout(tid);
        const data = await res.json().catch(() => ({}));
        
        if (res.status === 401) {
            Auth.clear();
            if (!window.location.pathname.endsWith('login.html')) {
                window.location.href = 'login.html';
            }
            if (!path.includes('/api/auth/')) {
                throw new Error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.');
            }
        }
        
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
    } catch (err) {
        clearTimeout(tid);
        if (err.name === 'AbortError') throw new Error('Kết nối hết thời gian. Kiểm tra server đang chạy.');
        if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
            throw new Error('Không thể kết nối server. Hãy chạy: node server.js');
        }
        throw err;
    }
}

// ══════════════════════════════════════════════════════════
//  WebSocket Manager
// ══════════════════════════════════════════════════════════
const LunarWS = {
    _socket: null, _handlers: [], _eventHandlers: {},
    async initSocketIo() {
        if (window.io) return true;
        return new Promise(resolve => {
            const s = document.createElement('script');
            s.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
            s.onload = () => resolve(true); s.onerror = () => resolve(false);
            document.head.appendChild(s);
        });
    },
    async connect() {
        const token = Auth.getToken();
        if (!token) return;
        const ok = await this.initSocketIo();
        if (!ok || this._socket?.connected) return;
        try {
            this._socket = io(API_BASE, { query: { token }, timeout: 5000 });
            this._socket.on('message', e => {
                try {
                    if (e.type === 'message' || e.type === 'sent') {
                        const d = e.data;
                        // Fixed: use 'd' not undefined 'm'
                        LunarDB.put('messages', { ...d, convo_key: [String(d.sender_id), String(d.receiver_id)].sort().join('_') });
                    }
                    this._handlers.forEach(h => h(e));
                } catch {}
            });
            this._socket.on('connect_error', () => console.warn('WS offline'));
            
            Object.keys(this._eventHandlers).forEach(event => {
                this._eventHandlers[event].forEach(handler => this._socket.on(event, handler));
            });
            
            // Join real-time visitor tracking for the current page
            const pageName = window.location.pathname.split('/').pop() || 'index';
            this._socket.emit('join_page', pageName);
            
            // Real-time Visitor tracking (Disabled per user request)
            this._socket.on('visitor_count', ({ count }) => {
                // Feature removed
            });

            // Real-time Lantern Effect across clients
            this._socket.on('lantern_lit', () => {
                const lantern = document.createElement('div');
                lantern.innerHTML = '🏮';
                const startX = Math.random() * window.innerWidth;
                lantern.style.cssText = `
                    position: fixed;
                    bottom: -50px;
                    left: ${startX}px;
                    font-size: ${Math.random() * 20 + 24}px;
                    z-index: 9998;
                    pointer-events: none;
                    transition: transform 5s ease-in, opacity 5s ease-out;
                    filter: drop-shadow(0 0 10px rgba(255, 165, 0, 0.8));
                `;
                document.body.appendChild(lantern);
                
                // Trigger animation
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        lantern.style.transform = `translateY(-${window.innerHeight + 100}px) translateX(${Math.random() * 100 - 50}px)`;
                        lantern.style.opacity = '0';
                    });
                });
                
                setTimeout(() => lantern.remove(), 5000);
            });
        } catch(e) { console.warn('WS failed:', e.message); }
    },
    disconnect() { this._socket?.disconnect(); this._socket = null; },
    send(ev, payload) { if (!this._socket?.connected) return false; this._socket.emit(ev, payload); return true; },
    sendMessage(receiverId, content) { return this.send('chat', { receiverId, content }); },
    onMessage(handler) { this._handlers.push(handler); return () => { this._handlers = this._handlers.filter(h => h !== handler); }; },
    on(event, handler) {
        if (!this._eventHandlers[event]) this._eventHandlers[event] = [];
        this._eventHandlers[event].push(handler);
        if (this._socket) this._socket.on(event, handler);
        return () => { this._eventHandlers[event] = this._eventHandlers[event].filter(h => h !== handler); };
    }
};

// ══════════════════════════════════════════════════════════
//  LunarAPI
// ══════════════════════════════════════════════════════════
const LunarAPI = {
    // Auth
    async signup(username, email, password) {
        const d = await apiFetch('/api/auth/signup', { method:'POST', body: JSON.stringify({ username, email, password }) });
        Auth.setToken(d.token); Auth.setUser(d.user); LunarWS.connect(); return d;
    },
    async login(email, password) {
        const d = await apiFetch('/api/auth/login', { method:'POST', body: JSON.stringify({ email, password }) });
        Auth.setToken(d.token); Auth.setUser(d.user); LunarWS.connect(); return d;
    },
    logout() { LunarWS.disconnect(); Auth.clear(); window.location.href = 'login.html'; },

    // Users
    async getMe() { const u = await apiFetch('/api/users/me'); Auth.setUser(u); await LunarDB.put('users', u); return u; },
    async getUser(id) { try { const u = await apiFetch(`/api/users/${id}`); await LunarDB.put('users', u); return u; } catch { return await LunarDB.get('users', id) || null; } },
    updateMe: body => apiFetch('/api/users/me', { method:'PATCH', body: JSON.stringify(body) }),
    async uploadAvatar(file) { const fd = new FormData(); fd.append('file', file); return apiFetch('/api/users/me/avatar', { method:'POST', body: fd }); },
    deleteAvatar: () => apiFetch('/api/users/me/avatar', { method: 'DELETE' }),
    async uploadCoverPhoto(file) { const fd = new FormData(); fd.append('file', file); return apiFetch('/api/users/me/cover', { method:'POST', body: fd }); },
    deleteCover: () => apiFetch('/api/users/me/cover', { method: 'DELETE' }),

    // Follows / Friends
    toggleFollow: id => apiFetch(`/api/users/${id}/follow`, { method:'POST' }),
    getFollowers: id => apiFetch(`/api/users/${id}/followers`),
    getFollowing: id => apiFetch(`/api/users/${id}/following`),
    getFriendStatus: id => apiFetch(`/api/friends/status/${id}`),
    requestFriend: id => apiFetch(`/api/friends/request/${id}`, { method:'POST' }),
    acceptFriend: id => apiFetch(`/api/friends/accept/${id}`, { method:'POST' }),
    removeFriend: id => apiFetch(`/api/friends/${id}`, { method:'DELETE' }),

    // Posts
    async getPosts(skip=0, limit=20) {
        try { const d = await apiFetch(`/api/posts?skip=${skip}&limit=${limit}`); if (skip===0) await LunarDB.putMany('posts', d.posts); return d; }
        catch { const cached = await LunarDB.getAll('posts'); return { posts: cached.sort((a,b)=>b.created_at>a.created_at?1:-1).slice(skip,skip+limit), cached:true }; }
    },
    getUserPosts: (uid,skip=0,limit=20) => apiFetch(`/api/users/${uid}/posts?skip=${skip}&limit=${limit}`),
    async createPost(content, location=null, mood=null, privacy='public') { const d = await apiFetch('/api/posts', { method:'POST', body: JSON.stringify({ content, location, mood, privacy }) }); if (d.post) await LunarDB.put('posts', d.post); return d; },
    async uploadPostImage(postId, file) { const fd = new FormData(); fd.append('file', file); return apiFetch(`/api/posts/${postId}/image`, { method:'POST', body: fd }); },
    async deletePost(id) { const d = await apiFetch(`/api/posts/${id}`, { method:'DELETE' }); await LunarDB.delete('posts', id); return d; },
    toggleLike: (postId, emotion='❤️') => apiFetch(`/api/posts/${postId}/like`, { method:'POST', body: JSON.stringify({ emotion }) }),
    getComments: postId => apiFetch(`/api/posts/${postId}/comments`),
    addComment: (postId, content) => apiFetch(`/api/posts/${postId}/comments`, { method:'POST', body: JSON.stringify({ content }) }),

    // Messages
    getConversations: () => apiFetch('/api/messages'),
    async getMessages(uid) {
        try {
            const d = await apiFetch(`/api/messages/${uid}`);
            for (const m of d.messages) {
                const convo_key = [String(m.sender_id), String(m.receiver_id)].sort().join('_');
                await LunarDB.put('messages', { ...m, convo_key });
            }
            return d;
        }
        catch {
            const all = await LunarDB.getAll('messages');
            const me = Auth.getUser()?.id;
            return { messages: all.filter(m => (m.sender_id === me && m.receiver_id === uid) || (m.sender_id === uid && m.receiver_id === me)), cached: true };
        }
    },
    sendMessage: (receiverId, content) => LunarWS.sendMessage(receiverId, content),

    // Heritage & Lanterns
    getHeritage: () => apiFetch('/api/heritage'),
    getLanterns: (skip=0,limit=50) => apiFetch(`/api/lanterns?skip=${skip}&limit=${limit}`),
    createLantern: (name,story,heritage=null) => apiFetch('/api/lanterns', { method:'POST', body: JSON.stringify({ name, story, heritage }) }),
    lanternStats: () => apiFetch('/api/stats'),

    // AI
    chat: messages => apiFetch('/api/ai/chat', { method:'POST', body: JSON.stringify({ messages }) }),
    async analyzeImage(file) { const fd = new FormData(); fd.append('file', file); return apiFetch('/api/ai/analyze-image', { method:'POST', body: fd }); },
    createItinerary: (destination,days,budget,interests,travelers,start_from=null) => apiFetch('/api/ai/itinerary', { method:'POST', body: JSON.stringify({ destination, days, budget, interests, travelers, start_from }) }),

    // AI Chat History (server-side per user)
    getAiHistory: (session='default') => apiFetch(`/api/ai/history?session=${session}`),
    saveAiMessage: (session_id, role, content) => apiFetch('/api/ai/history', { method:'POST', body: JSON.stringify({ session_id, role, content }) }),
    clearAiHistory: (session='default') => apiFetch(`/api/ai/history?session=${session}`, { method:'DELETE' }),
    getAiSessions: () => apiFetch('/api/ai/sessions'),

    // Settings
    getSettings: () => apiFetch('/api/settings'),
    updateSettings: body => apiFetch('/api/settings', { method:'PATCH', body: JSON.stringify(body) }),

    // Account management (real MongoDB operations)
    getUserStats: () => apiFetch('/api/users/me/stats'),
    searchUsers: (q = '') => apiFetch(`/api/users/search?q=${encodeURIComponent(q)}`),
    deactivateAccount: () => apiFetch('/api/account/deactivate', { method: 'POST' }),
    deleteAccount: (password) => apiFetch('/api/account', { method: 'DELETE', body: JSON.stringify({ password }) }),
    async exportData() {
        const token = Auth.getToken();
        const res = await fetch(`${API_BASE}/api/account/export`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Export thất bại'); }
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        a.download = `lunar-heritage-export-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return { ok: true };
    },
    deleteAllPosts: () => apiFetch('/api/posts/all', { method: 'DELETE' }),

    // Heritage Passport
    getPassport: () => apiFetch('/api/passport'),
    getLeaderboard: () => apiFetch('/api/passport/leaderboard'),

    // Stats
    stats: () => apiFetch('/api/stats'),

    // Utilities
    Auth, LunarDB, LunarWS,
    isLoggedIn: () => Auth.isLogged(),
    currentUser: () => Auth.getUser(),
    getToken: () => Auth.getToken(),
    getCsrfToken: () => csrfToken,
    fetchCsrfToken,
    /**
     * setUser – persist a user object to localStorage via Auth.
     * Keeps LunarAPI.setUser(u) as a public alias so callers (e.g. profile.js)
     * don't need to reach into the Auth helper directly.
     */
    setUser: (u) => Auth.setUser(u),
    apiBase: () => API_BASE,
    sanitize: (html) => window.DOMPurify ? window.DOMPurify.sanitize(html) : html,
};

// Auto-connect WS
if (Auth.isLogged()) setTimeout(() => LunarWS.connect(), 500);

window.LunarAPI = LunarAPI;
window.Auth     = Auth;
window.LunarDB  = LunarDB;
window.LunarWS  = LunarWS;
window.API_BASE = API_BASE;

// User status widget & Nav Auth state
document.addEventListener('DOMContentLoaded', () => {
    const user = Auth.getUser();
    
    // Update old #user-status widget if present
    const el = document.getElementById('user-status');
    if (el && user) {
        el.innerHTML = `<span style="color:var(--accent);font-weight:600">👤 ${user.username}</span>
            <button onclick="LunarAPI.logout()" style="margin-left:8px;font-size:12px;color:var(--text-muted);background:none;border:none;cursor:pointer">Đăng xuất</button>`;
    }
    
    // Update main nav login button if present
    const navLoginLink = document.getElementById('navLoginLink');
    if (navLoginLink && user) {
        navLoginLink.textContent = user.username;
        navLoginLink.href = 'profile.html';
        navLoginLink.setAttribute('aria-label', `Trang cá nhân của ${user.username}`);
        
        // Also update the mobile drawer if it's already built
        const mnavLogin = document.querySelector('.mnav-footer a[href*="login"], .mnav-footer a[href*="profile"]');
        if (mnavLogin) {
            mnavLogin.textContent = user.username;
            mnavLogin.href = 'profile.html';
        }
    }
});

// Scroll reveal
document.addEventListener('DOMContentLoaded', () => {
    const obs = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } }); }, { threshold:0.1 });
    const apply = () => { document.querySelectorAll('.post-card,.card,.dest-card').forEach(el => { if (!el.classList.contains('reveal')) { el.classList.add('reveal'); obs.observe(el); } }); };
    apply();
    const mo = new MutationObserver(() => apply());
    mo.observe(document.getElementById('feedContainer') || document.body, { childList:true, subtree:true });
});

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.warn('Service Worker registration failed:', err);
        });
    });
}

// ══════════════════════════════════════════════════════════
//  Mobile Swipe Navigation
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    // Only run on mobile viewport
    if (window.innerWidth > 640) return;
    
    let touchStartX = 0;
    let touchEndX = 0;
    
    const pages = ['index.html', 'dashboard.html', 'explore.html', 'passport.html', 'ai.html'];
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    let currentIndex = pages.indexOf(currentPath);
    // If not found (e.g. root '/'), default to index.html
    if (currentIndex === -1 && currentPath === '') currentIndex = 0;
    
    if (currentIndex === -1) return;
    
    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    document.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        
        // Avoid swiping if user is interacting with map, chat, etc.
        if (e.target && e.target.closest('.leaflet-container, canvas, input, textarea, .horizontal-scroll, #chat-msgs')) return;
        
        const diff = touchEndX - touchStartX;
        const threshold = 100; // Require 100px swipe to avoid accidental navigations
        
        if (diff > threshold) {
            // Swipe Right -> Previous Page
            if (currentIndex > 0) window.location.href = pages[currentIndex - 1];
        } else if (diff < -threshold) {
            // Swipe Left -> Next Page
            if (currentIndex < pages.length - 1) window.location.href = pages[currentIndex + 1];
        }
    }, { passive: true });
});
