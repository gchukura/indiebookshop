#!/bin/bash

# Debug script for form submission endpoint
# This helps identify what's causing 500 errors

DOMAIN="${1:-www.indiebookshop.com}"
BASE_URL="https://${DOMAIN}"

echo "🔍 Debugging Form Submission Endpoint"
echo "===================================="
echo ""
echo "Endpoint: ${BASE_URL}/api/bookstores/submit"
echo ""

# Test 1: Check if endpoint is reachable
echo "Test 1: Checking endpoint availability..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/bookstores/submit" \
  -H "Content-Type: application/json" \
  -d '{}')
echo "  Status: $HTTP_CODE"
echo ""

# Test 2: Test with minimal valid data
echo "Test 2: Testing with minimal valid data..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${BASE_URL}/api/bookstores/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "submitterEmail": "debug@example.com",
    "submitterName": "Debug Test",
    "isNewSubmission": true,
    "bookstoreData": {
      "name": "Debug Test Bookstore",
      "street": "123 Test St",
      "city": "Portland",
      "state": "OR",
      "zip": "97204",
      "description": "Debugging submission"
    }
  }')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_STATUS")

echo "  Status: $HTTP_CODE"
echo "  Response: $BODY"
echo ""

# Test 3: Check rate limiting
echo "Test 3: Checking rate limit headers..."
HEADERS=$(curl -s -I -X POST "${BASE_URL}/api/bookstores/submit" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}')

echo "$HEADERS" | grep -i "rate" || echo "  No rate limit headers found"
echo ""

# Test 4: Test validation (should return 400, not 500)
echo "Test 4: Testing validation (missing email - should return 400)..."
VALIDATION_TEST=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${BASE_URL}/api/bookstores/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "submitterName": "Test",
    "isNewSubmission": true,
    "bookstoreData": {
      "name": "Test",
      "street": "123 Test",
      "city": "Portland",
      "state": "OR",
      "zip": "97204"
    }
  }')

VALIDATION_CODE=$(echo "$VALIDATION_TEST" | grep "HTTP_STATUS" | cut -d: -f2)
VALIDATION_BODY=$(echo "$VALIDATION_TEST" | grep -v "HTTP_STATUS")

echo "  Status: $VALIDATION_CODE (should be 400)"
echo "  Response: $VALIDATION_BODY" | head -3
echo ""

echo "📋 Next Steps:"
echo "=============="
echo ""
if [ "$HTTP_CODE" = "500" ]; then
  echo "❌ Getting 500 errors - Check Vercel logs for:"
  echo "   1. Supabase connection errors"
  echo "   2. Database schema mismatches"
  echo "   3. Missing required fields"
  echo "   4. SendGrid email errors"
  echo ""
  echo "   To check logs:"
  echo "   1. Go to Vercel Dashboard"
  echo "   2. Your Project → Functions → /api/serverless.js"
  echo "   3. Check the Logs tab"
  echo ""
elif [ "$HTTP_CODE" = "429" ]; then
  echo "⚠️  Rate limited - wait 15 minutes or test from different IP"
  echo ""
elif [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Success! Submission is working"
  echo ""
else
  echo "Status: $HTTP_CODE - Check response above for details"
  echo ""
fi

echo "Common Issues:"
echo "  - Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
echo "  - Database table doesn't exist or schema mismatch"
echo "  - Missing required columns in bookstores table"
echo "  - SendGrid API key not set (non-fatal, but emails won't send)"

