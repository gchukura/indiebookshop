# FeatureIds Column Parsing from Google Sheets

## How It Works

The system uses **flexible column header matching** to find the featureIds column in your Google Sheet. It's not hardcoded to a specific column position, but rather looks for column headers that match certain patterns.

## Column Header Matching

### Server-side (`server/google-sheets.ts`)

Looks for column headers (case-insensitive) that match any of these:
- `featureids`
- `feature_ids`
- `features`
- `tags`
- `categories`

**Code:**
```typescript
featureIds: ['featureids', 'feature_ids', 'features', 'tags', 'categories']
```

**Fallback:** If no matching header is found, it defaults to **column 14 (position O)** in the sheet.

### Serverless (`api/google-sheets-serverless.js`)

Looks for any column header that **starts with** `featureid` (case-insensitive):
- Matches: `featureids`, `featureIds`, `feature_ids`, `featureIds (comma-separated)`, etc.

**Code:**
```javascript
featureIds: headers.findIndex(h => h.startsWith('featureid'))
```

**No fallback:** If no matching header is found, `featureIds` will be `-1` and the field will be skipped.

## Data Format Expected

The column should contain **comma-separated feature IDs**:
- Example: `1,2,3`
- Example: `1, 4, 7, 8`
- Empty cells result in `featureIds = null`

**Parsing Logic:**
```typescript
// Server-side
featureIds = featureIdsValue.split(',')
  .map(id => parseInt(id.trim()))
  .filter(id => !isNaN(id));

// Serverless
featureIds = row[fieldToColumn.featureIds].split(',').map((idStr) => parseInt(idStr.trim()));
```

## Recommended Column Header

For best compatibility with both implementations, use one of these column headers:
- ✅ `featureids` (recommended)
- ✅ `feature_ids`
- ✅ `features`

## Example Google Sheet Structure

| id | name | ... | featureids | ... |
|----|------|-----|------------|-----|
| 1  | Shop A | ... | 1,2,3 | ... |
| 2  | Shop B | ... | 4,5 | ... |
| 3  | Shop C | ... | (empty) | ... |

Where:
- Column header: `featureids` (or any of the accepted variations)
- Cell values: Comma-separated numbers like `1,2,3`
- Empty cells: Will result in `featureIds = null`

## Troubleshooting

If featureIds aren't being parsed correctly:

1. **Check column header name**: Must match one of the accepted patterns (case-insensitive)
2. **Check data format**: Should be comma-separated numbers (e.g., `1,2,3`)
3. **Check for typos**: Common mistakes include `featureid` (singular) or `feature ID` (with space)
4. **Check server logs**: Look for "Field to column mapping" to see which column was matched

## Current Behavior

- ✅ Flexible header matching (multiple accepted names)
- ✅ Case-insensitive matching
- ✅ Handles comma-separated values
- ✅ Trims whitespace
- ✅ Filters out invalid numbers
- ⚠️ Server-side has positional fallback (column 14), serverless does not

