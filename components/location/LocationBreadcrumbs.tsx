import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/StructuredData';

const SITE = 'https://www.indiebookshop.com';

export type Crumb = { name: string; href: string };

/** Visible breadcrumb trail plus BreadcrumbList JSON-LD. The last crumb is the current page. */
export default function LocationBreadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <>
      <BreadcrumbSchema items={items.map(c => ({ name: c.name, url: `${SITE}${c.href}` }))} />
      <nav aria-label="Breadcrumb" className="bg-white border-b border-gray-200">
        <ol className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {items.map((crumb, i) => {
            const last = i === items.length - 1;
            return (
              <li key={crumb.href} className="flex items-center gap-2">
                {i > 0 && <span className="text-gray-400" aria-hidden="true">›</span>}
                {last ? (
                  <span className="text-gray-700" aria-current="page">{crumb.name}</span>
                ) : (
                  <Link href={crumb.href} className="text-[#2A6B7C] hover:underline">
                    {crumb.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
