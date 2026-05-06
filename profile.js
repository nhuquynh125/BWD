// Profile Page - Load user profile, edit profile, friends

let currentUser = null;
let currentProfileUserId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    if (!isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    loadProfileData();
    setupEventListeners();
});

// Load profile data
function loadProfileData() {
    try {
        // Get user ID from URL param or use current user
        const urlParams = new URLSearchParams(window.location.search);
        currentProfileUserId = urlParams.get('user_id') || currentUser.id;
        
        // Load profile from backend
        (async () => {
            try {
                const profile = await getUserProfile(currentProfileUserId);
                if (profile && profile.id) {
                    updateProfileUI(profile);
                    // if viewing own profile, keep session in sync
                    if (String(profile.id) === String(currentUser.id)) {
                        currentUser = profile;
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    }
                }
            } catch (err) {
                console.warn('Could not load profile from API, falling back to local data', err);
                updateProfileUI(currentUser);
            }
        })();
        
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Update profile UI with user data
function updateProfileUI(user) {
    if (!user) return;
    
    document.querySelector('.profile-name').textContent = user.username || 'User';
    document.querySelector('.profile-username').textContent = '@' + (user.username || '').toLowerCase();
    
    // Only show edit button if viewing own profile
    const editBtn = document.getElementById('editProfileBtn');
    if (editBtn && currentProfileUserId === currentUser.id) {
        editBtn.style.display = 'inline-block';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Edit profile form
    const editForm = document.getElementById('editProfileForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditProfileSubmit);
    }
    
    // Bio character counter
    const bioInput = document.getElementById('bio');
    if (bioInput) {
        bioInput.addEventListener('input', function() {
            document.getElementById('bioCount').textContent = this.value.length;
        });
    }
    
    // Edit profile button
    const editBtn = document.getElementById('editProfileBtn');
    if (editBtn) {
        editBtn.addEventListener('click', openEditProfile);
    }
}

// Open edit profile modal
function openEditProfile() {
    if (currentProfileUserId !== currentUser.id) {
        alert('⚠️ Bạn chỉ có thể chỉnh sửa hồ sơ của chính mình');
        return;
            const payload = {
                username: fullName,
                bio,
                location,
                website
            };
            const res = await updateUserProfile(currentUser.id, payload);
            if (res && res.ok && res.user) {
                currentUser = res.user;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                alert('✓ Hồ sơ đã được cập nhật!');
                closeEditProfile();
                updateProfileUI(currentUser);
            } else {
                alert('❌ Lỗi: ' + (res.error || 'Cập nhật thất bại'));
            }
}

// Close edit profile modal
function closeEditProfile() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Handle edit profile form submit
async function handleEditProfileSubmit(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('fullName').value.trim();
    const bio = document.getElementById('bio').value.trim();
    const location = document.getElementById('location').value.trim();
    const website = document.getElementById('website').value.trim();
    
    // Validate
    if (!fullName) {
        alert('⚠️ Vui lòng nhập tên đầy đủ');
        return;
    }
    
    if (bio.length > 150) {
        alert('⚠️ Tiểu sử không quá 150 ký tự');
        return;
    }
    
    // Show loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Đang lưu...';
    submitBtn.disabled = true;
    
    try {
        // TODO: Add PATCH /api/users/<id> endpoint to update profile
        // For now, just update localStorage
        currentUser.username = fullName;
        currentUser.bio = bio;
        currentUser.location = location;
        currentUser.website = website;
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        alert('✓ Hồ sơ đã được cập nhật!');
        closeEditProfile();
        updateProfileUI(currentUser);
        
    } catch (error) {
        alert('❌ Lỗi: ' + error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Switch profile tabs
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Remove active state from buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName + '-tab');
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }
    
    // Mark button as active
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

// Toggle follow (placeholder)
function toggleFollow() {
    alert('⚠️ Tính năng này sẽ sớm được kích hoạt');
}

// Remove friend (placeholder)
function removeFriend() {
    if (confirm('Xóa bạn này?')) {
        event.target.parentElement.remove();
        alert('✓ Đã xóa bạn');
    }
}

// Message button
function sendMessage() {
    alert('💬 Mở cửa sổ trò chuyện');
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('editProfileModal');
    if (event.target === modal) {
        closeEditProfile();
    }
});

// Delete Post
function deletePost(postId) {
    if (confirm('Xóa bài viết này?')) {
        const postCard = event.target.closest('.post-card');
        postCard.remove();
        alert('✓ Đã xóa bài viết');
        
        // TODO: Send to backend
        console.log('Post deleted:', postId);
    }
}

// Post Menu (Edit/Delete)
document.querySelectorAll('.post-menu-btn').forEach((btn, index) => {
    btn.addEventListener('click', function() {
        const menu = document.createElement('div');
        menu.className = 'post-menu';
        menu.innerHTML = `
            <button onclick="editPost(${index})">✏️ Chỉnh sửa</button>
            <button onclick="deletePost(${index})">🗑️ Xóa</button>
        `;
        
        // Remove existing menu
        document.querySelectorAll('.post-menu').forEach(m => m.remove());
        
        // Add new menu
        this.parentElement.appendChild(menu);
    });
});

// Close menus when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.classList.contains('post-menu-btn')) {
        document.querySelectorAll('.post-menu').forEach(menu => menu.remove());
    }
});

// Edit Post
function editPost(postId) {
    window.location.href = 'create-post.html';
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('Profile page loaded');
    
    // Check if viewing own profile or someone else's
    const isOwnProfile = true; // This would come from backend
    
    if (isOwnProfile) {
        document.getElementById('profileActions').style.display = 'flex';
        document.getElementById('profileActionsOther').style.display = 'none';
        document.getElementById('friendsTabBtn').style.display = 'inline-block';
    } else {
        document.getElementById('profileActions').style.display = 'none';
        document.getElementById('profileActionsOther').style.display = 'flex';
        document.getElementById('friendsTabBtn').style.display = 'none';
    }
    
    // Smooth scroll for tabs
    document.querySelectorAll('.profile-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        });
    });
});

// Like post
document.querySelectorAll('.post-actions .action-btn').forEach(btn => {
    if (btn.textContent.includes('Thích')) {
        btn.addEventListener('click', function() {
            this.classList.toggle('liked');
            
            if (this.classList.contains('liked')) {
                this.textContent = '❤️ Đã thích';
            } else {
                this.textContent = '👍 Thích';
            }
        });
    }
});

// Comment button
document.querySelectorAll('.post-actions .action-btn').forEach(btn => {
    if (btn.textContent.includes('Bình luận')) {
        btn.addEventListener('click', function() {
            alert('Mở cửa sổ bình luận');
        });
    }
});

// Share button
document.querySelectorAll('.post-actions .action-btn').forEach(btn => {
    if (btn.textContent.includes('Chia sẻ')) {
        btn.addEventListener('click', function() {
            if (navigator.share) {
                navigator.share({
                    title: 'Travel Share',
                    text: 'Xem bài viết du lịch tuyệt vời này!',
                    url: window.location.href
                });
            } else {
                alert('Đã sao chép liên kết bài viết!');
            }
        });
    }
});

// Back to dashboard
window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // Could add escape handling here
    }
});
