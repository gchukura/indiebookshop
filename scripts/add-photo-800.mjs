/**
 * Adds an 800px WebP next to every shop photo already in R2, made from the
 * 1200px file (no Google calls). Detail pages offer it in the hero's srcset, so
 * phones at 2x stop downloading the 1200px file.
 *
 *   photos/<id>-<hash>.webp      → photos/<id>-<hash>-800.webp
 *
 * Idempotent: photos that already have a -800 file are skipped. New photos get
 * all three sizes from scripts/fetch-google-photos.mjs.
 *
 * Usage:
 *   node scripts/add-photo-800.mjs --dry-run   # count what's missing, no uploads
 *   node scripts/add-photo-800.mjs             # create the missing files
 *
 * Env (.env.local): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 */

import nextEnv from '@next/env';
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

const DRY_RUN = process.argv.includes('--dry-run');
const CONCURRENCY = 8;
// Same settings as the 1200px size in fetch-google-photos.mjs
const WIDTH = 800;
const QUALITY = 72;
const CACHE_CONTROL = 'public, max-age=31536000, s-maxage=31536000, immutable';

const env = process.env;
const missing = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'].filter(k => !env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});
const Bucket = env.R2_BUCKET_NAME;

async function listPhotoKeys() {
  const keys = [];
  let ContinuationToken;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: 'photos/', ContinuationToken }));
    for (const obj of page.Contents ?? []) keys.push(obj.Key);
    ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return keys;
}

async function addVariant(key) {
  const res = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
  const source = Buffer.from(await res.Body.transformToByteArray());
  const body = await sharp(source)
    .resize({ width: WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();
  await s3.send(new PutObjectCommand({
    Bucket,
    Key: key.replace(/\.webp$/, '-800.webp'),
    Body: body,
    ContentType: 'image/webp',
    CacheControl: CACHE_CONTROL,
  }));
  return { from: source.length, to: body.length };
}

async function main() {
  const keys = await listPhotoKeys();
  const existing = new Set(keys);
  const originals = keys.filter(k => /^photos\/[^/]+\.webp$/.test(k) && !/-(400|800)\.webp$/.test(k));
  const todo = originals.filter(k => !existing.has(k.replace(/\.webp$/, '-800.webp')));
  console.log(`[photos-800] ${originals.length} photos, ${originals.length - todo.length} already have -800, ${todo.length} to create`);
  if (DRY_RUN || !todo.length) return;

  let done = 0, failed = 0, bytesFrom = 0, bytesTo = 0;
  const queue = [...todo];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    for (let key = queue.shift(); key; key = queue.shift()) {
      try {
        const r = await addVariant(key);
        bytesFrom += r.from;
        bytesTo += r.to;
        done++;
      } catch (err) {
        failed++;
        console.error(`[photos-800] ${key}: ${err.message}`);
      }
      if ((done + failed) % 100 === 0) console.log(`[photos-800] ${done + failed}/${todo.length}`);
    }
  }));

  const kb = n => Math.round(n / 1024);
  console.log(`[photos-800] created ${done}, failed ${failed}; average ${kb(bytesFrom / (done || 1))} KB (1200px) → ${kb(bytesTo / (done || 1))} KB (800px)`);
  if (failed) process.exitCode = 1;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
