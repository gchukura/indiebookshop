# Debugging Submission 500 Errors

If you're getting 500 errors on form submissions, follow these steps to identify and fix the issue.

## Step 1: Check Vercel Function Logs

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click **Functions** in the left sidebar
4. Find `/api/serverless.js`
5. Click on it
6. Go to **Logs** tab
7. Look for recent errors (they'll have timestamps)

## Step 2: Identify the Error Type

Look for these common error patterns in the logs:

### Error: "Supabase environment variables are missing"
**Fix**: Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel Settings → Environment Variables

### Error: "relation 'bookstores' does not exist"
**Fix**: The `bookstores` table doesn't exist in Supabase. Create it using your schema.

### Error: "column 'X' does not exist"
**Fix**: The table schema doesn't match. Check column names in Supabase match the code.

### Error: "new row violates row-level security policy"
**Fix**: RLS policies are blocking inserts. The service role key should bypass RLS, but verify it's set correctly.

### Error: "null value in column 'X' violates not-null constraint"
**Fix**: A required field is missing. Check the submission data includes all required fields.

### Error: "invalid input syntax for type integer"
**Fix**: A field that should be a number is being sent as a string or invalid value.

### Error: Rate limiting related
**Fix**: If you see rate limit errors, the trust proxy setting might not be working. Check `app.set('trust proxy', true)` is set.

## Step 3: Test Locally (Optional)

If you want to test locally to see detailed errors:

```bash
npm run dev
# Then test: curl -X POST http://localhost:3000/api/bookstores/submit ...
```

Local errors will show in your terminal with full stack traces.

## Step 4: Check Environment Variables

Verify all required variables are set in Vercel:

**Required for Submissions:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (not anon key)

**Optional (for email notifications):**
- `SENDGRID_API_KEY` - SendGrid API key
- `SENDGRID_FROM_EMAIL` - Verified sender email
- `ADMIN_EMAIL` - Where to send notifications

## Step 5: Verify Supabase Table Schema

Check that your `bookstores` table in Supabase has these columns (at minimum):

- `id` (serial/auto-increment)
- `name` (text, not null)
- `street` (text, not null)
- `city` (text, not null)
- `state` (text, not null)
- `zip` (text, not null)
- `description` (text, not null)
- `imageUrl` (text, nullable) - Note: camelCase
- `website` (text, nullable)
- `phone` (text, nullable)
- `hours_json` (jsonb, nullable)
- `latitude` (text, nullable)
- `longitude` (text, nullable)
- `feature_ids` (text[], nullable)
- `live` (boolean, default true)
- `created_at` (timestamp, auto-generated)

## Step 6: Test with Minimal Data

Try submitting with just required fields:

```bash
curl -X POST https://www.indiebookshop.com/api/bookstores/submit \
  -H "Content-Type: application/json" \
  -d '{
    "submitterEmail": "test@example.com",
    "submitterName": "Test",
    "isNewSubmission": true,
    "bookstoreData": {
      "name": "Test Bookstore",
      "street": "123 Test St",
      "city": "Portland",
      "state": "OR",
      "zip": "97204",
      "description": "Test"
    }
  }'
```

## Common Issues and Solutions

### Issue: Generic "Failed to process" error
**Solution**: Check Vercel logs for the actual error. The generic message means an exception was caught.

### Issue: Works locally but fails in production
**Solution**: 
- Environment variables might not be set in Vercel
- Vercel might be using cached code - try redeploying
- Check Vercel function logs for production-specific errors

### Issue: Rate limiting errors
**Solution**: 
- Verify `app.set('trust proxy', true)` is in `api/serverless.js`
- Check rate limit configuration in `api/routes-serverless.js`

### Issue: Module not found errors
**Solution**: 
- All modules should be inlined in `api/routes-serverless.js`
- Check that dynamic imports were removed
- Verify all dependencies are in `package.json`

## Getting Help

If you're still stuck:
1. Copy the **full error message** from Vercel logs
2. Include the **error stack trace** if available
3. Note which **environment** (production/preview)
4. Check if it works **locally**

Share the error details and we can help fix it!

