#!/bin/bash

# Test script to verify canonical URLs use www.indiebookshop.com
# Run this after deployment to verify the fix

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Testing Canonical URL Fix (www.indiebookshop.com)"
echo "=================================================="
echo ""

# Test URLs
TEST_URLS=(
  "https://www.indiebookshop.com/bookshop/fables-books"
  "https://www.indiebookshop.com/bookshop/powell-books"
  "https://www.indiebookshop.com/bookshop/booktenders-wv"
  "https://www.indiebookshop.com/"
  "https://www.indiebookshop.com/directory"
)

PASSED=0
FAILED=0

for URL in "${TEST_URLS[@]}"; do
  echo "Testing: $URL"
  
  # Fetch the page
  HTML=$(curl -s "$URL" 2>/dev/null)
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ FAIL: Could not fetch URL${NC}"
    FAILED=$((FAILED + 1))
    echo ""
    continue
  fi
  
  # Extract canonical URL
  CANONICAL=$(echo "$HTML" | grep -i 'rel="canonical"' | sed -n 's/.*href="\([^"]*\)".*/\1/p')
  
  if [ -z "$CANONICAL" ]; then
    echo -e "${YELLOW}⚠️  WARNING: No canonical tag found${NC}"
    FAILED=$((FAILED + 1))
  elif [[ $CANONICAL == *"https://www.indiebookshop.com"* ]]; then
    echo -e "${GREEN}✅ PASS: Canonical uses www version${NC}"
    echo "   Canonical: $CANONICAL"
    PASSED=$((PASSED + 1))
  elif [[ $CANONICAL == *"https://indiebookshop.com"* ]]; then
    echo -e "${RED}❌ FAIL: Canonical still uses non-www version${NC}"
    echo "   Canonical: $CANONICAL"
    FAILED=$((FAILED + 1))
  else
    echo -e "${RED}❌ FAIL: Unexpected canonical URL${NC}"
    echo "   Canonical: $CANONICAL"
    FAILED=$((FAILED + 1))
  fi
  
  echo ""
done

echo "=================================================="
echo "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed! Canonical URLs are using www version.${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed. Please check the output above.${NC}"
  exit 1
fi

