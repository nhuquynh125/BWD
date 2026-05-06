// Toggle User Menu
function toggleUserMenu() {
    const menu = document.getElementById('userDropdownMenu');
    menu.classList.toggle('show');
}

// Close user menu when clicking outside
document.addEventListener('click', function(event) {
    const userMenu = document.querySelector('.user-menu');
    if (!userMenu.contains(event.target)) {
        const menu = document.getElementById('userDropdownMenu');
        menu.classList.remove('show');
    }
});

// Logout
function logout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        // TODO: Clear session/token
        window.location.href = 'index.html';
    }
}

// Open Notifications
function openNotifications() {
    alert('Thông báo:\n- Nguyễn Hữu Hùng đã thích bài viết của bạn\n- Trần Thị Hương đã theo dõi bạn\n- Lê Minh Tuấn đã bình luận: "Đẹp quá!"');
}

// Open Messages
function openMessages() {
    window.location.href = 'messages.html';
}

// Open Create Post
function openCreatePost() {
    window.location.href = 'create-post.html';
}

// Like/Unlike Post
function toggleLike(button, postId) {
    const isLiked = button.classList.contains('liked');
    const likeCount = document.getElementById('likeCount' + postId);
    let currentCount = parseInt(likeCount.textContent);

    if (isLiked) {
        button.classList.remove('liked');
        button.innerHTML = '<span class="emotion-icon">👍</span><span>Thích</span>';
        likeCount.textContent = currentCount - 1;
    } else {
        button.classList.add('liked');
        button.innerHTML = '<span class="emotion-icon">❤️</span><span>Thích</span>';
        likeCount.textContent = currentCount + 1;
    }

    // TODO: Send to backend
    console.log('Like post:', postId, 'Liked:', !isLiked);
}

// React with Emotion
function reactWithEmotion(postId, emotion) {
    const button = event.target.closest('.action-btn');
    const parent = button.parentElement;
    const emotionPicker = parent.querySelector('.emotion-picker');
    
    button.classList.add('liked');
    const emotionEmoji = emotion.split('')[0];
    button.innerHTML = `<span class="emotion-icon">${emotion}</span><span>Thích</span>`;
    emotionPicker.style.display = 'none';
    
    // Update like count
    const likeCount = document.getElementById('likeCount' + postId);
    if (!button.classList.contains('liked-before')) {
        likeCount.textContent = parseInt(likeCount.textContent) + 1;
        button.classList.add('liked-before');
    }

    // TODO: Send to backend
    console.log('Reacted to post:', postId, 'with', emotion);
}

// Show Emotion Picker
function showEmotionPicker(button) {
    const parent = button.parentElement;
    const emotionPicker = parent.querySelector('.emotion-picker');
    emotionPicker.style.display = emotionPicker.style.display === 'none' ? 'flex' : 'none';
}

// Add click handler for like buttons to show emotion picker
document.querySelectorAll('.action-btn').forEach(btn => {
    if (btn.textContent.includes('Thích')) {
        btn.addEventListener('mouseenter', function() {
            const parent = this.parentElement;
            const emotionPicker = parent.querySelector('.emotion-picker');
            if (emotionPicker) {
                emotionPicker.style.display = 'flex';
            }
        });
        
        const parent = btn.parentElement;
        if (parent) {
            parent.addEventListener('mouseleave', function() {
                const emotionPicker = this.querySelector('.emotion-picker');
                if (emotionPicker) {
                    emotionPicker.style.display = 'none';
                }
            });
        }
    }
});

// Open Comments
function openComments(postId) {
    // TODO: Open modal or navigate to comments page
    console.log('Opening comments for post:', postId);
    alert('Bình luận:\n- Vũ Thái Huy: "Tuyệt vời!"\n- Phạm Thị Linh: "Chắc chắn phải đi!"\n- Đỗ Văn Sơn: "Mình cũng muốn đi"');
}

// Share Post
function sharePost(postId) {
    if (navigator.share) {
        navigator.share({
            title: 'Travel Share',
            text: 'Xem bài viết du lịch tuyệt vời này!',
            url: window.location.href
        }).catch(err => console.log('Error sharing:', err));
    } else {
        // Fallback
        const url = `${window.location.origin}?post=${postId}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url);
            alert('Đã sao chép liên kết!');
        }
    }
}

// Add Friend
function addFriend() {
    const btn = event.target;
    btn.textContent = 'Đang theo dõi';
    btn.disabled = true;
    btn.style.opacity = '0.6';
    
    // TODO: Send to backend
    console.log('Added friend');
}

// Filter Feed
function filterFeed(filter) {
    // Update active tab
    document.querySelectorAll('.feed-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // TODO: Filter posts based on selection
    console.log('Filtering feed by:', filter);
    alert(`Lọc theo: ${filter}`);
}

// Load More Posts
function loadMorePosts() {
    console.log('Loading more posts...');
    alert('Đang tải thêm bài viết...');
    
    // TODO: Fetch more posts from backend and append
    // This would typically use fetch() or axios to get data from API
}

// Search
document.getElementById('searchInput')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const query = this.value;
        console.log('Searching for:', query);
        // TODO: Navigate to search results or filter posts
        alert(`Tìm kiếm: ${query}`);
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard loaded');
    
    // Check if logged in
    if (!isLoggedIn()) {
        alert('Vui lòng đăng nhập');
        window.location.href = 'index.html';
        return;
    }

    // Load posts from API
    loadPostsFromAPI();
    
    // Add smooth scroll behavior
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Simulated real-time notifications
    setTimeout(() => {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = parseInt(badge.textContent) + 1;
        }
    }, 5000);
});

// Load posts from API
async function loadPostsFromAPI() {
    try {
        const posts = await getPosts();
        renderPosts(posts);
    } catch (error) {
        console.error('Failed to load posts:', error);
        // Show error or keep default posts
    }
}

// Render posts from API
function renderPosts(posts) {
    const container = document.getElementById('postsContainer');
    if (!posts || posts.length === 0) {
        console.log('No posts to display');
        return;
    }

    // For demo, we'll just show a few from API
    // In production, replace the default posts entirely
    const newPosts = posts.slice(0, 3).map(post => `
        <article class="post-card">
            <div class="post-header">
                <div class="author-info">
                    <img src="https://via.placeholder.com/48" alt="Avatar" class="post-avatar">
                    <div>
                        <h3 class="post-author">User ${post.user_id}</h3>
                        <span class="post-time">${new Date(post.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                </div>
                <button class="post-menu-btn">⋮</button>
            </div>

            <div class="post-content">
                <p>${post.content}</p>
                <div class="post-location">📍 ${post.location || 'Chưa chỉ định'}</div>
            </div>

            ${post.images && post.images.length > 0 ? `<img src="${post.images[0]}" alt="Post image" class="post-image">` : ''}

            <div class="post-stats">
                <span class="like-count">${post.likes}</span>
                <span class="comment-count">0</span>
                <span class="share-count">0</span>
            </div>

            <div class="post-actions">
                <button class="action-btn" onclick="toggleLikeAPI(${post.id})">
                    <span class="emotion-icon">👍</span>
                    <span>Thích</span>
                </button>
                <button class="action-btn" onclick="openComments(${post.id})">
                    💬 Bình luận
                </button>
                <button class="action-btn" onclick="sharePost(${post.id})">
                    📤 Chia sẻ
                </button>
            </div>
        </article>
    `).join('');

    // Append new posts (keep defaults + add API posts)
    // For now, we keep the defaults for demo
}

// Like post via API
async function toggleLikeAPI(postId) {
    try {
        const result = await likePost(postId, 'like');
        // Update UI
        alert('✓ Đã thích bài viết');
    } catch (error) {
        alert('❌ Lỗi: ' + error.message);
    }
}

// Infinite scroll (optional)
window.addEventListener('scroll', function() {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
        // Load more posts when user scrolls near bottom
        console.log('User scrolled near bottom');
    }
});
