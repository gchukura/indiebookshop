/**
 * Opening hours from Google's opening_hours data. Pure functions, used by
 * the detail page's client islands (open/closed depends on the current time,
 * so it can't be baked into the statically generated page).
 */

import type { Bookstore } from '@/shared/schema';

type OpeningHours = NonNullable<Bookstore['openingHoursJson']>;
type Period = NonNullable<OpeningHours['periods']>[number];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MINUTES_PER_DAY = 1440;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

export type HoursRow = { dayIndex: number; day: string; hours: string };

/** Monday-first rows from weekday_text ("Monday: 9 AM – 5 PM"). */
export function weeklyHours(opening: OpeningHours | null | undefined): HoursRow[] {
  return (opening?.weekday_text ?? []).flatMap(line => {
    const i = line.indexOf(':');
    const day = line.slice(0, i).trim();
    const dayIndex = DAY_NAMES.indexOf(day);
    return i > 0 && dayIndex >= 0 ? [{ dayIndex, day, hours: line.slice(i + 1).trim() }] : [];
  });
}

/** Day of week (0 = Sunday) and minutes since midnight in the given zone. */
export function localTime(now: Date, timeZone: string): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, minutes: parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10) };
}

const toMinutes = (hhmm: string) => parseInt(hhmm.slice(0, 2), 10) * 60 + parseInt(hhmm.slice(2, 4), 10);

/** "0930" → "9:30 AM", "1700" → "5 PM", "0000" → "midnight". */
export function formatTime(hhmm: string): string {
  const m = toMinutes(hhmm);
  if (m === 0) return 'midnight';
  const h = Math.floor(m / 60);
  const min = m % 60;
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${min ? `:${String(min).padStart(2, '0')}` : ''} ${suffix}`;
}

export type OpenStatus = { open: boolean; label: string };

/**
 * "Open now · closes 5 PM", "Closed · opens 11 AM", "Closed · opens Thursday 11 AM",
 * or "Open 24 hours". Null when there are no periods.
 */
export function openStatus(periods: Period[] | null | undefined, now: { day: number; minutes: number }): OpenStatus | null {
  if (!periods?.length) return null;
  // A single period with no close time means open around the clock
  if (periods.some(p => !p.close)) return { open: true, label: 'Open 24 hours' };

  const t = now.day * MINUTES_PER_DAY + now.minutes;
  const spans = periods.map(p => {
    const start = p.open.day * MINUTES_PER_DAY + toMinutes(p.open.time);
    let end = p.close!.day * MINUTES_PER_DAY + toMinutes(p.close!.time);
    if (end <= start) end += MINUTES_PER_WEEK; // wraps past Saturday night
    return { start, end, period: p };
  });

  for (const s of spans) {
    for (const shift of [0, MINUTES_PER_WEEK]) {
      if (t + shift >= s.start && t + shift < s.end) {
        return { open: true, label: `Open now · closes ${formatTime(s.period.close!.time)}` };
      }
    }
  }

  const next = spans
    .map(s => ({ ...s, wait: (s.start - t + MINUTES_PER_WEEK) % MINUTES_PER_WEEK }))
    .sort((a, b) => a.wait - b.wait)[0];
  const opensToday = next.period.open.day === now.day && next.wait < MINUTES_PER_DAY;
  const when = opensToday ? '' : next.period.open.day === (now.day + 1) % 7 ? 'tomorrow ' : `${DAY_NAMES[next.period.open.day]} `;
  return { open: false, label: `Closed · opens ${when}${formatTime(next.period.open.time)}` };
}

const hhmm = (time: string) => `${time.slice(0, 2)}:${time.slice(2, 4)}`;

/** schema.org OpeningHoursSpecification entries (HH:MM, one per opening period). */
export function openingHoursSpecification(periods: Period[] | null | undefined): object[] | undefined {
  if (!periods?.length) return undefined;
  if (periods.some(p => !p.close)) {
    return [{ '@type': 'OpeningHoursSpecification', dayOfWeek: DAY_NAMES.map(d => `https://schema.org/${d}`), opens: '00:00', closes: '23:59' }];
  }
  return periods.map(p => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: `https://schema.org/${DAY_NAMES[p.open.day]}`,
    opens: hhmm(p.open.time),
    // A close on a later day (past midnight) is expressed as the close time itself
    closes: hhmm(p.close!.time),
  }));
}
