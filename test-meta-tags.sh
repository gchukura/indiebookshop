#!/bin/bash

# Test script to verify server-side meta tag injection

echo "Testing server-side meta tag injection..."
echo "=========================================="
echo ""

# Test 1: Check if canonical tag is present
echo "Test 1: Checking for canonical tag in /bookshop/113-books"
echo "--------------------------------------------------------"
curl -s http://localhost:3000/bookshop/113-books 2>&1 | grep -i "canonical" | head -3
echo ""

# Test 2: Check for OG tags
echo "Test 2: Checking for Open Graph tags"
echo "-------------------------------------"
curl -s http://localhost:3000/bookshop/113-books 2>&1 | grep -E "og:title|og:description|og:url" | head -5
echo ""

# Test 3: Check for Twitter tags
echo "Test 3: Checking for Twitter Card tags"
echo "----------------------------------------"
curl -s http://localhost:3000/bookshop/113-books 2>&1 | grep -E "twitter:card|twitter:title" | head -3
echo ""

# Test 4: Check title tag
echo "Test 4: Checking for bookshop-specific title"
echo "---------------------------------------------"
curl -s http://localhost:3000/bookshop/113-books 2>&1 | grep -E "<title>" | head -2
echo ""

# Test 5: Full HTML head section
echo "Test 5: Full <head> section (first 50 lines)"
echo "---------------------------------------------"
curl -s http://localhost:3000/bookshop/113-books 2>&1 | grep -A 50 "<head>" | head -50
echo ""

echo "=========================================="
echo "Testing complete!"
echo ""
echo "If you see canonical, og:*, and twitter:* tags above, the implementation is working!"
echo "If not, check server logs for errors."

