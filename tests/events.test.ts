import { describe, expect, it } from 'vitest';
import type { Bookstore, Event } from '@/shared/schema';
import { eventDay, eventJsonLd, formatEventDay, groupEventsByDay, upcomingEvents } from '@/lib/data/events';

const ev = (id: number, date: string, time = '', bookshopId = 1): Event => ({ id, bookshopId, title: `Event ${id}`, description: '', date, time });

describe('events', () => {
  const events = [ev(1, '2026-11-05', '19:00'), ev(2, '2026-10-01'), ev(3, 'TBD'), ev(4, '2026-10-23', '18:30'), ev(5, '2026-11-05', '10:00')];

  it('hides past events, sorts by day then time, keeps undated last', () => {
    expect(upcomingEvents(events, '2026-10-23').map(e => e.id)).toEqual([4, 5, 1, 3]);
  });

  it('groups by day', () => {
    const groups = groupEventsByDay(upcomingEvents(events, '2026-10-23'));
    expect(groups.map(g => [g.day, g.events.map(e => e.id)])).toEqual([
      ['2026-10-23', [4]],
      ['2026-11-05', [5, 1]],
      [null, [3]],
    ]);
  });

  it('parses and formats days', () => {
    expect(eventDay({ date: 'November 8, 2026' })).toBe('2026-11-08');
    expect(eventDay({ date: 'soon' })).toBeNull();
    expect(formatEventDay('2026-11-08')).toBe('Sunday, November 8, 2026');
  });

  it('builds Event JSON-LD with the shop as location', () => {
    const shop = { id: 1, name: 'Test Books', slug: null, street: '1 Main St', city: 'Austin', state: 'Texas', zip: '78701' } as Bookstore;
    const ld = eventJsonLd(ev(9, '2026-11-08', '7:30'), shop) as Record<string, any>;
    expect(ld.startDate).toBe('2026-11-08T07:30');
    expect(ld.location.address.addressRegion).toBe('TX');
    expect(ld.organizer.url).toBe('https://www.indiebookshop.com/bookshop/test-books');
  });
});
