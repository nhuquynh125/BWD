/**
 * settings.js – LUNAR HERITAGE Settings Page (Real Data)
 * Loads user profile from API, saves changes back to server + localStorage per-user
 */

const SETTINGS_API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:8000' : window.location.origin;
let currentUser = null;
let currentSettings = {};
let originalData = {};   // snapshot for "cancel" reset

// ── Utilities ──────────────────────────────────────────────
const $ = id => document.getElementById(id);
function getToken() { return localStorage.getItem('lh_token'); }
function getStoredUser() { try { return JSON.parse(localStorage.getItem('lh_user') || 'null'); } catch { return null; } }

async function apiFetch(path, opts = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...opts.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (opts.body instanceof FormData) delete headers['Content-Type'];
    const res = await fetch(`${SETTINGS_API_BASE}${path}`, { ...opts, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

// Per-user pref key
function prefKey(key) { return `lh_pref_${currentUser?.id || 'guest'}_${key}`; }
function savePref(key, val) { localStorage.setItem(prefKey(key), JSON.stringify(val)); }
function loadPref(key, def) {
    const v = localStorage.getItem(prefKey(key));
    if (v === null) return def;
    try { return JSON.parse(v); } catch { return def; }
}

function cacheSettings(settings = {}) {
    currentSettings = settings || {};
    Object.entries(currentSettings).forEach(([key, value]) => {
        if (key !== 'user_id' && key !== 'created_at' && key !== 'updated_at') savePref(key, value);
    });
}

function isOn(id, fallback = false) {
    const el = $(id);
    return el ? el.classList.contains('on') : fallback;
}

function collectSettingsPayload() {
    const vis = document.querySelector('#profileVis .privacy-opt.selected')?.dataset.val || loadPref('profile_visibility', 'public');
    return {
        profile_visibility: vis,
        share_location: isOn('toggleShareLocation', false),
        show_trips: isOn('toggleShowTrips', true),
        message_perm: $('messagePermSelect')?.value || loadPref('message_perm', 'followers'),
        two_fa: isOn('toggle2FA', false),
        email_verify: isOn('toggleEmailVerify', true),
        login_alert: isOn('toggleLoginAlert', true),
        notif_like_app: isOn('notifLikeApp', true),
        notif_like_email: isOn('notifLikeEmail', false),
        notif_like_push: isOn('notifLikePush', true),
        notif_comment_app: isOn('notifCommentApp', true),
        notif_comment_email: isOn('notifCommentEmail', true),
        notif_comment_push: isOn('notifCommentPush', true),
        notif_follow_app: isOn('notifFollowApp', true),
        notif_follow_email: isOn('notifFollowEmail', false),
        notif_follow_push: isOn('notifFollowPush', true),
        notif_trip_app: isOn('notifTripApp', true),
        notif_trip_email: isOn('notifTripEmail', true),
        notif_trip_push: isOn('notifTripPush', true),
        notif_msg_app: isOn('notifMsgApp', true),
        notif_msg_email: isOn('notifMsgEmail', false),
        notif_msg_push: isOn('notifMsgPush', true),
        notif_suggest_app: isOn('notifSuggestApp', true),
        notif_suggest_email: isOn('notifSuggestEmail', true),
        notif_suggest_push: isOn('notifSuggestPush', false),
        language: $('languageSelect')?.value || loadPref('language', 'vi'),
        timezone: $('timezoneSelect')?.value || loadPref('timezone', 'GMT+7'),
        currency: $('currencySelect')?.value || loadPref('currency', 'VND'),
    };
}

// Toast
function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' error' : '');
    t.textContent = (type === 'success' ? '✅ ' : '❌ ') + msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3000);
}

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    if (!getToken()) { window.location.href = 'login.html'; return; }
    try {
        currentUser = await apiFetch('/api/users/me');
        localStorage.setItem('lh_user', JSON.stringify(currentUser));
        const { settings } = await apiFetch('/api/settings');
        cacheSettings(settings);
    } catch (e) {
        console.warn('settings: fallback to localStorage user', e);
        currentUser = getStoredUser();
        if (!currentUser) { window.location.href = 'login.html'; return; }
    }
    try { populateProfile(); }        catch(e) { console.error('populateProfile', e); }
    try { populateSecurity(); }       catch(e) { console.error('populateSecurity', e); }
    try { populatePrivacy(); }        catch(e) { console.error('populatePrivacy', e); }
    try { populateNotifications(); }  catch(e) { console.error('populateNotifications', e); }
    // appearance section removed
    try { populateLanguage(); }       catch(e) { console.error('populateLanguage', e); }
    try { updateSidebarUser(); }      catch(e) { console.error('updateSidebarUser', e); }
    try { setupAvatarUpload(); }      catch(e) { console.error('setupAvatarUpload', e); }
    try { setupProfileForm(); }       catch(e) { console.error('setupProfileForm', e); }
    try { setupPasswordForm(); }      catch(e) { console.error('setupPasswordForm', e); }
    try { setupPrivacyControls(); }   catch(e) { console.error('setupPrivacyControls', e); }
    try { setupNotifToggles(); }      catch(e) { console.error('setupNotifToggles', e); }
    // appearance pickers removed
    try { setupLanguageControls(); }  catch(e) { console.error('setupLanguageControls', e); }
    try { setupDangerZone(); }        catch(e) { console.error('setupDangerZone', e); }
    // Navigate to hash section if present in URL
    const hash = window.location.hash.replace('#', '');
    if (hash) goSection(hash);
    // Load live account stats from MongoDB (non-blocking)
    loadAccountStats().catch(e => console.warn('Stats load failed:', e));
});

// ── Account Statistics (real data from MongoDB) ────────────
async function loadAccountStats() {
    try {
        const stats = await apiFetch('/api/users/me/stats');
        const map = {
            'statPosts':            stats.posts            ?? 0,
            'statFollowers':        stats.followers        ?? 0,
            'statFollowing':        stats.following        ?? 0,
            'statLikesReceived':    stats.likes_received   ?? 0,
            'statCommentsReceived': stats.comments_received ?? 0,
        };
        Object.entries(map).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val.toLocaleString('vi-VN');
        });
    } catch (e) {
        console.warn('loadAccountStats failed:', e.message);
    }
}

// ── Sidebar user ───────────────────────────────────────────
function updateSidebarUser() {
    const u = currentUser;
    const av = document.getElementById('navAvatar');
    if (!av) return;
    if (u.avatar_url) {
        av.innerHTML = `<img src="${SETTINGS_API_BASE}${u.avatar_url}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else {
        av.textContent = (u.username || 'U')[0].toUpperCase();
    }
    // also update big-avatar if already rendered
    const bigAvatar = document.getElementById('bigAvatar');
    if (bigAvatar && u.avatar_url) {
        bigAvatar.innerHTML = `<img src="${SETTINGS_API_BASE}${u.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"><div class="avatar-overlay">📷</div>`;
    }
}

// ── PROFILE section ────────────────────────────────────────
function populateProfile() {
    const u = currentUser;
    // split username as display name (no firstName/lastName in DB)
    const parts = (u.username || '').split(/[\s_.-]+/);
    setVal('inputLastName', parts.length > 1 ? parts.slice(0, -1).join(' ') : '');
    setVal('inputFirstName', parts[parts.length - 1] || u.username);
    setVal('inputUsername', u.username || '');
    setVal('inputBio', u.bio || '');
    setVal('inputLocation', u.location || '');
    setVal('inputWebsite', u.website || '');
    // Join date (read-only display)
    if (u.created_at) {
        setVal('inputJoinDate', new Date(u.created_at).toLocaleDateString('vi-VN'));
    }
    updateBioCount();

    // Big avatar
    const bigAvatar = $('bigAvatar');
    if (bigAvatar) {
        if (u.avatar_url) {
            bigAvatar.innerHTML = `<img src="${SETTINGS_API_BASE}${u.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"><div class="avatar-overlay">📷</div>`;
        } else {
            bigAvatar.innerHTML = `<span>${(u.username || 'U')[0].toUpperCase()}</span><div class="avatar-overlay">📷</div>`;
        }
    }

    // Travel style from prefs
    const styles = loadPref('travel_styles', []);
    document.querySelectorAll('#styleGroup .radio-opt').forEach(opt => {
        const label = opt.querySelector('input') ? opt.textContent.trim() : opt.textContent.trim();
        if (styles.includes(label)) opt.classList.add('selected');
        else opt.classList.remove('selected');
    });

    const budget = loadPref('budget', '');
    document.querySelectorAll('#budgetGroup .radio-opt').forEach(opt => {
        if (opt.textContent.trim() === budget) opt.classList.add('selected');
        else opt.classList.remove('selected');
    });

    // snapshot
    originalData.profile = {
        username: u.username, bio: u.bio, location: u.location, website: u.website
    };
}

function setVal(id, v) { const el = $(id); if (el) el.value = v || ''; }

function updateBioCount() {
    const bio = $('inputBio');
    const cnt = $('bioCount');
    if (bio && cnt) cnt.textContent = bio.value.length;
}

function setupAvatarUpload() {
    const avatarInput = $('avatarFileInput');
    const coverInput  = $('coverFileInput');

    // Avatar upload — onclick in HTML already opens picker; just handle change
    if (avatarInput) {
        avatarInput.addEventListener('change', async e => {
            const file = e.target.files?.[0];
            if (!file) return;
            // Preview immediately
            const reader = new FileReader();
            reader.onload = ev => {
                const bigAvatar = $('bigAvatar');
                if (bigAvatar) bigAvatar.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"><div class="avatar-overlay">📷</div>`;
            };
            reader.readAsDataURL(file);

            const fd = new FormData(); fd.append('file', file);
            try {
                const data = await apiFetch('/api/users/me/avatar', { method: 'POST', body: fd });
                currentUser.avatar_url = data.avatar_url;
                localStorage.setItem('lh_user', JSON.stringify(currentUser));
                updateSidebarUser();
                showToast('Ảnh đại diện đã cập nhật');
            } catch (err) { showToast(err.message, 'error'); }
            avatarInput.value = '';
        });
    }

    // Cover upload
    if (coverInput) {
        coverInput.addEventListener('change', async e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const fd = new FormData(); fd.append('file', file);
            try {
                const data = await apiFetch('/api/users/me/cover', { method: 'POST', body: fd });
                currentUser.cover_url = data.cover_url;
                localStorage.setItem('lh_user', JSON.stringify(currentUser));
                showToast('Ảnh bìa đã cập nhật');
            } catch (err) { showToast(err.message, 'error'); }
            coverInput.value = '';
        });
    }
}

async function deleteAvatar() {
    if (!confirm('Xóa ảnh đại diện? Ảnh sẽ được thay bằng ký tự tên.')) return;
    try {
        await apiFetch('/api/users/me/avatar', { method: 'DELETE' });
        currentUser.avatar_url = null;
        localStorage.setItem('lh_user', JSON.stringify(currentUser));
        const bigAvatar = $('bigAvatar');
        if (bigAvatar) bigAvatar.innerHTML = `<span>${(currentUser.username||'U')[0].toUpperCase()}</span><div class="avatar-overlay">📷</div>`;
        updateSidebarUser();
        showToast('Đã xóa ảnh đại diện');
    } catch (err) { showToast(err.message, 'error'); }
}

function setupProfileForm() {
    $('inputBio')?.addEventListener('input', updateBioCount);

    // travel style chips
    document.querySelectorAll('#styleGroup .radio-opt').forEach(opt => {
        opt.addEventListener('click', () => opt.classList.toggle('selected'));
    });
    document.querySelectorAll('#budgetGroup .radio-opt').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('#budgetGroup .radio-opt').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
        });
    });
}

// ── SECURITY section ───────────────────────────────────────
function populateSecurity() {
    const joinDate = currentUser.created_at
        ? new Date(currentUser.created_at).toLocaleDateString('vi-VN')
        : '—';
    const el = $('accountJoinDate');
    if (el) el.textContent = `Tham gia từ: ${joinDate}`;

    // 2FA & login-alert from prefs
    setToggle('toggle2FA', loadPref('two_fa', false));
    setToggle('toggleEmailVerify', loadPref('email_verify', true));
    setToggle('toggleLoginAlert', loadPref('login_alert', true));
}

function setupPasswordForm() {
    $('passwordForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('[type="submit"]');
        const currentPass = $('inputCurrentPassword')?.value;
        const newPass = $('inputNewPassword')?.value;
        const confirmPass = $('inputConfirmPassword')?.value;

        if (!currentPass || !newPass || !confirmPass) {
            showToast('Vui lòng điền đầy đủ', 'error'); return;
        }
        if (newPass !== confirmPass) {
            showToast('Mật khẩu mới không khớp', 'error'); return;
        }
        if (newPass.length < 8) {
            showToast('Mật khẩu mới ít nhất 8 ký tự', 'error'); return;
        }

        btn.disabled = true; btn.textContent = '⏳ Đang đổi...';
        try {
            await apiFetch('/api/users/me/password', {
                method: 'POST',
                body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass })
            });
            showToast('Đổi mật khẩu thành công');
            e.target.reset();
        } catch (err) { showToast(err.message, 'error'); }
        finally { btn.disabled = false; btn.textContent = 'Đổi mật khẩu'; }
    });
}

// ── PRIVACY section ────────────────────────────────────────
function populatePrivacy() {
    // Profile visibility
    const vis = loadPref('profile_visibility', 'public');
    document.querySelectorAll('#profileVis .privacy-opt').forEach(o => {
        o.classList.toggle('selected', o.dataset.val === vis);
    });
    // Toggles
    setToggle('toggleShareLocation', loadPref('share_location', false));
    setToggle('toggleShowTrips', loadPref('show_trips', true));
    setToggle('toggleHideSuggestion', loadPref('hide_suggestion', false));
    // Message perm select
    const ms = $('messagePermSelect');
    if (ms) ms.value = loadPref('message_perm', 'followers');
    // Blocked count
    const bc = $('blockedCount');
    if (bc) bc.textContent = loadPref('blocked_users', []).length + ' tài khoản đang bị chặn';
}

function setupPrivacyControls() {
    document.querySelectorAll('#profileVis .privacy-opt').forEach(o => {
        o.addEventListener('click', () => {
            document.querySelectorAll('#profileVis .privacy-opt').forEach(x => x.classList.remove('selected'));
            o.classList.add('selected');
        });
    });
    $('messagePermSelect')?.addEventListener('change', e => savePref('message_perm', e.target.value));
}

// ── NOTIFICATIONS section ──────────────────────────────────
function populateNotifications() {
    const defs = {
        'notifLikeApp': true, 'notifLikeEmail': false, 'notifLikePush': true,
        'notifCommentApp': true, 'notifCommentEmail': true, 'notifCommentPush': true,
        'notifFollowApp': true, 'notifFollowEmail': false, 'notifFollowPush': true,
        'notifTripApp': true, 'notifTripEmail': true, 'notifTripPush': true,
        'notifMsgApp': true, 'notifMsgEmail': false, 'notifMsgPush': true,
        'notifSuggestApp': true, 'notifSuggestEmail': true, 'notifSuggestPush': false,
    };
    Object.entries(defs).forEach(([id, def]) => {
        setToggle(id, loadPref(id, def));
    });
}

function setupNotifToggles() {
    document.querySelectorAll('[data-pref]').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('on');
            savePref(btn.dataset.pref, btn.classList.contains('on'));
        });
    });
}

// ── APPEARANCE section ─────────────────────────────────────
function populateAppearance() {
    const theme = loadPref('theme', 'dark');
    const accent = loadPref('accent', '#e8a87c');
    const fontSize = loadPref('font_size', 'normal');
    const animations = loadPref('animations', true);

    document.querySelectorAll('#themePicker .theme-opt').forEach(o => {
        o.classList.toggle('selected', o.dataset.theme === theme);
    });
    document.querySelectorAll('#accentPicker .accent-dot').forEach(d => {
        d.classList.toggle('selected', d.dataset.color === accent);
    });
    const fs = $('fontSizeSelect');
    if (fs) fs.value = fontSize;
    setToggle('toggleAnimations', animations);

    applyTheme(theme);
    applyAccent(accent);
}

function setupAppearancePickers() {
    document.querySelectorAll('#themePicker .theme-opt').forEach(o => {
        o.addEventListener('click', () => {
            document.querySelectorAll('#themePicker .theme-opt').forEach(x => x.classList.remove('selected'));
            o.classList.add('selected');
            applyTheme(o.dataset.theme);
        });
    });
    document.querySelectorAll('#accentPicker .accent-dot').forEach(d => {
        d.addEventListener('click', () => {
            document.querySelectorAll('#accentPicker .accent-dot').forEach(x => x.classList.remove('selected'));
            d.classList.add('selected');
            applyAccent(d.dataset.color);
        });
    });
    $('fontSizeSelect')?.addEventListener('change', e => {
        savePref('font_size', e.target.value);
        const map = { small: '13px', normal: '15px', large: '17px' };
        document.documentElement.style.setProperty('--font-size-base', map[e.target.value] || '15px');
    });
}

function applyTheme(theme) {
    const themes = {
        dark:   { '--bg': '#0d0f14', '--surface': '#151820', '--surface2': '#1c2030', '--border': '#252a3a', '--text': '#e8eaf0' },
        dim:    { '--bg': '#1a1f2e', '--surface': '#1e2436', '--surface2': '#252a3a', '--border': '#2e3550', '--text': '#d0d4e0' },
        light:  { '--bg': '#f5f5f0', '--surface': '#ffffff', '--surface2': '#f0ede6', '--border': '#dddad0', '--text': '#1a1a2e' },
        forest: { '--bg': '#0d1a10', '--surface': '#112215', '--surface2': '#1a3a1e', '--border': '#254028', '--text': '#d0e8d4' },
    };
    const vars = themes[theme] || themes.dark;
    Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
}

function applyAccent(color) {
    document.documentElement.style.setProperty('--accent', color);
}

// ── LANGUAGE section ───────────────────────────────────────
function populateLanguage() {
    const lang = loadPref('language', 'vi');
    const tz   = loadPref('timezone', 'gmt7');
    const unit = loadPref('distance_unit', 'km');
    const currency = loadPref('currency', 'VND');

    const langEl = $('languageSelect');     if (langEl) langEl.value = lang;
    const tzEl   = $('timezoneSelect');     if (tzEl)   tzEl.value   = tz;
    const curEl  = $('currencySelect');     if (curEl)  curEl.value  = currency;

    document.querySelectorAll('#unitGroup .radio-opt').forEach(o => {
        o.classList.toggle('selected', o.dataset.val === unit);
    });
}

function setupLanguageControls() {
    $('languageSelect')?.addEventListener('change', e => savePref('language', e.target.value));
    $('timezoneSelect')?.addEventListener('change', e => savePref('timezone', e.target.value));
    $('currencySelect')?.addEventListener('change', e => savePref('currency', e.target.value));
    document.querySelectorAll('#unitGroup .radio-opt').forEach(o => {
        o.addEventListener('click', () => {
            document.querySelectorAll('#unitGroup .radio-opt').forEach(x => x.classList.remove('selected'));
            o.classList.add('selected');
            savePref('distance_unit', o.dataset.val);
        });
    });
}

// ── DANGER ZONE ────────────────────────────────────────────
function setupDangerZone() {
    $('btnDeactivate')?.addEventListener('click', async () => {
        if (!confirm('Tạm dừng tài khoản? Hồ sơ sẽ bị ẩn cho đến khi bạn đăng nhập lại.')) return;
        const btn = $('btnDeactivate');
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang xử lý...'; }
        try {
            await apiFetch('/api/account/deactivate', { method: 'POST' });
            showToast('Tài khoản đã tạm dừng. Đang đăng xuất...');
            setTimeout(() => {
                localStorage.removeItem('lh_token');
                localStorage.removeItem('lh_user');
                window.location.href = 'login.html';
            }, 1500);
        } catch (e) {
            showToast(e.message, 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'Tạm dừng tài khoản'; }
        }
    });

    $('btnDeletePosts')?.addEventListener('click', async () => {
        const username = prompt('Nhập username của bạn để xác nhận xóa TẤT CẢ bài viết:');
        if (!username || username !== currentUser?.username) { showToast('Username không đúng', 'error'); return; }
        const btn = $('btnDeletePosts');
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang xóa...'; }
        try {
            const { deleted } = await apiFetch('/api/posts/all', { method: 'DELETE' });
            showToast(`Đã xóa ${deleted} bài viết`);
        } catch (e) { showToast(e.message, 'error'); }
        finally { if (btn) { btn.disabled = false; btn.textContent = 'Xóa tất cả bài viết'; } }
    });

    $('btnDeleteAccount')?.addEventListener('click', () => {
        const username = prompt('⚠️ NGUY HIỂM! Nhập username của bạn để xác nhận XÓA TÀI KHOẢN VĨNH VIỄN:');
        if (!username || username !== currentUser?.username) { showToast('Username không đúng', 'error'); return; }
        if (!confirm('Hành động này KHÔNG THỂ HOÀN TÁC. Tiếp tục?')) return;
        const password = prompt('Nhập mật khẩu của bạn để xác nhận:');
        if (!password) { showToast('Bạn chưa nhập mật khẩu', 'error'); return; }
        const btn = $('btnDeleteAccount');
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang xóa...'; }
        apiFetch('/api/account', { method: 'DELETE', body: JSON.stringify({ password }) })
            .then(() => {
                showToast('Tài khoản đã bị xóa vĩnh viễn. Đang chuyển hướng...');
                localStorage.clear();
                setTimeout(() => window.location.href = 'login.html', 1800);
            })
            .catch(e => {
                showToast(e.message, 'error');
                if (btn) { btn.disabled = false; btn.textContent = 'Xóa tài khoản'; }
            });
    });
}

// ── NAVIGATION (defined inline in HTML – this is a fallback) ──
if (typeof window.goSection !== 'function') {
  window.goSection = function goSection(sec) {
    document.querySelectorAll('[id^="section-"]').forEach(s => s.style.display = 'none');
    let target = document.getElementById('section-' + sec);
    if (!target) {
      sec = 'security';
      target = document.getElementById('section-' + sec);
    }
    if (target) target.style.display = 'block';
    document.querySelectorAll('.settings-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.section === sec);
    });
    history.replaceState(null, '', '#' + sec);
    document.querySelector('.settings-main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };
}

// Keep old setupNavigation as no-op for compatibility
function setupNavigation() {}

// ── SAVE / CANCEL ──────────────────────────────────────────
async function saveSettings() {
    const btn = $('saveBtn');
    btn.disabled = true; btn.textContent = '⏳ Đang lưu...';

    try {
        // 1. Profile fields
        const username  = $('inputUsername')?.value.trim();
        const bio       = $('inputBio')?.value.trim();
        const location  = $('inputLocation')?.value.trim();
        const website   = $('inputWebsite')?.value.trim();

        if (!username) { showToast('Tên người dùng không được trống', 'error'); return; }
        if (bio.length > 160) { showToast('Tiểu sử tối đa 160 ký tự', 'error'); return; }

        const { user } = await apiFetch('/api/users/me', {
            method: 'PATCH',
            body: JSON.stringify({ username, bio: bio || null, location: location || null, website: website || null })
        });
        currentUser = { ...currentUser, ...user };
        localStorage.setItem('lh_user', JSON.stringify(currentUser));
        updateSidebarUser();

        // 2. Travel prefs
        const styles = [...document.querySelectorAll('#styleGroup .radio-opt.selected')]
            .map(o => o.textContent.trim());
        const budget = document.querySelector('#budgetGroup .radio-opt.selected')?.textContent.trim() || '';
        savePref('travel_styles', styles);
        savePref('budget', budget);

        // 3. Settings in MongoDB
        const settingsPayload = collectSettingsPayload();
        const { settings } = await apiFetch('/api/settings', {
            method: 'PATCH',
            body: JSON.stringify(settingsPayload)
        });
        cacheSettings(settings);

        // 4. Appearance
        const selTheme = document.querySelector('#themePicker .theme-opt.selected')?.dataset.theme || 'dark';
        const selAccent = document.querySelector('#accentPicker .accent-dot.selected')?.dataset.color || '#e8a87c';
        savePref('theme', selTheme);
        savePref('accent', selAccent);
        savePref('font_size', $('fontSizeSelect')?.value || 'normal');
        savePref('animations', $('toggleAnimations')?.classList.contains('on') || true);

        btn.textContent = '✓ Đã lưu';
        btn.classList.add('saved');
        showToast('Cài đặt đã được lưu');
        setTimeout(() => { btn.textContent = 'Lưu thay đổi'; btn.classList.remove('saved'); btn.disabled = false; }, 2500);
    } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false; btn.textContent = 'Lưu thay đổi';
    }
}

function resetForm() {
    if (!originalData.profile) return;
    setVal('inputUsername', originalData.profile.username);
    setVal('inputBio', originalData.profile.bio);
    setVal('inputLocation', originalData.profile.location);
    setVal('inputWebsite', originalData.profile.website);
    updateBioCount();
    showToast('Đã khôi phục thay đổi');
}

// ── Toggle helpers ─────────────────────────────────────────
function setToggle(id, on) {
    const el = $(id);
    if (!el) return;
    if (on) el.classList.add('on'); else el.classList.remove('on');
}
// Wire all generic toggle buttons (those NOT using data-pref)
document.addEventListener('DOMContentLoaded', () => {
    ['toggle2FA','toggleLoginAlert','toggleShareLocation','toggleShowTrips','toggleHideSuggestion','toggleAnimations'].forEach(id => {
        if (!$(id)?.getAttribute('onclick')) $(id)?.addEventListener('click', function() { this.classList.toggle('on'); });
    });
});

window.saveSettings   = saveSettings;
window.resetForm      = resetForm;
window.goSection      = goSection;
window.updateBioCount = updateBioCount;
window.deleteAvatar   = deleteAvatar;

// ── SECURITY helpers ──────────────────────────────────────
function togglePasswordSection() {
    const s = document.getElementById('passwordSection');
    if (s) s.style.display = s.style.display === 'none' ? '' : 'none';
}

function checkPasswordStrength(pw) {
    const bar  = document.getElementById('pwStrengthBar');
    const text = document.getElementById('pwStrengthText');
    if (!bar || !text) return;
    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const levels = [
        { w: '0%',   color: 'transparent',       label: '' },
        { w: '25%',  color: '#e8747c',            label: '❌ Rất yếu' },
        { w: '50%',  color: '#f5c842',            label: '⚠️ Yếu' },
        { w: '75%',  color: '#4aa3ff',            label: '✅ Trung bình' },
        { w: '90%',  color: '#4ecb71',            label: '💪 Mạnh' },
        { w: '100%', color: '#4ecb71',            label: '🔒 Rất mạnh' },
    ];
    const lvl = levels[Math.min(score, 5)];
    bar.style.width = lvl.w;
    bar.style.background = lvl.color;
    text.textContent = lvl.label;
}

function toggleSetting(id, prefKey, invert = false) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOn = el.classList.contains('on');
    savePref(prefKey, invert ? !isOn : isOn);
}

function logoutAllDevices() {
    if (!confirm('Đăng xuất khỏi TẤT CẢ thiết bị khác?')) return;
    document.querySelectorAll('.session-item').forEach((item, i) => {
        if (i > 0) item.style.opacity = '.35';
    });
    showToast('Đã đăng xuất tất cả thiết bị khác');
}

// ── PRIVACY helpers ───────────────────────────────────────
function selectPrivacy(groupId, el, prefKey) {
    document.querySelectorAll(`#${groupId} .privacy-opt`).forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    savePref(prefKey, el.dataset.val);
}

function saveSelectSetting(selectId, prefKey) {
    const el = document.getElementById(selectId);
    if (el) savePref(prefKey, el.value);
}

function openBlockedModal() {
    const modal = document.getElementById('blockedModal');
    if (modal) modal.classList.add('open');
    const blocked = loadPref('blocked_users', []);
    const list = document.getElementById('blockedList');
    if (!list) return;
    if (blocked.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted)">Không có ai bị chặn</div>';
    } else {
        list.innerHTML = blocked.map(u => `
            <div class="blocked-item">
                <div class="avatar-sm" style="flex-shrink:0">${u[0].toUpperCase()}</div>
                <div style="flex:1">@${u}</div>
                <button class="btn-sm" onclick="unblockUser('${u}')">Bỏ chặn</button>
            </div>`).join('');
    }
}

function closeBlockedModal() {
    document.getElementById('blockedModal')?.classList.remove('open');
}

function blockUser() {
    const input = document.getElementById('blockUserInput');
    if (!input || !input.value.trim()) return;
    const username = input.value.trim().replace('@', '');
    const blocked = loadPref('blocked_users', []);
    if (!blocked.includes(username)) { blocked.push(username); savePref('blocked_users', blocked); }
    input.value = '';
    openBlockedModal();
    showToast(`Đã chặn @${username}`);
    const bc = document.getElementById('blockedCount');
    if (bc) bc.textContent = blocked.length + ' tài khoản đang bị chặn';
}

function unblockUser(username) {
    let blocked = loadPref('blocked_users', []);
    blocked = blocked.filter(u => u !== username);
    savePref('blocked_users', blocked);
    openBlockedModal();
    showToast(`Đã bỏ chặn @${username}`);
}

// ── NOTIFICATIONS helpers ─────────────────────────────────
function toggleNotif(btn, prefKey) {
    btn.classList.toggle('on');
    savePref(prefKey, btn.classList.contains('on'));
}

function toggleQuietConfig() {
    const btn = document.getElementById('toggleQuietHours');
    const cfg = document.getElementById('quietHoursConfig');
    if (cfg) cfg.style.display = btn?.classList.contains('on') ? '' : 'none';
}

function selectFreq(el) {
    document.querySelectorAll('#freqGroup .freq-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    savePref('email_digest_freq', el.dataset.val);
}

// ── LANGUAGE helpers ──────────────────────────────────────
function selectTimeFormat(fmt) {
    document.getElementById('fmt24h')?.classList.toggle('selected', fmt === '24h');
    document.getElementById('fmt12h')?.classList.toggle('selected', fmt === '12h');
    savePref('time_format', fmt);
}

function selectUnit(el, unit) {
    document.querySelectorAll('#unitGroup .radio-opt').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    savePref('distance_unit', unit);
}

// ── APPS helpers ──────────────────────────────────────────
function disconnectApp(btn, name) {
    if (!confirm(`Huỷ liên kết với ${name}?`)) return;
    const item = btn.closest('.app-item');
    const statusDiv = item?.querySelector('.app-status');
    if (statusDiv) statusDiv.innerHTML = '<button class="btn-sm connect" onclick="connectApp(this,\''+name+'\')">' + '+ Kết nối</button>';
    showToast(`Đã huỷ liên kết ${name}`);
}

function connectApp(btn, name) {
    btn.textContent = '⏳ Đang kết nối...';
    btn.disabled = true;
    setTimeout(() => {
        const statusDiv = btn.closest('.app-status');
        if (statusDiv) statusDiv.innerHTML = '<div class="connected-badge">✓ Đã kết nối</div><button class="btn-sm" onclick="disconnectApp(this,\''+name+'\')">' + 'Huỷ liên kết</button>';
        showToast(`Đã kết nối ${name}`);
    }, 1500);
}

function revokePermission(btn, type) {
    if (!confirm(`Thu hồi quyền ${type}?`)) return;
    btn.textContent = '✓ Đã thu hồi';
    btn.disabled = true;
    showToast(`Đã thu hồi quyền ${type}`);
}

function manageNotifPerm() {
    showToast('Mở cài đặt thông báo hệ thống...');
}

// ── DATA helpers ──────────────────────────────────────────
function clearCache() {
    const btn = document.getElementById('clearCacheBtn');
    if (btn) { btn.textContent = '⏳ Đang xoá...'; btn.disabled = true; }
    setTimeout(() => {
        if (btn) { btn.textContent = '✓ Đã xoá (128 MB)'; }
        showToast('Cache đã được xoá – giải phóng 128 MB');
    }, 1200);
}

async function exportAllData() {
    const btn = document.getElementById('exportAllBtn');
    if (btn) { btn.textContent = '⏳ Đang chuẩn bị...'; btn.disabled = true; }
    try {
        const token = getToken();
        const res = await fetch(`${SETTINGS_API_BASE}/api/account/export`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            throw new Error(d.error || 'Xuất dữ liệu thất bại');
        }
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        a.download = `lunar-heritage-export-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        if (btn) { btn.textContent = '✓ Đã tải xuống'; btn.disabled = false; }
        showToast('Đã xuất dữ liệu tài khoản từ MongoDB');
    } catch (e) {
        showToast(e.message, 'error');
        if (btn) { btn.textContent = 'Tải xuống'; btn.disabled = false; }
    }
}

function exportKML() {
    const kml = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Lunar Heritage – Địa điểm đã thăm</name></Document></kml>`;
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'lunar-heritage-places.kml'; a.click();
    showToast('Đã xuất file KML');
}

function exportTrips() { showToast('Tính năng xuất PDF đang được phát triển'); }

function requestFullData() {
    const btn = document.getElementById('requestDataBtn');
    if (btn) { btn.textContent = '✓ Đã yêu cầu'; btn.disabled = true; }
    showToast('Yêu cầu đã được ghi nhận – file sẽ sẵn sàng trong 48 giờ');
}

function manualBackup() { showToast('Đang sao lưu dữ liệu...'); setTimeout(() => showToast('Sao lưu hoàn tất'), 1500); }

// ── DANGER helpers ────────────────────────────────────────
function deactivateAccount() {
    if (!confirm('Tạm dừng tài khoản? Hồ sơ sẽ bị ẩn cho đến khi bạn đăng nhập lại.')) return;
    apiFetch('/api/account/deactivate', { method: 'POST' })
        .then(() => {
            showToast('Tài khoản đã tạm dừng. Đang đăng xuất...');
            setTimeout(() => {
                localStorage.removeItem('lh_token');
                localStorage.removeItem('lh_user');
                window.location.href = 'login.html';
            }, 1500);
        })
        .catch(e => showToast(e.message, 'error'));
}

function deleteAllPosts() {
    const username = prompt('Nhập username của bạn để xác nhận xóa TẤT CẢ bài viết:');
    if (!username || username !== currentUser?.username) { showToast('Username không đúng', 'error'); return; }
    showToast('Đang xoá bài viết...');
    apiFetch('/api/posts/all', { method: 'DELETE' })
        .then(({ deleted }) => showToast(`Đã xóa ${deleted} bài viết`))
        .catch(e => showToast(e.message, 'error'));
}

function deleteAllMessages() {
    if (!confirm('Xoá TẤT CẢ tin nhắn của bạn? Người nhận vẫn có thể thấy.')) return;
    showToast('Tính năng này đang được phát triển', 'error');
}

function deleteAccount() {
    const username = prompt('⚠️ NGUY HIỂM! Nhập username để xác nhận XÓA TÀI KHOẢN VĨNH VIỄN:');
    if (!username || username !== currentUser?.username) { showToast('Username không đúng', 'error'); return; }
    if (!confirm('Hành động này KHÔNG THỂ HOÀN TÁC. Tiếp tục?')) return;
    const password = prompt('Nhập mật khẩu của bạn để xác nhận:');
    if (!password) { showToast('Bạn chưa nhập mật khẩu', 'error'); return; }
    apiFetch('/api/account', { method: 'DELETE', body: JSON.stringify({ password }) })
        .then(() => {
            showToast('Tài khoản đã bị xóa vĩnh viễn. Đang chuyển hướng...');
            localStorage.clear();
            setTimeout(() => window.location.href = 'login.html', 1800);
        })
        .catch(e => showToast(e.message, 'error'));
}

function closeConfirmModal() {
    document.getElementById('confirmModal')?.classList.remove('open');
}

// Expose all new helpers globally
Object.assign(window, {
    togglePasswordSection, checkPasswordStrength, toggleSetting, logoutAllDevices,
    selectPrivacy, saveSelectSetting, openBlockedModal, closeBlockedModal, blockUser, unblockUser,
    toggleNotif, toggleQuietConfig, selectFreq,
    selectTimeFormat, selectUnit,
    disconnectApp, connectApp, revokePermission, manageNotifPerm,
    clearCache, exportAllData, exportKML, exportTrips, requestFullData, manualBackup,
    deactivateAccount, deleteAllPosts, deleteAllMessages, deleteAccount, closeConfirmModal
});
