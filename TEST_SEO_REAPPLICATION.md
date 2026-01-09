# SEO Re-application Test Script

## Overview

This test script verifies that all SEO improvements have been successfully re-applied after the incremental re-application process.

## Usage

### Basic Usage

```bash
./test-seo-reapplication.sh
```

### Custom Base URL

```bash
BASE_URL=https://staging.indiebookshop.com ./test-seo-reapplication.sh
```

### Local Testing

```bash
BASE_URL=http://localhost:5173 ./test-seo-reapplication.sh
```

## What It Tests

### 1. Page Loading
- ✅ Homepage loads (200 OK)
- ✅ Directory page loads (200 OK)
- ✅ Bookshop detail pages load (200 OK)

### 2. SEO Content Injection
- ✅ Homepage contains SEO content
- ✅ Directory page contains SEO content
- ✅ Static pages (about, contact, events, blog) contain SEO content
- ✅ SEO content includes proper H1 tags

### 3. Internal Linking
- ✅ Homepage contains bookshop links
- ✅ Static pages have internal navigation links
- ✅ Links use canonical URL format (`/bookshop/bookshop-name`)
- ✅ Links are properly formatted

### 4. Meta Tags
- ✅ Bookshop detail pages have Open Graph tags
- ✅ Bookshop detail pages have Twitter Card tags
- ✅ Meta tags include proper dimensions (1200x630)

### 5. Location Variant Redirects
- ✅ Location variant URLs redirect to canonical URLs (301)
- ✅ Example: `/bookshop/powells-books-portland` → `/bookshop/powells-books`

### 6. HTML Escaping
- ✅ Special characters are properly escaped in SEO content
- ✅ XSS prevention is working

### 7. Cache Headers
- ✅ Cache-Control headers are set appropriately
- ✅ Different cache times for static vs dynamic pages

### 8. Sitemap
- ✅ Sitemap is accessible
- ✅ Sitemap contains canonical URLs

## Test Results

The script outputs:
- **✓ PASS**: Test passed
- **✗ FAIL**: Test failed (with details)
- **ℹ INFO**: Informational message

At the end, it provides a summary:
- Total tests run
- Number of passed tests
- Number of failed tests

## Exit Codes

- `0`: All tests passed
- `1`: One or more tests failed

## Dependencies

- `curl` - For making HTTP requests
- `bash` - Shell interpreter

## Notes

- Some tests may be skipped if specific conditions aren't met (e.g., location variants may not exist for all bookshops)
- The script uses a known bookshop (Powell's Books) for testing - this may need adjustment if that bookshop is not in the database
- Network access is required to test against production/staging URLs

## Troubleshooting

### Test fails for location variant redirect
- This is expected if the test bookshop doesn't have a location variant
- The test will be skipped with an info message

### Test fails for HTML escaping
- This may be normal if the test content doesn't contain special characters
- The test will show an info message if no special characters are found

### Connection errors
- Ensure the BASE_URL is correct and accessible
- Check network connectivity
- Verify the site is deployed and running
