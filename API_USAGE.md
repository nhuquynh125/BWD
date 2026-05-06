# Frontend - api.js Documentation

The `api.js` file is the central API client that handles all communication between the frontend and backend.

## Usage Overview

### Include in HTML

```html
<script src="api.js"></script>
```

All functions are automatically available globally.

---

## Auth Functions

### signupUser(username, email, phone, password)

Create a new user account.

```javascript
const result = await signupUser('john_doe', 'john@example.com', '0912345678', 'SecurePass123');

if (result.ok) {
  console.log('Signup successful:', result.user_id);
  window.location.href = 'index.html';  // Redirect to login
} else {
  console.error('Signup failed:', result.error);
}
```

**Returns:**
```javascript
{
  ok: true,
  user_id: 1,
  username: "john_doe",
  email: "john@example.com",
  error: null
}
```

---

### loginUser(email, password)

Login with email and password.

```javascript
const result = await loginUser('john@example.com', 'SecurePass123');

if (result.ok) {
  // User logged in, currentUser is saved to localStorage
  console.log('Current user:', result.user);
  window.location.href = 'dashboard.html';
} else {
  console.error('Login failed:', result.error);
}
```

**Returns:**
```javascript
{
  ok: true,
  user: {
    id: 1,
    username: "john_doe",
    email: "john@example.com"
  },
  error: null
}
```

---

### sendOTP(phone)

Send OTP to phone number.

```javascript
const result = await sendOTP('0987654321');

if (result.ok) {
  console.log('OTP sent. Check console for dev OTP.');
  startOTPTimer();  // Show countdown
} else {
  console.error('Failed to send OTP:', result.error);
}
```

**Returns:**
```javascript
{
  ok: true,
  message: "OTP sent to phone",
  expires_in: 300,
  error: null
}
```

---

### verifyOTP(phone, otp)

Verify OTP from SMS.

```javascript
const result = await verifyOTP('0987654321', '123456');

if (result.ok) {
  console.log('Phone verified. User:', result.user_id);
  // Auto-login or redirect to create password
} else {
  console.error('Invalid OTP:', result.error);
}
```

**Returns:**
```javascript
{
  ok: true,
  user_id: 1,
  message: "Phone verified",
  error: null
}
```

---

## Session Functions

### isLoggedIn()

Check if user is currently logged in.

```javascript
if (isLoggedIn()) {
  console.log('User is logged in');
  const user = JSON.parse(localStorage.getItem('currentUser'));
  console.log('Username:', user.username);
} else {
  console.log('User is not logged in');
  window.location.href = 'index.html';
}
```

**Returns:** `true` or `false`

---

### getCurrentUser()

Get current logged-in user from localStorage.

```javascript
const user = getCurrentUser();

if (user) {
  console.log('User ID:', user.id);
  console.log('Username:', user.username);
  console.log('Email:', user.email);
}
```

**Returns:**
```javascript
{
  id: 1,
  username: "john_doe",
  email: "john@example.com"
} // or null if not logged in
```

---

### logout()

Logout current user.

```javascript
logout();
// User data cleared from localStorage
// Safe to redirect to login page
window.location.href = 'index.html';
```

---

## Post Functions

### getPosts(limit = 50)

Get list of posts.

```javascript
const posts = await getPosts(10);  // Get 10 posts

console.log('Total posts:', posts.length);
posts.forEach(post => {
  console.log(post.content);
  console.log(post.username);
  console.log(post.likes, 'likes');
});
```

**Returns:**
```javascript
[
  {
    id: 1,
    user_id: 1,
    username: "john_doe",
    content: "Beautiful sunset!",
    location: "ha-long",
    mood: "excited",
    privacy: "public",
    likes: 5,
    images: ["image1.jpg", "image2.jpg"],
    created_at: "2024-03-15T10:30:00"
  },
  // ... more posts
]
```

---

### createPost(content, location, mood, privacy, imageFiles = [])

Create a new post with optional images.

```javascript
// Get images from file input
const imageInput = document.getElementById('imageInput');
const files = Array.from(imageInput.files);

const result = await createPost(
  "Vịnh Hạ Long thật tuyệt vời!",
  "ha-long",
  "excited",
  "public",
  files
);

if (result.ok) {
  console.log('Post created:', result.post_id);
  window.location.href = 'dashboard.html';
} else {
  console.error('Failed to create post:', result.error);
}
```

**Parameters:**
- `content` (string): Post content, 10-5000 characters
- `location` (string): One of: ha-long, sapa, hanoi, da-nang, hoi-an, hue, ruong-bac-thang, etc.
- `mood` (string): One of: happy, sad, excited, funny, romantic, adventurous
- `privacy` (string): One of: public, friends, private
- `imageFiles` (array): Array of File objects (max 5, max 5MB each)

**Returns:**
```javascript
{
  ok: true,
  post_id: 1,
  message: "Post created successfully",
  error: null
}
```

---

### getPost(postId)

Get a single post by ID.

```javascript
const post = await getPost(1);

if (post) {
  console.log('Post:', post.content);
  console.log('Likes:', post.likes);
  console.log('Author:', post.username);
} else {
  console.error('Post not found');
}
```

**Returns:**
```javascript
{
  id: 1,
  user_id: 1,
  username: "john_doe",
  content: "Beautiful sunset!",
  location: "ha-long",
  mood: "excited",
  privacy: "public",
  likes: 5,
  images: ["image1.jpg", "image2.jpg"],
  created_at: "2024-03-15T10:30:00"
}
// or null if not found
```

---

### likePost(postId, action = 'like')

Like or unlike a post.

```javascript
// Like a post
const result = await likePost(1, 'like');

if (result.ok) {
  console.log('Post liked! New total:', result.likes);
} else {
  console.error('Failed to like post:', result.error);
}

// Unlike a post
const resultUnlike = await likePost(1, 'unlike');

if (resultUnlike.ok) {
  console.log('Post unliked! New total:', resultUnlike.likes);
}
```

**Parameters:**
- `postId` (number): ID of post to like
- `action` (string): 'like' or 'unlike'

**Returns:**
```javascript
{
  ok: true,
  post_id: 1,
  likes: 6,
  message: "Post liked",
  error: null
}
```

---

## Low-Level Functions

### apiCall(endpoint, method = 'GET', data = null)

General API call function (used internally).

```javascript
// GET request
const posts = await apiCall('/posts', 'GET');

// POST request
const result = await apiCall('/auth/login', 'POST', {
  email: 'john@example.com',
  password: 'Test123456'
});

// Handle response
if (result.ok) {
  console.log('Success:', result);
} else {
  console.error('Error:', result.error);
}
```

---

### apiUpload(endpoint, formData)

Upload files (used for posts with images).

```javascript
const formData = new FormData();
formData.append('user_id', 1);
formData.append('content', 'My post');
formData.append('location', 'ha-long');
formData.append('mood', 'excited');
formData.append('privacy', 'public');
formData.append('images', fileObject1);
formData.append('images', fileObject2);

const result = await apiUpload('/posts', formData);

if (result.ok) {
  console.log('Uploaded! Post ID:', result.post_id);
}
```

---

## Error Handling

All functions return an object with `ok` and `error` properties.

```javascript
const result = await signupUser(...);

if (!result.ok) {
  // Handle error
  const errorMsg = result.error;
  
  if (errorMsg.includes('already exists')) {
    console.log('Username or email already taken');
  } else if (errorMsg.includes('validation')) {
    console.log('Invalid input data');
  } else {
    console.log('Unknown error:', errorMsg);
  }
}
```

---

## Common Patterns

### 1. Check Before Redirecting

```javascript
if (isLoggedIn()) {
  // Show dashboard
} else {
  // Redirect to login
  window.location.href = 'index.html';
}
```

### 2. Load Posts on Page Load

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  const posts = await getPosts(20);
  posts.forEach(post => renderPost(post));
});
```

### 3. Create Post with Loading State

```javascript
const submitBtn = document.querySelector('button[type="submit"]');
const originalText = submitBtn.textContent;

submitBtn.textContent = '⏳ Uploading...';
submitBtn.disabled = true;

try {
  const result = await createPost(...);
  if (result.ok) {
    alert('✓ Posted successfully!');
    window.location.href = 'dashboard.html';
  } else {
    alert('❌ Error: ' + result.error);
  }
} finally {
  submitBtn.textContent = originalText;
  submitBtn.disabled = false;
}
```

### 4. Toggle Like on Click

```javascript
document.addEventListener('click', async (e) => {
  if (e.target.classList.contains('like-btn')) {
    const postId = e.target.dataset.postId;
    const isLiked = e.target.classList.contains('liked');
    
    const action = isLiked ? 'unlike' : 'like';
    const result = await likePost(postId, action);
    
    if (result.ok) {
      e.target.classList.toggle('liked');
      e.target.textContent = `❤️ ${result.likes}`;
    }
  }
});
```

---

## Configuration

### Change API Base URL

Edit the top of `api.js`:

```javascript
const API_BASE_URL = 'http://localhost:5001/api';  // Change port if needed
```

For production:
```javascript
const API_BASE_URL = 'https://api.yoursite.com/api';
```

---

## Development Tips

### Test in Browser Console

```javascript
// Test signup
await signupUser('test', 'test@test.com', '0912345678', 'Test123456')

// Test login
await loginUser('test@test.com', 'Test123456')

// Check current user
getCurrentUser()

// Get posts
await getPosts()

// Create post
await createPost('Test post', 'ha-long', 'excited', 'public')
```

### View Network Traffic

In browser DevTools:
1. Press F12
2. Go to Network tab
3. Perform action (login, create post, etc.)
4. See API calls in Network tab
5. Click on request to see details

### Check localStorage

In browser Console:
```javascript
// View all stored data
console.table(localStorage)

// View current user
console.log(JSON.parse(localStorage.currentUser))

// Clear all (careful!)
localStorage.clear()
```

---

## Future Enhancements

Planned additions to api.js:
- `getUserProfile(userId)` - Get user profile data
- `updateProfile(userId, data)` - Update user info
- `followUser(userId)` - Follow a user
- `unfollowUser(userId)` - Unfollow a user
- `getComments(postId)` - Get post comments
- `addComment(postId, text)` - Add comment
- `searchPosts(query)` - Search posts
- `getNotifications()` - Get notifications

---

## Support

For API errors, check:
1. Backend is running (`http://localhost:5000`)
2. Network tab in DevTools (F12)
3. Browser Console for error messages
4. Backend console for server errors
5. `API_DOCS.md` for endpoint details
