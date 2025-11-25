#!/bin/bash

# Script to verify Supabase environment variables are set in Vercel
# This tests the production endpoint to see if Supabase is configured

DOMAIN="${1:-www.indiebookshop.com}"
BASE_URL="https://${DOMAIN}"

echo "🔍 Verifying Supabase Environment Variables"
echo "=========================================="
echo ""
echo "Testing endpoint: ${BASE_URL}/api/bookstores/submit"
echo ""

# Test submission endpoint
echo "Making test submission..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${BASE_URL}/api/bookstores/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "submitterEmail": "env-test@example.com",
    "submitterName": "Env Test",
    "isNewSubmission": true,
    "bookstoreData": {
      "name": "Supabase Env Test Bookstore",
      "street": "123 Test St",
      "city": "Portland",
      "state": "OR",
      "zip": "97204",
      "description": "Testing if Supabase environment variables are configured"
    }
  }')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_STATUS")

echo ""
echo "📊 Results:"
echo "-----------"

case "$HTTP_CODE" in
  201)
    echo "✅ SUCCESS: Submission saved to Supabase"
    echo "   Supabase environment variables are configured correctly!"
    ;;
  429)
    echo "⚠️  RATE LIMITED: Too many requests from this IP"
    echo "   This means rate limiting is working, but we can't test Supabase right now."
    echo "   Wait 15 minutes and try again, or check Vercel logs directly."
    ;;
  500)
    echo "❌ ERROR: Server error occurred"
    echo ""
    echo "Response: $BODY"
    echo ""
    echo "Possible causes:"
    echo "  1. SUPABASE_URL not set in Vercel"
    echo "  2. SUPABASE_SERVICE_ROLE_KEY not set in Vercel"
    echo "  3. Supabase connection error"
    echo "  4. Database schema mismatch"
    echo ""
    echo "Next steps:"
    echo "  1. Check Vercel Dashboard → Settings → Environment Variables"
    echo "  2. Verify both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set"
    echo "  3. Check Vercel function logs for detailed error messages"
    echo "  4. See docs/setup/VERIFY_SUPABASE_ENV.md for detailed instructions"
    ;;
  400)
    echo "⚠️  BAD REQUEST: Validation error"
    echo "   Response: $BODY"
    echo "   (This might indicate a different issue, check the response)"
    ;;
  *)
    echo "❓ UNEXPECTED STATUS: $HTTP_CODE"
    echo "   Response: $BODY"
    ;;
esac

echo ""
echo "📝 To check Vercel environment variables:"
echo "   1. Go to: https://vercel.com/dashboard"
echo "   2. Select your project"
echo "   3. Settings → Environment Variables"
echo "   4. Look for: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "📚 For detailed instructions, see: docs/setup/VERIFY_SUPABASE_ENV.md"

