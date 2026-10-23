import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import LocationBreadcrumbs from '@/components/location/LocationBreadcrumbs';
import { formatPostDate, getAllPosts } from '@/lib/blog';
import { BRAND, DEFAULT_OG_IMAGE } from '@/lib/seo';

const DESCRIPTION = 'Guides and stories about independent bookshops across the United States, and how to get the most out of the directory.';

export const metadata: Metadata = {
  title: { absolute: `Blog | ${BRAND}` },
  description: DESCRIPTION,
  alternates: { canonical: 'https://www.indiebookshop.com/blog' },
  openGraph: { title: 'Blog | IndieBookShop', description: DESCRIPTION, url: 'https://www.indiebookshop.com/blog', type: 'website', images: [DEFAULT_OG_IMAGE] },
};

export default async function BlogIndexPage() {
  const posts = await getAllPosts();
  // The nav hides Blog when there are no posts; don't serve an empty page either
  if (!posts.length) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <LocationBreadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Blog', href: '/blog' }]} />
      <main className="container-site py-10 md:py-14">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-brown">Blog</h1>
        <p className="mt-2 mb-8 text-gray-600">{DESCRIPTION}</p>
        <ul className="space-y-6">
          {posts.map(post => (
            <li key={post.slug}>
              <article className="bg-white rounded-lg shadow-md p-6">
                <h2 className="font-serif text-2xl font-bold text-brand-brown">
                  <Link href={`/blog/${post.slug}`} className="hover:text-brand-orange">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                </p>
                <p className="mt-3 text-gray-700">{post.description}</p>
                <Link href={`/blog/${post.slug}`} className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-brand-teal hover:underline">
                  Read more →
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
