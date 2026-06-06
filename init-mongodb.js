/**
 * init-mongodb.js – Initialize MongoDB collections with indexes
 * Run this once before starting the app: node init-mongodb.js
 */
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lunar_heritage';

async function initMongoDB() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    
    const db = mongoose.connection.db;
    
    console.log('📋 Creating collections...');
    
    // Users collection
    if (!await db.listCollections({ name: 'users' }).hasNext()) {
      await db.createCollection('users');
      await db.collection('users').createIndex({ username: 1 });
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      console.log('✅ users collection created');
    }
    
    // Posts collection
    if (!await db.listCollections({ name: 'posts' }).hasNext()) {
      await db.createCollection('posts');
      await db.collection('posts').createIndex({ user_id: 1 });
      await db.collection('posts').createIndex({ created_at: -1 });
      await db.collection('posts').createIndex({ privacy: 1 });
      console.log('✅ posts collection created');
    }
    
    // Post likes
    if (!await db.listCollections({ name: 'post_likes' }).hasNext()) {
      await db.createCollection('post_likes');
      await db.collection('post_likes').createIndex({ user_id: 1, post_id: 1 }, { unique: true });
      await db.collection('post_likes').createIndex({ post_id: 1 });
      console.log('✅ post_likes collection created');
    }
    
    // Comments
    if (!await db.listCollections({ name: 'comments' }).hasNext()) {
      await db.createCollection('comments');
      await db.collection('comments').createIndex({ post_id: 1 });
      await db.collection('comments').createIndex({ user_id: 1 });
      console.log('✅ comments collection created');
    }
    
    // Follows
    if (!await db.listCollections({ name: 'follows' }).hasNext()) {
      await db.createCollection('follows');
      await db.collection('follows').createIndex({ follower_id: 1, following_id: 1 }, { unique: true });
      await db.collection('follows').createIndex({ following_id: 1 });
      console.log('✅ follows collection created');
    }
    
    // Messages
    if (!await db.listCollections({ name: 'messages' }).hasNext()) {
      await db.createCollection('messages');
      await db.collection('messages').createIndex({ sender_id: 1 });
      await db.collection('messages').createIndex({ receiver_id: 1 });
      await db.collection('messages').createIndex({ created_at: -1 });
      console.log('✅ messages collection created');
    }
    
    // Lanterns
    if (!await db.listCollections({ name: 'lanterns' }).hasNext()) {
      await db.createCollection('lanterns');
      await db.collection('lanterns').createIndex({ user_id: 1 });
      console.log('✅ lanterns collection created');
    }
    
    // Notifications
    if (!await db.listCollections({ name: 'notifications' }).hasNext()) {
      await db.createCollection('notifications');
      await db.collection('notifications').createIndex({ user_id: 1 });
      await db.collection('notifications').createIndex({ created_at: -1 });
      console.log('✅ notifications collection created');
    }
    
    // Heritage sites
    if (!await db.listCollections({ name: 'heritage_sites' }).hasNext()) {
      await db.createCollection('heritage_sites');
      await db.collection('heritage_sites').createIndex({ slug: 1 }, { unique: true });
      console.log('✅ heritage_sites collection created');
    }
    
    console.log('\n✅ MongoDB initialization complete!');
    console.log('📊 Collections and indexes ready.');
    console.log('🚀 You can now start the app: npm start\n');
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error initializing MongoDB:', error.message);
    process.exit(1);
  }
}

initMongoDB();
