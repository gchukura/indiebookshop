# Testing Rate Limiting

This guide explains how to test that rate limiting is working correctly on your production deployment.

## Quick Test

Use the provided test script:

```bash
./test-rate-limiting.sh indiebookshop.com
```

Or test manually:

```bash
# Make 6 requests (limit is 5)
for i in {1..6}; do
  echo "Request $i:"
  curl -X POST https://indiebookshop.com/api/bookstores/submit \
    -H "Content-Type: application/json" \
    -d '{
      "submitterEmail": "test@example.com",
      "submitterName": "Test",
      "isNewSubmission": true,
      "bookstoreData": {
        "name": "Test Bookstore '$i'",
        "street": "123 Test St",
        "city": "Portland",
        "state": "OR",
        "zip": "97204",
        "description": "Testing rate limiting"
      }
    }'
  echo ""
  sleep 0.5
done
```

## Expected Results

- **Requests 1-5**: Should return `201 Created` (success)
- **Request 6**: Should return `429 Too Many Requests` with message:
  ```json
  {
    "message": "Too many submissions from this IP, please try again later."
  }
  ```

## Check Rate Limit Headers

Inspect the response headers to see rate limit information:

```bash
curl -I -X POST https://indiebookshop.com/api/bookstores/submit \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

Look for these headers:
- `X-RateLimit-Limit`: Maximum requests allowed (should be `5`)
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `Retry-After`: Seconds until you can retry (only on 429 responses)

## Testing Events Endpoint

Test the events endpoint rate limiting:

```bash
for i in {1..6}; do
  curl -X POST https://indiebookshop.com/api/events \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Test Event '$i'",
      "description": "Testing rate limiting",
      "date": "2025-12-25",
      "time": "19:00",
      "bookstoreId": 1
    }'
  echo ""
  sleep 0.5
done
```

## Troubleshooting

### Rate Limiting Not Working

1. **Check deployment**: Ensure the latest code with rate limiting is deployed
2. **Check logs**: Look at Vercel function logs for rate limit middleware execution
3. **Verify middleware**: Check that `express-rate-limit` is installed and imported correctly

### Rate Limiting Too Strict

If legitimate users are hitting limits:

1. Edit `api/routes-serverless.js`
2. Adjust the `max` value in `submissionLimiter`:
   ```javascript
   const submissionLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 10, // Increase from 5 to 10
     // ...
   });
   ```
3. Commit and redeploy

### Testing Different IPs

To test from a different IP (to bypass your own rate limit):

1. Use a VPN
2. Use a different network
3. Wait 15 minutes for the rate limit window to reset

## Rate Limit Configuration

Current settings:
- **Submission endpoints** (`/api/bookstores/submit`, `/api/events`):
  - Limit: 5 requests
  - Window: 15 minutes
  - Per: IP address

- **General API routes** (`/api/*`):
  - Limit: 100 requests
  - Window: 15 minutes
  - Per: IP address

These can be adjusted in `api/routes-serverless.js` and `server/routes.ts`.

