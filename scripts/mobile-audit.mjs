/**
 * Mobile audit: screenshots every route type at iPhone 14 size and reports
 * horizontal overflow, tap targets < 44px, text < 14px, layout shift, and
 * images without dimensions.
 *
 * Usage (against a running `next start`):
 *   node scripts/mobile-audit.mjs http://localhost:3000 docs/screenshots/mobile/before [report.json]
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const [base = 'http://localhost:3000', outDir = 'docs/screenshots/mobile/after', reportPath] = process.argv.slice(2);

export const ROUTES = [
  ['home', '/'],
  ['bookshops', '/bookshops'],
  ['state', '/bookshops/california'],
  ['city', '/bookshops/california/san-francisco'],
  ['feature', '/bookshops/features/used-books'],
  ['shop', '/bookshop/parnassus-books'],
  ['directory', '/directory'],
  ['directory-ca', '/directory?state=CA'],
  ['search', '/search?q=books'],
  ['near-me', '/near-me?lat=37.7749&lng=-122.4194'],
  ['events', '/events'],
  ['blog', '/blog'],
  ['submit', '/submit'],
  ['contact', '/contact'],
  ['about', '/about'],
];

// iPhone 14 viewport on Chromium (the WebKit build isn't installed)
const IPHONE_14 = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2, // screenshots at 2× keep files reviewable; layout is the same as the 3× device
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
};

/** Runs in the page: collects the checks. */
function auditPage() {
  const vw = window.innerWidth;
  const visible = el => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && el.closest('[aria-hidden="true"]') === null;
  };
  const describe = el => {
    const text = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('alt') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${text ? ` "${text}"` : ''}`;
  };

  // Horizontal overflow: elements sticking out past the right edge
  const overflowing = [];
  if (document.documentElement.scrollWidth > vw) {
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed') overflowing.push(`${describe(el)} right=${Math.round(r.right)}`);
    }
  }

  // Tap targets: interactive elements smaller than 44×44 (inline links inside running text are exempt, per WCAG)
  const small = [];
  for (const el of document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="option"]')) {
    if (!visible(el)) continue;
    if (el.tagName === 'A' && el.closest('p, li p, figcaption') && getComputedStyle(el).display === 'inline') continue;
    // "Stretched" links cover their positioned ancestor (e.g. a whole card) via ::after
    const after = getComputedStyle(el, '::after');
    const stretched = after.position === 'absolute' && after.content !== 'none' && el.offsetParent;
    const r = (stretched ? el.offsetParent : el).getBoundingClientRect();
    if (r.width < 44 || r.height < 44) small.push(`${describe(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
  }

  // Text under 14px (captions, figcaptions, and legal small print are exempt)
  const tinyText = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const el = walker.currentNode.parentElement;
    if (!el || seen.has(el) || !walker.currentNode.textContent.trim() || !visible(el)) continue;
    seen.add(el);
    if (el.closest('figcaption, small, [data-caption], script, style, noscript')) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 14) tinyText.push(`${describe(el)} ${size}px`);
  }

  // Images without intrinsic size and not inside an aspect-ratio box
  const unsized = [];
  for (const img of document.querySelectorAll('img')) {
    if (!visible(img)) continue;
    const hasAttrs = img.getAttribute('width') && img.getAttribute('height');
    const boxed = img.closest('[class*="aspect-"]') || getComputedStyle(img.parentElement).aspectRatio !== 'auto';
    if (!hasAttrs && !boxed) unsized.push(describe(img) + ' ' + (img.getAttribute('src') || '').slice(0, 50));
  }

  return {
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: vw,
    pageHeight: document.documentElement.scrollHeight,
    overflow: [...new Set(overflowing)].slice(0, 8),
    smallTargets: small,
    tinyText,
    unsizedImages: unsized,
  };
}

async function run() {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const report = {};
  for (const [name, path] of ROUTES) {
    const ctx = await browser.newContext(IPHONE_14);
    const page = await ctx.newPage();
    // Cumulative layout shift during load and a scroll through the page
    await page.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver(list => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    const res = await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      for (let y = 0; y < Math.min(document.body.scrollHeight, 20000); y += 500) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 40));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);
    const result = await page.evaluate(auditPage);
    result.status = res?.status();
    result.cls = Number((await page.evaluate(() => window.__cls)).toFixed(3));
    // Screenshot: the first four screens (3,400px), enough to review layout without huge files
    const height = Math.min(result.pageHeight, 3400);
    await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true, clip: { x: 0, y: 0, width: 390, height } });
    report[name] = result;
    console.log(
      `${name.padEnd(13)} ${result.status} h=${result.pageHeight} overflow=${result.scrollWidth > result.innerWidth ? result.scrollWidth : 'no'} ` +
        `small-targets=${result.smallTargets.length} tiny-text=${result.tinyText.length} unsized-img=${result.unsizedImages.length} cls=${result.cls}`
    );
    await ctx.close();
  }
  await browser.close();
  if (reportPath) writeFileSync(reportPath, JSON.stringify(report, null, 2));
}

await run();
