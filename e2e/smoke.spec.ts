import { expect, test } from '@playwright/test';

// Builds from the fixture (USE_FIXTURE_DATA=1, ~200 shops) have far fewer URLs
const MIN_SITEMAP_URLS = process.env.USE_FIXTURE_DATA === '1' ? 150 : 3000;

test('home renders its heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find your next independent bookshop');
});

test('California lists shops, and a shop page has its heading and LocalBusiness JSON-LD', async ({ page }) => {
  await page.goto('/bookshops/california');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('California');
  const cards = page.locator('article');
  expect(await cards.count()).toBeGreaterThan(0);

  const href = await cards.first().locator('a[href^="/bookshop/"]').last().getAttribute('href');
  expect(href).toBeTruthy();
  await page.goto(href!);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
  // BookStore is schema.org's LocalBusiness subtype for bookshops
  expect(jsonLd.some(text => JSON.parse(text)['@type'] === 'BookStore')).toBe(true);
});

test('directory renders its list', async ({ page }) => {
  await page.goto('/directory');
  await expect(page.locator('[id^="bookshop-"]').first()).toBeVisible();
});

test('sitemap.xml lists the site', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  const urls = ((await res.text()).match(/<loc>/g) ?? []).length;
  expect(urls).toBeGreaterThan(MIN_SITEMAP_URLS);
});

test('unknown pages return 404', async ({ request }) => {
  const res = await request.get('/this-does-not-exist');
  expect(res.status()).toBe(404);
});
