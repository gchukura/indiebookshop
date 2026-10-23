'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crosshair, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Suggestion } from '@/lib/data/search';

const TYPE_LABEL: Record<Suggestion['type'], string> = { state: 'State', city: 'City', shop: 'Bookshop' };

type SearchBoxProps = {
  /** "hero": large, with a Search button and "Use my location". "compact": header-sized. */
  variant?: 'hero' | 'compact';
  defaultValue?: string;
  /** Called after navigating (e.g. to close the mobile menu). */
  onNavigate?: () => void;
};

/**
 * Search with suggestions from /api/suggest as you type. Picking one goes to its
 * page; free text goes to /search?q=; "Use my location" goes to /near-me.
 */
export default function SearchBox({ variant = 'hero', defaultValue = '', onNavigate }: SearchBoxProps) {
  const hero = variant === 'hero';
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const boxRef = useRef<HTMLFormElement>(null);
  // Only show results while the query is long enough to have produced them
  const visible = query.trim().length >= 2 ? suggestions : [];

  // Debounced fetch; ignores responses for stale queries
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return; // shorter queries show nothing (see `visible` above)
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok) {
          setSuggestions(await res.json());
          setActive(-1);
        }
      } catch {
        // aborted or offline: keep the previous list
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Close the list when clicking outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
    onNavigate?.();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (active >= 0 && visible[active]) return go(visible[active].href);
    if (!q) return go('/search');
    // An exact name match ("Portland, OR", "Powell's Books") goes straight to its page
    const exact = visible.find(s => s.label.toLowerCase() === q.toLowerCase());
    go(exact ? exact.href : `/search?q=${encodeURIComponent(q)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!visible.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive(i => (i + 1) % visible.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => (i <= 0 ? visible.length - 1 : i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  };

  const useLocation = () => {
    if (!navigator.geolocation) {
      setMessage('Your browser can’t share its location.');
      return;
    }
    setLocating(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        go(`/near-me?lat=${latitude.toFixed(4)}&lng=${longitude.toFixed(4)}`);
      },
      () => {
        setLocating(false);
        setMessage('Couldn’t get your location. Try searching for a city instead.');
      },
      { timeout: 10_000, maximumAge: 300_000 }
    );
  };

  const showList = open && visible.length > 0;

  return (
    <form ref={boxRef} onSubmit={submit} role="search" className={hero ? 'w-full max-w-2xl' : 'w-full'}>
      <div className={hero ? 'flex flex-col sm:flex-row gap-3' : 'flex'}>
        <div className="relative flex-1">
          <Search
            className={cn('absolute top-1/2 -translate-y-1/2 text-gray-400', hero ? 'left-4 w-5 h-5' : 'left-3 w-4 h-4')}
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={hero ? 'City, state, or bookshop name' : 'Search bookshops'}
            aria-label="Search bookshops by city, state, or name"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
            className={cn(
              'w-full rounded-full border border-input bg-white focus:outline-none focus:ring-2 focus:ring-ring',
              hero ? 'h-14 pl-12 pr-4 text-base shadow-sm' : 'h-10 pl-9 pr-3 text-sm'
            )}
          />
          {showList && (
            <ul
              id={listId}
              role="listbox"
              className={cn(
                'absolute z-50 mt-2 bg-white rounded-lg shadow-lg border border-border overflow-hidden text-left',
                hero ? 'w-full' : 'w-full min-w-[18rem] right-0'
              )}
            >
              {visible.map((s, i) => (
                <li
                  key={s.href}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={e => {
                    e.preventDefault();
                    go(s.href);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer ${i === active ? 'bg-brand-cream' : ''}`}
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-gray-900 truncate">{s.label}</span>
                    <span className="block text-xs text-gray-500 truncate">{s.detail}</span>
                  </span>
                  <span className="shrink-0 text-xs text-gray-500">{TYPE_LABEL[s.type]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {hero && (
          <Button type="submit" className="h-14 px-8 text-base">
            Search
          </Button>
        )}
      </div>
      {hero && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <button
            type="button"
            onClick={useLocation}
            disabled={locating}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand-teal hover:underline disabled:opacity-60"
          >
            <Crosshair className="w-4 h-4" aria-hidden="true" />
            {locating ? 'Finding you…' : 'Use my location'}
          </button>
          {message && (
            <p className="text-sm text-gray-600" role="status">
              {message}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
