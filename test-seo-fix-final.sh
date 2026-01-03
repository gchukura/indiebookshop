#!/bin/bash

# Comprehensive test script to verify SEO fix
# Tests that H1 tags, navigation links, and meta tags work correctly

BASE_URL="${1:-https://www.indiebookshop.com}"

echo "=========================================="
echo "Testing IndiebookShop SEO Fix"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# Test URLs
TEST_BOOKSHOPS=(
  "strand-bookstore"
  "powell-s-city-of-books"
  "city-lights-bookstore"
  "elliott-bay-book-company"
  "politics-and-prose"
)

PASSED=0
FAILED=0

# Test 1: Verify H1 tags are present
echo "Test 1: Checking for H1 tags..."
echo "----------------------------------------"
for slug in "${TEST_BOOKSHOPS[@]}"; do
  URL="${BASE_URL}/bookshop/${slug}"
  H1_COUNT=$(curl -s "$URL" | grep -c "<h1>" 2>/dev/null | head -1 || echo "0")
  H1_COUNT=${H1_COUNT//[^0-9]/}  # Remove any non-numeric characters
  if [ -n "$H1_COUNT" ] && [ "$H1_COUNT" -ge 1 ]; then
    H1_CONTENT=$(curl -s "$URL" | grep -A1 "<h1>" | head -2 | grep -o "<h1>.*</h1>" | sed 's/<[^>]*>//g' || echo "")
    echo "  ✅ $slug: H1 found ($H1_COUNT) - '$H1_CONTENT'"
    ((PASSED++))
  else
    echo "  ❌ $slug: No H1 tag found"
    ((FAILED++))
  fi
done
echo ""

# Test 2: Verify navigation links are correct
echo "Test 2: Checking navigation links..."
echo "----------------------------------------"
NAV_TEST_URL="${BASE_URL}/bookshop/strand-bookstore"
NAV_HTML=$(curl -s "$NAV_TEST_URL" | grep -A10 "<nav>" | head -15)

# Check for Home link
if echo "$NAV_HTML" | grep -q 'href="/"'; then
  echo "  ✅ Home link present"
  ((PASSED++))
else
  echo "  ❌ Home link missing"
  ((FAILED++))
fi

# Check for Browse/Directory link
if echo "$NAV_HTML" | grep -q 'href="/directory"'; then
  echo "  ✅ Directory link present"
  ((PASSED++))
else
  echo "  ❌ Directory link missing"
  ((FAILED++))
fi

# Check that NO state links exist
STATE_LINK_COUNT=$(curl -s "$NAV_TEST_URL" | grep -c "directory?state" 2>/dev/null | head -1 || echo "0")
STATE_LINK_COUNT=${STATE_LINK_COUNT//[^0-9]/}  # Remove any non-numeric characters
if [ -z "$STATE_LINK_COUNT" ] || [ "$STATE_LINK_COUNT" -eq "0" ]; then
  echo "  ✅ No state links found (correct - removed)"
  ((PASSED++))
else
  echo "  ❌ State links still present (found $STATE_LINK_COUNT)"
  ((FAILED++))
fi
echo ""

# Test 3: Verify noscript tag is present
echo "Test 3: Checking noscript tag..."
echo "----------------------------------------"
NOSCRIPT_COUNT=$(curl -s "$NAV_TEST_URL" | grep -c "<noscript>" 2>/dev/null | head -1 || echo "0")
NOSCRIPT_COUNT=${NOSCRIPT_COUNT//[^0-9]/}  # Remove any non-numeric characters
if [ -n "$NOSCRIPT_COUNT" ] && [ "$NOSCRIPT_COUNT" -ge 1 ]; then
  echo "  ✅ noscript tag found ($NOSCRIPT_COUNT)"
  ((PASSED++))
else
  echo "  ❌ noscript tag missing"
  ((FAILED++))
fi
echo ""

# Test 4: Verify canonical tags still work (regression test)
echo "Test 4: Checking canonical tags (regression test)..."
echo "----------------------------------------"
for slug in "${TEST_BOOKSHOPS[@]:0:3}"; do
  URL="${BASE_URL}/bookshop/${slug}"
  CANONICAL=$(curl -s "$URL" | grep 'rel="canonical"' || echo "")
  if [ -n "$CANONICAL" ]; then
    echo "  ✅ $slug: Canonical tag present"
    ((PASSED++))
  else
    echo "  ❌ $slug: Canonical tag missing - REGRESSION!"
    ((FAILED++))
  fi
done
echo ""

# Test 5: Verify root div still exists (React compatibility)
echo "Test 5: Checking React compatibility..."
echo "----------------------------------------"
ROOT_DIV_COUNT=$(curl -s "$NAV_TEST_URL" | grep -c 'id="root"' 2>/dev/null | head -1 || echo "0")
ROOT_DIV_COUNT=${ROOT_DIV_COUNT//[^0-9]/}  # Remove any non-numeric characters
if [ -n "$ROOT_DIV_COUNT" ] && [ "$ROOT_DIV_COUNT" -ge 1 ]; then
  echo "  ✅ Root div found ($ROOT_DIV_COUNT) - React will work"
  ((PASSED++))
else
  echo "  ❌ Root div missing - React will break!"
  ((FAILED++))
fi
echo ""

# Test 6: Verify link validity (check HTTP status codes)
echo "Test 6: Checking link validity..."
echo "----------------------------------------"
for path in "/" "/directory"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${path}")
  if [ "$STATUS" -eq "200" ]; then
    echo "  ✅ $path: Returns 200 OK"
    ((PASSED++))
  else
    echo "  ❌ $path: Returns $STATUS"
    ((FAILED++))
  fi
done
echo ""

# Test 7: Verify no broken state links in HTML
echo "Test 7: Checking for any remaining state link references..."
echo "----------------------------------------"
STATE_REF_COUNT=$(curl -s "$NAV_TEST_URL" | grep -c "directory?state" 2>/dev/null | head -1 || echo "0")
STATE_REF_COUNT=${STATE_REF_COUNT//[^0-9]/}  # Remove any non-numeric characters
if [ -z "$STATE_REF_COUNT" ] || [ "$STATE_REF_COUNT" -eq "0" ]; then
  echo "  ✅ No state link references found"
  ((PASSED++))
else
  echo "  ❌ Found $STATE_REF_COUNT state link references"
  ((FAILED++))
fi
echo ""

# Test 8: Verify meta description is present
echo "Test 8: Checking meta description..."
echo "----------------------------------------"
META_DESC=$(curl -s "$NAV_TEST_URL" | grep 'name="description"' || echo "")
if [ -n "$META_DESC" ]; then
  echo "  ✅ Meta description present"
  ((PASSED++))
else
  echo "  ❌ Meta description missing"
  ((FAILED++))
fi
echo ""

# Test 9: Verify Open Graph tags are present
echo "Test 9: Checking Open Graph tags..."
echo "----------------------------------------"
OG_TITLE=$(curl -s "$NAV_TEST_URL" | grep 'property="og:title"' || echo "")
if [ -n "$OG_TITLE" ]; then
  echo "  ✅ Open Graph title present"
  ((PASSED++))
else
  echo "  ❌ Open Graph title missing"
  ((FAILED++))
fi
echo ""

# Test 10: Sample HTML output for manual inspection
echo "Test 10: Sample HTML output (first 50 lines with H1 and nav)..."
echo "----------------------------------------"
SAMPLE_HTML=$(curl -s "${BASE_URL}/bookshop/strand-bookstore" | grep -A5 -B5 "<h1>\|<nav>" | head -20)
echo "$SAMPLE_HTML"
echo ""

# Summary
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo "Total tests passed: $PASSED"
echo "Total tests failed: $FAILED"
echo ""

if [ "$FAILED" -eq 0 ]; then
  echo "✅ ALL TESTS PASSED!"
  echo ""
  echo "The SEO fix is comprehensive and stable:"
  echo "  ✓ H1 tags are present"
  echo "  ✓ Navigation links are correct (no state links)"
  echo "  ✓ Meta tags still work (no regression)"
  echo "  ✓ React compatibility maintained"
  echo "  ✓ All links are valid"
  exit 0
else
  echo "❌ SOME TESTS FAILED"
  echo ""
  echo "Please review the failures above and fix any issues."
  exit 1
fi

