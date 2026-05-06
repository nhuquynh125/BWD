from app import db, app
from models import User, Post, Image

with app.app_context():
    db.create_all()
    print('✓ Database initialized successfully.')
