# Warning #4 Fix: 3XX Redirect Chains Optimization

**Date:** January 3, 2026  
**Issue:** Multiple redirect hops instead of direct redirects  
**Status:** ✅ Partially Fixed (Code Optimization Complete, Vercel Dashboard Configuration Needed)

## Problem

Multiple redirect hops were occurring instead of direct redirects:
- `http://indiebookshop.com/` → 308 → `https://indiebookshop.com/` → 307 → `https://www.indiebookshop.com/`
- `http://www.indiebookshop.com/` → 308 → `https://www.indiebookshop.com/`
- `https://indiebookshop.com/` → 307 → `https://www.indiebookshop.com/`

This wastes crawl budget and slows page loads.

## Solution

### 1. Code Optimization (✅ Completed)

**Updated:** `vercel.json`

Optimized redirect rules to:
- Use consistent 301 (permanent) redirects
- Handle HTTP to HTTPS + www redirects more efficiently
- Add explicit redirect for HTTP www subdomain

**Changes:**
```json
"redirects": [
  {
    "source": "/:path*",
    "has": [
      {
        "type": "host",
        "value": "indiebookshop.com"
      }
    ],
    "destination": "https://www.indiebookshop.com/:path*",
    "permanent": true,
    "statusCode": 301
  },
  {
    "source": "/:path*",
    "has": [
      {
        "type": "host",
        "value": "www.indiebookshop.com"
      },
      {
        "type": "header",
        "key": "x-forwarded-proto",
        "value": "http"
      }
    ],
    "destination": "https://www.indiebookshop.com/:path*",
    "permanent": true,
    "statusCode": 301
  }
]
```

### 2. Vercel Dashboard Configuration (⚠️ Required)

**Note:** Vercel automatically handles HTTP→HTTPS redirects (308), which creates the first hop. To eliminate this completely, you need to configure DNS-level redirects or use Vercel's domain settings.

**Steps to Complete:**

1. **Go to Vercel Dashboard:**
   - Navigate to your project
   - Go to **Settings** → **Domains**

2. **Configure Domain Redirects:**
   - Ensure `indiebookshop.com` is configured to redirect to `www.indiebookshop.com`
   - Ensure `www.indiebookshop.com` is the primary domain
   - Set up redirect rules in Vercel's domain settings (if available)

3. **Alternative: DNS-Level Redirects:**
   - Configure DNS provider to handle redirects
   - Point all variants to `https://www.indiebookshop.com`
   - This eliminates the HTTP→HTTPS hop at the DNS level

## Expected Results

### Before
- `http://indiebookshop.com/` → 308 → `https://indiebookshop.com/` → 307 → `https://www.indiebookshop.com/` (2 hops)
- `http://www.indiebookshop.com/` → 308 → `https://www.indiebookshop.com/` (1 hop)
- `https://indiebookshop.com/` → 307 → `https://www.indiebookshop.com/` (1 hop)

### After (With Vercel Configuration)
- `http://indiebookshop.com/` → 301 → `https://www.indiebookshop.com/` (1 hop, if DNS configured)
- `http://www.indiebookshop.com/` → 301 → `https://www.indiebookshop.com/` (1 hop)
- `https://indiebookshop.com/` → 301 → `https://www.indiebookshop.com/` (1 hop)

**Note:** The HTTP→HTTPS redirect (308) is handled automatically by Vercel for security. This is a best practice and cannot be eliminated without DNS-level configuration.

## Benefits

1. **SEO:** Reduced redirect chains conserve crawl budget
2. **Performance:** Faster page loads with fewer redirect hops
3. **User Experience:** Smoother navigation with direct redirects
4. **Consistency:** All redirects use 301 (permanent) status code

## Testing

### Manual Testing

1. **Test non-www redirect:**
   ```bash
   curl -I http://indiebookshop.com/
   # Should redirect to: https://www.indiebookshop.com/
   # Status: 301 (or 308 for HTTP→HTTPS, then 301)
   ```

2. **Test HTTP www redirect:**
   ```bash
   curl -I http://www.indiebookshop.com/
   # Should redirect to: https://www.indiebookshop.com/
   # Status: 301
   ```

3. **Test HTTPS non-www redirect:**
   ```bash
   curl -I https://indiebookshop.com/
   # Should redirect to: https://www.indiebookshop.com/
   # Status: 301
   ```

4. **Verify final destination:**
   ```bash
   curl -I https://www.indiebookshop.com/
   # Should return: 200 OK (no redirect)
   ```

### Using Online Tools

1. **Redirect Checker:**
   - Use https://httpstatus.io/ or similar tool
   - Enter `http://indiebookshop.com/`
   - Verify redirect chain length

2. **Ahrefs Site Audit:**
   - Run Ahrefs audit after deployment
   - Check that Warning #4 is resolved
   - Verify redirect chains are optimized

## Limitations

1. **Vercel HTTP→HTTPS Redirect:**
   - Vercel automatically redirects HTTP to HTTPS (308)
   - This is a security best practice and cannot be disabled
   - The first hop (HTTP→HTTPS) will always occur unless DNS handles it

2. **DNS-Level Configuration:**
   - To eliminate all redirect hops, configure DNS provider
   - Some DNS providers support redirect records
   - This requires DNS provider configuration, not code changes

## Next Steps

1. ✅ **Code optimization complete** - `vercel.json` updated
2. ⚠️ **Vercel dashboard configuration** - Configure domain redirects in Vercel
3. ⚠️ **DNS configuration (optional)** - Configure DNS-level redirects for zero hops
4. ⚠️ **Testing** - Verify redirect chains after deployment
5. ⚠️ **Monitoring** - Check Ahrefs audit after changes

## Related Documentation

- [Vercel Redirects Documentation](https://vercel.com/docs/edge-network/redirects)
- [Vercel Domain Configuration](https://vercel.com/docs/domains)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
