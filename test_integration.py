#!/usr/bin/env python3
"""
Integration test script for Travel Social Network API.
Run this after starting the backend Flask server.

Usage:
    python test_integration.py
"""

import requests
import json
import sys
from datetime import datetime

API_BASE = "http://localhost:5000/api"

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def test_signup():
    log("TEST: Signup")
    payload = {
        "username": "testuser",
        "email": "test@example.com",
        "phone": "0912345678",
        "password": "SecurePass123"
    }
    try:
        resp = requests.post(f"{API_BASE}/auth/signup", json=payload)
        data = resp.json()
        if resp.status_code == 200 and data.get('ok'):
            log(f"✓ Signup successful. User ID: {data.get('user_id')}")
            return data.get('user_id')
        else:
            log(f"✗ Signup failed: {data}")
            return None
    except Exception as e:
        log(f"✗ Signup error: {e}")
        return None

def test_login():
    log("TEST: Login")
    payload = {
        "email": "test@example.com",
        "password": "SecurePass123"
    }
    try:
        resp = requests.post(f"{API_BASE}/auth/login", json=payload)
        data = resp.json()
        if resp.status_code == 200 and data.get('ok'):
            log(f"✓ Login successful. User: {data.get('user')}")
            return data.get('user', {}).get('id')
        else:
            log(f"✗ Login failed: {data}")
            return None
    except Exception as e:
        log(f"✗ Login error: {e}")
        return None

def test_send_otp():
    log("TEST: Send OTP")
    payload = {"phone": "0987654321"}
    try:
        resp = requests.post(f"{API_BASE}/auth/phone/send_otp", json=payload)
        data = resp.json()
        if resp.status_code == 200 and data.get('ok'):
            log(f"✓ OTP sent. Check console for dev OTP.")
            return True
        else:
            log(f"✗ Send OTP failed: {data}")
            return False
    except Exception as e:
        log(f"✗ Send OTP error: {e}")
        return False

def test_verify_otp():
    log("TEST: Verify OTP")
    # For testing, we manually check the log from send_otp
    # Default test OTP would be generated server-side
    log("⚠ Skipping OTP verify (requires manual OTP from send_otp)")
    return False

def test_create_post(user_id):
    log("TEST: Create Post")
    if not user_id:
        log("✗ No user_id provided")
        return None
    
    payload = {
        "user_id": user_id,
        "content": "Thử nghiệm API - Vịnh Hạ Long thật đẹp!",
        "location": "ha-long",
        "mood": "excited",
        "privacy": "public"
    }
    try:
        resp = requests.post(f"{API_BASE}/posts", data=payload)
        data = resp.json()
        if resp.status_code == 200 and data.get('ok'):
            log(f"✓ Post created. Post ID: {data.get('post_id')}")
            return data.get('post_id')
        else:
            log(f"✗ Create post failed: {data}")
            return None
    except Exception as e:
        log(f"✗ Create post error: {e}")
        return None

def test_get_post(post_id):
    log("TEST: Get Post")
    if not post_id:
        log("✗ No post_id provided")
        return None
    
    try:
        resp = requests.get(f"{API_BASE}/posts/{post_id}")
        data = resp.json()
        if resp.status_code == 200 and data.get('id'):
            log(f"✓ Post retrieved: {data.get('content')[:50]}...")
            return data
        else:
            log(f"✗ Get post failed: {data}")
            return None
    except Exception as e:
        log(f"✗ Get post error: {e}")
        return None

def test_list_posts():
    log("TEST: List Posts")
    try:
        resp = requests.get(f"{API_BASE}/posts")
        data = resp.json()
        if resp.status_code == 200:
            log(f"✓ Posts listed. Total: {len(data)} posts")
            if data:
                log(f"  Sample post: {data[0].get('content')[:50]}...")
            return data
        else:
            log(f"✗ List posts failed: {data}")
            return None
    except Exception as e:
        log(f"✗ List posts error: {e}")
        return None

def test_like_post(post_id):
    log("TEST: Like Post")
    if not post_id:
        log("✗ No post_id provided")
        return None
    
    payload = {"action": "like"}
    try:
        resp = requests.post(f"{API_BASE}/posts/{post_id}/like", json=payload)
        data = resp.json()
        if resp.status_code == 200 and data.get('ok'):
            log(f"✓ Post liked. Total likes: {data.get('likes')}")
            return True
        else:
            log(f"✗ Like post failed: {data}")
            return False
    except Exception as e:
        log(f"✗ Like post error: {e}")
        return False

def main():
    log("=" * 50)
    log("Travel Social Network - API Integration Tests")
    log("=" * 50)
    
    # Check if API is reachable
    try:
        resp = requests.get(f"{API_BASE.replace('/api', '')}")
        log("✓ Backend is running")
    except Exception as e:
        log(f"✗ Backend not reachable: {e}")
        log("  Start backend with: python app.py")
        sys.exit(1)
    
    log("")
    
    # Run tests
    user_id = test_signup()
    if user_id:
        test_login()
        post_id = test_create_post(user_id)
        if post_id:
            test_get_post(post_id)
            test_like_post(post_id)
    
    test_list_posts()
    test_send_otp()
    
    log("")
    log("=" * 50)
    log("Tests completed!")
    log("=" * 50)

if __name__ == "__main__":
    main()
