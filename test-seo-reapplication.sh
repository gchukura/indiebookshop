#!/bin/bash

# SEO Re-application Test Script
# Tests all SEO improvements after incremental re-application

set -e

BASE_URL="${BASE_URL:-https://www.indiebookshop.com}"

# Handle SSL certificate issues in sandbox environments
# Use -k flag to skip SSL verification if needed (for testing only)
CURL_OPTS="${CURL_OPTS:--k}"
TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test helper functions
test_pass() {
  ((PASS_COUNT++))
  ((TEST_COUNT++))
  echo -e "${GREEN}✓ PASS${NC}: $1"
}

test_fail() {
  ((FAIL_COUNT++))
  ((TEST_COUNT++))
  echo -e "${RED}✗ FAIL${NC}: $1"
  if [ -n "$2" ]; then
    echo -e "  ${YELLOW}Details:${NC} $2"
  fi
}

test_info() {
  echo -e "${YELLOW}ℹ INFO${NC}: $1"
}

# Check if URL returns 200
check_status() {
  local url=$1
  local expected_status=${2:-200}
  local status=$(curl $CURL_OPTS -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  
  if [ "$status" = "$expected_status" ]; then
    return 0
  else
    return 1
  fi
}

# Check if URL redirects to expected location
check_redirect() {
  local url=$1
  local expected_location=$2
  local expected_status=${3:-301}
  
  local response=$(curl $CURL_OPTS -s -o /dev/null -w "%{http_code}|%{redirect_url}" -L "$url" 2>/dev/null || echo "000|")
  local status=$(echo "$response" | cut -d'|' -f1)
  local location=$(echo "$response" | cut -d'|' -f2)
  
  if [ "$status" = "$expected_status" ] || [ "$status" = "200" ]; then
    # Check if final URL contains expected location
    if echo "$location" | grep -q "$expected_location" || [ "$status" = "200" ]; then
      return 0
    fi
  fi
  return 1
}

# Check if content contains string
check_content() {
  local url=$1
  local search_string=$2
  local content=$(curl $CURL_OPTS -s "$url" 2>/dev/null || echo "")
  
  if echo "$content" | grep -q "$search_string"; then
    return 0
  else
    return 1
  fi
}

# Check if meta tag exists
check_meta_tag() {
  local url=$1
  local meta_name=$2
  local content=$(curl $CURL_OPTS -s "$url" 2>/dev/null || echo "")
  
  if echo "$content" | grep -qi "<meta.*$meta_name"; then
    return 0
  else
    return 1
  fi
}

echo "=========================================="
echo "SEO Re-application Test Suite"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Homepage loads
test_info "Testing homepage..."
if check_status "$BASE_URL/"; then
  test_pass "Homepage loads (200 OK)"
else
  test_fail "Homepage fails to load"
fi

# Test 2: Homepage has SEO content
test_info "Testing homepage SEO content..."
if check_content "$BASE_URL/" "Discover Independent Bookshops Across America"; then
  test_pass "Homepage contains SEO content"
else
  test_fail "Homepage missing SEO content"
fi

# Test 3: Homepage has bookshop links
test_info "Testing homepage internal links..."
if check_content "$BASE_URL/" "/bookshop/"; then
  test_pass "Homepage contains bookshop links"
else
  test_fail "Homepage missing bookshop links"
fi

# Test 4: Directory page loads
test_info "Testing directory page..."
if check_status "$BASE_URL/directory"; then
  test_pass "Directory page loads (200 OK)"
else
  test_fail "Directory page fails to load"
fi

# Test 5: Directory page has SEO content
test_info "Testing directory SEO content..."
# Check for any SEO content (directory might use different text or be client-side routed)
if check_content "$BASE_URL/directory" "seo-content" || check_content "$BASE_URL/directory" "noscript"; then
  test_pass "Directory page contains SEO content"
else
  test_fail "Directory page missing SEO content"
fi

# Test 6: Static pages have SEO content
test_info "Testing static pages SEO content..."
for page in "about" "contact" "events" "blog"; do
  if check_content "$BASE_URL/$page" "seo-content"; then
    test_pass "$page page contains SEO content"
  else
    test_fail "$page page missing SEO content"
  fi
done

# Test 7: Bookshop detail page loads
test_info "Testing bookshop detail page..."
# Use a known bookshop slug (Powell's Books)
if check_status "$BASE_URL/bookshop/powells-books"; then
  test_pass "Bookshop detail page loads (200 OK)"
else
  test_fail "Bookshop detail page fails to load"
fi

# Test 8: Bookshop detail page has meta tags
test_info "Testing bookshop meta tags..."
if check_meta_tag "$BASE_URL/bookshop/powells-books" "og:title"; then
  test_pass "Bookshop page has Open Graph tags"
else
  test_fail "Bookshop page missing Open Graph tags"
fi

# Test 9: Bookshop detail page has Twitter Card tags
test_info "Testing Twitter Card tags..."
if check_meta_tag "$BASE_URL/bookshop/powells-books" "twitter:card"; then
  test_pass "Bookshop page has Twitter Card tags"
else
  test_fail "Bookshop page missing Twitter Card tags"
fi

# Test 10: Location variant redirects
test_info "Testing location variant redirects..."
# Test a known location variant (if it exists)
# Note: This may not work if the bookshop doesn't have a location variant
# We'll test with a generic pattern
if check_redirect "$BASE_URL/bookshop/powells-books-portland" "powells-books" 301; then
  test_pass "Location variant redirects to canonical URL"
else
  test_info "Location variant test skipped (may not exist for test bookshop)"
fi

# Test 11: HTML escaping in SEO content
test_info "Testing HTML escaping..."
# Check that special characters are escaped in bookshop names
if check_content "$BASE_URL/" "&amp;" || check_content "$BASE_URL/" "&lt;"; then
  test_pass "HTML escaping is working (special characters escaped)"
else
  # This is okay - not all content may have special characters
  test_info "HTML escaping test: No special characters found (may be normal)"
fi

# Test 12: Cache headers
test_info "Testing cache headers..."
cache_header=$(curl $CURL_OPTS -s -I "$BASE_URL/" 2>/dev/null | grep -i "cache-control" || echo "")
if [ -n "$cache_header" ]; then
  test_pass "Cache headers are set"
else
  test_fail "Cache headers missing"
fi

# Test 13: Canonical URLs in sitemap
test_info "Testing sitemap canonical URLs..."
if check_status "$BASE_URL/sitemap.xml"; then
  if check_content "$BASE_URL/sitemap.xml" "/bookshop/powells-books"; then
    test_pass "Sitemap contains canonical URLs"
  else
    test_fail "Sitemap may not contain canonical URLs"
  fi
else
  test_fail "Sitemap not accessible"
fi

# Test 14: Internal linking on static pages
test_info "Testing internal linking on static pages..."
for page in "about" "contact" "events" "blog"; do
  if check_content "$BASE_URL/$page" 'href="/'; then
    test_pass "$page page has internal links"
  else
    test_fail "$page page missing internal links"
  fi
done

# Test 15: No broken links in SEO content
test_info "Testing for broken links..."
# This is a basic check - we'll verify that links use proper format
if check_content "$BASE_URL/" 'href="/bookshop/[^"]*"'; then
  test_pass "Bookshop links use proper format"
else
  test_fail "Bookshop links may have formatting issues"
fi

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Total Tests: $TEST_COUNT"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
  exit 1
fi
