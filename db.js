/**
 * db.js – LUNAR HERITAGE v5 – MongoDB / Mongoose Layer
 * All schemas consolidated here for clarity.
 * Phase 2 additions: Badge, PointEvent, UserGamification, Booking, Reconstruction
 */

const mongoose = require('mongoose');

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/lunar_heritage';

async function initDb() {
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 6000 });
    console.log('✅  MongoDB connected:', MONGODB_URI);
  } catch (err) {
    console.error('❌  MongoDB connection failed:', err.message);
    // Allow server to keep running so static assets still load
  }
}

/* ── helpers ────────────────────────────────────────────── */
const VIRTUAL_ID = {
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.__v;
    },
  },
};

/* ══════════════════════════════════════════════════════════
   USERS
══════════════════════════════════════════════════════════ */
const userSchema = new mongoose.Schema(
  {
    username:      { type: String, required: true, unique: true, trim: true },
    email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:         { type: String, default: null },
    bio:           { type: String, default: null },
    location:      { type: String, default: null },
    website:       { type: String, default: null },
    avatar_url:    { type: String, default: null },
    cover_url:     { type: String, default: null },
    password_hash: { type: String, default: '' },
    google_id:     { type: String, default: null, sparse: true },
    is_active:     { type: Boolean, default: true },
    passport:      [{
      artifactId: { type: String, required: true },
      discoveredAt: { type: Date, default: Date.now },
      stickerUrl: { type: String, default: null },
      region: { type: String, default: null }
    }],
    points:        { type: Number, default: 0 },
    role:          { type: String, enum: ['user', 'admin'], default: 'user' }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, ...VIRTUAL_ID }
);

/* ══════════════════════════════════════════════════════════
   POSTS
══════════════════════════════════════════════════════════ */
const postSchema = new mongoose.Schema(
  {
    user_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content:     { type: String, required: true },
    location:    { type: String, default: null },
    mood:        { type: String, default: null },
    privacy:     { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
    image_url:   { type: String, default: null },
    likes_count: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, ...VIRTUAL_ID }
);
postSchema.index({ privacy: 1, created_at: -1 });
postSchema.index({ user_id: 1, created_at: -1 });

/* ══════════════════════════════════════════════════════════
   POST LIKES
══════════════════════════════════════════════════════════ */
const postLikeSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    emotion: { type: String, default: '❤️' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);
postLikeSchema.index({ user_id: 1, post_id: 1 }, { unique: true });

/* ══════════════════════════════════════════════════════════
   COMMENTS
══════════════════════════════════════════════════════════ */
const commentSchema = new mongoose.Schema(
  {
    post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, ...VIRTUAL_ID }
);
commentSchema.index({ post_id: 1, created_at: 1 });

/* ══════════════════════════════════════════════════════════
   FOLLOWS
══════════════════════════════════════════════════════════ */
const followSchema = new mongoose.Schema(
  {
    follower_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    following_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);
followSchema.index({ follower_id: 1, following_id: 1 }, { unique: true });

/* ══════════════════════════════════════════════════════════
   MESSAGES
══════════════════════════════════════════════════════════ */
const messageSchema = new mongoose.Schema(
  {
    sender_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content:      { type: String, default: '' },
    image_url:    { type: String, default: null },
    message_type: { type: String, default: 'user' }, // 'user' | 'system'
    is_read:      { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, ...VIRTUAL_ID }
);
messageSchema.index({ sender_id: 1, receiver_id: 1, created_at: -1 });

/* ══════════════════════════════════════════════════════════
   LANTERNS
══════════════════════════════════════════════════════════ */
const lanternSchema = new mongoose.Schema(
  {
    user_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name:     { type: String, required: true },
    story:    { type: String, required: true },
    heritage: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, ...VIRTUAL_ID }
);

/* ══════════════════════════════════════════════════════════
   HERITAGE SITES  (dynamic, replaces the hardcoded array)
══════════════════════════════════════════════════════════ */
const heritageSiteSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true },
    name_en:    { type: String, default: '' },
    province:   { type: String, default: '' },
    // Multi-category array – e.g. ['Thiên nhiên', 'Địa chất']
    categories: {
      type: [String],
      default: ['Văn hóa'],
    },
    // Legacy single-type kept for backward compat (auto-derived)
    type:       { type: String, default: 'văn hóa' },
    unesco:     { type: Number, default: null },
    page:       { type: String, default: null },
    lat:        { type: Number, default: null },
    lng:        { type: Number, default: null },
    image_url:  { type: String, default: null },
    description:{ type: String, default: '' },
    is_active:  { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, ...VIRTUAL_ID }
);

/* ══════════════════════════════════════════════════════════
   USER SETTINGS
══════════════════════════════════════════════════════════ */
const userSettingsSchema = new mongoose.Schema(
  {
    user_id:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    profile_visibility:  { type: String, default: 'public' },
    post_default_privacy:{ type: String, default: 'public' },
    hide_email:          { type: Boolean, default: true },
    hide_phone:          { type: Boolean, default: true },
    share_location:      { type: Boolean, default: false },
    show_trips:          { type: Boolean, default: true },
    message_perm:        { type: String, default: 'followers' },
    show_online_status:  { type: Boolean, default: true },
    two_fa:              { type: Boolean, default: false },
    email_verify:        { type: Boolean, default: true },
    login_alert:         { type: Boolean, default: true },
    // notifications
    notif_like_app:      { type: Boolean, default: true },
    notif_like_email:    { type: Boolean, default: false },
    notif_like_push:     { type: Boolean, default: true },
    notif_comment_app:   { type: Boolean, default: true },
    notif_comment_email: { type: Boolean, default: true },
    notif_comment_push:  { type: Boolean, default: true },
    notif_follow_app:    { type: Boolean, default: true },
    notif_follow_email:  { type: Boolean, default: false },
    notif_follow_push:   { type: Boolean, default: true },
    notif_msg_app:       { type: Boolean, default: true },
    notif_msg_email:     { type: Boolean, default: false },
    notif_msg_push:      { type: Boolean, default: true },
    // locale
    language:    { type: String, default: 'vi' },
    timezone:    { type: String, default: 'GMT+7' },
    currency:    { type: String, default: 'VND' },
    distance_unit:{ type: String, default: 'km' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

/* ══════════════════════════════════════════════════════════
   AI CHAT HISTORY
══════════════════════════════════════════════════════════ */
const aiChatHistorySchema = new mongoose.Schema(
  {
    user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    session_id: { type: String, required: true, default: 'default' },
    role:       { type: String, required: true }, // 'user' | 'assistant'
    content:    { type: String, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);
aiChatHistorySchema.index({ user_id: 1, session_id: 1, created_at: 1 });

/* ══════════════════════════════════════════════════════════
   BADGE  (gamification badge definitions)
══════════════════════════════════════════════════════════ */
const badgeSchema = new mongoose.Schema(
  {
    slug:        { type: String, unique: true, required: true },
    name:        { type: Map, of: String, default: {} },
    description: { type: Map, of: String, default: {} },
    iconUrl:     { type: String, default: null },
    rarity:      { type: String, enum: ['common', 'rare', 'epic', 'legendary'], default: 'common' },
    criteria: {
      type:      { type: String, enum: ['visit_count', 'site_specific', 'streak', 'points_threshold'], default: 'visit_count' },
      threshold: { type: Number, default: 1 },
      siteSlug:  { type: String, default: null }
    }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, ...VIRTUAL_ID }
);

/* ══════════════════════════════════════════════════════════
   POINT EVENT  (immutable gamification audit log)
══════════════════════════════════════════════════════════ */
const pointEventSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    points:   { type: Number, required: true },
    action:   { type: String, enum: ['site_visit', 'comment', 'share', 'quiz_complete', 'booking', 'daily_login', 'first_visit'], required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);
pointEventSchema.index({ userId: 1, created_at: -1 });
pointEventSchema.index({ created_at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // TTL 90 days

/* ══════════════════════════════════════════════════════════
   USER GAMIFICATION  (per-user aggregate state)
══════════════════════════════════════════════════════════ */
const earnedBadgeSchema = new mongoose.Schema({
  badgeId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Badge', required: true },
  earnedAt:  { type: Date, default: Date.now },
  siteSlug:  { type: String, default: null }
}, { _id: false });

const userGamificationSchema = new mongoose.Schema(
  {
    userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
    totalPoints:   { type: Number, default: 0, index: true },
    weeklyPoints:  { type: Number, default: 0 },
    monthlyPoints: { type: Number, default: 0 },
    badges:        { type: [earnedBadgeSchema], default: [] },
    streakDays:    { type: Number, default: 0 },
    lastActiveDate:{ type: Date, default: null }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, ...VIRTUAL_ID }
);

/* ══════════════════════════════════════════════════════════
   BOOKING
══════════════════════════════════════════════════════════ */
const bookingSchema = new mongoose.Schema(
  {
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    siteSlug:     { type: String, required: true, index: true },
    siteName:     { type: String, default: '' },
    tourType:     { type: String, enum: ['standard', 'premium', 'private'], default: 'standard' },
    tourDate:     { type: Date, required: true },
    participants: { type: Number, required: true, min: 1, max: 50 },
    totalAmount:  { type: Number, required: true },
    currency:     { type: String, default: 'VND' },
    confirmCode:  { type: String, default: null },
    status: {
      type:    String,
      enum:    ['pending', 'confirmed', 'cancelled', 'refunded'],
      default: 'pending',
      index:   true
    },
    payment: {
      provider:     { type: String, enum: ['vnpay', 'momo', 'cash', null], default: null },
      transactionId:{ type: String, default: null },
      paidAt:       { type: Date, default: null },
      status:       { type: String, default: null }
    },
    statusHistory: [{
      status:    String,
      changedAt: { type: Date, default: Date.now },
      reason:    String
    }],
    notes: { type: String, default: '' }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, ...VIRTUAL_ID }
);
bookingSchema.index({ userId: 1, status: 1, created_at: -1 });

/* ══════════════════════════════════════════════════════════
   AI RECONSTRUCTION
══════════════════════════════════════════════════════════ */
const reconstructionSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    jobId:       { type: String, required: true, unique: true },
    originalUrl: { type: String, default: null },
    resultUrl:   { type: String, default: null },
    prompt:      { type: String, default: '' },
    mode:        { type: String, enum: ['sketch', 'colorize', 'full'], default: 'full' },
    status:      { type: String, enum: ['processing', 'completed', 'failed'], default: 'processing' },
    errorMsg:    { type: String, default: null }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, ...VIRTUAL_ID }
);
reconstructionSchema.index({ userId: 1, created_at: -1 });

/* ══════════════════════════════════════════════════════════
   FRIENDSHIP  (accepted connections)
══════════════════════════════════════════════════════════ */
const friendshipSchema = new mongoose.Schema(
  {
    user_low:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    user_high: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);
friendshipSchema.index({ user_low: 1, user_high: 1 }, { unique: true });

const friendRequestSchema = new mongoose.Schema(
  {
    sender_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status:      { type: String, default: 'pending' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
friendRequestSchema.index({ sender_id: 1, receiver_id: 1 }, { unique: true });

/* ── Export all models ──────────────────────────────────── */
module.exports = {
  initDb,
  User:              mongoose.model('User',              userSchema),
  Post:              mongoose.model('Post',              postSchema),
  PostLike:          mongoose.model('PostLike',          postLikeSchema),
  Comment:           mongoose.model('Comment',           commentSchema),
  Follow:            mongoose.model('Follow',            followSchema),
  Message:           mongoose.model('Message',           messageSchema),
  Lantern:           mongoose.model('Lantern',           lanternSchema),
  HeritageSite:      mongoose.model('HeritageSite',      heritageSiteSchema),
  UserSettings:      mongoose.model('UserSettings',      userSettingsSchema),
  AiChatHistory:     mongoose.model('AiChatHistory',     aiChatHistorySchema),
  Friendship:        mongoose.model('Friendship',        friendshipSchema),
  FriendRequest:     mongoose.model('FriendRequest',     friendRequestSchema),
  // Phase 2 — Gamification
  Badge:             mongoose.model('Badge',             badgeSchema),
  PointEvent:        mongoose.model('PointEvent',        pointEventSchema),
  UserGamification:  mongoose.model('UserGamification',  userGamificationSchema),
  // Phase 2 — Booking
  Booking:           mongoose.model('Booking',           bookingSchema),
  // Phase 3 — AI Reconstruction
  Reconstruction:    mongoose.model('Reconstruction',    reconstructionSchema),
};
