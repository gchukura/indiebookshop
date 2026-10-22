# Revert Plan - Get Site Back Up

## Situation
- Deployment complete but site still down
- Browser cache cleared but error persists
- Old bundle `vendor-C8_s_YSZ.js` still being served (CDN cache issue)

## Decision: Revert to Pre-SEO State

**Target Commit:** `31d46d3` (before all SEO work started)

## What Will Be Reverted

### SEO Work (All Lost):
- ✅ 5/5 Critical SEO errors fixed
- ✅ 3/8 SEO warnings fixed  
- ✅ Location variant redirects (Warning #11)
- ✅ Redirect chain optimization (Warning #4)
- ✅ Meta tag improvements
- ✅ SEO content injection
- ✅ Internal linking improvements
- ✅ Shared utilities (shared/utils.ts)
- ✅ Cache cleanup improvements
- ✅ HTML escaping for security

### Files That Will Be Reverted:
- `middleware.ts` - Location variant redirects, meta tag injection
- `server/redirectMiddleware.ts` - Location variant redirects
- `server/htmlInjectionMiddleware.ts` - SEO content injection
- `server/metaTagGenerator.ts` - Meta tag improvements
- `server/dataPreloading.ts` - Cache cleanup
- `api/bookshop-slug.js` - Meta tag improvements
- `client/src/pages/BookshopDetailPage.tsx` - Redirect logging
- `client/src/lib/linkUtils.ts` - Shared utilities
- `shared/utils.ts` - NEW FILE (will be deleted)
- Many static pages with SEO content

## What Will Be Kept

- Directory page fixes
- State filtering improvements
- Performance optimizations
- Google Photos integration
- All work before SEO changes

## Revert Command

```bash
git revert --no-commit 9d7abad..HEAD
# Review changes
git commit -m "revert: Revert all SEO work to restore site functionality

Site was down due to React bundling issues. Reverting all SEO changes
to get site back up. SEO work can be re-applied more carefully later."
```

## After Revert

1. Site should work immediately
2. All SEO improvements will need to be re-done
3. Can re-apply SEO fixes one at a time with testing

## Alternative: Partial Revert

Could revert just the problematic commits, but since we've already tried fixing and cache is the issue, full revert is safer.
