'use client';

import { useEffect, useState } from 'react';
import type { Bookstore } from '@/shared/schema';
import { localTime, openStatus, weeklyHours, type OpenStatus } from '@/lib/data/shop-hours';

type Opening = Bookstore['openingHoursJson'];

/**
 * The current day/time in the shop's zone, set after mount. Detail pages are
 * statically generated, so "now" must be read in the browser, not at build time.
 */
function useShopNow(timeZone: string | null) {
  const [now, setNow] = useState<{ day: number; minutes: number } | null>(null);
  useEffect(() => {
    if (!timeZone) return;
    const update = () => setNow(localTime(new Date(), timeZone));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [timeZone]);
  return now;
}

/** "Open now · closes 5 PM" / "Closed · opens 11 AM"; without a zone, today's hours. */
export function OpenStatusBadge({ opening, timeZone }: { opening: Opening; timeZone: string | null }) {
  const now = useShopNow(timeZone);
  const [todayFallback, setTodayFallback] = useState<string | null>(null);
  useEffect(() => {
    if (timeZone) return;
    // No reliable zone: show today's hours (by the visitor's day) without open/closed
    const day = new Date().getDay();
    const row = weeklyHours(opening).find(r => r.dayIndex === day);
    setTodayFallback(row ? `Today: ${row.hours}` : null);
  }, [opening, timeZone]);

  const status: OpenStatus | null = now ? openStatus(opening?.periods, now) : null;
  if (status) {
    return (
      <span
        className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${status.open ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
      >
        {status.label}
      </span>
    );
  }
  return todayFallback ? <span className="text-sm text-gray-700">{todayFallback}</span> : null;
}

/** All seven days, Monday first; today's row is highlighted once mounted. */
export function HoursTable({ opening, timeZone }: { opening: Opening; timeZone: string | null }) {
  const now = useShopNow(timeZone);
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => {
    setToday(now ? now.day : timeZone ? null : new Date().getDay());
  }, [now, timeZone]);

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
