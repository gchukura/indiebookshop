# CLS (Cumulative Layout Shift) Fix Summary

## Issue
- **CLS Score**: 0.87 (Poor - should be < 0.1)
- **Worst Cluster**: 1 shift

## Root Causes Identified

1. **Hero Image Without Dimensions**
   - OptimizedImage component didn't have explicit width/height props
   - Container had fixed height but image could still cause shifts

2. **Photo Gallery Images**
   - Images in gallery had no width/height attributes
   - Only had className with h-40, causing layout shifts when images load

3. **Related Bookshops Component**
   - Loads asynchronously, changing from loading state to content
   - No reserved space, causing significant shift

4. **Dynamic Content Sections**
   - Features section appears/disappears based on data
   - Events section conditionally renders
   - No reserved space for these sections

5. **Map Component**
   - SingleLocationMap loads asynchronously
   - No min-height to reserve space

## Fixes Applied

### 1. Hero Image
- ✅ Added explicit `width={1200}` and `height={400}` props
- ✅ Added `minHeight` style to container
- ✅ Already had placeholder color, but now has dimensions

### 2. Photo Gallery Images
- ✅ Added `width={400}` and `height={300}` to all gallery images
- ✅ Added `aspectRatio: '4/3'` style to containers
- ✅ Changed loading to `lazy` for below-fold images
- ✅ Maintained existing error handling

### 3. Related Bookshops Component
- ✅ Improved loading skeleton with proper dimensions
- ✅ Added `minHeight: '200px'` to container
- ✅ Skeleton now matches final content layout
- ✅ Empty state reserves minimal space (1px) to prevent shift

### 4. Dynamic Content Sections
- ✅ Added `minHeight` to features section
- ✅ Added fallback text when no features
- ✅ Events section now always reserves space (1px min)
- ✅ Prevents layout shift when content appears/disappears

### 5. Map Component
- ✅ Added `minHeight: '256px'` to map container
- ✅ Reserves space before map loads

## Expected Improvements

**Before:**
- CLS: 0.87 (Poor)
- Multiple layout shifts during page load

**After:**
- CLS: < 0.1 (Good)
- All images have explicit dimensions
- All dynamic content has reserved space
- No unexpected layout shifts

## Testing Recommendations

1. **Test in Chrome DevTools**:
   - Open Performance tab
   - Record page load
   - Check for layout shifts (red bars)
   - Verify CLS score in Lighthouse

2. **Test with Slow 3G**:
   - Throttle network to see shifts during slow loads
   - Verify placeholders appear correctly
   - Check that reserved space prevents shifts

3. **Test Different Bookshops**:
   - Bookshops with images
   - Bookshops without images
   - Bookshops with/without features
   - Bookshops with/without events

## Additional Recommendations

1. **Font Loading**: Ensure fonts are loaded early or use `font-display: swap` with fallbacks
2. **Web Fonts**: Preload critical fonts to prevent text shifts
3. **Ad Placeholders**: If you add ads later, reserve space for them
4. **Monitor**: Use Real User Monitoring (RUM) to track CLS in production

## Files Modified

- `client/src/pages/BookshopDetailPage.tsx` - Added dimensions and min-heights
- `client/src/components/RelatedBookshops.tsx` - Improved loading skeleton

## Next Steps

1. Deploy changes
2. Run Lighthouse audit
3. Verify CLS score improves to < 0.1
4. Monitor in production

