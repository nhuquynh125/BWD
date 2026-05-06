import os
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from app import db
from models import Post, Image, User

ALLOWED_EXT = {'png', 'jpg', 'jpeg', 'gif'}

posts_bp = Blueprint('posts', __name__)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXT

@posts_bp.route('/posts', methods=['GET'])
def list_posts():
    posts = Post.query.order_by(Post.created_at.desc()).limit(50).all()
    results = []
    for p in posts:
        images = [f"/uploads/{img.filename}" for img in p.images]
        results.append({
            'id': p.id,
            'user_id': p.user_id,
            'content': p.content,
            'location': p.location,
            'mood': p.mood,
            'privacy': p.privacy,
            'likes': p.likes,
            'images': images,
            'created_at': p.created_at.isoformat()
        })
    return jsonify(results)

@posts_bp.route('/posts', methods=['POST'])
def create_post():
    # For demo we accept form-data; expect 'user_id' as simple auth placeholder
    user_id = request.form.get('user_id')
    content = request.form.get('content')
    location = request.form.get('location')
    mood = request.form.get('mood')
    privacy = request.form.get('privacy') or 'public'

    if not user_id or not content:
        return jsonify({'error': 'user_id and content required'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'user not found'}), 404

    post = Post(user_id=user.id, content=content, location=location, mood=mood, privacy=privacy)
    db.session.add(post)
    db.session.commit()

    # Handle images
    files = request.files.getlist('images')
    saved = []
    if files:
        for f in files:
            if f and allowed_file(f.filename):
                filename = secure_filename(f.filename)
                # ensure unique
                base, ext = os.path.splitext(filename)
                filename = f"{base}_{post.id}{ext}"
                save_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
                f.save(save_path)
                img = Image(post_id=post.id, filename=filename)
                db.session.add(img)
                saved.append(filename)
        db.session.commit()

    return jsonify({'ok': True, 'post_id': post.id, 'images': saved})

@posts_bp.route('/posts/<int:post_id>/like', methods=['POST'])
def like_post(post_id):
    post = Post.query.get(post_id)
    if not post:
        return jsonify({'error': 'post not found'}), 404
    # simple toggle: expect json {action: 'like'/'unlike'}
    data = request.get_json() or {}
    action = data.get('action', 'like')
    if action == 'like':
        post.likes = (post.likes or 0) + 1
    else:
        post.likes = max((post.likes or 0) - 1, 0)
    db.session.commit()
    return jsonify({'ok': True, 'likes': post.likes})

@posts_bp.route('/posts/<int:post_id>', methods=['GET'])
def get_post(post_id):
    p = Post.query.get(post_id)
    if not p:
        return jsonify({'error': 'post not found'}), 404
    images = [f"/uploads/{img.filename}" for img in p.images]
    return jsonify({
        'id': p.id,
        'user_id': p.user_id,
        'content': p.content,
        'location': p.location,
        'mood': p.mood,
        'privacy': p.privacy,
        'likes': p.likes,
        'images': images,
        'created_at': p.created_at.isoformat()
    })
