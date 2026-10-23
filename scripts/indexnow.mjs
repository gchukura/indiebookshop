/**
 * Submit URLs to IndexNow (Bing, Yandex, Seznam, Naver, ...).
 *
 * The key file lives at public/<KEY>.txt, so it is served at
 * https://www.indiebookshop.com/<KEY>.txt. It must be deployed before submitting.
 *
 * Usage:
 *   node scripts/indexnow.mjs                      # every URL in the live sitemap
 *   node scripts/indexnow.mjs --urls /bookshop/foo,/bookshops/ca
 *   node scripts/indexnow.mjs --dry-run            # print what would be sent
 *   Options: --site <origin> (default https://www.indiebookshop.com)
 */

const KEY = 'acc33ef596bf47359e1aa5cd6b78344d';
const ENDPOINT = 'https://api.indexnow.org/IndexNow';
const BATCH = 10000; // IndexNow's per-request limit

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const site = (opt('--site') ?? 'https://www.indiebookshop.com').replace(/\/$/, '');
const host = new URL(site).host;
const keyLocation = `${site}/${KEY}.txt`;

async function sitemapUrls() {
  const res = await fetch(`${site}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml: HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

async function main() {
  const urls = opt('--urls')
    ? opt('--urls').split(',').map((u) => new URL(u.trim(), site).href)
    : await sitemapUrls();
  if (urls.length === 0) throw new Error('No URLs to submit');

  const keyRes = await fetch(keyLocation);
  const keyText = keyRes.ok ? (await keyRes.text()).trim() : '';
  if (keyText !== KEY) {
    throw new Error(`Key file not live at ${keyLocation} (HTTP ${keyRes.status}); deploy first`);
  }

  for (let i = 0; i < urls.length; i += BATCH) {
    const urlList = urls.slice(i, i + BATCH);
    const body = { host, key: KEY, keyLocation, urlList };
    if (flag('--dry-run')) {
      console.log(`[dry-run] would submit ${urlList.length} URLs, e.g. ${urlList.slice(0, 3).join(', ')}`);
      continue;
    }
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
    // 200 = accepted, 202 = accepted, key validation pending
    if (res.status !== 200 && res.status !== 202) {
      throw new Error(`IndexNow HTTP ${res.status}: ${await res.text()}`);
    }
    console.log(`Submitted ${urlList.length} URLs (HTTP ${res.status})`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
