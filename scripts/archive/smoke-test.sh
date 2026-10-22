#!/bin/bash

# Smoke Test Script for IndiebookShop.com
# Validates main endpoints after deployment to ensure migration is working correctly
#
# Usage:
#   ./scripts/smoke-test.sh                    # Test localhost:3000
#   ./scripts/smoke-test.sh https://yourdomain.com  # Test production
#
# Exit codes:
#   0 - All tests passed
#   1 - One or more tests failed

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL (default to localhost, or use first argument)
BASE_URL="${1:-http://localhost:3000}"

# Track test results
PASSED=0
FAILED=0
TOTAL=0

# Function to print test header
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Function to run a test
run_test() {
    local test_name="$1"
    local url="$2"
    local expected_field="$3"  # Optional: field that should exist in JSON response
    
    TOTAL=$((TOTAL + 1))
    echo -e "${YELLOW}Testing: ${test_name}${NC}"
    echo -e "URL: ${url}"
    
    # Make request and capture response
    response=$(curl -s -w "\n%{http_code}" "$url" 2>&1) || {
        echo -e "${RED}✗ FAILED: Request failed${NC}"
        FAILED=$((FAILED + 1))
        return 1
    }
    
    # Extract HTTP status code (last line)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    # Check HTTP status code
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        # Check if response is valid JSON (if expected)
        if [ -n "$expected_field" ]; then
            if echo "$body" | jq -e ".$expected_field" > /dev/null 2>&1; then
                echo -e "${GREEN}✓ PASSED: HTTP $http_code, valid JSON with '$expected_field' field${NC}"
                PASSED=$((PASSED + 1))
                return 0
            else
                echo -e "${RED}✗ FAILED: HTTP $http_code, but missing expected field '$expected_field'${NC}"
                echo -e "Response preview: $(echo "$body" | head -c 100)..."
                FAILED=$((FAILED + 1))
                return 1
            fi
        else
            # For non-JSON responses (like sitemap), just check status
            echo -e "${GREEN}✓ PASSED: HTTP $http_code${NC}"
            PASSED=$((PASSED + 1))
            return 0
        fi
    else
        echo -e "${RED}✗ FAILED: HTTP $http_code${NC}"
        echo -e "Response: $(echo "$body" | head -c 200)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Function to test JSON array endpoint
test_json_array() {
    local test_name="$1"
    local url="$2"
    local min_items="${3:-1}"  # Minimum number of items expected
    
    TOTAL=$((TOTAL + 1))
    echo -e "${YELLOW}Testing: ${test_name}${NC}"
    echo -e "URL: ${url}"
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>&1) || {
        echo -e "${RED}✗ FAILED: Request failed${NC}"
        FAILED=$((FAILED + 1))
        return 1
    }
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        # Check if it's a valid JSON array
        if echo "$body" | jq -e "type == \"array\"" > /dev/null 2>&1; then
            item_count=$(echo "$body" | jq 'length')
            if [ "$item_count" -ge "$min_items" ]; then
                echo -e "${GREEN}✓ PASSED: HTTP $http_code, JSON array with $item_count items${NC}"
                PASSED=$((PASSED + 1))
                return 0
            else
                echo -e "${RED}✗ FAILED: HTTP $http_code, but only $item_count items (expected at least $min_items)${NC}"
                FAILED=$((FAILED + 1))
                return 1
            fi
        else
            echo -e "${RED}✗ FAILED: HTTP $http_code, but response is not a JSON array${NC}"
            echo -e "Response preview: $(echo "$body" | head -c 100)..."
            FAILED=$((FAILED + 1))
            return 1
        fi
    else
        echo -e "${RED}✗ FAILED: HTTP $http_code${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Function to test XML endpoint (sitemap)
test_xml() {
    local test_name="$1"
    local url="$2"
    local expected_tag="$3"  # Expected XML tag (e.g., "urlset")
    
    TOTAL=$((TOTAL + 1))
    echo -e "${YELLOW}Testing: ${test_name}${NC}"
    echo -e "URL: ${url}"
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>&1) || {
        echo -e "${RED}✗ FAILED: Request failed${NC}"
        FAILED=$((FAILED + 1))
        return 1
    }
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        if echo "$body" | grep -q "<$expected_tag"; then
            url_count=$(echo "$body" | grep -c "<url>" || echo "0")
            echo -e "${GREEN}✓ PASSED: HTTP $http_code, valid XML with <$expected_tag> tag ($url_count URLs)${NC}"
            PASSED=$((PASSED + 1))
            return 0
        else
            echo -e "${RED}✗ FAILED: HTTP $http_code, but missing expected tag <$expected_tag>${NC}"
            echo -e "Response preview: $(echo "$body" | head -c 100)..."
            FAILED=$((FAILED + 1))
            return 1
        fi
    else
        echo -e "${RED}✗ FAILED: HTTP $http_code${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq is not installed. JSON validation will be limited.${NC}"
    echo -e "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
fi

# Start testing
print_header "Smoke Test Suite - IndiebookShop.com"
echo -e "Base URL: ${BASE_URL}"
echo -e "Started: $(date)"

# Test 1: Bookstores endpoint (with limit)
print_header "Test 1: Bookstores API (with limit)"
test_json_array "GET /api/bookstores?limit=1" "${BASE_URL}/api/bookstores?limit=1" 1

# Test 2: Bookstores endpoint (full)
print_header "Test 2: Bookstores API (full list)"
test_json_array "GET /api/bookstores" "${BASE_URL}/api/bookstores" 1

# Test 3: Features endpoint
print_header "Test 3: Features API"
test_json_array "GET /api/features" "${BASE_URL}/api/features" 1

# Test 4: Verify features have id field (critical for migration)
print_header "Test 4: Features ID Field Validation"
if command -v jq &> /dev/null; then
    response=$(curl -s "${BASE_URL}/api/features")
    if echo "$response" | jq -e '.[0].id != null' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED: Features have 'id' field (migration fix verified)${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAILED: Features missing 'id' field (migration issue!)${NC}"
        FAILED=$((FAILED + 1))
    fi
    TOTAL=$((TOTAL + 1))
else
    echo -e "${YELLOW}⚠ SKIPPED: jq not available, cannot validate id field${NC}"
fi

# Test 5: States endpoint
print_header "Test 5: States API"
test_json_array "GET /api/states" "${BASE_URL}/api/states" 1

# Test 6: Sitemap
print_header "Test 6: Sitemap Generation"
test_xml "GET /sitemap.xml" "${BASE_URL}/sitemap.xml" "urlset"

# Test 7: Health check (if available)
print_header "Test 7: Health Check"
run_test "GET /api/health" "${BASE_URL}/api/health" "status" || {
    echo -e "${YELLOW}⚠ Health endpoint not available (optional)${NC}"
    TOTAL=$((TOTAL - 1))
    FAILED=$((FAILED - 1))
}

# Summary
print_header "Test Summary"
echo -e "Total Tests: ${TOTAL}"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo -e "Completed: $(date)"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed! Migration appears successful.${NC}\n"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed. Please review the errors above.${NC}\n"
    exit 1
fi

