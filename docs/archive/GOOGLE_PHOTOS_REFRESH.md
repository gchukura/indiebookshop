# Google Places Photo Reference Refresh Strategy

Google Places photo references expire after 2-3 months. This document outlines the best practices for keeping them fresh.

## Why Photo References Expire

Google Places photo references are temporary tokens that expire for security and data freshness reasons. When they expire, you'll see 400 errors when trying to fetch photos.

## Recommended Solutions

### 1. **Automated Scheduled Refresh (Recommended)**

We've set up two automated refresh mechanisms:

#### Option A: GitHub Actions (Recommended - Works on All Plans)
- **Location**: `.github/workflows/refresh-google-photos.yml`
- **Schedule**: Every 2 months (1st of every other month at 2 AM UTC)
- **How it works**: Runs the enrichment script with `--refresh-stale` flag
- **Cost**: Free (GitHub Actions provides 2,000 minutes/month for free)

**To enable:**
1. Add secrets to GitHub Actions:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_PLACES_API_KEY`
2. The workflow will run automatically on schedule
3. You can also trigger manually from GitHub Actions tab

**Note**: This is the recommended solution for Hobby/Free/V0 Premium plans.

#### Option B: Vercel Cron Jobs (Requires Pro Plan or Higher)
- **Location**: `api/cron/refresh-google-photos.js`
- **Schedule**: Every 2 months (1st of every other month at 2 AM UTC)
- **Configuration**: Defined in `vercel.json`
- **How it works**: Automatically refreshes photos older than 2 months
- **Plan Requirement**: Vercel Pro plan ($20/month) or Enterprise plan

**To enable:**
1. Upgrade to Vercel Pro plan (cron jobs not available on Hobby/Free/V0 Premium)
2. Ensure `CRON_SECRET_TOKEN` is set in Vercel environment variables (optional, for security)
3. The cron job will run automatically on the schedule

**To test manually:**
```bash
curl -X GET https://your-site.vercel.app/api/cron/refresh-google-photos?token=YOUR_CRON_SECRET_TOKEN
```
- **Location**: `.github/workflows/refresh-google-photos.yml`
- **Schedule**: Every 2 months (same schedule as Vercel cron)
- **How it works**: Runs the enrichment script with `--refresh-stale` flag

**To enable:**
1. Add secrets to GitHub Actions:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_PLACES_API_KEY`
2. The workflow will run automatically on schedule
3. You can also trigger manually from GitHub Actions tab

### 2. **Manual Refresh (When Needed)**

If photos expire before the scheduled refresh, you can manually refresh:

```bash
# Refresh all bookshops
npx tsx scripts/enrich-google-data.ts --refresh-all --batch-size=1000

# Refresh only stale ones (older than 3 months)
npx tsx scripts/enrich-google-data.ts --refresh-stale --batch-size=1000
```

### 3. **On-Demand Refresh (Future Enhancement)**

We could add automatic refresh when a photo fails to load, but this would:
- Slow down page loads
- Increase API costs
- Be less efficient than batch refresh

**Current behavior**: When a photo fails (400 error), it's logged for monitoring but doesn't trigger an immediate refresh.

## Best Practices

1. **Refresh Before Expiration**: Refresh photos every 2 months (before the typical 2-3 month expiration)
2. **Batch Processing**: Process in batches to avoid API rate limits and timeouts
3. **Rate Limiting**: Use delays between API calls (100ms default)
4. **Monitor Logs**: Check Vercel function logs for failed refreshes
5. **Track Timestamps**: The `google_data_updated_at` field tracks when photos were last refreshed

## Monitoring

Check refresh status:
- **Vercel Cron**: Check Vercel dashboard → Cron Jobs
- **GitHub Actions**: Check GitHub Actions tab for workflow runs
- **Database**: Query `google_data_updated_at` to see when photos were last refreshed

## Troubleshooting

### Photos Still Not Loading After Refresh

1. **Check API Key**: Ensure `GOOGLE_PLACES_API_KEY` is valid and has Places API enabled
2. **Check Logs**: Review Vercel function logs for errors
3. **Verify Refresh Ran**: Check `google_data_updated_at` timestamps in database
4. **Manual Test**: Try refreshing a single bookshop manually

### Cron Job Not Running

1. **Vercel Plan**: Vercel Cron Jobs require Pro plan ($20/month) or Enterprise. If you're on Hobby/Free/V0 Premium, use GitHub Actions instead.
2. **Configuration**: Verify `vercel.json` has the cron configuration (only works on Pro+)
3. **Environment Variables**: Ensure all required env vars are set
4. **Use GitHub Actions**: GitHub Actions works on all plans and is free (2,000 minutes/month)

## Cost Considerations

- **Google Places API**: Each refresh makes 1 API call per bookshop
- **Frequency**: Every 2 months for ~2,100 bookshops = ~12,600 calls/year
- **Cost**: Check Google Cloud Console for current pricing

## Alternative: Shorter Refresh Interval

If you want more frequent refreshes (e.g., monthly), update the cron schedule:

```json
// In vercel.json, change from:
"schedule": "0 2 1 */2 *"  // Every 2 months

// To:
"schedule": "0 2 1 * *"     // Every month
```

Or in GitHub Actions:
```yaml
- cron: '0 2 1 * *'  # Every month
```

