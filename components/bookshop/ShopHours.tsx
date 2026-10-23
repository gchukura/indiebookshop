'use client';

import { useSyncExternalStore } from 'react';
import type { Bookstore } from '@/shared/schema';
import { localTime, openStatus, weeklyHours } from '@/lib/data/shop-hours';

type Opening = Bookstore['openingHoursJson'];

// The current minute as an external store. Detail pages are statically
// generated, so "now" must be read in the browser: the server snapshot is
// null, which keeps hydration identical to the HTML before the clock kicks in.
const MINUTE = 60_000;
function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, MINUTE / 4);
  return () => clearInterval(timer);
}
const currentMinute = () => Math.floor(Date.now() / MINUTE);
const serverMinute = () => null;

function useMinute(): number | null {
  return useSyncExternalStore(subscribe, currentMinute, serverMinute);
}

/** Today's day (0 = Sunday) and minutes in the shop's zone, or the visitor's day when the zone is unknown. */
function shopNow(minute: number, timeZone: string | null) {
  const now = new Date(minute * MINUTE);
  return timeZone ? localTime(now, timeZone) : { day: now.getDay(), minutes: now.getHours() * 60 + now.getMinutes() };
}

/** "Open now · closes 5 PM" / "Closed · opens 11 AM"; without a zone, today's hours. */
export function OpenStatusBadge({ opening, timeZone }: { opening: Opening; timeZone: string | null }) {
  const minute = useMinute();
  if (minute === null) return null;
  const now = shopNow(minute, timeZone);

  const status = timeZone ? openStatus(opening?.periods, now) : null;
  if (status) {
    return (
      <span
        className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${status.open ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
      >
        {status.label}
      </span>
    );
  }
  // No reliable zone: show today's hours (by the visitor's day) without open/closed
  const today = weeklyHours(opening).find(r => r.dayIndex === now.day);
  return today ? <span className="text-sm text-gray-700">Today: {today.hours}</span> : null;
}

/** All seven days, Monday first; today's row is highlighted once mounted. */
export function HoursTable({ opening, timeZone }: { opening: Opening; timeZone: string | null }) {
  const minute = useMinute();
  const today = minute === null ? null : shopNow(minute, timeZone).day;

  const rows = weeklyHours(opening);
  if (!rows.length) return null;
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(row => {
          const isToday = row.dayIndex === today;
          return (
            <tr key={row.day} className={isToday ? 'bg-brand-cream font-semibold' : ''} aria-current={isToday ? 'date' : undefined}>
              <th scope="row" className="text-left font-medium text-gray-900 py-1.5 px-2 rounded-l-md">
                {row.day}
              </th>
              <td className="text-right text-gray-700 py-1.5 px-2 rounded-r-md">{row.hours}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
