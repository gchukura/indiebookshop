# Homepage Performance Diagnostic Report

## Issues Identified

### 🔴 Critical Performance Issues

#### 1. Browse by State Section - Expensive Computations on Every Render
**Location:** `client/src/pages/Home.tsx:352-447`

**Problem:**
- Large `stateMap` object (70+ entries) created inline on every render
- Large `usStateAbbreviations` array (50+ entries) created inline on every render
- Processing all bookshops to extract unique states on every render
- Filtering, mapping, and sorting operations run on every render
- All computations happen inside JSX render function (IIFE)

**Impact:**
- Recomputes ~200+ operations on every render
- Blocks main thread during render
- Causes visible lag when scrolling/interacting

**Fix Required:**
- Move `stateMap` and `usStateAbbreviations` outside component (constants)
- Memoize state processing with `useMemo`
- Only recompute when `bookshops` changes

#### 2. Featured Bookshops - Inefficient Feature Filtering
**Location:** `client/src/pages/Home.tsx:282-286`

**Problem:**
- `bookshopFeatures` computed inside map for each bookshop
- Filters entire `features` array for each of 6 bookshops
- `generateSlugFromName` called for each bookshop (could be cached)
- `getHeroImageUrl` called for each bookshop (acceptable but could be optimized)

**Impact:**
- 6+ array filters per render
- Redundant slug generation
- Minor but cumulative performance cost

**Fix Required:**
- Pre-compute features map outside render
- Memoize slug generation or compute once
- Consider memoizing hero image URLs

#### 3. getFeaturedBookshops - Multiple Array Operations
**Location:** `client/src/pages/Home.tsx:66-82`

**Problem:**
- Filters all bookshops twice (withImages, withoutImages)
- Creates two new arrays
- Sorts both arrays
- Runs on every `bookshops` change (even if data hasn't changed)

**Impact:**
- Processes 3000+ bookshops twice
- Two sort operations
- Triggers unnecessary re-renders

**Fix Required:**
- Optimize to single pass through bookshops
- Memoize result with `useMemo`
- Only recompute when bookshops actually change

### ⚠️ Moderate Performance Issues

#### 4. Missing Memoization for Helper Functions
**Location:** `client/src/pages/Home.tsx:99-127`

**Problem:**
- `extractPhotoReference` and `getHeroImageUrl` are recreated on every render
- Not expensive individually, but called multiple times

**Impact:**
- Minor memory allocation overhead
- Function recreation on every render

**Fix Required:**
- Move outside component or use `useCallback`

#### 5. useEffect Dependency on Function
**Location:** `client/src/pages/Home.tsx:85-89`

**Problem:**
- `useEffect` depends on `getFeaturedBookshops` function
- Function is recreated on every render (even with useCallback)
- Could cause unnecessary effect runs

**Impact:**
- Potential unnecessary state updates
- Minor but could cause cascading re-renders

**Fix Required:**
- Remove function from dependencies, depend on `bookshops` directly
- Or inline the logic in useEffect

## Performance Metrics (Estimated)

### Current Performance
- **Browse by State**: ~50-100ms per render (blocking)
- **Featured Bookshops**: ~10-20ms per render
- **Total Blocking Time**: ~60-120ms per render
- **Re-render Frequency**: On every state/prop change

### Expected After Fixes
- **Browse by State**: ~1-5ms per render (memoized)
- **Featured Bookshops**: ~2-5ms per render (optimized)
- **Total Blocking Time**: ~3-10ms per render
- **Re-render Frequency**: Only when data actually changes

## Recommended Fixes Priority

1. **HIGH**: Memoize Browse by State computations
2. **HIGH**: Optimize getFeaturedBookshops
3. **MEDIUM**: Pre-compute features map
4. **MEDIUM**: Optimize useEffect dependencies
5. **LOW**: Memoize helper functions

## Implementation Plan

1. Extract constants outside component
2. Add useMemo for expensive computations
3. Optimize array operations (single pass)
4. Pre-compute feature mappings
5. Fix useEffect dependencies

