# Travel Social Network - Complete Setup Guide

Hướng dẫn toàn diện để setup và chạy mạng xã hội du lịch.

## Project Structure

```
TravelSocialNetwork/
├── frontend/          # HTML, CSS, JS (no build needed)
│   ├── index.html     # Login page
│   ├── signup.html    # Sign up page
│   ├── dashboard.html # Main feed
│   ├── create-post.html
│   ├── profile.html
│   ├── api.js         # API helpers
│   └── ... (other pages & CSS/JS)
└── backend/           # Flask backend
    ├── app.py
    ├── models.py
    ├── auth.py
    ├── posts.py
    ├── test_integration.py
    └── requirements.txt
```

## Step 1: Setup Backend

### 1a. Open PowerShell, navigate to backend folder

```powershell
cd d:\BaiTapHTML\files\TravelSocialNetwork\backend
```

### 1b. Create virtual environment and install dependencies

```powershell
python -m venv venv
venv\Scripts\Activate
pip install -r requirements.txt
```

### 1c. Initialize database

```powershell
python db_init.py
```

Expected output: `✓ Database initialized successfully.`

### 1d. Start backend server

```powershell
$env:FLASK_APP="app.py"
flask run
```

Expected output:
```
 * Running on http://127.0.0.1:5000
```

**Keep this terminal open!** Backend runs on `http://localhost:5000`

---

## Step 2: Setup Frontend

### 2a. Open browser and navigate to frontend

Open your browser and go to:
```
file:///d:/BaiTapHTML/files/TravelSocialNetwork/frontend/index.html
```

Or start a local web server:

```powershell
# In a new PowerShell window, navigate to frontend folder
cd d:\BaiTapHTML\files\TravelSocialNetwork\frontend

# Start Python's built-in web server
python -m http.server 8000
```

Then open: `http://localhost:8000/index.html`

---

## Step 3: Test the System

### 3a. Signup

1. Go to `index.html` (login page)
2. Click "Đăng ký ngay" link
3. Fill in signup form:
   - Username: `testuser`
   - Email: `test@example.com`
   - Phone: `0912345678`
   - Password: `SecurePass123`
4. Click "Tạo tài khoản"

Expected: Redirects to login page

### 3b. Login

1. Back to login page
2. Tab "Đăng nhập Google" (or use phone OTP for testing)
3. Or use another tab for phone OTP:
   - Phone: `0987654321`
   - Click "Gửi mã OTP"
   - You'll see fake OTP in backend console (check the terminal running Flask)
   - Enter 6-digit OTP
   - Click "Xác nhận"

Expected: Redirects to dashboard

### 3c. Create Post

1. On dashboard, click "✏️ Tạo bài viết"
2. Fill form:
   - Content: "Vịnh Hạ Long thật đẹp!"
   - Location: "Vịnh Hạ Long, Quảng Ninh"
   - Mood: Select one (e.g., 🤩)
   - Images: Click to upload (optional)
3. Click "✓ Đăng bài viết"

Expected: Post shows in feed on dashboard

### 3d. Like & Interact

1. On dashboard feed, hover over post's like button
2. Choose emotion (❤️ 😂 etc.)
3. Like count increases

---

## Step 4: API Integration Tests (Optional)

Run automated tests to verify backend:

### 4a. In new PowerShell window, navigate to backend

```powershell
cd d:\BaiTapHTML\files\TravelSocialNetwork\backend
```

### 4b. Activate venv

```powershell
venv\Scripts\Activate
```

### 4c. Run tests

```powershell
python test_integration.py
```

Expected output shows:
```
✓ Signup successful
✓ Login successful
✓ Post created
✓ Post retrieved
✓ Posts listed
✓ Post liked
✓ OTP sent
```

---

## File Descriptions

### Frontend Key Files

| File | Purpose |
|------|---------|
| `index.html` / `script.js` | Login & phone OTP |
| `signup.html` / `signup.js` | User registration |
| `dashboard.html` / `dashboard.js` | Main feed, view posts |
| `create-post.html` / `create-post.js` | Create & upload posts |
| `profile.html` / `profile.js` | User profile, stats |
| `api.js` | **API client** - all backend calls |
| `style.css` | Responsive design |

### Backend Key Files

| File | Purpose |
|------|---------|
| `app.py` | Flask app, routes setup |
| `models.py` | User, Post, Image DB models |
| `auth.py` | Auth endpoints (signup/login/OTP) |
| `posts.py` | Posts endpoints (CRUD, like) |
| `db_init.py` | Initialize SQLite database |
| `test_integration.py` | Automated API tests |

---

## Common Issues & Fixes

### Issue: "ModuleNotFoundError: No module named 'flask'"

**Fix:** Make sure you've activated venv and run `pip install -r requirements.txt`

```powershell
venv\Scripts\Activate
pip install -r requirements.txt
```

### Issue: "Address already in use" on port 5000

**Fix:** Either:
- Kill process on port 5000
- Or run Flask on different port: `flask run --port 5001`

```powershell
# Kill existing process (Windows)
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or run on different port
flask run --port 5001
```

Then update `api.js` to use new port:
```javascript
const API_BASE_URL = 'http://localhost:5001/api';
```

### Issue: "CORS error" in browser console

**Fix:** This means frontend and backend aren't communicating. Check:
1. Backend is running (`http://localhost:5000`)
2. `api.js` has correct `API_BASE_URL`
3. Both tabs (frontend & backend) are open

### Issue: Images not uploading

**Fix:** Check backend `uploads/` folder exists (should be created automatically)

```powershell
cd d:\BaiTapHTML\files\TravelSocialNetwork\backend
ls uploads/  # Should exist
```

---

## Production Notes

**This is a demo/learning project.** For production:

1. **Auth**: Use JWT tokens instead of localStorage
2. **CORS**: Whitelist specific origins, not all
3. **Database**: Use PostgreSQL instead of SQLite
4. **Uploads**: Use cloud storage (S3, etc.) instead of local `uploads/`
5. **Security**: Add rate limiting, input validation, HTTPS
6. **Frontend**: Build with React/Vue for better performance
7. **Deployment**: Use Docker, K8s, or cloud platforms (Heroku, AWS, etc.)

---

## Next Steps

- Add friends/following system
- Implement comments on posts
- Add search functionality
- Deploy to cloud (Heroku, AWS, etc.)
- Add real SMS/OAuth integration
- Mobile app version

Enjoy building! 🚀
