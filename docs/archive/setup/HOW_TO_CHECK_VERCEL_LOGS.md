# How to Check Vercel Logs for Errors

Since the function might not appear in the Functions section, here are alternative ways to check logs:

## Method 1: Check Deployment Logs (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click on **Deployments** tab
4. Click on the **latest deployment** (the most recent one)
5. Look for these sections:
   - **Build Logs** - Shows build-time errors
   - **Function Logs** - Shows runtime errors (this is what you need!)
   - **Runtime Logs** - Alternative name for function logs

6. In Function Logs, look for errors with timestamps matching when you tested
7. Filter by searching for: `Error`, `Serverless`, `bookstore submission`

## Method 2: Check Real-Time Logs

1. Go to Vercel Dashboard → Your Project
2. Click **Logs** in the top navigation (if available)
3. This shows real-time logs from your functions
4. Make a test submission while watching the logs

## Method 3: Use Vercel CLI (If Installed)

If you have Vercel CLI installed:

```bash
vercel logs [your-project-url] --follow
```

This streams logs in real-time.

## Method 4: Check via API Route Directly

Since your route is `/api/bookstores/submit`, the function might be listed as:
- `api/bookstores/submit` (if Vercel auto-detects it)
- Or bundled under the main serverless function

## What to Look For

In the logs, search for:

### Error Messages:
- `Error processing bookstore submission`
- `Serverless: Error`
- `Supabase`
- `Cannot find module`
- `Database not configured`

### Success Messages:
- `Submission saved to Supabase`
- `Email sent successfully`

## Quick Test to Generate Logs

1. Make a test submission:
   ```bash
   curl -X POST https://www.indiebookshop.com/api/bookstores/submit \
     -H "Content-Type: application/json" \
     -d '{"submitterEmail":"test@example.com","submitterName":"Test","isNewSubmission":true,"bookstoreData":{"name":"Test","street":"123","city":"Portland","state":"OR","zip":"97204","description":"Test"}}'
   ```

2. Immediately check the deployment logs
3. Look for entries with the current timestamp
4. Copy any error messages you see

## If You Still Can't Find Logs

1. **Check the deployment status**: Make sure the latest deployment completed successfully
2. **Check the timestamp**: Make sure you're looking at logs from after your test
3. **Try a different deployment**: Check if there are multiple deployments and look at the most recent one
4. **Check Vercel's status page**: Sometimes logging can be delayed

## Alternative: Check Response Headers

You can also check what the server is returning:

```bash
curl -v -X POST https://www.indiebookshop.com/api/bookstores/submit \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}' 2>&1 | grep -i "x-vercel\|error\|server"
```

This might show Vercel-specific headers that indicate which function handled the request.

