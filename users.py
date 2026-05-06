from flask import Blueprint, request, jsonify, current_app
from app import db
from models import User

users_bp = Blueprint('users', __name__)


@users_bp.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'user not found'}), 404

    avatar_url = f"/uploads/{user.avatar}" if user.avatar else None

    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'phone': user.phone,
        'bio': user.bio,
        'location': user.location,
        'website': user.website,
        'avatar': avatar_url,
        'created_at': user.created_at.isoformat()
    })


@users_bp.route('/users/<int:user_id>', methods=['PATCH'])
def update_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'user not found'}), 404

    data = request.get_json() or {}
    username = data.get('username')
    bio = data.get('bio')
    location = data.get('location')
    website = data.get('website')

    if username:
        # enforce uniqueness for username
        existing = User.query.filter(User.username == username, User.id != user.id).first()
        if existing:
            return jsonify({'error': 'username already exists'}), 400
        user.username = username

    if bio is not None:
        user.bio = bio
    if location is not None:
        user.location = location
    if website is not None:
        user.website = website

    db.session.commit()

    avatar_url = f"/uploads/{user.avatar}" if user.avatar else None

    return jsonify({'ok': True, 'user': {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'phone': user.phone,
        'bio': user.bio,
        'location': user.location,
        'website': user.website,
        'avatar': avatar_url,
        'created_at': user.created_at.isoformat()
    }})
