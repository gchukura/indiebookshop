#!/bin/bash

# Test script to verify SEO body content injection
# Tests that H1 tags and navigation links appear in raw HTML output

BASE_URL="${1:-https://www.indiebookshop.com}"

echo "Testing SEO body content injection..."
echo "Base URL: $BASE_URL"
echo ""

# Test URLs
TEST_URLS=(
  "/bookshop/strand-bookstore"
  "/bookshop/powell-s-city-of-books"
  "/bookshop/city-lights-bookstore"
  "/bookshop/elliott-bay-book-company"
  "/bookshop/politics-and-prose"
)

PASSED=0
FAILED=0

for url in "${TEST_URLS[@]}"; do
  echo "=========================================="
  echo "Testing: $url"
  echo "=========================================="
  
  FULL_URL="${BASE_URL}${url}"
  
  # Test 1: Check for H1 tag
  H1_COUNT=$(curl -s "$FULL_URL" | grep -c "<h1>" || echo "0")
  if [ "$H1_COUNT" -ge 1 ]; then
    echo "✓ PASS: H1 tag found ($H1_COUNT)"
    ((PASSED++))
  else
    echo "✗ FAIL: No H1 tag found"
    ((FAILED++))
  fi
  
  # Test 2: Check for navigation links
  NAV_LINKS=$(curl -s "$FULL_URL" | grep -c '<nav>' || echo "0")
  if [ "$NAV_LINKS" -ge 1 ]; then
    echo "✓ PASS: Navigation section found ($NAV_LINKS)"
    ((PASSED++))
  else
    echo "✗ FAIL: No navigation section found"
    ((FAILED++))
  fi
  
  # Test 3: Check for Home link
  HOME_LINK=$(curl -s "$FULL_URL" | grep -c 'href="/"' || echo "0")
  if [ "$HOME_LINK" -ge 1 ]; then
    echo "✓ PASS: Home link found ($HOME_LINK)"
    ((PASSED++))
  else
    echo "✗ FAIL: No Home link found"
    ((FAILED++))
  fi
  
  # Test 4: Check for Browse link
  BROWSE_LINK=$(curl -s "$FULL_URL" | grep -c 'href="/directory"' || echo "0")
  if [ "$BROWSE_LINK" -ge 1 ]; then
    echo "✓ PASS: Browse link found ($BROWSE_LINK)"
    ((PASSED++))
  else
    echo "✗ FAIL: No Browse link found"
    ((FAILED++))
  fi
  
  # Test 5: Check for noscript tag
  NOSCRIPT_COUNT=$(curl -s "$FULL_URL" | grep -c "<noscript>" || echo "0")
  if [ "$NOSCRIPT_COUNT" -ge 1 ]; then
    echo "✓ PASS: noscript tag found ($NOSCRIPT_COUNT)"
    ((PASSED++))
  else
    echo "✗ FAIL: No noscript tag found"
    ((FAILED++))
  fi
  
  # Test 6: Verify canonical tag still works (regression test)
  CANONICAL_COUNT=$(curl -s "$FULL_URL" | grep -c 'rel="canonical"' || echo "0")
  if [ "$CANONICAL_COUNT" -ge 1 ]; then
    echo "✓ PASS: Canonical tag found ($CANONICAL_COUNT) - no regression"
    ((PASSED++))
  else
    echo "✗ FAIL: Canonical tag missing - possible regression!"
    ((FAILED++))
  fi
  
  # Test 7: Verify root div still exists
  ROOT_DIV=$(curl -s "$FULL_URL" | grep -c 'id="root"' || echo "0")
  if [ "$ROOT_DIV" -ge 1 ]; then
    echo "✓ PASS: Root div found ($ROOT_DIV) - React will work"
    ((PASSED++))
  else
    echo "✗ FAIL: Root div missing - React will break!"
    ((FAILED++))
  fi
  
  echo ""
done

echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo "Total tests passed: $PASSED"
echo "Total tests failed: $FAILED"
echo ""

if [ "$FAILED" -eq 0 ]; then
  echo "✓ All tests passed!"
  exit 0
else
  echo "✗ Some tests failed. Please review the output above."
  exit 1
fi

