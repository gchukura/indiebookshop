# Ahrefs Audit - Remaining TODO Items

**Date**: January 3, 2026  
**Current Status**: ✅ All Critical Errors Fixed (5/5), 5/8 Warnings Fixed

---

## ✅ Completed Work

### Critical Errors (5/5) - 100% ✅
- ✅ Error #3: Non-canonical pages in sitemap
- ✅ Error #5: Orphan pages - no incoming internal links
- ✅ Error #13: Pages with no outgoing links
- ✅ Error #14: Canonical URLs have no incoming internal links
- ✅ Error #23: Duplicate pages without canonical

### Warnings Fixed (5/8) - 63% ✅
- ✅ Warning #1: Open Graph tags incomplete
- ✅ Warning #10: Slow page (TTFB)
- ✅ Warning #12: Low word count
- ✅ Warning #16: Meta description too short
- ✅ Warning #21: H1 tag missing or empty

### Quick Wins Completed ✅
- ✅ Twitter card image dimensions
- ✅ Open Graph image dimensions

---

## ⚠️ Remaining Items (Priority Order)

### 🔴 High Priority (Before Next Audit)

#### 1. Warning #4: 3XX Redirect Chains
**Status**: ⚠️ NOT ADDRESSED  
**Impact**: Medium - Wastes crawl budget, slows page loads  
**Effort**: Medium (requires Vercel/DNS configuration)

**Problem**:
- Multiple redirect hops instead of direct redirects
- `http://indiebookshop.com/` → 308 → `https://indiebookshop.com/` → 307 → `https://www.indiebookshop.com/`
- `http://www.indiebookshop.com/` → 308 → `https://www.indiebookshop.com/`
- `https://indiebookshop.com/` → 307 → `https://www.indiebookshop.com/`

**Solution**:
- Configure Vercel to redirect directly to final URL (single hop)
- Or configure DNS to handle redirects at DNS level
- **Note**: This requires Vercel dashboard configuration, not code changes

**How to Fix**:
1. Go to Vercel Dashboard → Project Settings → Domains
2. Configure redirects to go directly to `https://www.indiebookshop.com`
3. Set up redirect rules:
   - `http://indiebookshop.com/*` → `https://www.indiebookshop.com/*` (301)
   - `https://indiebookshop.com/*` → `https://www.indiebookshop.com/*` (301)
   - `http://www.indiebookshop.com/*` → `https://www.indiebookshop.com/*` (301)

**Expected Improvement**: +2-3 Ahrefs points, better crawl efficiency

---

#### 2. Warning #11: Orphan Pages - Location Variants
**Status**: ⚠️ NEEDS VERIFICATION  
**Impact**: Medium - Non-canonical URLs still indexable  
**Effort**: Low (verification + potential code fix)

**Problem**:
- Location-specific URLs (e.g., `/bookshop/name-city`) are orphaned
- These are non-canonical URLs but still indexable

**Current Implementation**:
- ✅ Client-side redirects handle location variants → canonical URLs
- ✅ Server-side canonical tags point to base slug
- ⚠️ Need to verify redirects are working in production

**Solution**:
1. **Verify redirects work** (test in production after deployment):
   ```bash
   curl -I https://www.indiebookshop.com/bookshop/powells-books-portland
   # Should redirect to: /bookshop/powells-books
   ```

2. **If redirects don't work**, add server-side redirect in `server/redirectMiddleware.ts`:
   ```typescript
   // Handle location variant URLs (e.g., /bookshop/name-city)
   const locationVariantMatch = path.match(/^\/bookshop\/([^-]+)-(.+)$/);
   if (locationVariantMatch) {
     const baseSlug = locationVariantMatch[1];
     // Fetch bookshop to verify canonical slug
     // Redirect to canonical if different
   }
   ```

3. **Alternative**: Ensure canonical tags are always present (already done ✅)

**Expected Improvement**: +1-2 Ahrefs points

---

### 🟡 Medium Priority

#### 3. Warning #22: CSS File Size Too Large (23.4 KB)
**Status**: ⚠️ NOT ADDRESSED  
**Impact**: Medium - Affects Core Web Vitals  
**Effort**: Medium-High (optimization task)

**Problem**:
- CSS file is 23.4 KB, affecting 2,175 pages
- Impacts Core Web Vitals (LCP, CLS)

**Solution Options**:
1. **Code splitting for CSS** (partially done in `vite.config.ts`)
   - Split CSS by route/page type
   - Load critical CSS inline
   - Defer non-critical CSS

2. **Remove unused CSS**
   - Use PurgeCSS or similar tool
   - Analyze which CSS is actually used
   - Remove Tailwind classes that aren't used

3. **Minify and compress CSS**
   - Ensure CSS is minified in production
   - Enable gzip/brotli compression
   - Check Vercel compression settings

4. **Critical CSS extraction**
   - Extract above-the-fold CSS
   - Inline critical CSS in `<head>`
   - Load full CSS asynchronously

**Expected Improvement**: +1-2 Ahrefs points, better Core Web Vitals

---

### 🟢 Low Priority (Optional)

#### 4. Notice #2: Verify Twitter Cards
**Status**: ⚠️ VERIFY  
**Impact**: Low - Affects Twitter sharing appearance  
**Effort**: Low (verification only)

**Action**: 
- Test Twitter card validator: https://cards-dev.twitter.com/validator
- Verify cards render correctly
- Check image dimensions are correct (already added ✅)

---

#### 5. Notice #7: Review Sitemap Completeness
**Status**: ✅ VERIFIED COMPLETE  
**Impact**: Low  
**Effort**: None needed

**Status**: All pages are in sitemap ✅

---

#### 6. Notice #18: Implement IndexNow
**Status**: ⚠️ OPTIONAL  
**Impact**: Low - Optional optimization  
**Effort**: Medium

**Action**: 
- Implement IndexNow API to notify search engines of updates
- Can improve indexing speed for new/updated pages
- Optional enhancement, not required

---

## 📊 Priority Summary

### Immediate (Before Next Audit)
1. **Warning #4**: Fix redirect chains (Vercel configuration)
2. **Warning #11**: Verify location variant redirects (testing + potential code fix)

### Soon (Performance Optimization)
3. **Warning #22**: Optimize CSS file size

### Optional (Nice to Have)
4. Verify Twitter cards
5. Implement IndexNow (optional)

---

## 🎯 Recommended Action Plan

### Week 1: High Priority
1. **Fix redirect chains** (Warning #4)
   - Configure Vercel redirects
   - Test all URL variants
   - Verify single-hop redirects

2. **Verify location variant redirects** (Warning #11)
   - Test in production after deployment
   - Add server-side redirects if needed
   - Monitor redirect logs

### Week 2: Medium Priority
3. **Optimize CSS** (Warning #22)
   - Analyze CSS usage
   - Implement code splitting
   - Remove unused CSS
   - Minify and compress

### Ongoing: Low Priority
4. Verify Twitter cards work correctly
5. Consider IndexNow implementation

---

## 📈 Expected Impact

### After High Priority Fixes
- **Warning #4**: +2-3 Ahrefs points
- **Warning #11**: +1-2 Ahrefs points
- **Total**: +3-5 Ahrefs points

### After Medium Priority Fixes
- **Warning #22**: +1-2 Ahrefs points
- **Total**: +4-7 Ahrefs points overall

---

## ✅ Current Status

**Critical Errors**: 5/5 Fixed (100%) ✅  
**Warnings Fixed**: 5/8 (63%)  
**Warnings Remaining**: 3/8 (37%)  
**Overall Progress**: 77% of critical issues resolved

**Next Focus**: Address remaining 3 warnings to reach 100%

---

**Last Updated**: January 3, 2026  
**Next Review**: After deployment and next Ahrefs crawl
