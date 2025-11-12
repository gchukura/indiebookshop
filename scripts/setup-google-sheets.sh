#!/bin/bash

# Helper script to set up Google Sheets credentials
# This script helps convert your service account JSON file to environment variable format

echo "🔧 Google Sheets Setup Helper"
echo "=============================="
echo ""

# Check if JSON file is provided
if [ -z "$1" ]; then
  echo "Usage: ./scripts/setup-google-sheets.sh <path-to-service-account-json-file>"
  echo ""
  echo "Example:"
  echo "  ./scripts/setup-google-sheets.sh ~/Downloads/indiebookshop-credentials.json"
  echo ""
  exit 1
fi

JSON_FILE="$1"

# Check if file exists
if [ ! -f "$JSON_FILE" ]; then
  echo "❌ Error: File not found: $JSON_FILE"
  exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo "📝 Creating .env file from .env.example..."
  cp .env.example .env
fi

# Read JSON and convert to single line (escape quotes)
CREDENTIALS=$(cat "$JSON_FILE" | tr -d '\n' | sed 's/"/\\"/g')

# Extract spreadsheet ID if not already set
SPREADSHEET_ID=$(grep "GOOGLE_SHEETS_ID" .env | cut -d'=' -f2 | tr -d ' ')

echo ""
echo "✅ Found service account file: $JSON_FILE"
echo ""

# Update .env file
if grep -q "GOOGLE_SERVICE_ACCOUNT_CREDENTIALS=" .env; then
  # Update existing line
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|GOOGLE_SERVICE_ACCOUNT_CREDENTIALS=.*|GOOGLE_SERVICE_ACCOUNT_CREDENTIALS=\"$CREDENTIALS\"|" .env
  else
    # Linux
    sed -i "s|GOOGLE_SERVICE_ACCOUNT_CREDENTIALS=.*|GOOGLE_SERVICE_ACCOUNT_CREDENTIALS=\"$CREDENTIALS\"|" .env
  fi
else
  # Add new line
  echo "GOOGLE_SERVICE_ACCOUNT_CREDENTIALS=\"$CREDENTIALS\"" >> .env
fi

# Ensure USE_SAMPLE_DATA is false
if grep -q "USE_SAMPLE_DATA=" .env; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/USE_SAMPLE_DATA=.*/USE_SAMPLE_DATA=false/" .env
  else
    sed -i "s/USE_SAMPLE_DATA=.*/USE_SAMPLE_DATA=false/" .env
  fi
else
  echo "USE_SAMPLE_DATA=false" >> .env
fi

echo "✅ Updated .env file with credentials"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env and set GOOGLE_SHEETS_ID to your spreadsheet ID"
echo "2. Share your Google Sheet with the service account email (found in the JSON file)"
echo "3. Restart your server: npm run dev"
echo ""
echo "🔍 To find the service account email, check the 'client_email' field in: $JSON_FILE"

