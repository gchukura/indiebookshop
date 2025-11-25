# Frontend-Backend Alignment

This document describes how the frontend forms align with the backend API and database schema.

## Bookshop Submission Form

### Frontend Sends:
- `name`, `street`, `city`, `state`, `zip` (required)
- `description`, `website`, `phone`, `hours` (optional, as strings)
- `featureIds` (comma-separated string like `"1,2,3"`)
- `submitterEmail`, `submitterName`, `isNewSubmission`

### Backend Processing:
- ✅ Converts `featureIds` from comma-separated string to array automatically
- ✅ Handles `hours` as string (tries to parse as JSON for `hours_json`, falls back to string)
- ✅ Maps `imageUrl` to `"imageUrl"` column (camelCase in schema)
- ✅ Maps `featureIds` to `feature_ids` (text array in schema)
- ✅ Sets `live: false` for new submissions (pending review)

### Database Schema:
- Uses `bookstores` table
- Column names: `imageUrl` (camelCase), `hours_json` (jsonb), `feature_ids` (text[])
- Optional fields: `county`, `imageUrl`, `latitude`, `longitude` (not collected in form)

**Status:** ✅ **ALIGNED** - No changes needed

## Event Submission Form

### Frontend Sends:
- `title`, `description`, `date`, `time` (required)
- `bookstoreId` (integer, required)

### Backend Processing:
- ✅ Accepts both `bookstoreId` and `bookshopId` (form sends `bookstoreId`)
- ✅ Validates bookshop exists before saving
- ✅ Maps `bookstoreId` to `bookshop_id` column

### Database Schema:
- Uses `events` table
- Fields: `bookshop_id`, `title`, `description`, `date`, `time`
- Foreign key constraint to `bookstores(id)`

**Status:** ✅ **ALIGNED** - No changes needed

## Summary

Both forms are correctly aligned with the backend:
- ✅ Data formats match
- ✅ Field names match (with backend handling variations)
- ✅ Required fields are present
- ✅ Optional fields are handled gracefully
- ✅ Type conversions are handled automatically

