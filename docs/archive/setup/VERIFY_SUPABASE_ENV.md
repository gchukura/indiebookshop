# Verify Supabase Environment Variables in Vercel

This guide helps you verify that Supabase environment variables are correctly set in your Vercel project.

## Required Environment Variables

For serverless functions to save form submissions, you need:

1. **`SUPABASE_URL`** - Your Supabase project URL
   - Format: `https://[project-id].supabase.co`
   - Example: `https://imhpnaucjyswcgpwrvdz.supabase.co`

2. **`SUPABASE_SERVICE_ROLE_KEY`** - Service role key (bypasses RLS)
   - Format: Long JWT token starting with `eyJ...`
   - ⚠️ **Keep this secret** - never commit to git

## How to Check in Vercel Dashboard

### Step 1: Access Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`indiebookshop` or similar)
3. Click on **Settings** in the top navigation
4. Click on **Environment Variables** in the left sidebar

### Step 2: Verify Variables

Look for these variables in the list:

- ✅ `SUPABASE_URL` - Should show your Supabase project URL
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Should show `••••••••` (hidden for security)

### Step 3: Check Environment Scope

Make sure the variables are set for the correct environments:
- **Production** ✅ (required)
- **Preview** (optional, but recommended)
- **Development** (optional, for local testing)

### Step 4: Verify Values

Click on each variable to see:
- **Name**: Should match exactly (case-sensitive)
- **Value**: 
  - `SUPABASE_URL` should start with `https://` and end with `.supabase.co`
  - `SUPABASE_SERVICE_ROLE_KEY` should be a long JWT token

## How to Get Your Supabase Values

If variables are missing or incorrect:

### Get SUPABASE_URL

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Find **Project URL** - this is your `SUPABASE_URL`
   - Should look like: `https://[project-id].supabase.co`

### Get SUPABASE_SERVICE_ROLE_KEY

1. In the same **Settings** → **API** page
2. Find **Project API keys** section
3. Look for **`service_role`** key (NOT the `anon` key)
4. Click **Reveal** to show the key
5. Copy the entire key (it's a long JWT token)

⚠️ **Important**: 
- Use the **`service_role`** key, NOT the `anon` key
- The service role key bypasses Row Level Security (RLS)
- Keep it secret - never share or commit to git

## Adding/Updating Variables in Vercel

### Add New Variable

1. In Vercel Dashboard → Settings → Environment Variables
2. Click **Add New**
3. Enter:
   - **Key**: `SUPABASE_URL` (or `SUPABASE_SERVICE_ROLE_KEY`)
   - **Value**: Your Supabase URL or service role key
   - **Environment**: Select Production (and Preview if desired)
4. Click **Save**

### Update Existing Variable

1. Find the variable in the list
2. Click the **•••** menu (three dots)
3. Select **Edit**
4. Update the value
5. Click **Save**

### After Adding/Updating

**Important**: After adding or updating environment variables, you must **redeploy** for changes to take effect:

1. Go to **Deployments** tab
2. Click **•••** on the latest deployment
3. Select **Redeploy**
4. Or push a new commit to trigger automatic deployment

## Testing if Variables Are Set

### Method 1: Check Function Logs

1. Go to Vercel Dashboard → Your Project
2. Click **Functions** in the sidebar
3. Find `/api/serverless.js`
4. Check the **Logs** tab
5. Look for warnings like:
   ```
   Serverless: Supabase environment variables are missing. SUBMISSIONS WILL NOT BE SAVED.
   ```
   - If you see this warning, variables are NOT set
   - If you don't see it, variables are likely set

### Method 2: Test Submission Endpoint

Try submitting a form and check the response:

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
      "description": "Testing Supabase connection"
    }
  }'
```

**Expected Results:**
- ✅ **201 Created**: Submission saved to Supabase (variables are set correctly)
- ❌ **500 Error**: Check Vercel function logs for specific error
- ❌ **"Database not configured"**: Variables are missing or incorrect

### Method 3: Check Deployment Logs

1. Go to **Deployments** → Latest deployment
2. Click on the deployment
3. Check **Build Logs** and **Function Logs**
4. Look for Supabase-related errors or warnings

## Troubleshooting

### Variables Not Working After Adding

1. **Redeploy**: Environment variables only apply to new deployments
2. **Check spelling**: Variable names are case-sensitive
3. **Check environment**: Make sure variables are set for Production
4. **Check for extra spaces**: Copy/paste might include spaces

### "Supabase client is NULL" Error

This means one or both variables are missing:
- Check Vercel Dashboard → Settings → Environment Variables
- Verify both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Redeploy after adding variables

### "Invalid API key" Error

- Verify you're using the **service_role** key, not the `anon` key
- Check that the key was copied completely (they're very long)
- Make sure there are no extra spaces or line breaks

### Variables Set But Still Not Working

1. **Redeploy**: Changes require a new deployment
2. **Check function logs**: Look for specific error messages
3. **Verify Supabase project**: Make sure the project is active
4. **Check RLS policies**: Service role key should bypass RLS, but verify table permissions

## Quick Checklist

- [ ] `SUPABASE_URL` is set in Vercel
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel
- [ ] Both variables are set for **Production** environment
- [ ] Values are correct (URL format, service_role key)
- [ ] Project has been **redeployed** after setting variables
- [ ] No warnings in Vercel function logs about missing variables
- [ ] Form submissions return 201 (not 500) when testing

## Need Help?

If you're still having issues:
1. Check Vercel function logs for specific error messages
2. Verify Supabase project is active and accessible
3. Test Supabase connection directly using the Supabase dashboard
4. Check that the `bookstores` table exists and has the correct schema

