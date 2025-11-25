# Fix: "Invalid supabaseUrl" Error

## Error Message

```
Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.
```

## What This Means

The `SUPABASE_URL` environment variable in Vercel is set, but the value is invalid. The Supabase client requires a valid URL starting with `http://` or `https://`.

## Common Causes

1. **Missing `https://` prefix**
   - ❌ Wrong: `imhpnaucjyswcgpwrvdz.supabase.co`
   - ✅ Correct: `https://imhpnaucjyswcgpwrvdz.supabase.co`

2. **Extra whitespace**
   - ❌ Wrong: ` https://imhpnaucjyswcgpwrvdz.supabase.co ` (spaces)
   - ✅ Correct: `https://imhpnaucjyswcgpwrvdz.supabase.co`

3. **Empty string**
   - ❌ Wrong: `` (empty)
   - ✅ Correct: `https://imhpnaucjyswcgpwrvdz.supabase.co`

4. **Wrong variable name**
   - ❌ Wrong: Using `VITE_SUPABASE_URL` (that's for client-side)
   - ✅ Correct: Use `SUPABASE_URL` (for server-side)

## How to Fix

### Step 1: Check Current Value in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Your Project → **Settings** → **Environment Variables**
3. Find `SUPABASE_URL`
4. Click to view/edit the value

### Step 2: Verify the Format

The URL should:
- ✅ Start with `https://`
- ✅ End with `.supabase.co`
- ✅ Have no spaces before or after
- ✅ Look like: `https://[project-id].supabase.co`

### Step 3: Get the Correct Value from Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. **Settings** → **API**
4. Find **Project URL**
5. Copy the entire URL (it should start with `https://`)

### Step 4: Update in Vercel

1. In Vercel, edit the `SUPABASE_URL` variable
2. Paste the full URL from Supabase (including `https://`)
3. Make sure there are no extra spaces
4. Click **Save**

### Step 5: Redeploy

**Important**: After updating environment variables, you must redeploy:

1. Go to **Deployments** tab
2. Click **•••** on the latest deployment
3. Select **Redeploy**
4. Or push a new commit to trigger automatic deployment

## Verification

After redeploying, test the form again. The error should be gone if the URL is correct.

## Still Getting the Error?

If you're still seeing the error after fixing:

1. **Double-check the URL format** - must start with `https://`
2. **Check for hidden characters** - copy/paste directly from Supabase
3. **Verify environment scope** - make sure it's set for **Production**
4. **Redeploy** - environment variables only apply to new deployments

## Quick Test

You can verify the URL format is correct by checking:
- Does it start with `https://`? ✅
- Does it end with `.supabase.co`? ✅
- Are there any spaces? ❌ (should be none)
- Is it the full URL from Supabase Settings → API? ✅

If all are ✅, the URL should work!

