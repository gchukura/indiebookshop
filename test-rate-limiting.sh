#!/bin/bash

# Test rate limiting on production
# Usage: ./test-rate-limiting.sh [domain]
# Example: ./test-rate-limiting.sh indiebookshop.com

DOMAIN="${1:-indiebookshop.com}"
URL="https://${DOMAIN}/api/bookstores/submit"

echo "Testing rate limiting on: ${URL}"
echo "Limit: 5 requests per 15 minutes"
echo "Making 6 requests (6th should be rate limited)..."
echo ""

for i in {1..6}; do
  echo "Request $i:"
  RESPONSE=$(curl -s -X POST "${URL}" \
    -H "Content-Type: application/json" \
    -d '{
      "submitterEmail": "ratelimit-test@example.com",
      "submitterName": "Rate Limit Test",
      "isNewSubmission": true,
      "bookstoreData": {
        "name": "Rate Limit Test Bookstore '${i}'",
        "street": "123 Test St",
        "city": "Portland",
        "state": "OR",
        "zip": "97204",
        "description": "Testing rate limiting - request '${i}'"
      }
    }' \
    -w "\nHTTP_STATUS:%{http_code}\n" \
    -H "X-RateLimit-Limit: check" 2>&1)
  
  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$RESPONSE" | grep -v "HTTP_STATUS:")
  
  echo "  Status: ${HTTP_STATUS}"
  
  if [ "$HTTP_STATUS" = "429" ]; then
    echo "  ✅ RATE LIMITED (as expected)"
    echo "  Response: $BODY"
  elif [ "$HTTP_STATUS" = "201" ] || [ "$HTTP_STATUS" = "200" ]; then
    echo "  ✓ Allowed"
  else
    echo "  Response: $BODY"
  fi
  
  echo ""
  sleep 0.5
done

echo ""
echo "Check the responses above:"
echo "- Requests 1-5 should return 201 (success)"
echo "- Request 6 should return 429 (Too Many Requests)"
echo ""
echo "To check rate limit headers, use:"
echo "  curl -I -X POST ${URL} -H 'Content-Type: application/json' -d '{\"test\":\"data\"}'"

