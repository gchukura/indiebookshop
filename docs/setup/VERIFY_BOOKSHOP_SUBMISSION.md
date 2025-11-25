# Verify Bookshop Submission Setup

## Current Status ✅

The code is **already set up** to write to the `bookstores` table when a user submits the form.

## What Happens When Form is Submitted

1. **Form sends data** to `/api/bookstores/submit` endpoint
2. **Serverless route** (`api/routes-serverless.js`) receives the data
3. **Data is prepared** with these fields:
   ```javascript
   {
     name, street, city, state, zip, county,
     description, image_url, website, phone, hours,
     latitude, longitude, feature_ids,
     live: false,  // Not published yet
     submitter_email, submitter_name, submission_type: 'new'
   }
   ```
4. **Inserted into Supabase** `bookstores` table
5. **Email notification** sent (if SendGrid configured)

## Required Supabase Table Structure

The `bookstores` table needs these columns:

### Standard Columns (should already exist):
- `id` (auto-increment)
- `name` (text)
- `street` (text)
- `city` (text)
- `state` (text)
- `zip` (text)
- `county` (text, nullable)
- `description` (text)
- `image_url` (text, nullable)
- `website` (text, nullable)
- `phone` (text, nullable)
- `hours` (jsonb, nullable)
- `latitude` (text, nullable)
- `longitude` (text, nullable)
- `feature_ids` (integer array, nullable)
- `live` (boolean, default true)
- `created_at` (timestamp, auto)

### Submission Tracking Columns (may need to be added):
- `submitter_email` (text, nullable)
- `submitter_name` (text, nullable)
- `submission_type` (text, nullable)

## Quick Test

To test if it's working:

1. **Check if SERVICE_ROLE_KEY is set**:
   ```bash
   # In Vercel or .env file
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

2. **Submit a test form** at `/submit` page

3. **Check Supabase Dashboard**:
   - Go to Table Editor → `bookstores`
   - Look for new row with `live: false`
   - Check if `submitter_email` and `submitter_name` are populated

4. **Check server logs** for any errors

## If Submission Fails

Common issues:
1. **Missing SERVICE_ROLE_KEY** - Get from Supabase Dashboard → Settings → API
2. **Missing columns** - Add `submitter_email`, `submitter_name`, `submission_type` to table
3. **RLS blocking** - Service role should bypass, but check policies
4. **Column type mismatch** - Ensure `feature_ids` is array type

## Next Steps

1. Verify Supabase table has all required columns
2. Add SERVICE_ROLE_KEY to environment variables
3. Test form submission
4. Verify data appears in Supabase

