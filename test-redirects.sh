#!/bin/bash

# Test script for URL redirect patterns
# This script tests the three URL patterns for bookshop detail pages

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "Testing URL Redirect Patterns"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Slug-based URL (should work normally)
echo "Test 1: /bookshop/powell-books (Slug-based - Canonical)"
echo "--------------------------------------------------------"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/bookshop/powell-books")
if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Status: $RESPONSE (OK)${NC}"
    echo "  Expected: 200 OK, no redirects"
else
    echo -e "${RED}✗ Status: $RESPONSE (Expected 200)${NC}"
fi

# Check for canonical tag
CANONICAL=$(curl -s "${BASE_URL}/bookshop/powell-books" | grep -i 'rel="canonical"' | head -1)
if [[ $CANONICAL == *"bookshop/powell-books"* ]]; then
    echo -e "${GREEN}✓ Canonical tag found: $CANONICAL${NC}"
else
    echo -e "${YELLOW}⚠ Canonical tag check: $CANONICAL${NC}"
fi
echo ""

# Test 2: Numeric ID (should redirect to slug)
echo "Test 2: /bookshop/123 (Numeric ID - Should redirect to slug)"
echo "--------------------------------------------------------------"
echo "Note: This requires a valid bookshop ID. Replace '123' with an actual ID."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/bookshop/123")
if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Status: $RESPONSE (OK)${NC}"
    echo "  Note: Client-side redirect happens in browser"
    echo "  Check browser DevTools Network tab to see redirect"
else
    echo -e "${YELLOW}⚠ Status: $RESPONSE${NC}"
    echo "  This might be expected if bookshop ID 123 doesn't exist"
fi
echo ""

# Test 3: Old bookstore route (should 301 redirect)
echo "Test 3: /bookstore/123 (Old Route - Should 301 redirect)"
echo "---------------------------------------------------------"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -L "${BASE_URL}/bookstore/123")
LOCATION=$(curl -s -o /dev/null -w "%{redirect_url}" "${BASE_URL}/bookstore/123")

if [ "$RESPONSE" = "301" ] || [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Status: $RESPONSE${NC}"
    if [ -n "$LOCATION" ]; then
        echo -e "${GREEN}✓ Redirect Location: $LOCATION${NC}"
        if [[ $LOCATION == *"/bookshop/123"* ]]; then
            echo -e "${GREEN}✓ Correct redirect target${NC}"
        else
            echo -e "${YELLOW}⚠ Unexpected redirect target${NC}"
        fi
    fi
else
    echo -e "${RED}✗ Status: $RESPONSE (Expected 301 or 200)${NC}"
fi
echo ""

# Test 3b: Check redirect chain
echo "Test 3b: Following redirect chain for /bookstore/123"
echo "----------------------------------------------------"
echo "Following redirects (max 3 hops):"
curl -s -o /dev/null -w "Initial: %{url_effective}\n" "${BASE_URL}/bookstore/123" -L --max-redirs 3
echo ""

echo "=============================="
echo "Testing Complete"
echo ""
echo "Manual Testing Instructions:"
echo "1. Open browser DevTools (F12)"
echo "2. Go to Network tab"
echo "3. Navigate to each URL pattern"
echo "4. Check:"
echo "   - Status codes"
echo "   - Redirect chains"
echo "   - Final URL in address bar"
echo "   - Canonical tag in page source"
echo ""
echo "Expected Results:"
echo "- /bookshop/powell-books: Loads normally, no redirects"
echo "- /bookshop/123: Loads, then client-side redirects to slug"
echo "- /bookstore/123: 301 redirects to /bookshop/123, then to slug"

