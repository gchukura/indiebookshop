/**
 * Event helpers (Events tab: id, bookshopId, title, description, date, time).
 * Pure, so the events page, detail pages, and tests share one definition of
 * "upcoming".
 */

import type { Bookstore, Event } from '@/shared/schema';
import { getBookstoreSlug } from './slug';
import { getStateAbbrev } from '@/lib/state-utils';

/** YYYY-MM-DD for a parseable date cell, else null. */
export function eventDay(event: Pick<Event, 'date'>): string | null {
  const t = Date.parse(event.date);
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}

/**
 * Events on or after `today` (YYYY-MM-DD), soonest first. Events whose date
 * can't be parsed are kept, last, rather than silently hidden.
 */
export function upcomingEvents(events: Event[], today: string): Event[] {
  const rank = (e: Event) => eventDay(e) ?? '9999-12-31';
  return events.filter(e => (eventDay(e) ?? today) >= today).sort((a, b) => rank(a).localeCompare(rank(b)) || a.time.localeCompare(b.time));
}

export type EventGroup = { day: string | null; events: Event[] };

/** Consecutive events grouped by day (null = date to be confirmed). Input should already be sorted. */
export function groupEventsByDay(events: Event[]): EventGroup[] {
  const groups: EventGroup[] = [];
  for (const event of events) {
    const day = eventDay(event);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.events.push(event);
    else groups.push({ day, events: [event] });
  }
  return groups;
}

/** "Saturday, November 8, 2026" */
export function formatEventDay(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

/** schema.org Event for one listing; the shop is the location and organizer. */
export function eventJsonLd(event: Event, shop: Bookstore | undefined, site = 'https://www.indiebookshop.com'): object {
  const day = eventDay(event);
  const time = /^\d{1,2}:\d{2}$/.test(event.time.trim()) ? event.time.trim().padStart(5, '0') : null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description || undefined,
    startDate: day ? (time ? `${day}T${time}` : day) : undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(shop
      ? {
          location: {
            '@type': 'Place',
            name: shop.name,
            address: {
              '@type': 'PostalAddress',
              streetAddress: shop.street ?? undefined,
              addressLocality: shop.city,
              addressRegion: getStateAbbrev(shop.state),
              postalCode: shop.zip ?? undefined,
              addressCountry: 'US',
            },
          },
          organizer: { '@type': 'Organization', name: shop.name, url: `${site}/bookshop/${getBookstoreSlug(shop)}` },
        }
      : {}),
  };
}
