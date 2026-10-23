import { describe, expect, it } from 'vitest';
import { formatPostDate, getAllPosts, getPost, hasBlogPosts } from '@/lib/blog';

describe('blog', () => {
  it('loads posts from content/blog with valid frontmatter, newest first', async () => {
    expect(hasBlogPosts()).toBe(true);
    const posts = await getAllPosts();
    expect(posts.length).toBeGreaterThan(0);
    const dates = posts.map(p => p.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    for (const p of posts) expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('compiles a post by slug', async () => {
    const post = await getPost('how-to-use-this-directory');
    expect(post?.meta.title).toBe('How to use this directory');
    expect(post?.content).toBeTruthy();
    expect(await getPost('nope')).toBeNull();
  });

  it('formats dates', () => {
    expect(formatPostDate('2026-10-23')).toBe('October 23, 2026');
  });
});
