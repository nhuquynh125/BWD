// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Store current user session (demo - in production use secure session/JWT)
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// API helper functions
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `API Error: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Upload files with FormData
async function apiUpload(endpoint, formData) {
    const options = {
        method: 'POST',
        body: formData
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Upload Error: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Upload failed:', error);
        throw error;
    }
}

// Auth functions
async function signupUser(username, email, phone, password) {
    const result = await apiCall('/auth/signup', 'POST', {
        username,
        email,
        phone,
        password
    });
    return result;
}

async function loginUser(email, password) {
    const result = await apiCall('/auth/login', 'POST', {
        email,
        password
    });
    if (result.ok) {
        currentUser = result.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
    return result;
}

async function sendOTP(phone) {
    const result = await apiCall('/auth/phone/send_otp', 'POST', { phone });
    return result;
}

async function verifyOTP(phone, otp) {
    const result = await apiCall('/auth/phone/verify', 'POST', { phone, otp });
    if (result.ok) {
        currentUser = result.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
    return result;
}

// Posts functions
async function getPosts() {
    const result = await apiCall('/posts', 'GET');
    return result;
}

async function createPost(content, location, mood, privacy, images) {
    const formData = new FormData();
    formData.append('user_id', currentUser?.id || '1');
    formData.append('content', content);
    formData.append('location', location);
    formData.append('mood', mood);
    formData.append('privacy', privacy);

    if (images && images.length > 0) {
        images.forEach(img => {
            formData.append('images', img.file);
        });
    }

    const result = await apiUpload('/posts', formData);
    return result;
}

async function getPost(postId) {
    const result = await apiCall(`/posts/${postId}`, 'GET');
    return result;
}

async function likePost(postId, action = 'like') {
    const result = await apiCall(`/posts/${postId}/like`, 'POST', { action });
    return result;
}

// User profile functions
async function getUserProfile(userId) {
    const result = await apiCall(`/users/${userId}`, 'GET');
    return result;
}

async function updateUserProfile(userId, data) {
    const result = await apiCall(`/users/${userId}`, 'PATCH', data);
    // If the updated profile is the current user, refresh local session
    if (result && result.user && currentUser && result.user.id === currentUser.id) {
        currentUser = result.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
    return result;
}

// Logout
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
}

// Check if user is logged in
function isLoggedIn() {
    return currentUser !== null;
}
