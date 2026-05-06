# Travel Social Network - API Documentation

## Base URL

```
http://localhost:5000/api
```

All requests should include `Content-Type: application/json` or `Content-Type: multipart/form-data` for file uploads.

---

## Authentication Endpoints

### POST /auth/signup

Create a new user account.

**Request:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "phone": "0912345678",
  "password": "SecurePass123"
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "user_id": 1,
  "username": "john_doe",
  "email": "john@example.com"
}
```

**Validation:**
- Username: 3-30 characters, alphanumeric + underscore
- Email: Valid email format
- Phone: Valid format (10-11 digits)
- Password: Minimum 8 characters, hashed with Werkzeug

**Error responses:**
- 400: Missing field or validation failed
- 409: Username or email already exists

---

### POST /auth/login

Login with email and password.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "created_at": "2024-03-15T10:30:00"
  }
}
```

**Error responses:**
- 400: Missing email or password
- 401: Invalid credentials
- 404: User not found

---

### POST /auth/phone/send_otp

Send OTP to phone number for verification.

**Request:**
```json
{
  "phone": "0987654321"
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "message": "OTP sent to phone",
  "expires_in": 300
}
```

**Note (Demo):**
- OTP is printed to backend console (development only)
- In production, integrate with Twilio or SMS provider
- OTP expires in 5 minutes

**Error responses:**
- 400: Invalid phone format
- 429: Too many OTP requests

---

### POST /auth/phone/verify

Verify OTP for phone authentication.

**Request:**
```json
{
  "phone": "0987654321",
  "otp": "123456"
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "message": "Phone verified",
  "user_id": 1
}
```

**Error responses:**
- 400: Invalid phone or OTP format
- 401: Invalid or expired OTP
- 404: OTP not found for this phone

---

### POST /auth/google

Google OAuth callback (placeholder - not configured).

**Status:** ⚠️ Placeholder - needs Google API setup

---

## Posts Endpoints

### GET /posts

Get list of posts (paginated, max 50).

**Query Parameters:**
- `limit`: Number of posts (default 50, max 100)
- `offset`: Skip N posts (for pagination)
- `user_id`: Filter by user (optional)

**Request:**
```
GET /api/posts?limit=10&offset=0
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "username": "john_doe",
    "content": "Vịnh Hạ Long thật tuyệt vời!",
    "location": "ha-long",
    "mood": "excited",
    "privacy": "public",
    "likes": 5,
    "images": [
      "image-abc123.jpg",
      "image-def456.jpg"
    ],
    "created_at": "2024-03-15T10:30:00"
  }
]
```

**Error responses:**
- 400: Invalid query parameters

---

### POST /posts

Create a new post (with optional images).

**Request (Form Data):**
```
user_id: 1
content: "Beautiful sunset at Hạ Long Bay!"
location: "ha-long"
mood: "excited"
privacy: "public"
images: [file1.jpg, file2.jpg]  # Optional, max 5 files, max 5MB each
```

**Response (200 OK):**
```json
{
  "ok": true,
  "post_id": 1,
  "message": "Post created successfully"
}
```

**Validation:**
- Content: 10-5000 characters
- Location: One of predefined Vietnamese landmarks
- Mood: One of [happy, sad, excited, funny, romantic, adventurous]
- Privacy: One of [public, friends, private]
- Images: JPG, PNG only, max 5MB each, max 5 files

**Error responses:**
- 400: Validation failed
- 401: User not authenticated
- 413: File too large
- 422: Invalid file type

---

### GET /posts/<post_id>

Get a single post by ID.

**Request:**
```
GET /api/posts/1
```

**Response (200 OK):**
```json
{
  "id": 1,
  "user_id": 1,
  "username": "john_doe",
  "content": "Vịnh Hạ Long thật tuyệt vời!",
  "location": "ha-long",
  "mood": "excited",
  "privacy": "public",
  "likes": 5,
  "images": ["image-abc123.jpg"],
  "created_at": "2024-03-15T10:30:00"
}
```

**Error responses:**
- 404: Post not found

---

### POST /posts/<post_id>/like

Like or unlike a post with an emotion.

**Request:**
```json
{
  "action": "like",
  "emotion": "heart"  # Optional: heart, laughing, shocked, sad, love, etc.
}
```

Or simply like (increment like count):
```json
{
  "action": "like"
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "post_id": 1,
  "likes": 6,
  "message": "Post liked"
}
```

**To unlike:**
```json
{
  "action": "unlike"
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "post_id": 1,
  "likes": 5,
  "message": "Post unliked"
}
```

**Error responses:**
- 404: Post not found
- 400: Invalid action (not "like" or "unlike")

---

## File Upload

### Uploading Images

Images are uploaded with posts via `POST /posts` using FormData.

**Frontend JavaScript Example:**
```javascript
const formData = new FormData();
formData.append('user_id', userId);
formData.append('content', 'My travel post');
formData.append('location', 'ha-long');
formData.append('mood', 'excited');
formData.append('privacy', 'public');

// Add images
const fileInput = document.getElementById('imageInput');
for (let file of fileInput.files) {
  formData.append('images', file);
}

const response = await fetch('http://localhost:5000/api/posts', {
  method: 'POST',
  body: formData
});
```

### Serving Uploaded Images

Images are served at:
```
http://localhost:5000/uploads/<filename>
```

Example:
```html
<img src="http://localhost:5000/uploads/image-abc123.jpg" alt="Travel photo">
```

---

## Vietnamese Landmarks

Valid location values:

| Code | Name | Vietnamese |
|------|------|-----------|
| `ha-long` | Ha Long Bay | Vịnh Hạ Long |
| `sapa` | Sa Pa Fansipan | Sapa - Fansipan |
| `hanoi` | Hanoi Lake | Hà Nội - Hồ Hoàn Kiếm |
| `da-nang` | Da Nang My Khe | Đà Nẵng - Bãi Mỹ Khánh |
| `hoi-an` | Hoi An Ancient Town | Hội An - Phố Cổ |
| `hue` | Hue | Huế - Thừa Thiên Huế |
| `ruong-bac-thang` | Terraced Fields | Ruộng bậc thang |
| `co-do-hue` | Hue Citadel | Cố Đô Huế |
| `bwd-g5` | Ba Vi Dunes | Bãi Dunes |
| `vinh-ha-long` | Ha Long Vista | Vịnh Hạ Long |

---

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid credentials) |
| 404 | Not Found |
| 409 | Conflict (duplicate username/email) |
| 413 | Payload Too Large |
| 422 | Unprocessable Entity (invalid data) |
| 429 | Too Many Requests |
| 500 | Server Error |

---

## Error Response Format

```json
{
  "error": "Error message",
  "status": 400
}
```

---

## Authentication Notes

**Current Implementation (Demo):**
- Uses `user_id` in request body
- Session stored in `localStorage` on frontend
- No JWT tokens yet

**For Production:**
- Implement JWT authentication
- Send token in `Authorization: Bearer <token>` header
- Store secure httpOnly cookies
- Implement token refresh mechanism

---

## Rate Limiting

Current implementation has basic rate limiting:
- OTP: 3 attempts per phone per 5 minutes
- Signup: 5 attempts per IP per 5 minutes (future)

---

## CORS Configuration

CORS is enabled for all origins (development only).

**For Production:**
```python
CORS(app, resources={
  r"/api/*": {
    "origins": ["https://yourdomain.com"],
    "methods": ["GET", "POST"],
    "allow_headers": ["Content-Type", "Authorization"]
  }
})
```

---

## Testing with curl

### Signup
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "phone": "0912345678",
    "password": "Test123456"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456"
  }'
```

### Get Posts
```bash
curl http://localhost:5000/api/posts
```

### Create Post
```bash
curl -X POST http://localhost:5000/api/posts \
  -F "user_id=1" \
  -F "content=My first post!" \
  -F "location=ha-long" \
  -F "mood=excited" \
  -F "privacy=public" \
  -F "images=@/path/to/image.jpg"
```

### Like Post
```bash
curl -X POST http://localhost:5000/api/posts/1/like \
  -H "Content-Type: application/json" \
  -d '{"action": "like"}'
```

---

## Future Endpoints (Planned)

- `GET /api/users/<user_id>` - Get user profile
- `PATCH /api/users/<user_id>` - Update profile
- `POST /api/posts/<post_id>/comment` - Add comment
- `GET /api/posts/<post_id>/comments` - Get comments
- `POST /api/users/<user_id>/follow` - Follow user
- `GET /api/users/<user_id>/followers` - Get followers
- `GET /api/search?q=...` - Search posts/users
- `GET /api/notifications` - Get notifications

---

## Development

Run `python test_integration.py` to test all endpoints automatically.

For more details, see:
- `backend/README.md` - Backend setup
- `SETUP_GUIDE.md` - Full setup guide
- `test_integration.py` - Test examples
