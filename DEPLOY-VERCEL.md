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
NODE_ENV=production
USE_SAMPLE_DATA=false
USE_MEM_STORAGE=false
GOOGLE_SHEETS_ID=your_google_sheets_id
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
SENDGRID_API_KEY=your_sendgrid_api_key
GOOGLE_SERVICE_ACCOUNT_CREDENTIALS=your_credentials_json_string
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