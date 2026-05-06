# TravelSocialNetwork Backend

Minimal Flask backend for the Travel Social Network demo.

Features:
- SQLite via SQLAlchemy
- Basic user signup/login (password hash)
- Phone OTP & Google OAuth endpoints are placeholders (no external providers configured)
- Posts API with image upload (stores in `uploads/`)

## Quick Start

### 1. Setup virtual environment and dependencies

```bash
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

### 2. Initialize the database

```bash
python db_init.py
```

### 3. Run the backend server

```bash
set FLASK_APP=app.py
flask run
```

The API will be available at `http://127.0.0.1:5000/`.

### 4. Test the API (optional)

In a new terminal, run the integration tests:

```bash
python test_integration.py
```

This will:
- Create a new user
- Login
- Create a test post
- Like the post
- List all posts
- Send an OTP

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/phone/send_otp` - Send OTP to phone (dev only)
- `POST /api/auth/phone/verify` - Verify OTP

### Posts
- `GET /api/posts` - List all posts (limit 50)
- `POST /api/posts` - Create new post (form-data with optional images)
- `GET /api/posts/<post_id>` - Get single post
- `POST /api/posts/<post_id>/like` - Like/unlike post

## Frontend Integration

The frontend (HTML/JS) uses `api.js` to communicate with this backend:

- `api.js` contains helper functions: `signupUser()`, `loginUser()`, `sendOTP()`, `verifyOTP()`, `createPost()`, `getPosts()`, etc.
- Frontend stores `currentUser` in `localStorage` (demo auth).

## Notes

- OAuth and SMS verification are scaffolded as placeholders — you'll need to configure external providers to enable them.
- Uploaded images are saved under `backend/uploads/` and served at `/uploads/<filename>`.
- Session is demo-only (localStorage). For production, use JWT or secure server-side sessions.
- Database is SQLite in `travel_social.db` (created on first run).

