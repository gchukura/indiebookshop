import Link from 'next/link';

export type PlaceLink = { name: string; href: string; count: number };

/** Grid of links to other location pages, each with its shop count. */
export default function PlaceLinks({ title, links }: { title: string; links: PlaceLink[] }) {
  if (!links.length) return null;
  return (
    <section className="bg-white rounded-lg shadow-md p-6">
      <h2 className="font-serif text-2xl font-bold text-brand-brown mb-4">{title}</h2>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6">
        {links.map(link => (
          <li key={link.href}>
            <Link href={link.href} className="inline-flex min-h-[44px] items-center gap-1.5 text-brand-teal hover:underline">
              {link.name} <span className="text-sm text-gray-500">({link.count})</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
