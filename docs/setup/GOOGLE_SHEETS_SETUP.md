# Google Sheets Setup Guide

This guide will help you set up Google Sheets access so your application can load thousands of bookshop records instead of just the sample data.

## Prerequisites

- A Google account
- Access to Google Cloud Console
- A Google Sheets spreadsheet with your bookshop data

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "IndieBookShop")
4. Click "Create"
5. Wait for the project to be created and select it

## Step 2: Enable Google Sheets API

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Click on it and click "Enable"

## Step 3: Create a Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Enter a name (e.g., "indiebookshop-sheets-reader")
4. Click "Create and Continue"
5. Skip the optional steps and click "Done"

## Step 4: Create and Download Service Account Key

1. In the "Credentials" page, find your service account
2. Click on the service account email
3. Go to the "Keys" tab
4. Click "Add Key" → "Create new key"
5. Select "JSON" format
6. Click "Create" - this will download a JSON file

**Important**: Save this JSON file securely. It contains sensitive credentials.

## Step 5: Share Your Google Sheet with the Service Account

1. Open your Google Sheets spreadsheet
2. Click the "Share" button (top right)
3. Copy the email address from the downloaded JSON file (it's in the `client_email` field)
   - It looks like: `indiebookshop-sheets-reader@your-project.iam.gserviceaccount.com`
4. Paste the service account email in the "Share" field
5. Give it "Viewer" permissions (read-only is sufficient)
6. Uncheck "Notify people" (service accounts don't need notifications)
7. Click "Share"

## Step 6: Get Your Spreadsheet ID

1. Open your Google Sheets spreadsheet
2. Look at the URL in your browser
3. The Spreadsheet ID is the long string between `/d/` and `/edit`
   - Example: `https://docs.google.com/spreadsheets/d/1Qa3AW5Zmu0X4yT3fXjmoU62Drqz0oMKRsXsm3a7JiQs/edit`
   - The ID is: `1Qa3AW5Zmu0X4yT3fXjmoU62Drqz0oMKRsXsm3a7JiQs`

## Step 7: Prepare Your Spreadsheet

Your Google Sheet needs these tabs with the following structure:

### Bookstores Sheet
- **Tab name**: `Bookstores`
- **Headers** (Row 1): id, name, street, city, state, zip, county, description, imageUrl, website, phone, hours, latitude, longitude, featureIds, live
- **Data starts**: Row 2

### Features Sheet
- **Tab name**: `Features`
- **Headers** (Row 1): id, name
- **Data starts**: Row 2

### Events Sheet
- **Tab name**: `Events`
- **Headers** (Row 1): id, title, description, date, time, bookshopId
- **Data starts**: Row 2

## Step 8: Set Environment Variables

### Option A: For Local Development (Terminal)

1. Open the downloaded JSON credentials file
2. Convert it to a single-line string (or use it as-is if your shell supports it)

**For macOS/Linux:**
```bash
# Set the credentials (replace with your actual JSON content)
export GOOGLE_SERVICE_ACCOUNT_CREDENTIALS='{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'

# Set the spreadsheet ID (if different from default)
export GOOGLE_SHEETS_ID='your-spreadsheet-id'

# Ensure sample data is disabled
export USE_SAMPLE_DATA='false'

# Restart your server
npm run dev
```

**Easier method - using a file:**
```bash
# Save your credentials to a file (don't commit this!)
cat > ~/.indiebookshop-credentials.json << 'EOF'
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
EOF

# Then set it as an environment variable
export GOOGLE_SERVICE_ACCOUNT_CREDENTIALS=$(cat ~/.indiebookshop-credentials.json)
export GOOGLE_SHEETS_ID='your-spreadsheet-id'
export USE_SAMPLE_DATA='false'
npm run dev
```

### Option B: Create a .env File (Recommended for Development)

1. Create a `.env` file in the project root:
```bash
touch .env
```

2. Add your credentials to `.env`:
```env
# Google Sheets Configuration
GOOGLE_SERVICE_ACCOUNT_CREDENTIALS={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
GOOGLE_SHEETS_ID=your-spreadsheet-id
USE_SAMPLE_DATA=false
```

**Important**: Add `.env` to your `.gitignore` to avoid committing credentials!

3. Install dotenv to load the .env file:
```bash
npm install dotenv
```

4. Update `server/index.ts` to load the .env file at the top:
```typescript
import 'dotenv/config';
```

## Step 9: Verify the Setup

1. Restart your server:
```bash
npm run dev
```

2. Check the server logs - you should see:
   - "Google Sheets service initialized with service account credentials"
   - "Successfully loaded X bookstores, Y features, and Z events"

3. Test the API:
```bash
curl http://localhost:3000/api/bookstores | jq 'length'
curl http://localhost:3000/api/states | jq 'length'
```

You should see thousands of bookstores and many states instead of just 4 bookstores and 3 states.

## Troubleshooting

### "API key not valid"
- Make sure you're using service account credentials, not an API key
- Verify the JSON credentials are properly formatted

### "Permission denied" or "The caller does not have permission"
- Make sure you shared the Google Sheet with the service account email
- Verify the service account has "Viewer" access

### "Unable to parse range"
- Check that your sheet tabs are named exactly: `Bookstores`, `Features`, `Events`
- Verify the headers are in row 1
- Check that data starts in row 2

### Still showing sample data
- Verify `USE_SAMPLE_DATA=false` is set
- Check server logs for Google Sheets errors
- Make sure the environment variables are loaded before the server starts

## Security Notes

- **Never commit credentials to git**
- Add `.env` and `*.json` (credentials files) to `.gitignore`
- Use environment variables in production (Vercel, etc.)
- Service account credentials should have minimal permissions (read-only for Sheets)

## Next Steps

Once configured, your application will:
- Load all bookstores from Google Sheets
- Display all states with bookshops
- Automatically refresh data every 30 minutes
- Support thousands of records instead of just sample data

