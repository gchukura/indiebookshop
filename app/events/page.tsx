import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import LocationBreadcrumbs from '@/components/location/LocationBreadcrumbs';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getAllUpcomingEvents, getProcessedBookstoreData } from '@/lib/data/bookstore-data';
import { eventJsonLd, formatEventDay, groupEventsByDay } from '@/lib/data/events';
import { getBookstoreSlug } from '@/lib/data/slug';
import { getStateAbbrev } from '@/lib/state-utils';
import { BRAND } from '@/lib/seo';

export const revalidate = 3600;

const DESCRIPTION = 'Author readings, signings, book clubs, and more at independent bookshops across the United States.';

export const metadata: Metadata = {
  title: { absolute: `Bookshop Events | ${BRAND}` },
  description: DESCRIPTION,
  alternates: { canonical: 'https://www.indiebookshop.com/events' },
  openGraph: { title: 'Bookshop Events | IndieBookShop', description: DESCRIPTION, url: 'https://www.indiebookshop.com/events', type: 'website' },
};

export default async function EventsPage() {
  const [events, data] = await Promise.all([
    getAllUpcomingEvents().catch(() => []),
    getProcessedBookstoreData(),
  ]);
  const groups = groupEventsByDay(events);

  return (
    <div className="min-h-screen bg-gray-50">
      <LocationBreadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Events', href: '/events' }]} />
      {events.map(event => (
        <script
          key={event.id}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd(event, data.byId[event.bookshopId])) }}
        />
      ))}
      <main className="container-site py-10 md:py-14">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-brown">Bookshop events</h1>
        <p className="mt-2 mb-8 text-gray-600">{DESCRIPTION}</p>

        {groups.length === 0 ? (
          <section className="bg-white rounded-lg shadow-md p-8 text-center">
            <CalendarDays className="w-12 h-12 mx-auto text-brand-teal mb-4" aria-hidden="true" />
            <h2 className="font-serif text-2xl font-bold text-brand-brown">No upcoming events yet</h2>
            <p className="mt-2 mb-6 text-gray-700 max-w-xl mx-auto">
              Hosting a reading, signing, or book club at your shop? Tell readers about it and it will appear here and on your shop’s page.
            </p>
            <Link href="/submit-event" className={cn(buttonVariants(), 'px-6')}>
              Submit an event
            </Link>
          </section>
        ) : (
          <div className="space-y-10">
            {groups.map(group => (
              <section key={group.day ?? 'tbc'} aria-labelledby={`day-${group.day ?? 'tbc'}`}>
                <h2 id={`day-${group.day ?? 'tbc'}`} className="font-serif text-xl font-bold text-brand-brown mb-4">
                  {group.day ? <time dateTime={group.day}>{formatEventDay(group.day)}</time> : 'Date to be confirmed'}
                </h2>
                <ul className="space-y-4">
                  {group.events.map(event => {
                    const shop = data.byId[event.bookshopId];
                    return (
                      <li key={event.id} className="bg-white rounded-lg shadow-md p-5 border-l-4 border-brand-orange">
                        <p className="font-serif text-lg font-bold text-brand-brown">{event.title}</p>
                        <p className="text-sm text-gray-600">
                          {[event.time, shop && `${shop.city}, ${getStateAbbrev(shop.state)}`].filter(Boolean).join(' · ')}
                        </p>
                        {shop && (
                          <Link href={`/bookshop/${getBookstoreSlug(shop)}`} className="text-sm font-semibold text-brand-teal hover:underline">
                            {shop.name}
                          </Link>
                        )}
                        {event.description && <p className="mt-2 text-gray-700">{event.description}</p>}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            <p className="text-sm">
              <Link href="/submit-event" className="text-brand-teal hover:underline">
                Hosting an event? Submit it →
              </Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
