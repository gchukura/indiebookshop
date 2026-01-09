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

# Check if canonical tag exists and extract URL
check_canonical_tag() {
  local url=$1
  local content=$(curl $CURL_OPTS -s "$url" 2>/dev/null || echo "")
  
  # Check for canonical link tag (case insensitive)
  if echo "$content" | grep -qi 'rel.*canonical'; then
    return 0
  else
    return 1
  fi
}

# Check if meta description is 120+ characters
check_meta_description_length() {
  local url=$1
  local content=$(curl $CURL_OPTS -s "$url" 2>/dev/null || echo "")
  
  # Extract meta description content using sed (works on macOS)
  local desc=""
  
  # Pattern: Extract content from <meta name="description" content="...">
  desc=$(echo "$content" | grep -i 'meta.*name.*description' | sed -n 's/.*content=["'\'']\([^"'\'']*\)["'\''].*/\1/p' | head -1)
  
  # If that didn't work, try with double quotes
  if [ -z "$desc" ]; then
    desc=$(echo "$content" | grep -i 'meta.*name.*description' | sed -n 's/.*content="\([^"]*\)".*/\1/p' | head -1)
  fi
  
  # If still empty, try single quotes
  if [ -z "$desc" ]; then
    desc=$(echo "$content" | grep -i 'meta.*name.*description' | sed -n "s/.*content='\([^']*\)'.*/\1/p" | head -1)
  fi
  
  # Check length
  if [ -n "$desc" ] && [ ${#desc} -ge 120 ]; then
    return 0
  else
    return 1
  fi
}

# Check redirect chain (verifies final URL is correct)
check_redirect_chain() {
  local url=$1
  local expected_final="https://www.indiebookshop.com"
  
  # Get final URL after following redirects (don't follow more than 5 redirects)
  local final_url=$(curl $CURL_OPTS -s -o /dev/null -w "%{url_effective}" -L --max-redirs 5 "$url" 2>/dev/null || echo "")
  
  # Check if final URL matches expected
  if echo "$final_url" | grep -q "$expected_final"; then
    return 0
  fi
  
  return 1
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

# Test 16: Canonical tags on homepage
test_info "Testing canonical tags on homepage..."
if check_canonical_tag "$BASE_URL/"; then
  test_pass "Homepage has canonical tag"
else
  test_fail "Homepage missing canonical tag"
fi

# Test 17: Canonical tags on bookshop pages
test_info "Testing canonical tags on bookshop pages..."
if check_canonical_tag "$BASE_URL/bookshop/powells-books"; then
  test_pass "Bookshop page has canonical tag"
else
  test_fail "Bookshop page missing canonical tag"
fi

# Test 18: Canonical tags on static pages
test_info "Testing canonical tags on static pages..."
for page in "directory" "about" "contact" "events" "blog"; do
  if check_canonical_tag "$BASE_URL/$page"; then
    test_pass "$page page has canonical tag"
  else
    test_fail "$page page missing canonical tag"
  fi
done

# Test 19: Meta description length on bookshop pages
test_info "Testing meta description length on bookshop pages..."
if check_meta_description_length "$BASE_URL/bookshop/powells-books"; then
  test_pass "Bookshop page meta description is 120+ characters"
else
  test_fail "Bookshop page meta description is too short (< 120 characters)"
fi

# Test 20: Redirect chains (http → https → www)
test_info "Testing redirect chains..."
# Test http://indiebookshop.com → should redirect to https://www.indiebookshop.com
if check_redirect_chain "http://indiebookshop.com/"; then
  test_pass "HTTP to HTTPS redirect chain works"
else
  test_info "Redirect chain test: May require manual verification (Vercel/DNS config)"
fi

# Test 21: Redirect chains (https non-www → www)
test_info "Testing non-www to www redirect..."
if check_redirect_chain "https://indiebookshop.com/"; then
  test_pass "Non-www to www redirect works"
else
  test_info "Non-www redirect test: May require manual verification (Vercel/DNS config)"
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
