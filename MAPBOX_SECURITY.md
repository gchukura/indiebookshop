# Mapbox Token Security Guide

## Overview

The `/api/config` endpoint exposes the Mapbox access token to the client, which is **required** for Mapbox GL JS to function. This document outlines the security measures in place and best practices for securing your Mapbox token.

## Security Measures Implemented

### 1. Rate Limiting
- **Stricter rate limiting**: The `/api/config` endpoint has a dedicated rate limiter (20 requests per 15 minutes per IP)
- **General rate limiting**: All API routes are rate-limited (100 requests per 15 minutes per IP)
- **Development bypass**: Rate limiting is disabled in development mode for easier testing

### 2. Security Headers
The endpoint sets the following security headers:
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking attacks

### 3. CORS Protection
- Only allows requests from the same origin by default
- Can be configured via `ALLOWED_ORIGINS` environment variable for specific domains
- Format: `ALLOWED_ORIGINS=https://example.com,https://www.example.com`

### 4. Token Validation
- Validates that the token is a public token (starts with `pk.`)
- Logs a warning if a secret token (starts with `sk.`) is detected

## Required Mapbox Dashboard Configuration

**CRITICAL**: You must configure restrictions in your Mapbox account dashboard to prevent unauthorized use of your token.

### Step 1: Access Token Settings
1. Log in to [Mapbox Account](https://account.mapbox.com/)
2. Navigate to **Access Tokens** section
3. Select your token (or create a new public token)

### Step 2: Configure URL Restrictions
1. Under **Token Restrictions**, enable **URL restrictions**
2. Add your allowed domains:
   - `https://yourdomain.com/*`
   - `https://www.yourdomain.com/*`
   - `http://localhost:*` (for development only)
   - `http://127.0.0.1:*` (for development only)

### Step 3: Configure Scopes
Limit the token to only necessary scopes:
- ✅ `styles:read` - Required for loading map styles
- ✅ `fonts:read` - Required for map fonts
- ✅ `datasets:read` - If using custom datasets
- ❌ `styles:write` - NOT needed for client-side usage
- ❌ `fonts:write` - NOT needed for client-side usage
- ❌ Any write permissions - NOT needed for client-side usage

### Step 4: Set Rate Limits
1. Configure rate limits in Mapbox dashboard
2. Recommended limits:
   - **Requests per minute**: 600 (10 requests/second)
   - **Requests per day**: 50,000 (adjust based on expected traffic)

### Step 5: Use Public Token
- ✅ **Use a public token** (starts with `pk.`)
- ❌ **Never use a secret token** (starts with `sk.`) in client-side code
- Secret tokens should only be used server-side

## Environment Variable Configuration

### Required
```bash
MAPBOX_ACCESS_TOKEN=pk.your_public_token_here
```

### Optional
```bash
# Comma-separated list of allowed origins for CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## Monitoring and Alerts

### Recommended Monitoring
1. **Monitor token usage** in Mapbox dashboard for unusual patterns
2. **Set up alerts** for:
   - Unusual spike in requests
   - Requests from unexpected domains
   - Rate limit violations

### Logging
The application logs warnings if:
- A non-public token is detected (should start with `pk.`)
- Rate limits are exceeded

## Best Practices

1. ✅ **Always use public tokens** for client-side code
2. ✅ **Restrict URLs** to your domain(s) only
3. ✅ **Limit scopes** to minimum required permissions
4. ✅ **Set rate limits** in Mapbox dashboard
5. ✅ **Monitor usage** regularly
6. ✅ **Rotate tokens** periodically (every 90 days recommended)
7. ❌ **Never commit tokens** to version control
8. ❌ **Never use secret tokens** in client-side code

## Troubleshooting

### Token Not Working
- Verify token starts with `pk.` (public token)
- Check URL restrictions in Mapbox dashboard
- Verify domain matches exactly (including protocol and www)
- Check browser console for CORS errors

### Rate Limit Errors
- Check rate limits in Mapbox dashboard
- Verify you're not exceeding the configured limits
- Consider increasing limits if legitimate traffic is being blocked

### CORS Errors
- Verify `ALLOWED_ORIGINS` environment variable is set correctly
- Check that the requesting domain matches an allowed origin
- Ensure protocol (http/https) matches exactly

## Additional Resources

- [Mapbox Access Tokens Documentation](https://docs.mapbox.com/accounts/guides/tokens/)
- [Mapbox Token Security Best Practices](https://docs.mapbox.com/help/troubleshooting/how-to-use-mapbox-securely/)
- [Mapbox Rate Limits](https://docs.mapbox.com/api/overview/#rate-limits)

