/**
 * profile.js – LUNAR HERITAGE Profile Page v3
 * ─────────────────────────────────────────────────────────────
 * Architecture: "One UI Shell + Data Hydration"
 *
 *   profile.html  = Static shell with skeleton placeholders
 *   AppState      = Single source of truth (no scattered globals)
 *   loadProfile() = Fetch → validate → render pipeline
 *   render*()     = Pure functions: data in, DOM update out
 *
 * Fixes in this version vs v2:
 *   1. Type-safe isOwnProfile: String(id) === String(id)
 *   2. Single Promise.all for followers/following (was fetched twice)
 *   3. Nav avatar always initialized on load
 *   4. Skeleton placeholders hidden after data arrives
 *   5. All image URL construction via LunarAPI.apiBase()
 *   6. deleteImage() uses LunarAPI.deleteAvatar/deleteCover (no raw fetch)
 *   7. uploadCover uses LunarAPI.uploadCoverPhoto (consistent with uploadAvatar)
 *   8. All state synced via LunarAPI.setUser() (no direct Auth calls)
 *   9. Graceful error boundary: profile error state shown on failure
 *  10. p.username used for post initials (was p.author – wrong field)
 */

// ── AppState ────────────────────────────────────────────────
// Single source of truth. All functions read from / write to this.
const AppState = {
    currentUser:  null,   // logged-in user (from localStorage)
    viewedUser:   null,   // the user whose profile is being shown
    viewedUserId: null,   // string ID from URL param
    isOwnProfile: false,  // true when viewing your own profile
};

// ── Bootstrap ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Require login always. To allow public profiles, remove this guard.
    if (!LunarAPI.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    AppState.currentUser = LunarAPI.currentUser();

    // Determine whose profile to show
    const params = new URLSearchParams(window.location.search);
    const rawId  = params.get('user') || String(AppState.currentUser.id);

    // FIX #1: type-safe comparison — both sides cast to String
    AppState.viewedUserId = rawId;
    AppState.isOwnProfile = String(rawId) === String(AppState.currentUser.id);

    // Always update sidebar avatar with logged-in user's image
    initNavAvatar(AppState.currentUser);

    // Run profile load and post load in parallel for speed
    await loadProfile();
    loadUserPosts();
    setupEventListeners();
});

// ── Nav Avatar ───────────────────────────────────────────────
/**
 * Initializes the sidebar avatar (`#navAvatar`) with the
 * *logged-in* user's picture — always the logged-in user,
 * regardless of whose profile is being viewed.
 */
function initNavAvatar(user) {
    const el = document.getElementById('navAvatar');
    if (!el || !user) return;
    if (user.avatar_url) {
        el.innerHTML = `<img src="${imgUrl(user.avatar_url)}" alt="${esc(user.username)}"
                            style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else {
        el.textContent = (user.username || 'U')[0].toUpperCase();
    }
}

// ── Profile Loading ──────────────────────────────────────────
async function loadProfile() {
    try {
        // FIX #2: fetch user + followers + following in parallel (was 2 serial calls)
        const [user, followersRes, followingRes] = await Promise.all([
            LunarAPI.getUser(AppState.viewedUserId),
            LunarAPI.getFollowers(AppState.viewedUserId).catch(() => ({ followers: [] })),
            LunarAPI.getFollowing(AppState.viewedUserId).catch(() => ({ following: [] })),
        ]);

        if (!user) {
            // Own profile with no server record → clear session
            if (AppState.isOwnProfile) { LunarAPI.logout(); return; }
            showProfileError('Không tìm thấy người dùng này.');
            return;
        }

        AppState.viewedUser = user;

        // Render everything
        renderProfile(user);
        renderStats(
            followersRes.followers?.length ?? 0,
            followingRes.following?.length  ?? 0
        );

        // Determine follow status from the fetched followers list
        if (!AppState.isOwnProfile) {
            const isFollowing = (followersRes.followers || []).some(
                f => String(f.id) === String(AppState.currentUser.id)
            );
            renderFollowButton(isFollowing);
        }

    } catch (e) {
        console.error('loadProfile error:', e);
        showProfileError('Không thể tải hồ sơ. Vui lòng thử lại.');
    }
}

// ── Render Functions ─────────────────────────────────────────
/**
 * renderProfile – pure function: takes user data, updates DOM.
 * Hides skeleton placeholders and reveals real content.
 */
function renderProfile(user) {
    // Hide skeletons, reveal real elements
    const nameSkel   = document.getElementById('profileNameSkel');
    const handleSkel = document.getElementById('profileHandleSkel');
    const nameEl     = document.getElementById('profileName');
    const handleEl   = document.getElementById('profileUsername');
    if (nameSkel)   nameSkel.style.display   = 'none';
    if (handleSkel) handleSkel.style.display = 'none';
    if (nameEl)     { nameEl.textContent   = user.username || 'Người dùng'; nameEl.style.display = ''; }
    if (handleEl)   { handleEl.textContent = '@' + (user.username || '').toLowerCase(); handleEl.style.display = ''; }

    // Bio / location / website
    setEl('profileBio', user.bio || 'Chưa có tiểu sử');
    setEl('profileLocation', user.location ? '📍 ' + user.location : '');
    const websiteEl = document.getElementById('profileWebsite');
    if (websiteEl) {
        if (user.website) {
            websiteEl.textContent = user.website;
            websiteEl.href = user.website;
        } else {
            websiteEl.textContent = '';
        }
    }

    // Update page title dynamically
    document.title = `${user.username || 'Hồ sơ'} – LUNAR HERITAGE`;

    // Cover image
    if (user.cover_url) {
        const coverEl = document.getElementById('profileCover');
        if (coverEl) {
            coverEl.style.backgroundImage    = `url(${imgUrl(user.cover_url)})`;
            coverEl.style.backgroundSize     = 'cover';
            coverEl.style.backgroundPosition = 'center';
        }
    }

    // Avatar
    const avatarEl = document.getElementById('profileAvatar');
    if (avatarEl) {
        if (user.avatar_url) {
            avatarEl.innerHTML = `<img src="${imgUrl(user.avatar_url)}" alt="${esc(user.username)}"
                                      style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        } else {
            avatarEl.textContent = (user.username || 'U')[0].toUpperCase();
        }
    }

    // Show correct action buttons
    const ownActions   = document.getElementById('ownActions');
    const otherActions = document.getElementById('otherActions');
    if (ownActions)   ownActions.style.display   = AppState.isOwnProfile ? 'flex' : 'none';
    if (otherActions) otherActions.style.display = AppState.isOwnProfile ? 'none' : 'flex';
}

/** Renders follow/follower/following counts, replacing skeleton spans. */
function renderStats(followersCount, followingCount) {
    setEl('followersCount', followersCount);
    setEl('followingCount', followingCount);
    // postsCount is set by loadUserPosts()
}

/** Sets the follow button state without re-fetching. */
function renderFollowButton(isFollowing) {
    const btn = document.getElementById('followBtn');
    if (!btn) return;
    btn.dataset.following = isFollowing;
    btn.textContent  = isFollowing ? '✓ Đang theo dõi' : '+ Theo dõi';
    btn.className    = isFollowing ? 'btn btn-secondary' : 'btn btn-primary';
}

/** Shows a full-page error state in the profile area. */
function showProfileError(message) {
    // Hide skeletons
    ['profileNameSkel', 'profileHandleSkel'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const nameEl = document.getElementById('profileName');
    if (nameEl) {
        nameEl.style.display = '';
        nameEl.textContent   = '⚠️ Lỗi';
    }
    const container = document.getElementById('postsGrid');
    if (container) {
        container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><h3>${esc(message)}</h3></div>`;
    }
    showToast(message, 'error');
}

// ── User Posts ───────────────────────────────────────────────
async function loadUserPosts() {
    const container = document.getElementById('postsGrid');
    if (!container) return;

    // Show skeleton rows while fetching
    container.innerHTML = Array(3).fill(
        '<div class="skeleton" style="height:80px;margin-bottom:12px;border-radius:12px"></div>'
    ).join('');

    try {
        const { posts } = await LunarAPI.getUserPosts(AppState.viewedUserId);

        // Update post count stat (replacing inner skeleton span)
        setEl('postsCount', posts.length);

        if (!posts.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📷</div>
                    <h3>Chưa có bài viết</h3>
                    <p>${AppState.isOwnProfile ? 'Hãy chia sẻ chuyến đi đầu tiên!' : 'Người dùng này chưa đăng bài.'}</p>
                </div>`;
            return;
        }

        container.innerHTML = posts.map(p => renderPostCard(p)).join('');

    } catch (e) {
        container.innerHTML = `<div class="empty-state"><p>Không thể tải bài viết</p></div>`;
    }
}

/**
 * Renders a single post card.
 * FIX #10: uses p.username (not p.author) for initials — matches API response shape.
 */
function renderPostCard(p) {
    const avatarHtml = p.avatar_url
        ? `<img src="${imgUrl(p.avatar_url)}" alt="${esc(p.username || '')}">`
        : esc((p.username || 'U')[0].toUpperCase());

    return `
    <article class="post-card" style="margin-bottom:16px;animation:fadeInUp .3s ease">
        <div class="post-header">
            <div class="post-avatar avatar avatar-sm">${avatarHtml}</div>
            <div class="post-author-info">
                <div class="post-author-name">${esc(p.username || 'Người dùng')}</div>
                <div class="post-meta">
                    ${formatTime(p.created_at)}
                    ${p.location ? ` · <span style="color:var(--accent2)">📍 ${esc(p.location)}</span>` : ''}
                </div>
            </div>
            ${AppState.isOwnProfile
                ? `<button class="btn btn-ghost btn-sm" onclick="deletePost('${p.id}')">🗑️</button>`
                : ''}
        </div>
        <div class="post-body"><p class="post-text">${esc(p.content)}</p></div>
        ${p.image_url ? `<img class="post-image" src="${imgUrl(p.image_url)}" alt="" loading="lazy">` : ''}
        <div class="like-count">${p.likes_count ?? 0} lượt thích</div>
    </article>`;
}

async function deletePost(id) {
    if (!confirm('Xóa bài viết này?')) return;
    try {
        await LunarAPI.deletePost(id);
        showToast('Đã xóa bài viết');
        loadUserPosts();
    } catch (e) { showToast(e.message, 'error'); }
}

// ── Event Listeners ──────────────────────────────────────────
function setupEventListeners() {
    // Edit profile form
    document.getElementById('editProfileForm')?.addEventListener('submit', handleEditSubmit);

    // Bio char counter
    document.getElementById('editBio')?.addEventListener('input', function () {
        const counter = document.getElementById('bioCount');
        if (counter) counter.textContent = this.value.length;
    });

    // Edit profile button (own profile only)
    document.getElementById('editProfileBtn')?.addEventListener('click', openEditModal);

    // Follow button
    document.getElementById('followBtn')?.addEventListener('click', handleFollowAction);

    // Message button
    document.getElementById('msgBtn')?.addEventListener('click', () => {
        window.location.href = `messages.html?user=${AppState.viewedUserId}`;
    });

    // Close edit modal on overlay click
    document.getElementById('editModal')?.addEventListener('click', e => {
        if (e.target.id === 'editModal') closeEditModal();
    });

    // Close image viewer on overlay click
    document.getElementById('imageViewerModal')?.addEventListener('click', e => {
        if (e.target.id === 'imageViewerModal') e.currentTarget.style.display = 'none';
    });

    // Image upload / cover — own profile only
    if (AppState.isOwnProfile) {
        _setupOwnerInteractions();
    } else {
        _setupViewerInteractions();
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', e => {
        if (!e.target.closest('#avatarWrap'))   _hideMenu('avatarMenu');
        if (!e.target.closest('#profileCover')) _hideMenu('coverMenu');
    });
}

function _setupOwnerInteractions() {
    const avatarWrap    = document.getElementById('avatarWrap');
    const avatarOverlay = document.getElementById('avatarOverlay');
    const avatarInput   = document.getElementById('avatarInput');

    if (avatarWrap) {
        avatarWrap.addEventListener('mouseenter', () => { if (avatarOverlay) { avatarOverlay.style.opacity = '1'; avatarOverlay.style.background = 'rgba(0,0,0,0.5)'; } });
        avatarWrap.addEventListener('mouseleave', () => { if (avatarOverlay) { avatarOverlay.style.opacity = '0'; avatarOverlay.style.background = 'rgba(0,0,0,0)'; } });
    }

    document.getElementById('updateAvatarBtn')?.addEventListener('click', () => {
        _hideMenu('avatarMenu');
        avatarInput?.click();
    });
    avatarInput?.addEventListener('change', e => uploadAvatar(e));

    const coverEl      = document.getElementById('profileCover');
    const coverOverlay = document.getElementById('coverOverlay');
    const coverInput   = document.getElementById('coverInput');

    if (coverEl) {
        coverEl.addEventListener('mouseenter', () => { if (coverOverlay) { coverOverlay.style.opacity = '1'; coverOverlay.style.background = 'rgba(0,0,0,0.3)'; } });
        coverEl.addEventListener('mouseleave', () => { if (coverOverlay) { coverOverlay.style.opacity = '0'; coverOverlay.style.background = 'rgba(0,0,0,0)'; } });
    }

    document.getElementById('updateCoverBtn')?.addEventListener('click', () => {
        _hideMenu('coverMenu');
        coverInput?.click();
    });
    coverInput?.addEventListener('change', e => uploadCover(e));
}

function _setupViewerInteractions() {
    // Remove edit UI elements when viewing someone else's profile
    ['avatarOverlay', 'avatarMenu', 'coverOverlay', 'coverMenu'].forEach(id => {
        document.getElementById(id)?.remove();
    });
    const avatarWrap = document.getElementById('avatarWrap');
    if (avatarWrap) { avatarWrap.style.cursor = 'pointer'; avatarWrap.onclick = () => viewImage('avatar'); }
    const coverEl = document.getElementById('profileCover');
    if (coverEl) { coverEl.style.cursor = 'pointer'; coverEl.onclick = () => viewImage('cover'); }
}

function _hideMenu(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'none';
}

// ── Image Actions (exposed to HTML onclick attributes) ────────
window.toggleMenu = function (menuId, event) {
    if (event) event.stopPropagation();
    document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m.id !== menuId) m.style.display = 'none';
    });
    const menu = document.getElementById(menuId);
    if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
};

window.viewImage = function (type) {
    _hideMenu(type + 'Menu');
    // Always use viewedUser (covers both own and other profiles)
    const user = AppState.viewedUser || AppState.currentUser;
    const url  = type === 'avatar' ? user?.avatar_url : user?.cover_url;
    if (!url) { showToast('Chưa có ảnh để xem', 'error'); return; }

    const viewer = document.getElementById('imageViewerModal');
    const img    = document.getElementById('viewerImage');
    if (viewer && img) {
        img.src = imgUrl(url);
        viewer.style.display = 'flex';
    }
};

/**
 * deleteImage – FIX #8: routes through LunarAPI methods instead of raw fetch.
 * Keeps the API base URL, timeout handling, and auth header all centralised.
 */
window.deleteImage = async function (type) {
    _hideMenu(type + 'Menu');
    const label = type === 'avatar' ? 'đại diện' : 'bìa';
    if (!confirm(`Bạn có chắc muốn xóa ảnh ${label}?`)) return;

    try {
        if (type === 'avatar') {
            await LunarAPI.deleteAvatar();
            const avatarEl = document.getElementById('profileAvatar');
            if (avatarEl) { avatarEl.innerHTML = ''; avatarEl.textContent = (AppState.currentUser.username || 'U')[0].toUpperCase(); }
            initNavAvatar({ ...AppState.currentUser, avatar_url: null });
            // FIX #8: sync state consistently
            AppState.currentUser = { ...AppState.currentUser, avatar_url: null };
            LunarAPI.setUser(AppState.currentUser);
        } else {
            await LunarAPI.deleteCover();
            const coverEl = document.getElementById('profileCover');
            if (coverEl) coverEl.style.backgroundImage = 'linear-gradient(135deg,#1a2a4a 0%,#0f1a2e 50%,#1a2a1a 100%)';
            AppState.currentUser = { ...AppState.currentUser, cover_url: null };
            LunarAPI.setUser(AppState.currentUser);
        }
        showToast('Đã xóa ảnh thành công');
    } catch (e) {
        showToast(e.message || 'Xóa ảnh thất bại', 'error');
    }
};

// ── Edit Profile Modal ───────────────────────────────────────
function openEditModal() {
    const user = LunarAPI.currentUser();
    setValue('editUsername', user.username || '');
    setValue('editBio',      user.bio      || '');
    setValue('editLocation', user.location || '');
    setValue('editWebsite',  user.website  || '');
    const counter = document.getElementById('bioCount');
    if (counter) counter.textContent = (user.bio || '').length;
    openModal('editModal');
}

function closeEditModal() { closeModal('editModal'); }

async function handleEditSubmit(e) {
    e.preventDefault();
    const btn     = e.target.querySelector('[type="submit"]');
    const payload = {
        username: getValue('editUsername'),
        bio:      getValue('editBio'),
        location: getValue('editLocation'),
        website:  getValue('editWebsite'),
    };
    if (!payload.username) { showToast('Tên không được trống', 'error'); return; }
    if ((payload.bio || '').length > 160) { showToast('Tiểu sử tối đa 160 ký tự', 'error'); return; }

    setLoading(btn, true);
    try {
        const { user } = await LunarAPI.updateMe(payload);
        // FIX #3 (plan item C): use LunarAPI.setUser consistently
        LunarAPI.setUser(user);
        AppState.currentUser = user;
        // Also update viewedUser since we're on our own profile
        if (AppState.isOwnProfile) AppState.viewedUser = user;
        renderProfile(user);
        closeEditModal();
        showToast('Hồ sơ đã được cập nhật ✓');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        setLoading(btn, false);
    }
}

// ── Follow ───────────────────────────────────────────────────
async function handleFollowAction() {
    const btn = document.getElementById('followBtn');
    if (!btn) return;
    btn.disabled = true;
    try {
        const r         = await LunarAPI.toggleFollow(AppState.viewedUserId);
        const following = r.following;
        renderFollowButton(following);
        // Update follower count optimistically
        const fCount = document.getElementById('followersCount');
        if (fCount) {
            const current = parseInt(fCount.textContent || '0', 10);
            fCount.textContent = Math.max(0, current + (following ? 1 : -1));
        }
    } catch (e) { showToast(e.message, 'error'); }
    finally { btn.disabled = false; }
}

// ── Image Upload ─────────────────────────────────────────────
async function uploadAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
        // Uses existing LunarAPI.uploadAvatar (already correct)
        const data = await LunarAPI.uploadAvatar(file);
        const url  = imgUrl(data.avatar_url);

        // Update DOM immediately — no page reload needed
        const avatarEl = document.getElementById('profileAvatar');
        if (avatarEl) avatarEl.innerHTML = `<img src="${url}?t=${Date.now()}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;

        // Sync nav avatar
        AppState.currentUser = { ...AppState.currentUser, avatar_url: data.avatar_url };
        LunarAPI.setUser(AppState.currentUser);
        initNavAvatar(AppState.currentUser);
        if (AppState.isOwnProfile) AppState.viewedUser = AppState.currentUser;

        showToast('Cập nhật ảnh đại diện thành công');
    } catch (err) {
        showToast(err.message || 'Lỗi upload ảnh đại diện', 'error');
    }
}

/**
 * uploadCover – FIX plan item J: uses LunarAPI.uploadCoverPhoto (same pattern
 * as uploadAvatar) instead of a raw fetch(), so auth/timeout are handled uniformly.
 */
async function uploadCover(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
        const data    = await LunarAPI.uploadCoverPhoto(file);
        const coverEl = document.getElementById('profileCover');
        if (coverEl) {
            coverEl.style.backgroundImage    = `url(${imgUrl(data.cover_url)})`;
            coverEl.style.backgroundSize     = 'cover';
            coverEl.style.backgroundPosition = 'center';
        }
        // Sync state
        AppState.currentUser = { ...AppState.currentUser, cover_url: data.cover_url };
        LunarAPI.setUser(AppState.currentUser);
        if (AppState.isOwnProfile) AppState.viewedUser = AppState.currentUser;

        showToast('Cập nhật ảnh bìa thành công');
    } catch (err) {
        console.error('Upload cover error:', err);
        showToast(err.message || 'Lỗi upload ảnh bìa', 'error');
    }
}

// ── Navigate to own profile (called from HTML) ───────────────
window.goToOwnProfile = function () {
    const u = LunarAPI.currentUser();
    window.location.href = u ? `profile.html?user=${u.id}` : 'login.html';
};

// ── Utilities ─────────────────────────────────────────────────
/**
 * imgUrl – resolves a relative API path (/uploads/...) to an absolute URL.
 * FIX plan items A,I: always uses LunarAPI.apiBase(), never hardcodes localhost.
 * Also safe for already-absolute URLs (http/https).
 */
function imgUrl(path) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return LunarAPI.apiBase() + path;
}

function esc(s)        { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function setEl(id, v)  { const el = document.getElementById(id); if (el) el.textContent = v; }
function getValue(id)  { return document.getElementById(id)?.value.trim() || ''; }
function setValue(id, v) { const el = document.getElementById(id); if (el) el.value = v; }
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id){ document.getElementById(id)?.classList.remove('open'); }
function formatTime(iso) {
    try {
        const d    = new Date(iso);
        const diff = Date.now() - d;
        if (diff < 3_600_000)  return Math.floor(diff / 60_000) + 'ph trước';
        if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + 'g trước';
        return d.toLocaleDateString('vi-VN');
    } catch { return ''; }
}

function setLoading(btn, on) {
    if (!btn) return;
    btn.disabled    = on;
    btn.textContent = on ? '⏳ Đang lưu...' : 'Lưu thay đổi';
}

function showToast(msg, type = 'success') {
    let box = document.getElementById('toastContainer');
    if (!box) {
        box = document.createElement('div');
        box.className = 'toast-container';
        box.id        = 'toastContainer';
        document.body.appendChild(box);
    }
    const t = document.createElement('div');
    t.className   = `toast ${type}`;
    t.textContent = (type === 'success' ? '✅ ' : type === 'error' ? '❌ ' : 'ℹ️ ') + msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}
