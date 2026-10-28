# Deploying IndiebookShop.com to Vercel

This document provides instructions for deploying the IndiebookShop.com application to Vercel.

## Prerequisites

1. A Vercel account - If you don't have one, sign up at [vercel.com](https://vercel.com)
2. Git repository with your project (GitHub, GitLab, or Bitbucket)
3. Required API keys and environment variables:
   - `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` - JSON credentials for Google Sheets API
   - `GOOGLE_SHEETS_ID` - ID of the Google Sheets document
   - `MAPBOX_ACCESS_TOKEN` - Mapbox API access token
   - `SENDGRID_API_KEY` - SendGrid API key for email functionality

## Deployment Steps

### 1. Prepare Your Repository

Ensure your project is pushed to a Git repository (GitHub, GitLab, or Bitbucket).

### 2. Import Project to Vercel

1. Log in to your Vercel account
2. Click "Add New..." and select "Project"
3. Import your Git repository from GitHub, GitLab, or Bitbucket
4. Configure the project with the following settings:

### 3. Configure Environment Variables

Add the following environment variables in the Vercel project settings:

```
# Core environment settings
NODE_ENV=production
USE_SAMPLE_DATA=false
USE_MEM_STORAGE=false
GOOGLE_SHEETS_ID=your_google_sheets_id

# API keys
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
SENDGRID_API_KEY=your_sendgrid_api_key
GOOGLE_SERVICE_ACCOUNT_CREDENTIALS=your_credentials_json_string

# Data refresh configuration
REFRESH_API_KEY=your_custom_refresh_key     # Set a secure key for the refresh API
REFRESH_INTERVAL=1800000                    # 30 minutes (in milliseconds)
MIN_REFRESH_INTERVAL=900000                 # 15 minutes (in milliseconds)
DISABLE_AUTO_REFRESH=false                  # Set to 'true' to disable automatic refresh
```

**Important**: For the `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS`, you need to:
1. Convert your JSON credentials file to a string
2. Escape any quotes to avoid JSON parsing errors
3. Paste the entire string as the value

### 4. Deploy Settings

- Build Command: Vercel will automatically use the configuration in `vercel.json`
- Output Directory: The configuration will use `dist/public`
- Framework Preset: None (we've configured with `vercel.json`)

### 5. Deploy

Click "Deploy" and Vercel will:
1. Clone your repository
2. Install dependencies
3. Build the application
4. Deploy to a production URL

## Troubleshooting

If you encounter issues with your deployment:

1. Check the build logs in your Vercel dashboard
2. Verify all environment variables are set correctly
3. Make sure your Google Service Account has access to the sheets
4. Test the Mapbox and SendGrid API keys to ensure they're valid

## Custom Domain

To use your custom domain (e.g., indiebookshop.com):

1. Go to your project settings in Vercel
2. Click on "Domains"
3. Add your custom domain and follow the instructions to verify ownership
4. Update your domain's DNS settings as instructed

## Ongoing Maintenance

Vercel will automatically redeploy your application whenever changes are pushed to your repository's default branch.

## Data Refresh System

IndiebookShop.com includes a smart data refresh system that automatically updates content from Google Sheets.

### How It Works

1. **Automatic Refresh**: By default, the system will refresh data from Google Sheets approximately every 30 minutes.
2. **Intelligent Timing**: 
   - During peak hours, refreshes are spaced out to minimize API costs and maintain performance
   - During off-peak hours (10 PM - 6 AM), refreshes happen more frequently
   - If a refresh fails, the system uses exponential backoff to avoid overloading the API

### Manual Refresh API

You can manually trigger a data refresh using the refresh API:

```bash
# Replace YOUR_REFRESH_API_KEY with the value of REFRESH_API_KEY environment variable
curl -X POST https://your-site.vercel.app/api/admin/refresh \
  -H "X-Refresh-API-Key: YOUR_REFRESH_API_KEY"
```

### Checking Refresh Status

Check the current status of the data refresh system:

```bash
# Replace YOUR_REFRESH_API_KEY with the value of REFRESH_API_KEY environment variable
curl https://your-site.vercel.app/api/admin/refresh/status \
  -H "X-Refresh-API-Key: YOUR_REFRESH_API_KEY"
```

### Disabling Automatic Refresh

If needed, you can disable automatic refreshes by:

1. Setting the `DISABLE_AUTO_REFRESH` environment variable to `true` in Vercel
2. Using the API endpoint:

```bash
# Replace YOUR_REFRESH_API_KEY with the value of REFRESH_API_KEY environment variable
curl -X POST https://your-site.vercel.app/api/admin/refresh/config \
  -H "X-Refresh-API-Key: YOUR_REFRESH_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```