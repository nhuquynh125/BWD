// Select Mood
function selectMood(button) {
    // Remove active from all
    document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('active'));
    
    // Add active to clicked
    button.classList.add('active');
    
    const mood = button.dataset.mood;
    document.getElementById('mood').value = mood;
    
    // Update preview
    const emoji = button.querySelector('.mood-emoji').textContent;
    const name = button.querySelector('.mood-name').textContent;
    
    const moodPreview = document.getElementById('moodPreview');
    const moodEmojiPreview = document.getElementById('moodEmojiPreview');
    
    moodEmojiPreview.textContent = emoji;
    moodPreview.style.display = 'block';
}

// Handle Image Upload
let uploadedImages = [];

function handleImageUpload(event) {
    const files = Array.from(event.target.files);
    
    // Validate file count
    if (uploadedImages.length + files.length > 5) {
        showError('imageError', 'Tối đa 5 ảnh. Bạn đã tải ' + uploadedImages.length + ' ảnh.');
        return;
    }
    
    // Validate each file
    let validFiles = [];
    files.forEach(file => {
        // Check file type
        if (!file.type.startsWith('image/')) {
            showError('imageError', 'Chỉ hỗ trợ hình ảnh');
            return;
        }
        
        // Check file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            showError('imageError', 'Hình ảnh quá lớn (tối đa 10MB)');
            return;
        }
        
        validFiles.push(file);
    });
    
    if (validFiles.length > 0) {
        clearError('imageError');
        
        // Read and display previews
        validFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                uploadedImages.push({
                    file: file,
                    preview: e.target.result
                });
                
                displayImagePreviews();
                updateImagePreviewInPost();
            };
            reader.readAsDataURL(file);
        });
    }
}

// Display Image Previews
function displayImagePreviews() {
    const previewContainer = document.getElementById('imagePreview');
    previewContainer.innerHTML = '';
    
    uploadedImages.forEach((img, index) => {
        const imgDiv = document.createElement('div');
        imgDiv.className = 'image-preview-item';
        imgDiv.innerHTML = `
            <img src="${img.preview}" alt="Preview">
            <button type="button" class="remove-btn" onclick="removeImage(${index})">×</button>
            <span class="image-number">${index + 1}/${uploadedImages.length}</span>
        `;
        previewContainer.appendChild(imgDiv);
    });
}

// Remove Image
function removeImage(index) {
    uploadedImages.splice(index, 1);
    displayImagePreviews();
    updateImagePreviewInPost();
}

// Update Image Preview in Post
function updateImagePreviewInPost() {
    const previewPost = document.getElementById('imagePreviewPost');
    if (uploadedImages.length === 0) {
        previewPost.style.display = 'none';
        return;
    }
    
    previewPost.style.display = 'block';
    previewPost.innerHTML = '';
    
    uploadedImages.forEach(img => {
        const imgEl = document.createElement('img');
        imgEl.src = img.preview;
        imgEl.style.borderRadius = '8px';
        imgEl.style.maxWidth = '100%';
        imgEl.style.marginBottom = '10px';
        previewPost.appendChild(imgEl);
    });
}

// Update Preview Content
document.getElementById('content')?.addEventListener('input', function() {
    const charCount = this.value.length;
    document.getElementById('charCount').textContent = charCount;
    document.getElementById('contentPreview').textContent = this.value || 'Kể về trải nghiệm du lịch của bạn...';
});

// Update Location Preview
document.getElementById('location')?.addEventListener('change', function() {
    const locationPreview = document.getElementById('locationPreview');
    const locationName = document.getElementById('locationName');
    
    if (this.value) {
        const selectedOption = this.options[this.selectedIndex];
        locationName.textContent = selectedOption.text;
        locationPreview.style.display = 'block';
    } else {
        locationPreview.style.display = 'none';
    }
});

// Update Hashtag Count
document.getElementById('hashtags')?.addEventListener('input', function() {
    document.getElementById('hashtagCount').textContent = this.value.length;
});

// Show Error
function showError(fieldId, message) {
    const errorEl = document.getElementById(fieldId);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('show');
    }
}

// Clear Error
function clearError(fieldId) {
    const errorEl = document.getElementById(fieldId);
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('show');
    }
}

// Validate Form
function validateForm() {
    let isValid = true;
    
    // Clear all errors
    document.querySelectorAll('.error').forEach(el => el.textContent = '');
    
    // Validate content
    const content = document.getElementById('content').value;
    if (content.length < 10) {
        showError('contentError', 'Nội dung phải ít nhất 10 ký tự');
        isValid = false;
    }
    
    // Validate location
    const location = document.getElementById('location').value;
    if (!location) {
        showError('locationError', 'Vui lòng chọn địa danh');
        isValid = false;
    }
    
    return isValid;
}

// Submit Form
document.getElementById('createPostForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }

    const content = document.getElementById('content').value;
    const location = document.getElementById('location').value;
    const mood = document.getElementById('mood').value;
    const privacy = document.getElementById('privacy').value;

    // Show loading state
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Đang đăng...';
    submitBtn.disabled = true;

    try {
        // Check if user is logged in
        if (!isLoggedIn()) {
            alert('Vui lòng đăng nhập để đăng bài viết');
            window.location.href = 'index.html';
            return;
        }

        // Send to backend
        const result = await createPost(content, location, mood, privacy, uploadedImages);
        
        alert('✓ Bài viết đã được đăng thành công!');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

        // Reset form
        this.reset();
        uploadedImages = [];
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('imagePreviewPost').style.display = 'none';
        document.getElementById('contentPreview').textContent = 'Kể về trải nghiệm du lịch của bạn...';
        document.getElementById('locationPreview').style.display = 'none';
        document.getElementById('moodPreview').style.display = 'none';
        document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('active'));

        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    } catch (error) {
        alert('❌ Lỗi: ' + error.message);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// Discard Post
function discardPost() {
    if (document.getElementById('content').value.length > 0 || uploadedImages.length > 0) {
        if (confirm('Bạn có chắc chắn muốn hủy? Nội dung sẽ không được lưu.')) {
            window.location.href = 'dashboard.html';
        }
    } else {
        window.location.href = 'dashboard.html';
    }
}

// Drag and drop
const uploadArea = document.querySelector('.image-upload-area');
if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        const fileInput = document.getElementById('images');
        
        // Create a new DataTransfer to set files
        const dt = new DataTransfer();
        
        // Add existing images
        uploadedImages.forEach(img => {
            dt.items.add(img.file);
        });
        
        // Add new files
        Array.from(files).forEach(file => {
            dt.items.add(file);
        });
        
        fileInput.files = dt.files;
        
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(event);
    });
}

// Auto-save draft (optional)
const autoSaveInterval = setInterval(() => {
    const content = document.getElementById('content')?.value;
    const location = document.getElementById('location')?.value;
    
    if (content || location || uploadedImages.length > 0) {
        localStorage.setItem('postDraft', JSON.stringify({
            content: content,
            location: location,
            mood: document.getElementById('mood')?.value,
            hashtags: document.getElementById('hashtags')?.value
        }));
    }
}, 10000); // Auto-save every 10 seconds

// Restore draft on load
window.addEventListener('load', () => {
    const draft = localStorage.getItem('postDraft');
    if (draft) {
        const data = JSON.parse(draft);
        if (confirm('Bạn có muốn khôi phục bản nháp trước đó?')) {
            if (data.content) document.getElementById('content').value = data.content;
            if (data.location) document.getElementById('location').value = data.location;
            if (data.mood) {
                document.getElementById('mood').value = data.mood;
                const moodBtn = document.querySelector(`[data-mood="${data.mood}"]`);
                if (moodBtn) moodBtn.click();
            }
            if (data.hashtags) document.getElementById('hashtags').value = data.hashtags;
            
            // Trigger input events to update previews
            document.getElementById('content')?.dispatchEvent(new Event('input'));
            document.getElementById('hashtags')?.dispatchEvent(new Event('input'));
            document.getElementById('location')?.dispatchEvent(new Event('change'));
        }
    }
});

// Clear draft on successful post
document.getElementById('createPostForm')?.addEventListener('submit', function() {
    localStorage.removeItem('postDraft');
    clearInterval(autoSaveInterval);
});
