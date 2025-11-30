# Google Sheets to Supabase Migration Plan

## Overview
This document outlines the complete migration plan to move all data operations from Google Sheets to Supabase for improved performance and reliability.

## Key Considerations & Solutions

### ⚠️ TypeScript/JavaScript Interop Issue (Phase 1)
**Problem**: `api/serverless.js` is JavaScript, but `server/supabase-storage.ts` is TypeScript. Cannot import directly.

**Solution**: Create `api/supabase-storage-serverless.js` - a JavaScript version following the same pattern as `api/sheets-storage-serverless.js`. Use `api/supabase-serverless.js` for the Supabase client.

### ✅ Data Refresh Analysis
**Finding**: `refreshData()` only calls `loadData()` - no cache invalidation logic to preserve.

**Solution**: Skip refresh entirely for SupabaseStorage (real-time database doesn't need periodic refreshes).

### ✅ Client-Side Compatibility
**Finding**: Client uses standard API endpoints with no Google Sheets-specific assumptions. Directory.tsx has direct Supabase query but falls back to API.

**Solution**: No client-side changes needed. Verify React Query cache works correctly after migration.

### 📊 Testing & Monitoring Priority
**Action**: 
- Test sitemap generation early (Phase 1 work)
- Add 24-48 hour monitoring period post-migration
- Budget extra time for production monitoring and edge cases

## Current State Analysis

### ✅ Already Implemented
- `SupabaseStorage` class exists in `server/supabase-storage.ts`
- Server-side (`server/index.ts`) has conditional Supabase support
- Supabase tables already exist: `bookstores`, `features`, `events`, `users`
- Form submissions already write to Supabase

### ❌ Needs Migration
- **Serverless environment** (`api/serverless.js`) - Currently ONLY uses Google Sheets
- **Sitemap generation** (`api/sitemap.js`) - Uses GoogleSheetsStorage
- **Data refresh system** - Still designed for Google Sheets (not needed for Supabase)
- **Default storage selection** - Google Sheets is still the fallback

## Pre-Migration Checklist

### ⚠️ CRITICAL: Verify Vercel Environment Variables

**Before starting migration**, ensure Supabase environment variables are properly configured in Vercel:

#### Required Variables
- `SUPABASE_URL` - Must be set in Vercel Dashboard (not just `.env` file)
- `SUPABASE_SERVICE_ROLE_KEY` - Must be set in Vercel Dashboard

#### Verification Steps

1. **Check Vercel Dashboard**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Select your project → **Settings** → **Environment Variables**
   - Verify both variables exist and are set for **Production** environment
   - Check that `SUPABASE_URL` starts with `https://` and ends with `.supabase.co`
   - Check that `SUPABASE_SERVICE_ROLE_KEY` is a long JWT token (starts with `eyJ`)

2. **Test Current Setup**:
   - Check Vercel function logs for `/api/serverless.js`
   - Look for warnings: `"Supabase environment variables are missing"`
   - If you see warnings, variables are NOT properly set in Vercel

3. **Important Notes**:
   - ⚠️ **Environment variables in `.env` files are NOT automatically available in Vercel**
   - ⚠️ **Variables must be explicitly added in Vercel Dashboard**
   - ⚠️ **After adding/updating variables, you MUST redeploy** for changes to take effect
   - Variables set for "Production" may not be available in "Preview" environments

4. **If Variables Are Missing**:
   - Get `SUPABASE_URL` from Supabase Dashboard → Settings → API → Project URL
   - Get `SUPABASE_SERVICE_ROLE_KEY` from Supabase Dashboard → Settings → API → service_role key
   - Add both in Vercel Dashboard → Settings → Environment Variables
   - Select "Production" (and "Preview" if desired) for environment scope
   - **Redeploy** after adding variables

#### Why This Matters
- `api/supabase-storage-serverless.js` will fail silently if variables aren't set
- The code checks for variables but may fall back to Google Sheets without clear errors
- Migration will appear successful but still use Google Sheets if env vars are missing

**Reference**: See `docs/setup/VERIFY_SUPABASE_ENV.md` for detailed instructions.

## Migration Steps

### Phase 1: Serverless Environment Migration (Priority: HIGH)

#### 1.1 Create SupabaseStorage Serverless Version
- **File**: `api/supabase-storage-serverless.js`
- **Action**: Create JavaScript version of SupabaseStorage (TypeScript can't be imported directly in JS serverless files)
- **Approach**: 
  - Convert `server/supabase-storage.ts` to JavaScript
  - Use `api/supabase-serverless.js` for Supabase client (already exists)
  - Follow same pattern as `api/sheets-storage-serverless.js` and `api/storage-serverless.js`
- **Status**: Must create new file - TypeScript/JavaScript interop issue
- **⚠️ Important**: Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in Vercel before testing

#### 1.2 Update `api/serverless.js`
- **Current**: Line 49-52 only checks `USE_MEM_STORAGE`, defaults to Google Sheets
- **Change**: Add Supabase check similar to `server/index.ts`
- **Logic**: 
  ```javascript
  const USE_SUPABASE = process.env.USE_SUPABASE_STORAGE === 'true' || !!process.env.SUPABASE_URL;
  const USE_GOOGLE_SHEETS = !USE_SUPABASE && process.env.USE_MEM_STORAGE !== 'true';
  ```
- **Priority**: HIGH - This is the main performance bottleneck

#### 1.3 Update `api/sitemap.js`
- **Current**: Line 22 uses `new GoogleSheetsStorage()`
- **Change**: Use SupabaseStorage instead
- **Action**: Import and use SupabaseStorage with same logic as serverless.js

### Phase 2: Server-Side Updates (Priority: MEDIUM)

#### 2.1 Update `server/index.ts`
- **Current**: Line 107-108 - Supabase is conditional, Google Sheets is fallback
- **Change**: Make Supabase the default, Google Sheets as fallback only if explicitly enabled
- **Logic**: 
  ```typescript
  const USE_SUPABASE = process.env.USE_GOOGLE_SHEETS !== 'true' && (process.env.USE_SUPABASE_STORAGE === 'true' || !!process.env.SUPABASE_URL);
  const USE_GOOGLE_SHEETS = process.env.USE_GOOGLE_SHEETS === 'true' && !USE_SUPABASE;
  ```

### Phase 3: Data Refresh System (Priority: LOW)

#### 3.1 Analyze Data Refresh Logic
- **Finding**: `refreshData()` in GoogleSheetsStorage only calls `loadData()` - no cache invalidation logic
- **Conclusion**: No additional logic to preserve - Supabase is real-time, refresh not needed
- **Action**: Skip refresh entirely for SupabaseStorage

#### 3.2 Update `server/dataRefresh.ts`
- **Action**: Check storage type and skip refresh if SupabaseStorage
- **Change**: Add check: `if (storage instanceof SupabaseStorage) return;`
- **Note**: TypeScript instanceof check may need type guard

#### 3.3 Update `api/dataRefresh-serverless.js`
- **Action**: Same as above - skip refresh for SupabaseStorage
- **Change**: Check storage type or add `isSupabaseStorage` flag

### Phase 4: Cleanup & Documentation (Priority: LOW)

#### 4.1 Environment Variables
- **Remove**: `GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` (keep for now as fallback)
- **Document**: Supabase is now the default data source

#### 4.2 Update Documentation
- Update `docs/setup/` files to reflect Supabase as primary
- Mark Google Sheets setup as optional/legacy

#### 4.3 Optional: Remove Google Sheets Dependencies
- **Files to keep** (for fallback): 
  - `server/google-sheets.ts`
  - `api/google-sheets-serverless.js`
  - `server/sheets-storage.ts`
  - `api/sheets-storage-serverless.js`
- **Action**: Keep files but mark as deprecated in comments

## Implementation Details

### File Changes Required

1. **`api/supabase-storage-serverless.js`** (NEW FILE - CRITICAL)
   ```javascript
   // Create JavaScript version of SupabaseStorage
   // Convert from server/supabase-storage.ts
   // Use api/supabase-serverless.js for Supabase client
   // Follow pattern of api/sheets-storage-serverless.js
   ```

2. **`api/serverless.js`** (CRITICAL)
   ```javascript
   // Add Supabase import
   import { SupabaseStorage } from './supabase-storage-serverless.js';
   
   // Update storage selection (around line 48-52)
   const USE_SUPABASE = process.env.USE_SUPABASE_STORAGE === 'true' || !!process.env.SUPABASE_URL;
   const USE_GOOGLE_SHEETS = !USE_SUPABASE && process.env.USE_MEM_STORAGE !== 'true';
   
   const storageImplementation = USE_SUPABASE 
     ? new SupabaseStorage() 
     : (USE_GOOGLE_SHEETS ? new GoogleSheetsStorage() : storage);
   ```

2. **`api/sitemap.js`** (IMPORTANT)
   ```javascript
   // Replace GoogleSheetsStorage with SupabaseStorage
   import { SupabaseStorage } from './supabase-storage-serverless.js';
   const storage = new SupabaseStorage();
   ```

3. **`server/index.ts`** (IMPORTANT)
   ```typescript
   // Make Supabase default
   const USE_SUPABASE = process.env.USE_GOOGLE_SHEETS !== 'true' && 
     (process.env.USE_SUPABASE_STORAGE === 'true' || !!process.env.SUPABASE_URL);
   const USE_GOOGLE_SHEETS = process.env.USE_GOOGLE_SHEETS === 'true' && !USE_SUPABASE;
   ```

4. **`server/dataRefresh.ts`** (OPTIONAL)
   ```typescript
   // Skip refresh for Supabase
   private async performRefresh(): Promise<void> {
     if (this.storage instanceof SupabaseStorage) {
       console.log('Skipping refresh - Supabase is real-time');
       return;
     }
     // ... existing refresh logic
   }
   ```

### Create Missing Files

1. **`api/supabase-storage-serverless.js`** (REQUIRED)
   - **Cannot reuse TypeScript file** - `api/serverless.js` is JavaScript
   - Must create JavaScript version following pattern:
     - Use `api/supabase-serverless.js` for Supabase client (already exists)
     - Convert all TypeScript types to JavaScript with JSDoc comments
     - Implement same IStorage interface methods
     - Handle slug mappings same way
   - Reference: `api/sheets-storage-serverless.js` for structure pattern

## Testing Checklist

### Pre-Migration Verification
- [ ] **Verify `SUPABASE_URL` is set in Vercel Dashboard** (not just .env file)
- [ ] **Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel Dashboard**
- [ ] Check Vercel function logs - no warnings about missing Supabase variables
- [ ] Test form submission endpoint to confirm Supabase connection works

### Phase 1 Testing (Serverless - HIGH PRIORITY)
- [ ] **Test sitemap generation** (`/sitemap.xml`) - Verify SupabaseStorage works
- [ ] Test all API endpoints with Supabase in serverless environment
- [ ] **Verify environment variables are accessible** in serverless function logs
- [ ] Test bookstore listing (`/api/bookstores`)
- [ ] Test bookstore by ID (`/api/bookstores/:id`)
- [ ] Test bookstore by slug (`/api/bookstores/slug/:slug`)
- [ ] Test filtering (state, city, county, features)
- [ ] Test features endpoint (`/api/features`)
- [ ] Test events endpoint (`/api/events`)
- [ ] Test form submissions (should already work)
- [ ] Verify performance improvements (compare response times)

### Phase 2 Testing (Server-side)
- [ ] Test all endpoints in server environment
- [ ] Verify Supabase is default, Google Sheets only as fallback

### Client-Side Verification
- [ ] **Check client-side code** - Verify no Google Sheets-specific data structure assumptions
- [ ] Test Directory page (has direct Supabase query + API fallback)
- [ ] Test BookshopDetailPage
- [ ] Test form submissions from client
- [ ] Verify React Query cache works correctly with new data source

### Post-Migration Monitoring (First 24-48 hours)
- [ ] Monitor error logs for any Supabase connection issues
- [ ] Check API response times (should be faster)
- [ ] Monitor for any data inconsistencies
- [ ] Watch for user-reported issues
- [ ] Verify no Google Sheets API calls in production logs

## Rollback Plan

If issues arise:
1. **Quick Rollback**: Set `USE_GOOGLE_SHEETS=true` environment variable in Vercel
   - This will force Google Sheets usage
   - No code changes needed (if logic is correct)
2. **Code Rollback**: Revert changes to:
   - `api/serverless.js`
   - `api/sitemap.js`
   - Keep `api/supabase-storage-serverless.js` (doesn't hurt to have it)
3. **Data Safety**: 
   - Google Sheets remains as source of truth during transition
   - Supabase data is additive (form submissions)
   - No data loss risk
4. **Monitoring**: Watch error logs immediately after deployment
   - Set up alerts for Supabase connection errors
   - Monitor API response times
   - Check for any 500 errors

## Performance Benefits

After migration:
- ✅ **Faster queries**: Direct database queries vs API calls
- ✅ **No API rate limits**: No Google Sheets API quotas
- ✅ **Real-time updates**: Changes reflect immediately
- ✅ **Better scalability**: Database handles concurrent requests
- ✅ **Reduced latency**: No external API calls
- ✅ **Better error handling**: Database-level constraints

## Environment Variables

### Required (Supabase)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for server-side operations

### Optional (Google Sheets - fallback only)
- `USE_GOOGLE_SHEETS=true` - Force Google Sheets (for rollback)
- `GOOGLE_SHEETS_ID` - Spreadsheet ID
- `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` - Service account JSON

## Timeline Estimate

### Development Time
- **Phase 1** (Serverless): 3-4 hours
  - Creating `supabase-storage-serverless.js`: 2 hours (TypeScript → JS conversion)
  - Updating `serverless.js` and `sitemap.js`: 1 hour
  - Testing serverless endpoints: 1 hour
- **Phase 2** (Server): 1 hour
- **Phase 3** (Refresh): 1 hour
- **Phase 4** (Cleanup): 1-2 hours
- **Initial Testing**: 2-3 hours

**Development Total**: ~8-10 hours

### Additional Time Budget
- **Post-Migration Monitoring**: 2-4 hours (first 24-48 hours)
  - Watch error logs
  - Monitor performance metrics
  - Address any user-reported issues
- **Data Verification**: 1-2 hours
  - Compare Supabase data with Google Sheets (spot checks)
  - Verify no data loss during migration
- **Buffer for Issues**: 2-4 hours
  - Potential edge cases
  - Rollback if needed
  - Fix any discovered bugs

**Total Project Time**: ~13-20 hours (including monitoring and buffer)

## Success Criteria

- [ ] **Environment variables verified in Vercel Dashboard** (pre-migration)
- [ ] All API endpoints work with Supabase
- [ ] No Google Sheets API calls in production
- [ ] Performance improvements measurable (faster response times)
- [ ] Zero downtime during migration
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Client-side code works correctly (no data structure assumptions broken)
- [ ] Sitemap generation works with Supabase
- [ ] 24-48 hour monitoring period completed with no critical issues
- [ ] Data consistency verified (spot checks between Sheets and Supabase)
- [ ] No warnings in Vercel logs about missing Supabase environment variables

## Client-Side Considerations

### Current State Analysis
- ✅ Client uses standard API endpoints (`/api/bookstores`, `/api/features`)
- ✅ No Google Sheets-specific data structure assumptions found
- ✅ Directory.tsx has direct Supabase query but falls back to API
- ✅ Form submissions already use API endpoints (not direct Supabase)
- ✅ React Query handles caching (will work with new data source)

### Actions Required
- [ ] Verify client-side React Query cache invalidation works correctly
- [ ] Test that Directory.tsx Supabase fallback still works
- [ ] Ensure no hardcoded Google Sheets references in client code
- [ ] Test all client-side features after migration

