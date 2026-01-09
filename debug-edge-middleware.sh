#!/bin/bash

# Debug script to check Edge Middleware behavior
# This helps identify if Edge Middleware is running and what it's doing

BASE_URL="${BASE_URL:-https://www.indiebookshop.com}"

echo "=========================================="
echo "Edge Middleware Debugging Script"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test homepage
echo -e "${YELLOW}Testing homepage...${NC}"
response=$(curl -k -s -w "\n%{http_code}" "$BASE_URL/")
http_code=$(echo "$response" | tail -n1)
html=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ Homepage loads (200 OK)${NC}"
else
  echo -e "${RED}✗ Homepage failed with status $http_code${NC}"
fi

# Check for Edge Middleware headers
echo ""
echo -e "${YELLOW}Checking response headers...${NC}"
headers=$(curl -k -s -I "$BASE_URL/")
echo "$headers" | grep -i "x-vercel\|x-middleware\|server" || echo "No Edge Middleware headers found"

# Check for SEO content
echo ""
echo -e "${YELLOW}Checking for SEO content markers...${NC}"
if echo "$html" | grep -q "<!-- Server-side injected SEO body content -->"; then
  echo -e "${GREEN}✓ SEO content marker found${NC}"
else
  echo -e "${RED}✗ SEO content marker NOT found${NC}"
fi

# Check for noscript block
if echo "$html" | grep -q "<noscript>"; then
  echo -e "${GREEN}✓ <noscript> block found${NC}"
  noscript_content=$(echo "$html" | grep -A 20 "<noscript>" | head -20)
  echo "First 20 lines of noscript content:"
  echo "$noscript_content"
else
  echo -e "${RED}✗ <noscript> block NOT found${NC}"
fi

# Check for H1 tags in noscript
if echo "$html" | grep -q "<noscript>.*<h1>"; then
  echo -e "${GREEN}✓ H1 tag found in noscript block${NC}"
else
  echo -e "${RED}✗ H1 tag NOT found in noscript block${NC}"
fi

# Check cache headers
echo ""
echo -e "${YELLOW}Checking cache headers...${NC}"
cache_control=$(echo "$headers" | grep -i "cache-control" || echo "No Cache-Control header")
echo "Cache-Control: $cache_control"

# Check if HTML contains root div (needed for injection)
echo ""
echo -e "${YELLOW}Checking HTML structure...${NC}"
if echo "$html" | grep -q '<div id="root">'; then
  echo -e "${GREEN}✓ Root div found${NC}"
else
  echo -e "${RED}✗ Root div NOT found${NC}"
fi

# Check HTML length
html_length=$(echo "$html" | wc -c)
echo "HTML length: $html_length bytes"

# Check for script tags (should be present)
script_count=$(echo "$html" | grep -c "<script" || echo "0")
echo "Script tags found: $script_count"

echo ""
echo "=========================================="
echo "To check Vercel logs:"
echo "1. Go to https://vercel.com/dashboard"
echo "2. Select your project (indiebookshop)"
echo "3. Go to 'Deployments' → Latest deployment"
echo "4. Click 'Functions' tab"
echo "5. Look for 'Edge Middleware' function"
echo "6. Check logs for messages like:"
echo "   - [Edge Middleware] Successfully fetched /index.html"
echo "   - [Edge Middleware] Failed to fetch HTML"
echo "   - [Edge Middleware] Cannot fetch HTML"
echo "=========================================="
