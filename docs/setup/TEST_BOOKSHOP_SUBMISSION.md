# Testing Bookshop Submission to Supabase

## Current Implementation

The form submission flow:
1. User fills out form at `/submit` page
2. Form sends POST to `/api/bookstores/submit`
3. Serverless route saves to Supabase `bookstores` table
4. Email notification sent (if configured)

## What We're Writing

The code writes these fields to the `bookstores` table:

### Required Fields (from form):
- `name` - Bookshop name
- `street` - Street address
- `city` - City
- `state` - State abbreviation
- `zip` - Zip code
- `description` - Description
- `website` - Website URL (optional)
- `phone` - Phone number (optional)
- `hours` - Business hours (optional, JSON object)
- `feature_ids` - Array of feature IDs (optional)
- `latitude` - Latitude (optional)
- `longitude` - Longitude (optional)

### Submission Tracking Fields:
- `submitter_email` - Email of person submitting
- `submitter_name` - Name of person submitting
- `submission_type` - 'new' or 'change'
- `live` - Set to `false` (pending review)

### Column Name Mapping

The code maps form fields to Supabase columns:
- `imageUrl` → `image_url`
- `featureIds` → `feature_ids`
- `submitterEmail` → `submitter_email`
- `submitterName` → `submitter_name`
- `submissionType` → `submission_type`

## Testing Steps

1. **Check Supabase Table Structure**
   - Verify `bookstores` table exists
   - Check if submission tracking columns exist:
     - `submitter_email` (text, nullable)
     - `submitter_name` (text, nullable)
     - `submission_type` (text, nullable)

2. **Test Form Submission**
   - Fill out the form at `/submit`
   - Submit the form
   - Check browser console for errors
   - Check server logs for Supabase errors

3. **Verify Data in Supabase**
   - Go to Supabase dashboard
   - Check `bookstores` table
   - Look for new row with `live: false`
   - Verify all fields are populated correctly

## Potential Issues

1. **Missing Columns**: If `submitter_email`, `submitter_name`, or `submission_type` don't exist in Supabase, the insert will fail
2. **Column Type Mismatch**: Ensure `feature_ids` is an array type in Supabase
3. **RLS Policies**: Service role key should bypass RLS, but verify permissions
4. **Environment Variables**: Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

## Next Steps

If submission fails, check:
- Supabase error logs
- Server console logs
- Browser network tab for API response
- Verify environment variables are set correctly

