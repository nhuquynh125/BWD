# 🔧 Developer Guide - Using Validation & Security Features

## Quick Start

### Using Zod Validation in Routes

```javascript
// Example: Create a new endpoint with validation
const { validateRequest, myNewSchema } = require('./schemas');

app.post('/api/my-endpoint', requireAuth, validateRequest(myNewSchema), async (req, res) => {
  try {
    const validated = req.validatedBody;  // Pre-validated data!
    // ... rest of your code
    res.json({ ok: true, data });
  } catch (e) {
    logger.error({ event: 'MY_ENDPOINT_ERROR', error: e.message });
    res.status(500).json({ error: e.message });
  }
});
```

---

## Adding New Validation Schemas

### Step 1: Define Schema in `schemas.js`

```javascript
// Add to schemas.js
const myNewSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().min(0).max(150).optional(),
}).strict();  // Reject unknown fields
```

### Step 2: Export It

```javascript
module.exports = {
  // ... existing schemas
  myNewSchema,  // Add here
  validateRequest,
};
```

### Step 3: Use in Endpoint

```javascript
const { validateRequest, myNewSchema } = require('./schemas');

app.post('/api/create', requireAuth, validateRequest(myNewSchema), async (req, res) => {
  const { name, email, age } = req.validatedBody;
  // Data is guaranteed to be valid!
});
```

---

## Logging Events

### Log Successful Operations

```javascript
logger.info({
  event: 'USER_ACTION_SUCCESS',
  userId: req.user.userId,
  action: 'create_post',
  postId: newPost.id,
  timestamp: new Date(),
});
```

### Log Errors

```javascript
logger.error({
  event: 'CRITICAL_ERROR',
  error: e.message,
  stack: e.stack,
  userId: req.user.userId,
  endpoint: '/api/critical',
});
```

### Log Security Events

```javascript
logger.warn({
  event: 'SUSPICIOUS_ACTIVITY',
  type: 'multiple_failed_logins',
  email: req.body.email,
  ip: req.ip,
  attempts: 5,
});
```

---

## Understanding Error Responses

### Validation Error Response

```json
{
  "error": "Email không hợp lệ",
  "details": [
    {
      "code": "invalid_string",
      "expected": "email",
      "received": "string",
      "path": ["email"],
      "message": "Invalid email"
    }
  ]
}
```

### Server Error Response

```json
{
  "error": "Database connection timeout"
}
```

### Rate Limited Response

```json
{
  "error": "Quá nhiều yêu cầu từ IP này. Vui lòng thử lại sau.",
  "retryAfter": "15 minutes"
}
```

---

## Common Validation Patterns

### Required String Field

```javascript
z.object({
  name: z.string().min(1).max(100),
})
```

### Optional Field

```javascript
z.object({
  bio: z.string().max(500).optional(),
  // or
  avatar: z.string().optional().or(z.literal('')),
})
```

### Enum (Fixed Options)

```javascript
z.object({
  privacy: z.enum(['public', 'friends', 'private']),
  role: z.enum(['user', 'admin']),
})
```

### Array

```javascript
z.object({
  tags: z.array(z.string()).min(1).max(10),
  interests: z.array(z.string()).optional(),
})
```

### Number with Range

```javascript
z.object({
  age: z.number().min(0).max(150),
  rating: z.number().min(1).max(5),
})
```

---

## Monitoring Logs

### View All Logs

```bash
tail -f logs/combined.log
```

### View Only Errors

```bash
tail -f logs/error.log
```

### Filter Logs by Event

```bash
grep "USER_LOGIN" logs/combined.log
grep "LOGIN_FAILED" logs/combined.log
grep "SUSPICIOUS_ACTIVITY" logs/combined.log
```

### Parse JSON Logs

```bash
cat logs/combined.log | jq '.'
cat logs/combined.log | jq 'select(.event=="POST_CREATE_ERROR")'
```

### Count Errors by Type

```bash
grep -o '"event":"[^"]*"' logs/error.log | sort | uniq -c | sort -rn
```

---

## Testing Endpoints

### Test with Valid Data

```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "securePassword123"
  }'
```

### Test with Invalid Data

```bash
# Email validation will fail
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "invalid-email",
    "password": "securePassword123"
  }'

# Response:
# {
#   "error": "Email không hợp lệ",
#   "details": [...]
# }
```

### Test Rate Limiting

```bash
# Run 6 login attempts quickly
for i in {1..6}; do
  curl -X POST http://localhost:8000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo "\nAttempt $i"
done

# 6th will be blocked:
# {
#   "error": "Quá nhiều yêu cầu..."
# }
```

---

## Debugging Tips

### Check if Validation Is Working

1. Look at `schemas.js` - Is your schema defined?
2. Check `server.js` - Is `validateRequest(yourSchema)` applied to the route?
3. Test with invalid data - Should get 400 error with details
4. Test with valid data - Should process normally

### Check if Logging Is Working

```bash
# Make a request
curl http://localhost:8000/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check logs
cat logs/combined.log | tail -5
# Should see: { "method": "GET", "path": "/api/users/me", "status": 200, ... }
```

### Check Rate Limiting

```bash
# Check rate-limit headers in response
curl -i http://localhost:8000/api/posts

# Look for headers like:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
# X-RateLimit-Reset: 1234567890
```

---

## Best Practices

### ✅ DO:
- Use strict validation with `.strict()` to reject extra fields
- Add limits to string fields (`.min()` and `.max()`)
- Log security events (failed logins, suspicious patterns)
- Use `.optional()` for truly optional fields
- Test validation with edge cases (empty strings, max length, etc.)

### ❌ DON'T:
- Skip validation - always validate user input
- Log sensitive data (passwords, tokens)
- Create validation schemas that are too permissive
- Ignore validation errors - they indicate bad data
- Use old manual validation alongside Zod

---

## Adding to Existing Endpoints

### Before (No Validation)

```javascript
app.patch('/api/users/me', requireAuth, async (req, res) => {
  const { username, bio } = req.body;
  // Might accept invalid data!
});
```

### After (With Validation)

```javascript
// 1. Add schema to schemas.js
const myUpdateSchema = z.object({
  username: z.string().min(3).max(32).optional(),
  bio: z.string().max(500).optional(),
}).strict();

// 2. Export it
// module.exports = { ..., myUpdateSchema };

// 3. Use in endpoint
app.patch('/api/users/me', 
  requireAuth, 
  validateRequest(myUpdateSchema),  // Add this line!
  async (req, res) => {
    const { username, bio } = req.validatedBody;  // Use validatedBody!
    // Data is guaranteed to be valid
  }
);
```

---

## Performance Considerations

- **Validation:** ~1-2ms per request (negligible)
- **Logging:** ~5-10ms per request (varies with disk speed)
- **Rate Limiting:** <1ms per request (in-memory)
- **Total Overhead:** ~10-15ms per request

For comparison: Database queries typically take 10-100ms

---

## Environment-Specific Behavior

### Development
- Console logs appear in terminal
- Detailed error messages shown
- Rate limiting may not be active

### Production
- Only file logs (faster)
- Minimal error details for security
- Rate limiting active
- Set via: `NODE_ENV=production npm start`

---

## Getting Help

### Check Logs
```bash
tail -f logs/combined.log  # See all requests
tail -f logs/error.log     # See only errors
```

### Check Validation
```javascript
// Test schema directly
const schema = authSignupSchema;
try {
  schema.parse({ username: '', email: '', password: '' });
} catch (e) {
  console.log(e.errors);  // See validation errors
}
```

### Check Rate Limiting
```bash
# Look at X-RateLimit-* headers
curl -i http://localhost:8000/api/posts
```

---

## Troubleshooting

**Q: Getting "Dữ liệu không hợp lệ" error**  
A: Check `req.validatedBody` is being used in your handler, and validation schema matches the data

**Q: Logging not working**  
A: Check `logs/` directory exists and is writable. Check NODE_ENV setting.

**Q: Rate limiting not working**  
A: Check rate limiting middleware is applied to your route. Check you're making requests within 15 min window.

**Q: Old manual validation still running**  
A: Remove the old `if (!field)` checks - they're redundant with Zod validation

---

## Summary of Files

| File | Purpose |
|------|---------|
| `schemas.js` | All Zod validation schemas |
| `server.js` | Updated with validation, logging, rate limiting |
| `logs/combined.log` | All requests and events |
| `logs/error.log` | Errors only |

---

**Last Updated:** May 20, 2026  
**Status:** Complete and ready to use
