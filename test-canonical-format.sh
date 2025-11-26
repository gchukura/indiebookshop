#!/bin/bash

# Test script to verify canonical tag format
# This script tests that canonical URLs use https://indiebookshop.com, not localhost

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "Testing Canonical Tag Format"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test 1: Slug-based URL
echo "Test 1: /bookshop/powells-books"
echo "--------------------------------"
CANONICAL=$(curl -s "${BASE_URL}/bookshop/powells-books" 2>/dev/null | grep -i 'rel="canonical"' | head -1)

if [ -z "$CANONICAL" ]; then
    echo -e "${YELLOW}⚠ Could not fetch page or canonical tag not found${NC}"
    echo "   Make sure the server is running: npm run dev"
else
    echo "Found: $CANONICAL"
    
    if [[ $CANONICAL == *"https://indiebookshop.com"* ]]; then
        echo -e "${GREEN}✅ PASS: Canonical uses production URL (https://indiebookshop.com)${NC}"
    elif [[ $CANONICAL == *"http://localhost"* ]]; then
        echo -e "${RED}❌ FAIL: Canonical uses localhost instead of production URL${NC}"
    else
        echo -e "${YELLOW}⚠ Unexpected canonical format${NC}"
    fi
    
    if [[ $CANONICAL == *"/bookshop/powells-books"* ]]; then
        echo -e "${GREEN}✅ PASS: Canonical uses slug-based URL${NC}"
    else
        echo -e "${RED}❌ FAIL: Canonical does not use slug-based URL${NC}"
    fi
fi
echo ""

# Test 2: Numeric ID (should redirect, but canonical should still be slug-based)
echo "Test 2: /bookshop/123 (numeric ID)"
echo "-----------------------------------"
echo "Note: Replace 123 with an actual bookshop ID"
CANONICAL=$(curl -s "${BASE_URL}/bookshop/123" 2>/dev/null | grep -i 'rel="canonical"' | head -1)

if [ -z "$CANONICAL" ]; then
    echo -e "${YELLOW}⚠ Could not fetch page or canonical tag not found${NC}"
    echo "   This might be expected if bookshop ID 123 doesn't exist"
else
    echo "Found: $CANONICAL"
    
    if [[ $CANONICAL == *"https://indiebookshop.com"* ]]; then
        echo -e "${GREEN}✅ PASS: Canonical uses production URL${NC}"
    else
        echo -e "${RED}❌ FAIL: Canonical does not use production URL${NC}"
    fi
    
    if [[ $CANONICAL == *"/bookshop/123"* ]]; then
        echo -e "${RED}❌ FAIL: Canonical should NOT use numeric ID, should use slug${NC}"
    else
        echo -e "${GREEN}✅ PASS: Canonical does not use numeric ID (should use slug)${NC}"
    fi
fi
echo ""

# Test 3: Old bookstore route
echo "Test 3: /bookstore/123 (old route)"
echo "-----------------------------------"
echo "Note: Replace 123 with an actual bookshop ID"
CANONICAL=$(curl -s -L "${BASE_URL}/bookstore/123" 2>/dev/null | grep -i 'rel="canonical"' | head -1)

if [ -z "$CANONICAL" ]; then
    echo -e "${YELLOW}⚠ Could not fetch page or canonical tag not found${NC}"
else
    echo "Found: $CANONICAL"
    
    if [[ $CANONICAL == *"https://indiebookshop.com"* ]]; then
        echo -e "${GREEN}✅ PASS: Canonical uses production URL${NC}"
    else
        echo -e "${RED}❌ FAIL: Canonical does not use production URL${NC}"
    fi
fi
echo ""

echo "=============================="
echo "Expected Canonical Format:"
echo "  <link rel=\"canonical\" href=\"https://indiebookshop.com/bookshop/[slug]\" />"
echo ""
echo "NOT:"
echo "  <link rel=\"canonical\" href=\"http://localhost:3000/...\" />"
echo "  <link rel=\"canonical\" href=\"https://indiebookshop.com/bookshop/123\" />"

