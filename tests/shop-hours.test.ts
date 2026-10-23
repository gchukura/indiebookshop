import { describe, expect, it } from 'vitest';
import { formatTime, localTime, openStatus, openingHoursSpecification, weeklyHours } from '@/lib/data/shop-hours';

// Mon–Fri 9:30–17:00, Sat 10–14, closed Sunday (day 0 = Sunday)
const weekdays = [1, 2, 3, 4, 5].map(day => ({ open: { day, time: '0930' }, close: { day, time: '1700' } }));
const periods = [...weekdays, { open: { day: 6, time: '1000' }, close: { day: 6, time: '1400' } }];
const at = (day: number, h: number, m = 0) => ({ day, minutes: h * 60 + m });

describe('openStatus', () => {
  it('is open during a period and says when it closes', () => {
    expect(openStatus(periods, at(2, 12))).toEqual({ open: true, label: 'Open now · closes 5 PM' });
  });

  it('says when it opens later today', () => {
    expect(openStatus(periods, at(2, 8))).toEqual({ open: false, label: 'Closed · opens 9:30 AM' });
  });

  it('says tomorrow, or names the day further out', () => {
    expect(openStatus(periods, at(2, 18))).toEqual({ open: false, label: 'Closed · opens tomorrow 9:30 AM' });
    expect(openStatus(periods, at(6, 15))).toEqual({ open: false, label: 'Closed · opens Monday 9:30 AM' });
  });

  it('handles periods that run past midnight and wrap the week', () => {
    const late = [{ open: { day: 6, time: '2000' }, close: { day: 0, time: '0200' } }];
    expect(openStatus(late, at(0, 1))?.open).toBe(true);
    expect(openStatus(late, at(6, 21))?.open).toBe(true);
    expect(openStatus(late, at(0, 3))?.open).toBe(false);
  });

  it('treats a period without a close as open 24 hours, and no periods as unknown', () => {
    expect(openStatus([{ open: { day: 0, time: '0000' } }] as never, at(3, 3))).toEqual({ open: true, label: 'Open 24 hours' });
    expect(openStatus([], at(3, 3))).toBeNull();
  });
});

describe('helpers', () => {
  it('formatTime', () => {
    expect(formatTime('0930')).toBe('9:30 AM');
    expect(formatTime('1200')).toBe('12 PM');
    expect(formatTime('1730')).toBe('5:30 PM');
    expect(formatTime('0000')).toBe('midnight');
  });

  it('localTime reads the shop zone', () => {
    // 2026-10-21 is a Wednesday; 16:30 UTC is 12:30 in New York (EDT), 9:30 in Los Angeles (PDT)
    const now = new Date('2026-10-21T16:30:00Z');
    expect(localTime(now, 'America/New_York')).toEqual({ day: 3, minutes: 12 * 60 + 30 });
    expect(localTime(now, 'America/Los_Angeles')).toEqual({ day: 3, minutes: 9 * 60 + 30 });
  });

  it('weeklyHours parses weekday_text, Monday first', () => {
    const rows = weeklyHours({ open_now: false, weekday_text: ['Monday: 9 AM – 5 PM', 'Sunday: Closed'] });
    expect(rows).toEqual([
      { dayIndex: 1, day: 'Monday', hours: '9 AM – 5 PM' },
      { dayIndex: 0, day: 'Sunday', hours: 'Closed' },
    ]);
  });

  it('openingHoursSpecification uses HH:MM and schema.org days', () => {
    expect(openingHoursSpecification(periods)?.[0]).toEqual({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'https://schema.org/Monday',
      opens: '09:30',
      closes: '17:00',
    });
    expect(openingHoursSpecification(null)).toBeUndefined();
  });
});
