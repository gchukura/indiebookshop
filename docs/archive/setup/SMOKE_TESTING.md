# Smoke Testing Guide

Quick validation scripts to verify your deployment is working correctly after the Google Sheets → Supabase migration.

## Quick Start

### Test Localhost
```bash
./scripts/smoke-test.sh
# or for quick validation:
./scripts/smoke-test-quick.sh
```

### Test Production/Preview
```bash
./scripts/smoke-test.sh https://yourdomain.com
# or for quick validation:
./scripts/smoke-test-quick.sh https://your-preview-url.vercel.app
```

## What Gets Tested

### Full Smoke Test (`smoke-test.sh`)
- ✅ `/api/bookstores?limit=1` - Returns JSON array with at least 1 item
- ✅ `/api/bookstores` - Full list validation
- ✅ `/api/features` - Returns array with `id` field (critical for migration)
- ✅ `/api/states` - States endpoint
- ✅ `/sitemap.xml` - Valid XML with `<urlset>` tag
- ✅ `/api/health` - Health check (optional)

### Quick Smoke Test (`smoke-test-quick.sh`)
- ✅ `/api/bookstores?limit=1` - Basic validation
- ✅ `/api/features` - With `id` field check
- ✅ `/sitemap.xml` - XML validation

## Prerequisites

- `curl` (usually pre-installed)
- `jq` (recommended for JSON validation)
  - macOS: `brew install jq`
  - Linux: `apt-get install jq` or `yum install jq`

The scripts will work without `jq`, but with limited JSON validation.

## Expected Output

### Success
```
✓ PASSED: HTTP 200, JSON array with 24 items
✓ PASSED: HTTP 200, valid JSON with 'id' field
✅ All tests passed! Migration appears successful.
```

### Failure
```
✗ FAILED: HTTP 500
✗ FAILED: Features missing 'id' field (migration issue!)
```

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

Useful for CI/CD integration:
```bash
./scripts/smoke-test.sh https://yourdomain.com && echo "Deployment successful!" || echo "Deployment failed!"
```

## Troubleshooting

### Features Missing `id` Field
If the features test fails, it means the ID mapping fix isn't active. Check:
1. Server has been restarted after migration
2. Supabase environment variables are set
3. Using SupabaseStorage (not Google Sheets)

### Connection Errors
- Verify the URL is correct
- Check if the server is running
- Verify network connectivity

### JSON Parsing Errors
- Install `jq` for better validation
- Scripts will still work but with limited checks

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Smoke Test
  run: |
    chmod +x scripts/smoke-test.sh
    ./scripts/smoke-test.sh https://${{ secrets.PREVIEW_URL }}
```

### Vercel Post-Deploy Hook
Add to `package.json`:
```json
{
  "scripts": {
    "smoke-test": "./scripts/smoke-test.sh https://yourdomain.com"
  }
}
```

## When to Run

- ✅ After initial deployment
- ✅ After environment variable changes
- ✅ After code updates
- ✅ Before marking deployment as "complete"
- ✅ As part of CI/CD pipeline

## Next Steps

After smoke tests pass:
1. Test manually in browser
2. Verify specific features work
3. Monitor logs for 24-48 hours
4. Check performance metrics

