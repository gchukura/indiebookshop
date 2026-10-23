'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crosshair, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Shown on /near-me without coordinates: asks the browser for the visitor's
 * location, then reloads the page with ?lat=&lng= so results render on the
 * server. Falls back to searching for a city.
 */
export default function NearMeLocator({ radius }: { radius: number }) {
  const router = useRouter();
  const [state, setState] = useState<'asking' | 'denied' | 'unsupported'>('asking');
  const [city, setCity] = useState('');

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState('unsupported');
      return;
    }
    setState('asking');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        router.replace(`/near-me?lat=${latitude.toFixed(4)}&lng=${longitude.toFixed(4)}&radius=${radius}`);
      },
      () => setState('denied'),
      { timeout: 10_000, maximumAge: 300_000 }
    );
  }, [radius, router]);

  // The visitor came here to find nearby shops, so ask straight away
  useEffect(() => {
    const id = setTimeout(locate, 0);
    return () => clearTimeout(id);
  }, [locate]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 md:p-8 max-w-xl">
      {state === 'asking' ? (
        <p className="flex items-center gap-2 text-gray-700" role="status">
          <Loader2 className="w-5 h-5 animate-spin text-brand-teal" aria-hidden="true" />
          Finding your location… your browser may ask for permission.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-gray-700" role="status">
            {state === 'denied'
              ? 'We couldn’t get your location. You can allow it in your browser and try again.'
              : 'Your browser can’t share its location.'}
          </p>
          {state === 'denied' && (
            <Button type="button" onClick={locate} className="px-6">
              <Crosshair className="w-4 h-4" aria-hidden="true" />
              Try again
            </Button>
          )}
        </div>
      )}

      <form
        className="mt-6 pt-6 border-t border-border"
        onSubmit={e => {
          e.preventDefault();
          if (city.trim()) router.push(`/search?q=${encodeURIComponent(city.trim())}`);
        }}
      >
        <label htmlFor="near-me-city" className="block text-sm font-semibold text-gray-700 mb-2">
          …or enter a city
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
            <input
              id="near-me-city"
              type="search"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="e.g. Portland, OR"
              className="w-full h-11 pl-9 pr-3 rounded-full border border-input bg-white focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button type="submit" className="h-11 px-5">
            Search
          </Button>
        </div>
      </form>
    </div>
  );
}
