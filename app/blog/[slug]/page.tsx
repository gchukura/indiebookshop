import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LocationBreadcrumbs from '@/components/location/LocationBreadcrumbs';
import { formatPostDate, getAllPosts, getPost } from '@/lib/blog';

export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

const SITE = 'https://www.indiebookshop.com';

export async function generateStaticParams() {
  return (await getAllPosts()).map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  const { title, description, date, cover } = post.meta;
  const url = `${SITE}/blog/${slug}`;
  return {
    title: { absolute: `${title} | IndieBookShop` },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      publishedTime: date,
      ...(cover ? { images: [{ url: cover }] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const { title, description, date, cover } = post.meta;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    datePublished: date,
    dateModified: date,
    url: `${SITE}/blog/${slug}`,
    mainEntityOfPage: `${SITE}/blog/${slug}`,
    ...(cover ? { image: cover.startsWith('http') ? cover : `${SITE}${cover}` } : {}),
    author: { '@type': 'Organization', name: 'IndiebookShop.com', url: SITE },
    publisher: { '@type': 'Organization', name: 'IndiebookShop.com', url: SITE, logo: { '@type': 'ImageObject', url: `${SITE}/logo.png` } },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <LocationBreadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Blog', href: '/blog' },
          { name: title, href: `/blog/${slug}` },
        ]}
      />
      <main className="container-site py-10 md:py-14">
        <article className="bg-white rounded-lg shadow-md p-6 md:p-10 max-w-3xl">
          <header className="mb-8">
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-brown">{title}</h1>
            <p className="mt-2 text-sm text-gray-500">
              <time dateTime={date}>{formatPostDate(date)}</time>
            </p>
          </header>
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="mb-8 w-full rounded-lg aspect-[16/9] object-cover" />
          )}
          <div className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-brand-brown prose-a:text-brand-teal hover:prose-a:text-brand-orange">
            {post.content}
          </div>
        </article>
      </main>
    </div>
  );
}
