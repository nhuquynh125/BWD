# Troubleshooting Guide - Travel Social Network

## Before You Start

Make sure you have:
- Python 3.8+ installed
- Internet connection (first time setup needs pip install)
- Port 5000 (backend) and 8000 (frontend) available

Check versions:
```bash
python --version  # Should be 3.8+
pip --version     # Should be installed
```

---

## Setup Issues

### ❌ "python: command not found" or "python is not recognized"

**Problem**: Python not in PATH or not installed

**Solutions**:
1. Install Python from python.org (check "Add to PATH")
2. Use `python3` instead of `python`
3. Use full path: `C:\Users\YourUser\AppData\Local\Programs\Python\Python310\python.exe`

**Test**:
```bash
python --version
```

---

### ❌ "No module named 'flask'"

**Problem**: Virtual environment not activated or dependencies not installed

**Solution**:
```bash
cd backend

# Activate venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt
```

**Test**:
```bash
python -c "import flask; print(flask.__version__)"
```

---

### ❌ "Address already in use" on port 5000 or 8000

**Problem**: Another process using the port

**Solution 1 - Windows**:
```bash
# Find what's using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with the number)
taskkill /PID <PID> /F

# Example:
taskkill /PID 12345 /F
```

**Solution 2**:
Run Flask on a different port:
```bash
flask run --port 5001
```

Then update `api.js`:
```javascript
const API_BASE_URL = 'http://localhost:5001/api';
```

---

### ❌ Database initialization fails

**Problem**: Database file can't be created

**Solution**:
```bash
cd backend

# Delete old database
del travel_social.db  # Windows
rm travel_social.db   # Linux/Mac

# Create new one
python db_init.py
```

---

## Frontend Issues

### ❌ Page won't load at http://localhost:8000/index.html

**Problem**: Frontend server not running or wrong port

**Solution**:
```bash
cd frontend
python -m http.server 8000

# Should show:
# Serving HTTP on 0.0.0.0 port 8000
```

Then open browser: `http://localhost:8000/index.html`

---

### ❌ "CORS error" in browser console

**Problem**: Backend not running or wrong API URL

**Solution**:
1. Check backend is running: `http://localhost:5000` should show JSON response
2. Check `frontend/api.js` has correct URL:
   ```javascript
   const API_BASE_URL = 'http://localhost:5000/api';
   ```
3. Both tabs (frontend at 8000, backend at 5000) must be open

---

### ❌ Signup/Login buttons don't work

**Problem**: API endpoint not working

**Steps to debug**:

1. **Check backend logs** - Look at terminal running Flask
2. **Check browser console** - Press F12, look for errors
3. **Test API directly**:
   ```bash
   # In new terminal
   curl -X POST http://localhost:5000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d "{\"username\":\"test\",\"email\":\"test@test.com\",\"phone\":\"0912345678\",\"password\":\"Test123456\"}"
   
   # Should return JSON with ok: true
   ```

---

## Backend Issues

### ❌ Flask won't start - "AttributeError: module 'app' has no attribute 'x'"

**Problem**: Models not imported correctly

**Solution**:
Make sure `app.py` has this near the top:
```python
from models import User, Post, Image
```

And models are defined in `models.py`

---

### ❌ Image upload fails

**Problem**: `uploads/` folder doesn't exist or is read-only

**Solution**:
```bash
cd backend
mkdir uploads  # Create folder if missing
chmod 755 uploads  # Make it writable (Linux/Mac)
```

---

### ❌ Database is locked

**Problem**: SQLite database in use by another process

**Solution**:
1. Close all terminals and browser
2. Delete database: `del backend/travel_social.db`
3. Restart: `python db_init.py`

---

## Testing Issues

### ❌ test_integration.py fails

**Problem**: Backend not running or API issue

**Solution**:
```bash
# Make sure backend is running first
# In Terminal 1:
cd backend
flask run

# In Terminal 2:
cd backend
python test_integration.py
```

**If still fails**, debug step by step:
```bash
python

# Test imports
import requests
print(requests.__version__)

# Test API connection
resp = requests.get('http://localhost:5000/api')
print(resp.json())
```

---

## Common Error Messages

### ❌ "werkzeug.exceptions.RequestEntityTooLarge"
**Cause**: Image too large (> 10MB)
**Fix**: Compress image or increase MAX_CONTENT_LENGTH in app.py

### ❌ "FileNotFoundError: upload folder"
**Cause**: uploads folder missing
**Fix**: Create it: `mkdir backend/uploads`

### ❌ "IntegrityError: UNIQUE constraint failed"
**Cause**: Duplicate email or username
**Fix**: Use different email/username in signup

### ❌ "TypeError: 'NoneType' object is not subscriptable"
**Cause**: Missing required field in POST request
**Fix**: Check all required fields are sent (username, email, phone, password for signup)

---

## Performance Issues

### Slow image upload

**Problem**: Large files or network latency

**Solution**:
1. Compress images before upload
2. Check file size: `ls -lh image.jpg`
3. Try smaller test file first

### Dashboard loading slowly

**Problem**: Too many posts to load

**Solution**: 
Backend limits to 50 posts by default. To change in `posts.py`:
```python
@posts_bp.route('', methods=['GET'])
def get_posts():
    posts = Post.query.limit(100).all()  # Change 100 to your limit
```

---

## Debugging Tips

### 1. Check Browser Console
Press `F12` in browser, go to Console tab, look for red errors

### 2. Check Backend Logs
Look at terminal running Flask - errors appear there

### 3. Check Network Tab
In browser DevTools, Network tab shows API requests/responses

### 4. Test API with Curl
```bash
# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@test.com\",\"password\":\"Test123456\"}"
```

### 5. Check localStorage
In browser Console:
```javascript
console.log(localStorage.currentUser)
console.log(localStorage.userToken)
```

### 6. Verify Database
```bash
cd backend

# View database
python -c "from models import User; from app import db, app; app.app_context().push(); print([u.username for u in User.query.all()])"
```

---

## Clean Restart

If everything is broken:

```bash
# Kill all processes
# Windows Task Manager: Find "Python" or "flask", right-click Kill
# Or: taskkill /IM python.exe /F

# Delete everything fresh
cd TravelSocialNetwork/backend
del travel_social.db
rmdir venv /s /q  # Windows
rm -rf venv        # Linux/Mac

# Start from setup
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python db_init.py
flask run
```

---

## Getting Help

**Check these files for documentation:**
- `README.md` - Overview
- `SETUP_GUIDE.md` - Detailed setup
- `backend/README.md` - Backend docs
- `test_integration.py` - API examples

**Common issues**:
1. Backend not running (check terminal 1)
2. Wrong port (default 5000 backend, 8000 frontend)
3. CORS error (both servers need running)
4. Venv not activated (check prompt shows venv)

---

## Still Stuck?

1. Check all 3 prerequisites above
2. Read error message carefully (usually tells you what's wrong)
3. Google the error message
4. Delete and try fresh install
5. Check Python version is 3.8+

**Good luck! 🚀**
