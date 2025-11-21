# Category/Feature Filtering Analysis

## Current Implementation

### How It Works

1. **Filter Selection**:
   - User selects a single category/feature from dropdown
   - Stored as `selectedFeature` (number | null)
   - Labeled as "Filter by Category" in UI

2. **Data Structure**:
   - Features are stored with numeric IDs (1, 2, 3, etc.)
   - Each bookshop has `featureIds` which can be:
     - `null` (no features)
     - Array of numbers: `[1, 4, 7]`
     - String format: `"1,2,3"` (comma-separated)

3. **Filtering Logic**:

   **Client-side (Directory.tsx)**:
   ```typescript
   if (selectedFeature) {
     filtered = filtered.filter(bookshop => {
       if (!bookshop.featureIds) return false;
       
       // Convert to array of numbers
       let featureIdArray: number[] = [];
       if (typeof bookshop.featureIds === 'string') {
         featureIdArray = bookshop.featureIds.split(',').map(id => parseInt(id.trim()));
       } else if (Array.isArray(bookshop.featureIds)) {
         featureIdArray = bookshop.featureIds;
       }
       
       return featureIdArray.includes(selectedFeature);
     });
   }
   ```

   **Server-side (server/sheets-storage.ts & api/sheets-storage-serverless.js)**:
   ```typescript
   if (filters.featureIds && filters.featureIds.length > 0) {
     filteredBookstores = filteredBookstores.filter(bookstore => 
       bookstore.featureIds?.some(id => filters.featureIds?.includes(id)) || false
     );
   }
   ```

4. **Matching Behavior**:
   - **OR logic**: If a bookshop has ANY of the selected features, it matches
   - **Single selection**: Currently only one feature can be selected at a time
   - **Null handling**: Bookshops with `featureIds = null` are excluded when filtering

### Current Features Available

Based on API response:
- ID 1: Coffee Shop
- ID 2: Used Books
- ID 3: Rare Books
- ID 4: Children's Section
- ID 5: Author Events
- (and potentially more...)

### Data Format Issues

Some bookshops have `featureIds=null`, which means:
- They won't appear when filtering by any category
- They may need features assigned in the source data

## Strengths

✅ Handles multiple data formats (string vs array)
✅ Works consistently across client and server
✅ Supports bookshops with multiple features
✅ Simple single-selection UI

## Potential Improvements

1. **Multiple Selection**: Allow users to select multiple categories at once
2. **AND/OR Toggle**: Option to match ALL selected features (AND) vs ANY (OR)
3. **Null Handling**: Option to show bookshops without features
4. **Case-insensitive Feature Names**: If features are ever searched by name instead of ID
5. **Feature Count Display**: Show how many bookshops have each feature

## API Endpoints

- `GET /api/features` - Get all available features
- `GET /api/bookstores/filter?features=1,2,3` - Filter by feature IDs
- `GET /api/features/:featureId/bookstores` - Get bookshops by specific feature

## Current Limitations

- Only single feature selection (not multiple)
- No way to combine with AND logic (must have ALL features)
- Bookshops with null featureIds are excluded from category filtering

