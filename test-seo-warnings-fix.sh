#!/bin/bash

# Test script to verify SEO warning fixes
# Tests: Warning #11 (Location Variants), Warning #22 (CSS), Warning #4 (Redirects)

set -e

echo "=========================================="
echo "Testing SEO Warning Fixes"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Test 1: Verify location variant redirect middleware is set up
echo "Test 1: Location Variant Redirect Middleware"
echo "--------------------------------------------"
if grep -q "createRedirectMiddleware" server/index.ts && grep -q "findBookshopBySlugVariations" server/redirectMiddleware.ts; then
    echo -e "${GREEN}✓ PASS${NC}: Location variant redirect middleware is properly configured"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC}: Location variant redirect middleware not found"
    FAILED=$((FAILED + 1))
fi

if grep -q "findBookshopBySlugVariations" middleware.ts; then
    echo -e "${GREEN}✓ PASS${NC}: Edge middleware has location variant redirect logic"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC}: Edge middleware missing location variant redirect logic"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 2: Verify Mapbox CSS lazy loading
echo "Test 2: Mapbox CSS Lazy Loading"
echo "--------------------------------"
if [ -f "client/src/lib/mapboxCssLoader.ts" ]; then
    echo -e "${GREEN}✓ PASS${NC}: mapboxCssLoader.ts exists"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC}: mapboxCssLoader.ts not found"
    FAILED=$((FAILED + 1))
fi

if grep -q "useMapboxCss" client/src/components/MapboxMap.tsx && \
   grep -q "useMapboxCss" client/src/components/SingleLocationMap.tsx && \
   grep -q "useMapboxCss" client/src/pages/Directory.tsx; then
    echo -e "${GREEN}✓ PASS${NC}: All map components use useMapboxCss hook"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC}: Some map components missing useMapboxCss hook"
    FAILED=$((FAILED + 1))
fi

if ! grep -q "mapbox-gl.css" client/index.html; then
    echo -e "${GREEN}✓ PASS${NC}: Mapbox CSS removed from index.html (now lazy loaded)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC}: Mapbox CSS still in index.html (should be lazy loaded)"
fi
echo ""

# Test 3: Verify redirect configuration
echo "Test 3: Redirect Configuration"
echo "-------------------------------"
if grep -q '"permanent": true' vercel.json; then
    echo -e "${GREEN}✓ PASS${NC}: Redirects use permanent (301) status"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC}: Redirects not configured as permanent"
    FAILED=$((FAILED + 1))
fi

if grep -q "indiebookshop.com" vercel.json && grep -q "www.indiebookshop.com" vercel.json; then
    echo -e "${GREEN}✓ PASS${NC}: Redirect from non-www to www is configured"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC}: Redirect configuration missing"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 4: Verify shared utilities
echo "Test 4: Shared Utilities"
echo "------------------------"
if [ -f "shared/utils.ts" ]; then
    echo -e "${GREEN}✓ PASS${NC}: shared/utils.ts exists"
    PASSED=$((PASSED + 1))
    
    if grep -q "generateSlugFromName" shared/utils.ts && grep -q "escapeHtml" shared/utils.ts; then
        echo -e "${GREEN}✓ PASS${NC}: Shared utilities include generateSlugFromName and escapeHtml"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: Shared utilities missing functions"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${RED}✗ FAIL${NC}: shared/utils.ts not found"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 5: Verify imports are correct
echo "Test 5: Import Verification"
echo "--------------------------"
if grep -q "from '@shared/utils'" server/htmlInjectionMiddleware.ts 2>/dev/null || \
   grep -q "from.*shared/utils" server/htmlInjectionMiddleware.ts 2>/dev/null; then
    echo -e "${GREEN}✓ PASS${NC}: htmlInjectionMiddleware imports from shared/utils"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC}: htmlInjectionMiddleware may not be using shared utils"
fi

if grep -q "from.*mapboxCssLoader" client/src/components/MapboxMap.tsx; then
    echo -e "${GREEN}✓ PASS${NC}: MapboxMap imports mapboxCssLoader"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC}: MapboxMap missing mapboxCssLoader import"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 6: Verify documentation exists
echo "Test 6: Documentation"
echo "--------------------"
if [ -f "docs/WARNING_11_LOCATION_VARIANTS_FIX.md" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Warning #11 documentation exists"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC}: Warning #11 documentation missing"
fi

if [ -f "docs/WARNING_22_CSS_OPTIMIZATION.md" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Warning #22 documentation exists"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC}: Warning #22 documentation missing"
fi

if [ -f "docs/WARNING_4_REDIRECT_CHAINS.md" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Warning #4 documentation exists"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC}: Warning #4 documentation missing"
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Passed: ${GREEN}${PASSED}${NC}"
echo -e "Failed: ${RED}${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All critical tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
    exit 1
fi
