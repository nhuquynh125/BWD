/**
 * schemas.js – Zod Validation Schemas
 * Central location for request/response validation
 */

const { z } = require('zod');
const xss = require('xss');

// Helper to sanitize strings to prevent XSS
const sanitizeString = (val) => {
  if (typeof val === 'string') return xss(val);
  return val;
};

// ══════════════════════════════════════════════════════════
// AUTH SCHEMAS
// ══════════════════════════════════════════════════════════
const authSignupSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/, 'Username chỉ chứa chữ cái, số, _, -').transform(sanitizeString),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8).max(128, 'Mật khẩu tối đa 128 ký tự'),
});

const authLoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
});

// ══════════════════════════════════════════════════════════
// USER SCHEMAS
// ══════════════════════════════════════════════════════════
const userUpdateSchema = z.object({
  username: z.string().min(3).max(32).transform(sanitizeString).optional(),
  bio: z.string().max(500).transform(sanitizeString).optional(),
  location: z.string().max(100).transform(sanitizeString).optional(),
  website: z.string().url('URL không hợp lệ').transform(sanitizeString).optional().or(z.literal('')),
  phone: z.string().max(20).transform(sanitizeString).optional(),
}).strict();

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Mật khẩu hiện tại là bắt buộc'),
  newPassword: z.string().min(8, 'Mật khẩu mới tối thiểu 8 ký tự').max(128),
});

const userSearchSchema = z.object({
  q: z.string().max(100).transform(sanitizeString).optional(),
});

// ══════════════════════════════════════════════════════════
// POST SCHEMAS
// ══════════════════════════════════════════════════════════
const postCreateSchema = z.object({
  content: z.string().min(1, 'Nội dung không được trống').max(5000, 'Bài viết tối đa 5000 ký tự').transform(sanitizeString),
  location: z.string().max(200).transform(sanitizeString).optional(),
  mood: z.string().max(50).transform(sanitizeString).optional(),
  privacy: z.enum(['public', 'friends', 'private']).default('public'),
});

const postLikeSchema = z.object({
  emotion: z.string().max(10).transform(sanitizeString).optional().default('❤️'),
});

// ══════════════════════════════════════════════════════════
// COMMENT SCHEMAS
// ══════════════════════════════════════════════════════════
const commentCreateSchema = z.object({
  content: z.string().min(1, 'Bình luận không được trống').max(1000, 'Bình luận tối đa 1000 ký tự').transform(sanitizeString),
});

// ══════════════════════════════════════════════════════════
// SETTINGS SCHEMAS
// ══════════════════════════════════════════════════════════
const settingsUpdateSchema = z.object({
  profile_visibility: z.enum(['public', 'friends', 'private']).optional(),
  post_default_privacy: z.enum(['public', 'friends', 'private']).optional(),
  share_location: z.boolean().optional(),
  show_trips: z.boolean().optional(),
  message_perm: z.enum(['everyone', 'followers', 'friends']).optional(),
  two_fa: z.boolean().optional(),
  email_verify: z.boolean().optional(),
  login_alert: z.boolean().optional(),
  notif_like_app: z.boolean().optional(),
  notif_like_email: z.boolean().optional(),
  notif_like_push: z.boolean().optional(),
  notif_comment_app: z.boolean().optional(),
  notif_comment_email: z.boolean().optional(),
  notif_comment_push: z.boolean().optional(),
  notif_follow_app: z.boolean().optional(),
  notif_follow_email: z.boolean().optional(),
  notif_follow_push: z.boolean().optional(),
  notif_msg_app: z.boolean().optional(),
  notif_msg_email: z.boolean().optional(),
  notif_msg_push: z.boolean().optional(),
  language: z.enum(['vi', 'en']).optional(),
  timezone: z.string().max(50).optional(),
  currency: z.string().length(3).optional(),
}).strict();

// ══════════════════════════════════════════════════════════
// AI SCHEMAS
// ══════════════════════════════════════════════════════════
const aiChatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(2000),
  })).min(1),
});

const aiImageAnalysisSchema = z.object({
  prompt: z.string().max(500),
});

const aiItinerarySchema = z.object({
  destination: z.string().min(1).max(200),
  interests: z.array(z.string()).min(1).max(10),
  days: z.number().min(1).max(30),
  budget: z.string().max(50).optional(),
});

// ══════════════════════════════════════════════════════════
// HELPER FUNCTION - Validation middleware
// ══════════════════════════════════════════════════════════
function validateRequest(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.validatedBody = validated;
      next();
    } catch (error) {
      const issues = error.issues || error.errors || [];
      const message = issues[0]?.message || 'Dữ liệu không hợp lệ';
      res.status(400).json({ error: message, details: issues });
    }
  };
}

// ══════════════════════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════════════════════
module.exports = {
  // Auth
  authSignupSchema,
  authLoginSchema,
  
  // Users
  userUpdateSchema,
  passwordChangeSchema,
  userSearchSchema,
  
  // Posts
  postCreateSchema,
  postLikeSchema,
  
  // Comments
  commentCreateSchema,
  
  // Settings
  settingsUpdateSchema,
  
  // AI
  aiChatSchema,
  aiImageAnalysisSchema,
  aiItinerarySchema,
  
  // Helper
  validateRequest,
};
