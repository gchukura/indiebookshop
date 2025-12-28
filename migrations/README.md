# Database Migrations

## Adding Slug Column to Bookstores Table

### Problem
The bookstores table doesn't have a `slug` column, causing all bookshop lookups by slug to fail. This results in blank pages and missing meta tags.

### Solution
Run the migration script to add the slug column and populate it for all existing bookshops.

### Steps

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Create a new query

2. **Run the migration script**
   - Copy and paste the contents of `add-slug-column.sql`
   - Execute the script
   - This will:
     - Add the `slug` column
     - Create an index for fast lookups
     - Generate slugs for all existing bookshops
     - Handle duplicate slugs
     - Add triggers to auto-generate slugs for new bookshops

3. **Verify the migration**
   - Run the queries in `verify-slug-migration.sql`
   - Check that:
     - All bookshops have slugs
     - No duplicate slugs exist
     - Slug generation matches the format

### Important Notes

- **Slug Generation**: The SQL function `generate_slug()` matches the JavaScript `generateSlugFromName()` function exactly
- **Duplicate Handling**: If multiple bookshops have the same name, the slug will include the city name
- **Auto-Generation**: New bookshops will automatically get slugs generated via database triggers
- **Performance**: The slug column is indexed for fast lookups

### Testing After Migration

1. Check a few bookshops have slugs:
   ```sql
   SELECT id, name, slug FROM bookstores LIMIT 10;
   ```

2. Test the API:
   ```bash
   curl https://www.indiebookshop.com/api/bookshop-slug?slug=fables-books
   ```

3. Visit a bookshop page:
   - https://www.indiebookshop.com/bookshop/fables-books
   - Should show the bookshop page (not blank)
   - Should have meta tags in page source

### Rollback (if needed)

If you need to rollback the migration:

```sql
-- Remove triggers
DROP TRIGGER IF EXISTS trigger_set_bookstore_slug_insert ON bookstores;
DROP TRIGGER IF EXISTS trigger_set_bookstore_slug_update ON bookstores;

-- Remove function
DROP FUNCTION IF EXISTS set_bookstore_slug();
DROP FUNCTION IF EXISTS generate_slug(TEXT);

-- Remove index
DROP INDEX IF EXISTS idx_bookstores_slug;

-- Remove column
ALTER TABLE bookstores DROP COLUMN IF EXISTS slug;
```

