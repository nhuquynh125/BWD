from flask import Blueprint, request, jsonify, current_app
from app import db
from models import User
import random

auth_bp = Blueprint('auth', __name__)

# In-memory OTP store for demo (DO NOT use in production)
OTP_STORE = {}

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json() or {}
    username = data.get('username')
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')

    if not username or not email or not password:
        return jsonify({'error': 'username, email and password are required'}), 400

    if User.query.filter((User.username==username) | (User.email==email)).first():
        return jsonify({'error': 'username or email already exists'}), 400

    user = User(username=username, email=email, phone=phone)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({'ok': True, 'user_id': user.id})

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'email and password required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'invalid credentials'}), 401

    # NOTE: For demo we return basic info. For production, return JWT or session.
    return jsonify({'ok': True, 'user': {'id': user.id, 'username': user.username, 'email': user.email}})

@auth_bp.route('/phone/send_otp', methods=['POST'])
def send_otp():
    data = request.get_json() or {}
    phone = data.get('phone')
    if not phone:
        return jsonify({'error': 'phone required'}), 400

    otp = str(random.randint(100000, 999999))
    OTP_STORE[phone] = otp
    # In production send SMS via provider
    current_app.logger.info(f"[DEV OTP] send to {phone}: {otp}")
    return jsonify({'ok': True, 'message': 'OTP sent (dev-only)'}), 200

@auth_bp.route('/phone/verify', methods=['POST'])
def verify_otp():
    data = request.get_json() or {}
    phone = data.get('phone')
    otp = data.get('otp')
    if not phone or not otp:
        return jsonify({'error': 'phone and otp required'}), 400

    expected = OTP_STORE.get(phone)
    if expected and expected == otp:
        # find or create user by phone
        user = User.query.filter_by(phone=phone).first()
        if not user:
            user = User(username=f'user_{phone[-4:]}', email=f'{phone}@local', phone=phone)
            user.set_password('')
            db.session.add(user)
            db.session.commit()
        return jsonify({'ok': True, 'user': {'id': user.id, 'phone': user.phone}})
    return jsonify({'error': 'invalid otp'}), 401

@auth_bp.route('/google', methods=['GET'])
def google_oauth():
    # Placeholder endpoint: in production implement OAuth flow
    return jsonify({'ok': False, 'message': 'Google OAuth not configured. Implement with client ID/secret.'}), 501
