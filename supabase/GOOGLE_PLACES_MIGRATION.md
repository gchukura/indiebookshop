# Google Places API Migration Guide

This guide explains how to apply the database migration to add Google Places API enrichment fields to the `bookstores` table.

## Migration Files

- **`add-google-places-fields.sql`** - Main migration script to add Google Places fields
- **`rollback-google-places-fields.sql`** - Rollback script to remove the fields (if needed)

## What This Migration Adds

The migration adds the following columns to the `bookstores` table:

1. **`google_place_id`** (TEXT) - Google Places API Place ID
2. **`google_rating`** (TEXT) - Average rating (stored as text, e.g., "4.5")
3. **`google_review_count`** (INTEGER) - Total number of reviews
4. **`google_description`** (TEXT) - Editorial summary from Google Places
5. **`google_photos`** (JSONB) - Array of photo references
6. **`google_reviews`** (JSONB) - Array of review objects
7. **`google_price_level`** (INTEGER) - Price level (0-4 scale)
8. **`google_data_updated_at`** (TIMESTAMP) - Last refresh timestamp

The migration also creates:
- Indexes on `google_place_id`, `google_data_updated_at`, and `google_rating` for performance
- Constraints to validate `price_level` range (0-4) and `rating` format
- Column comments for documentation

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `add-google-places-fields.sql`
5. Click **Run** (or press `Cmd/Ctrl + Enter`)
6. Verify the migration completed successfully

### Option 2: Using Supabase CLI

If you're using Supabase CLI for local development:

```bash
# Make sure you're in the project root
cd /path/to/indiebookshop

# Apply the migration
supabase db push

# Or if you have migrations set up:
supabase migration new add_google_places_fields
# Then copy the SQL into the new migration file
```

### Option 3: Using psql

If you have direct database access:

```bash
psql -h your-db-host -U postgres -d postgres -f supabase/add-google-places-fields.sql
```

## Verifying the Migration

After running the migration, verify it worked by running this query in the SQL Editor:

```sql
-- Check that all columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'bookstores'
  AND column_name LIKE 'google_%'
ORDER BY column_name;
```

You should see all 8 Google Places columns listed.

## Rollback (If Needed)

If you need to revert the migration:

1. **WARNING**: This will permanently delete all Google Places data!
2. Go to Supabase SQL Editor
3. Copy and paste the contents of `rollback-google-places-fields.sql`
4. Run the script

## Next Steps

After applying the migration:

1. Set your `GOOGLE_PLACES_API_KEY` environment variable
2. Run the enrichment script:
   ```bash
   tsx scripts/enrich-google-data.ts
   ```
3. The Google Places data will start appearing on bookshop detail pages

## Troubleshooting

### Migration Fails with "Column Already Exists"

If you see this error, it means the columns already exist. You can either:
- Skip the migration (if columns are already there)
- Use `DROP COLUMN IF EXISTS` first, then re-run the migration

### Constraint Violation Errors

If you get constraint errors when inserting data:
- Check that `google_price_level` is between 0-4
- Check that `google_rating` is a valid decimal number format

### Performance Issues

The migration creates indexes, but if you have a large number of bookstores, you may want to:
- Run `ANALYZE public.bookstores;` after the migration
- Monitor query performance and adjust indexes as needed

## Support

If you encounter any issues with the migration, check:
1. Supabase logs for detailed error messages
2. That you have the correct permissions (you need ALTER TABLE permissions)
3. That the `bookstores` table exists and is in the `public` schema


