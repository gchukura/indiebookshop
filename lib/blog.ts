/**
 * MDX blog: posts are content/blog/*.mdx with YAML frontmatter
 * (title, date, description, slug, optional cover). Compiled on the server
 * with next-mdx-remote/rsc — no bundler config needed.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { compileMDX } from 'next-mdx-remote/rsc';
import { z } from 'zod';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

const frontmatterSchema = z.object({
  title: z.string().min(1),
  // YAML turns an unquoted 2026-10-23 into a Date; accept both
  date: z.union([z.string(), z.date()]).transform(d => (d instanceof Date ? d.toISOString().slice(0, 10) : d)),
  description: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be lowercase letters, numbers, and hyphens'),
  cover: z.string().optional(),
});

export type PostMeta = z.infer<typeof frontmatterSchema>;

function postFiles(): string[] {
  if (!existsSync(BLOG_DIR)) return [];
  return readdirSync(BLOG_DIR).filter(f => f.endsWith('.mdx'));
}

/** True when there's at least one post; the nav hides the Blog link otherwise. */
export function hasBlogPosts(): boolean {
  return postFiles().length > 0;
}

async function compile(file: string) {
  const source = readFileSync(path.join(BLOG_DIR, file), 'utf8');
  const { content, frontmatter } = await compileMDX<Record<string, unknown>>({
    source,
    options: { parseFrontmatter: true },
  });
  const parsed = frontmatterSchema.safeParse(frontmatter);
  if (!parsed.success) {
    throw new Error(`Invalid frontmatter in content/blog/${file}: ${parsed.error.issues.map(i => `${i.path.join('.')} ${i.message}`).join('; ')}`);
  }
  return { meta: parsed.data, content };
}

// Posts only change with a deploy, so compile each file once per process
const compiled = new Map<string, ReturnType<typeof compile>>();
const compileOnce = (file: string) => {
  if (!compiled.has(file)) compiled.set(file, compile(file));
  return compiled.get(file)!;
};

/** All posts, newest first. Invalid frontmatter fails the build rather than silently dropping a post. */
export async function getAllPosts(): Promise<PostMeta[]> {
  const posts = await Promise.all(postFiles().map(async f => (await compileOnce(f)).meta));
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPost(slug: string) {
  for (const file of postFiles()) {
    const post = await compileOnce(file);
    if (post.meta.slug === slug) return post;
  }
  return null;
}

export function formatPostDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
