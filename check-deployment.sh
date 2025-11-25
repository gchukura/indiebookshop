#!/bin/bash

# Check if deployment is working and diagnose issues

DOMAIN="${1:-indiebookshop.com}"
BASE_URL="https://${DOMAIN}"

echo "Checking deployment status for ${DOMAIN}..."
echo ""

# Test 1: Health endpoint
echo "1. Testing health endpoint:"
curl -s "${BASE_URL}/api/health" | head -5
echo ""
echo ""

# Test 2: Simple GET endpoint
echo "2. Testing GET /api/bookstores (first few):"
curl -s "${BASE_URL}/api/bookstores?limit=1" | head -10
echo ""
echo ""

# Test 3: Check if POST endpoint exists (without data)
echo "3. Testing POST endpoint (should fail with validation, not 500):"
curl -s -X POST "${BASE_URL}/api/bookstores/submit" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.' 2>/dev/null || curl -s -X POST "${BASE_URL}/api/bookstores/submit" \
  -H "Content-Type: application/json" \
  -d '{}'
echo ""
echo ""

echo "If you see 500 errors, check:"
echo "1. Vercel deployment logs (Dashboard > Your Project > Deployments > Latest > Functions)"
echo "2. Environment variables are set correctly"
echo "3. Dependencies are installed (express-rate-limit should be in package.json)"

