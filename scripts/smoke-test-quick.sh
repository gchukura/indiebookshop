#!/bin/bash

# Quick Smoke Test - Minimal validation for fast feedback
# Usage: ./scripts/smoke-test-quick.sh [URL]

BASE_URL="${1:-http://localhost:3000}"

echo "🔍 Quick Smoke Test - ${BASE_URL}"
echo ""

# Test 1: Bookstores
echo -n "Testing /api/bookstores... "
if curl -s "${BASE_URL}/api/bookstores?limit=1" | jq -e 'type == "array" and length > 0' > /dev/null 2>&1; then
    echo "✓"
else
    echo "✗ FAILED"
    exit 1
fi

# Test 2: Features
echo -n "Testing /api/features... "
if curl -s "${BASE_URL}/api/features" | jq -e 'type == "array" and .[0].id != null' > /dev/null 2>&1; then
    echo "✓"
else
    echo "✗ FAILED"
    exit 1
fi

# Test 3: Sitemap
echo -n "Testing /sitemap.xml... "
if curl -s "${BASE_URL}/sitemap.xml" | grep -q "<urlset"; then
    echo "✓"
else
    echo "✗ FAILED"
    exit 1
fi

echo ""
echo "✅ All quick tests passed!"

