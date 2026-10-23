import { ogCard, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og';
import { formatPostDate, getAllPosts, getPost } from '@/lib/blog';

export const alt = 'IndieBookShop blog post';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export async function generateStaticParams() {
  return (await getAllPosts()).map(p => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  return ogCard({
    eyebrow: 'Blog',
    title: post?.meta.title ?? 'IndieBookShop blog',
    footer: post ? formatPostDate(post.meta.date) : 'indiebookshop.com',
  });
}
