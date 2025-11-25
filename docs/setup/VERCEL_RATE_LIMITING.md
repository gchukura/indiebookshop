# Vercel Rate Limiting Configuration

This guide explains how to configure rate limiting for your serverless API routes in Vercel.

## Overview

Rate limiting prevents abuse of your API endpoints by limiting the number of requests a client can make within a specific time window. This is especially important for form submission endpoints to prevent spam and DoS attacks.

## Three Options

### Option 1: Vercel WAF (Web Application Firewall) - **Easiest** ⭐

Vercel's built-in WAF provides rate limiting through the dashboard. **This is the recommended approach** if you have a Vercel Pro plan or higher.

### Option 2: In-Function Rate Limiting - **Most Reliable** ⭐⭐

Add rate limiting directly in your serverless function. Works on all plans and is the most reliable.

### Option 3: Edge Middleware - **Advanced**

Custom Edge Middleware gives you full control over rate limiting logic. Works on all Vercel plans but requires Edge Runtime compatibility.

---

## Option 1: Vercel WAF (Recommended)

### Setup via Dashboard

1. **Go to Vercel Dashboard**:
   - Navigate to your project
   - Click on **"Firewall"** tab (or **"Security"** → **"Firewall"**)

2. **Create Rate Limit Rule**:
   - Click **"+ New Rule"** or **"Configure"**
   - Name: `API Rate Limit - Form Submissions`
   - **If condition**:
     - Filter: `Request Path`
     - Operator: `Starts with`
     - Value: `/api/bookstores/submit` or `/api/events`
   - **Then action**:
     - Action: `Rate Limit`
     - Requests: `5`
     - Window: `15 minutes`
   - Click **"Save Rule"**

3. **Repeat for Events Endpoint**:
   - Create another rule for `/api/events` with the same limits

4. **Publish Changes**:
   - Click **"Publish"** to apply to production

### Advantages
- ✅ No code changes required
- ✅ Managed by Vercel
- ✅ Works across all edge locations
- ✅ Easy to adjust via dashboard

### Requirements
- Vercel Pro plan or higher (WAF is a paid feature)

---

## Option 2: In-Function Rate Limiting (Recommended for Hobby Plan)

Add rate limiting directly in your serverless routes. This is the most reliable approach and works on all Vercel plans.

### Implementation

The rate limiting can be added directly to `api/routes-serverless.js` using a simple in-memory store or a service like Upstash Redis.

**Simple In-Memory Approach** (already implemented in server routes):
- Rate limiting is already implemented in `server/routes.ts` using `express-rate-limit`
- You can add the same middleware to `api/routes-serverless.js`

**Upstash Redis Approach** (recommended for production):
- Provides distributed rate limiting across all serverless function instances
- See "Alternative: Upstash Redis" section below

---

## Option 3: Edge Middleware (Advanced)

We've implemented **Vercel Edge Middleware** for rate limiting. This runs at the edge (globally) before requests hit your serverless functions, making it efficient and fast.

### How It Works

1. **Edge Middleware** (`middleware.ts`) runs before every request
2. It checks the client's IP address and request path
3. It tracks request counts in memory (or Redis for distributed systems)
4. If the limit is exceeded, it returns a 429 status code before the request reaches your serverless function

## Setup Instructions

### Step 1: Verify Middleware File

The `middleware.ts` file has been created in your project root. No additional dependencies are required - it uses standard Web APIs compatible with Vercel Edge Runtime.

### Step 2: Configure Vercel

The `middleware.ts` file has been created in your project root. Vercel will automatically detect and use it.

### Step 3: Deploy

1. Commit the `middleware.ts` file:
   ```bash
   git add middleware.ts
   git commit -m "Add rate limiting middleware for API routes"
   git push
   ```

2. Vercel will automatically deploy the middleware on your next deployment.

## Rate Limit Configuration

The middleware is configured with the following limits:

### Submission Endpoints (Strict)
- **`/api/bookstores/submit`**: 5 requests per 15 minutes per IP
- **`/api/events`**: 5 requests per 15 minutes per IP

### General API Routes
- **`/api/*`**: 100 requests per 15 minutes per IP

### Customizing Limits

Edit `middleware.ts` to change the limits:

```typescript
const rateLimitConfigs: Record<string, RateLimitConfig> = {
  '/api/bookstores/submit': {
    windowMs: 15 * 60 * 1000, // Time window (15 minutes)
    max: 5, // Maximum requests
    message: 'Too many submissions from this IP, please try again later.',
  },
  // Add more endpoints as needed
};
```

## How It Works

### Request Flow

1. Client makes request to `/api/bookstores/submit`
2. Edge Middleware intercepts the request
3. Middleware checks rate limit for client IP
4. If allowed: Request continues to serverless function
5. If denied: Returns 429 status with error message

### Rate Limit Headers

The middleware adds standard rate limit headers to all responses:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `Retry-After`: Seconds until client can retry

### Example Response (Rate Limited)

```json
{
  "message": "Too many submissions from this IP, please try again later."
}
```

Status: `429 Too Many Requests`

Headers:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1701234567
Retry-After: 900
```

## Limitations

### In-Memory Storage

The current implementation uses in-memory storage, which means:

- ✅ **Pros**: Simple, fast, no external dependencies
- ⚠️ **Cons**: 
  - Rate limits are per Edge location (not globally shared)
  - Limits reset when Edge functions restart
  - Not suitable for very high-traffic applications

### For Production at Scale

If you need distributed rate limiting (shared across all Edge locations), consider:

1. **Upstash Redis** (Recommended for Vercel):
   ```bash
   npm install @upstash/redis @upstash/ratelimit
   ```
   
   Then update `middleware.ts` to use Upstash instead of in-memory storage.

2. **Vercel KV** (Vercel's key-value store):
   - Available in Vercel Pro plan
   - Provides distributed storage

## Testing

### Test Rate Limiting Locally

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Make multiple requests to test:
   ```bash
   # Make 6 requests (limit is 5)
   for i in {1..6}; do
     curl -X POST http://localhost:3000/api/bookstores/submit \
       -H "Content-Type: application/json" \
       -d '{"test": "data"}'
     echo ""
   done
   ```

3. The 6th request should return `429 Too Many Requests`

### Test in Production

After deploying to Vercel:

```bash
# Make multiple requests
for i in {1..6}; do
  curl -X POST https://your-domain.vercel.app/api/bookstores/submit \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}'
  echo ""
done
```

## Monitoring

### Check Rate Limit Headers

Inspect response headers to see rate limit status:

```bash
curl -I -X POST https://your-domain.vercel.app/api/bookstores/submit \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

Look for:
- `X-RateLimit-Remaining`: How many requests you have left
- `X-RateLimit-Reset`: When the limit resets

### Vercel Analytics

Monitor rate limit hits in Vercel Analytics:
1. Go to your Vercel project dashboard
2. Navigate to Analytics
3. Look for 429 status codes

## Troubleshooting

### Middleware Not Running

1. **Check file location**: `middleware.ts` must be in the project root
2. **Check matcher config**: Ensure `matcher` includes your API routes
3. **Check Vercel logs**: Look for middleware errors in deployment logs

### Rate Limits Too Strict

If legitimate users are hitting rate limits:

1. Increase `max` value in `rateLimitConfigs`
2. Increase `windowMs` to allow more time between requests
3. Consider exempting certain IPs (add to middleware logic)

### Rate Limits Not Working

1. **Check IP detection**: The middleware uses `x-forwarded-for` header
2. **Check path matching**: Ensure your API paths match the config
3. **Check Vercel deployment**: Ensure middleware is deployed

## Alternative: Upstash Redis (Recommended for Production)

For production applications with high traffic, use Upstash Redis for distributed rate limiting:

### Setup Upstash

1. Create account at [upstash.com](https://upstash.com)
2. Create a Redis database
3. Get your REST API URL and token

### Install Dependencies

```bash
npm install @upstash/redis @upstash/ratelimit
```

### Update Middleware

Replace the in-memory storage with Upstash. See [Upstash Rate Limit docs](https://upstash.com/docs/redis/sdks/ratelimit) for implementation.

## Summary

### Option 1: Vercel WAF (Recommended if available)
- ✅ No code required
- ✅ Managed by Vercel
- ✅ Works across all edge locations
- ⚠️ Requires Vercel Pro plan

### Option 2: Edge Middleware (Current Implementation)
- ✅ **Edge Middleware** provides efficient rate limiting at the edge  
- ✅ **Automatic deployment** - Vercel detects and deploys middleware  
- ✅ **Standard headers** - Follows RFC 6585 for rate limit headers  
- ✅ **Configurable** - Easy to adjust limits per endpoint  
- ✅ **Works on all plans** - No paid features required
- ⚠️ **In-memory** - Consider Upstash Redis for production at scale

## Recommendation

1. **If you have Vercel Pro**: Use **Option 1 (WAF)** - it's the easiest and most reliable
2. **If you're on Hobby plan**: Use **Option 2 (In-Function)** - add rate limiting to your serverless routes (see below)
3. **If you need advanced control**: Use **Option 3 (Edge Middleware)** - already configured but may need adjustments

## Quick Start: Add Rate Limiting to Serverless Routes

If you're on the Hobby plan, the easiest approach is to add rate limiting directly in your serverless function:

### Step 1: Install express-rate-limit (if not already installed)

```bash
npm install express-rate-limit
```

### Step 2: Add Rate Limiting to api/routes-serverless.js

Add this at the top of `api/routes-serverless.js`:

```javascript
import rateLimit from 'express-rate-limit';

// Stricter rate limiter for submission endpoints
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many submissions from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to submission routes
app.post('/api/bookstores/submit', submissionLimiter, async (req, res) => {
  // ... existing code
});

app.post('/api/events', submissionLimiter, async (req, res) => {
  // ... existing code
});
```

This is the same approach used in `server/routes.ts` and will work reliably in serverless functions.

The rate limiting is now configured and will protect your form submission endpoints from abuse!

