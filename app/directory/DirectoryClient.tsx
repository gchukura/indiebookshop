'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Search, MapPin, Loader2, ChevronRight, X, Crosshair, SlidersHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import Link from 'next/link';
import { getStateAbbrev, getStateDisplayName } from '@/lib/state-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BookshopCard from '@/components/bookshop/BookshopCard';
import type { FeatureLink } from '@/lib/data/feature-index';
import { distanceKm, kmToMiles, shopCoordinates } from '@/lib/data/geo';
import { searchShops } from '@/lib/data/search';

// react-map-gl + mapbox-gl (~1.6 MB) load only once the map area is on screen
const DirectoryMap = dynamic(() => import('@/components/directory/DirectoryMap'), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

const LOCATION_DELIMITER = '|';
/** Shops rendered per "Show more"; the map always shows every match. */
const LIST_PAGE_SIZE = 60;

/** Lean bookstore type for the directory listing — only the fields DirectoryClient needs. */
export interface DirectoryBookstore {
  id: number;
  name: string;
  slug: string | null;
  city: string;
  state: string;
  county: string | null;
  latitude: string | null;
  longitude: string | null;
  imageUrl: string | null;
  googleRating: string | null;
  googleReviewCount: number | null;
  featureIds: number[];
}

type DirectoryClientProps = {
  /** Every shop; filtering happens here so filter changes need no server round trip. */
  initialBookstores: DirectoryBookstore[];
  initialStates: string[];
  features: Array<{ id: number; name: string }>;
  /** Feature id → chip name and feature page link, for the cards. */
  featureLinks: Record<number, FeatureLink>;
  mapboxToken: string;
  initialFilters: {
    state?: string;
    city?: string;
    county?: string;
    features?: string;
    view?: string;
    q?: string;
    lat?: string;
    lng?: string;
  };
};

function MapPlaceholder({ message = 'Loading map...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6 text-center">
      <Loader2 className="w-12 h-12 text-brand-teal animate-spin mb-4" />
      <p className="text-gray-600 font-sans text-sm">{message}</p>
    </div>
  );
}

/** Crosshair button to /near-me, which asks for the visitor's location. */
function NearMeLink({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/near-me"
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 font-sans text-sm font-semibold text-brand-teal hover:text-brand-teal-hover ${className}`}
    >
      <Crosshair className="w-4 h-4" aria-hidden="true" />
      Near me
    </Link>
  );
}

/** "Berkeley|CA" for the shop whose city matches `name` (case-insensitive) in that state, else 'all'. */
function initialPlace(
  shops: DirectoryBookstore[],
  name: string | undefined,
  stateAbbrev: string,
  placeOf: (b: DirectoryBookstore) => string | null
): string {
  if (!name || !stateAbbrev) return 'all';
  const wanted = name.trim().toLowerCase();
  const match = shops.find(b => getStateAbbrev(b.state) === stateAbbrev && placeOf(b)?.trim().toLowerCase() === wanted);
  const place = match && placeOf(match);
  return place ? `${place}${LOCATION_DELIMITER}${stateAbbrev}` : 'all';
}

function parseFeatureParam(value: string | undefined): number[] {
  return (value ?? '')
    .split(',')
    .map(v => parseInt(v.trim(), 10))
    .filter(n => !Number.isNaN(n));
}

export default function DirectoryClient({
  initialBookstores,
  initialStates,
  features,
  featureLinks,
  mapboxToken,
  initialFilters,
}: DirectoryClientProps) {
  // Filters start from the URL (?state=CA&city=Berkeley&county=Alameda&features=1,2)
  const initialState = getStateAbbrev(initialFilters.state) || 'all';
  const [searchQuery, setSearchQuery] = useState(initialFilters.q ?? '');
  // "Use my location" from the homepage: sort by distance from here
  const origin = useMemo(() => {
    const lat = parseFloat(initialFilters.lat ?? '');
    const lng = parseFloat(initialFilters.lng ?? '');
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }, [initialFilters.lat, initialFilters.lng]);
  const [selectedState, setSelectedState] = useState<string>(initialState);
  const [selectedCity, setSelectedCity] = useState<string>(() =>
    initialPlace(initialBookstores, initialFilters.city, initialState === 'all' ? '' : initialState, b => b.city)
  );
  const [selectedCounty, setSelectedCounty] = useState<string>(() =>
    initialPlace(initialBookstores, initialFilters.county, initialState === 'all' ? '' : initialState, b => b.county)
  );
  const [selectedFeatures, setSelectedFeatures] = useState<number[]>(() => parseFeatureParam(initialFilters.features));
  const [hoveredBookshopId, setHoveredBookshopId] = useState<number | null>(null);
  const [selectedBookshopId, setSelectedBookshopId] = useState<number | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState<'map' | 'list'>(initialFilters.view === 'map' ? 'map' : 'list');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Load the map once its area is visible: immediately on desktop, after
  // tapping "Map" on mobile (the area is display:none until then).
  const mapAreaRef = useRef<HTMLDivElement>(null);
  const [mapWanted, setMapWanted] = useState(false);
  useEffect(() => {
    const area = mapAreaRef.current;
    if (!area || mapWanted) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        setMapWanted(true);
        observer.disconnect();
      }
    });
    observer.observe(area);
    return () => observer.disconnect();
  }, [mapWanted]);

  // Keep the URL in sync so filtered views are shareable. history.replaceState
  // (not router.replace) avoids refetching the server payload on every change.
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedState !== 'all') params.set('state', selectedState);
    if (selectedCity !== 'all') params.set('city', selectedCity.split(LOCATION_DELIMITER)[0]);
    if (selectedCounty !== 'all') params.set('county', selectedCounty.split(LOCATION_DELIMITER)[0]);
    if (selectedFeatures.length) params.set('features', [...selectedFeatures].sort((a, b) => a - b).join(','));
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (origin) {
      params.set('lat', String(origin.lat));
      params.set('lng', String(origin.lng));
    }
    if (mobileView === 'map') params.set('view', 'map');
    const query = params.toString().replace(/%2C/g, ','); // keep features=1,2 readable
    const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
    if (url !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(window.history.state, '', url);
    }
  }, [selectedState, selectedCity, selectedCounty, selectedFeatures, mobileView, searchQuery, origin]);

  const changeState = useCallback((abbrev: string) => {
    setSelectedState(abbrev);
    setSelectedCity('all');
    setSelectedCounty('all');
  }, []);

  const toggleFeature = useCallback((id: number) => {
    setSelectedFeatures(prev => (prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]));
  }, []);

  // Filter bookstores
  const filteredBookstores = useMemo(() => {
    let filtered = initialBookstores;

    // Search: same matcher and ranking as /search and the search boxes
    if (searchQuery.trim()) {
      filtered = searchShops(filtered, searchQuery);
    }

    // State filter (compare using canonical abbreviation)
    if (selectedState !== 'all') {
      filtered = filtered.filter((b) => getStateAbbrev(b.state) === selectedState);
    }

    // City filter (state in option is abbrev; compare normalized)
    if (selectedCity !== 'all') {
      const [city, stateAbbrev] = selectedCity.split(LOCATION_DELIMITER);
      filtered = filtered.filter((b) => b.city === city && getStateAbbrev(b.state) === stateAbbrev);
    }

    // County filter (state in option is abbrev; compare normalized)
    if (selectedCounty !== 'all') {
      const [county, stateAbbrev] = selectedCounty.split(LOCATION_DELIMITER);
      filtered = filtered.filter((b) => b.county === county && getStateAbbrev(b.state) === stateAbbrev);
    }

    // Feature filter: shops must have every selected feature
    if (selectedFeatures.length) {
      filtered = filtered.filter((b) => selectedFeatures.every((id) => b.featureIds.includes(id)));
    }

    // Nearest first when the visitor shared their location
    if (origin) {
      const miles = (b: DirectoryBookstore) => {
        const at = shopCoordinates(b);
        return at ? kmToMiles(distanceKm(origin, at)) : Infinity;
      };
      filtered = [...filtered].sort((a, b) => miles(a) - miles(b));
    }

    return filtered;
  }, [initialBookstores, searchQuery, selectedState, selectedCity, selectedCounty, selectedFeatures, origin]);

  // Get unique cities and counties (use state abbrev in key so option values are consistent)
  const cities = useMemo(() => {
    const bookshopsToFilter =
      selectedState !== 'all'
        ? initialBookstores.filter((b) => getStateAbbrev(b.state) === selectedState)
        : initialBookstores;
    const citySet = new Set(
      bookshopsToFilter
        .filter((b) => b.city && b.state)
        .map((b) => `${b.city}${LOCATION_DELIMITER}${getStateAbbrev(b.state)}`)
    );
    return Array.from(citySet).sort();
  }, [initialBookstores, selectedState]);

  const counties = useMemo(() => {
    const bookshopsToFilter =
      selectedState !== 'all'
        ? initialBookstores.filter((b) => getStateAbbrev(b.state) === selectedState)
        : initialBookstores;
    const countySet = new Set(
      bookshopsToFilter
        .filter((b) => b.county && b.state)
        .map((b) => `${b.county}${LOCATION_DELIMITER}${getStateAbbrev(b.state)}`)
    );
    return Array.from(countySet).sort();
  }, [initialBookstores, selectedState]);

  // Feature chips: only features at least one shop has
  const availableFeatures = useMemo(() => {
    const used = new Set(initialBookstores.flatMap((b) => b.featureIds));
    return features.filter((f) => used.has(f.id));
  }, [initialBookstores, features]);

  // Render the list in pages; the count resets whenever the filtered set changes
  const listKey = `${searchQuery}|${selectedState}|${selectedCity}|${selectedCounty}|${selectedFeatures.join(',')}|${origin?.lat ?? ''}`;
  const [listPage, setListPage] = useState({ key: listKey, count: LIST_PAGE_SIZE });
  const shownCount = listPage.key === listKey ? listPage.count : LIST_PAGE_SIZE;
  const shownBookstores = filteredBookstores.slice(0, shownCount);
  const showMore = () => setListPage({ key: listKey, count: shownCount + LIST_PAGE_SIZE });

  // Handle pin click: reveal the shop's card (on phones, switch to the list)
  const handlePinClick = useCallback((bookshopId: number) => {
    setSelectedBookshopId(bookshopId);

    if (isPanelCollapsed) {
      setIsPanelCollapsed(false);
    }
    if (window.matchMedia('(max-width: 767px)').matches) {
      setMobileView('list');
    }
    const index = filteredBookstores.findIndex(b => b.id === bookshopId);
    if (index >= shownCount) {
      setListPage({ key: listKey, count: Math.ceil((index + 1) / LIST_PAGE_SIZE) * LIST_PAGE_SIZE });
    }

    setTimeout(() => {
      const cardElement = document.getElementById(`bookshop-${bookshopId}`);
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 300);
  }, [isPanelCollapsed, filteredBookstores, shownCount, listKey]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    changeState('all');
    setSelectedFeatures([]);
  }, [changeState]);

  const activeFilterCount = useMemo(() => {
    let count = selectedFeatures.length;
    if (selectedState !== 'all') count++;
    if (selectedCity !== 'all') count++;
    if (selectedCounty !== 'all') count++;
    return count;
  }, [selectedState, selectedCity, selectedCounty, selectedFeatures]);

  const searchInput = (className: string) => (
    <Input
      type="search"
      placeholder="Search state, city, or bookshop name..."
      aria-label="Search bookshops"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className={`w-full pl-12 pr-4 font-sans text-base rounded-full border-0 focus:ring-2 focus:ring-brand-teal ${className}`}
    />
  );

  const selectClass = 'w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-sans text-base md:text-sm';

  // Location + feature filters: in the side panel on desktop, in a sheet on phones
  const filters = (
    <div className="space-y-3">
      <h3 className="font-sans text-sm font-semibold text-gray-700">Location</h3>

      {/* State Filter (initialStates are abbrevs; display full name) */}
      <select value={selectedState} onChange={(e) => changeState(e.target.value)} aria-label="State" className={selectClass}>
        <option value="all">All States</option>
        {initialStates.map((abbrev) => (
          <option key={abbrev} value={abbrev}>
            {getStateDisplayName(abbrev) || abbrev}
          </option>
        ))}
      </select>

      {/* City Filter */}
      <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} disabled={cities.length === 0} aria-label="City" className={selectClass}>
        <option value="all">{selectedState === 'all' ? 'Select a state first' : 'All Cities'}</option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city.replace(LOCATION_DELIMITER, ', ')}
          </option>
        ))}
      </select>

      {/* County Filter */}
      <select value={selectedCounty} onChange={(e) => setSelectedCounty(e.target.value)} disabled={counties.length === 0} aria-label="County" className={selectClass}>
        <option value="all">{selectedState === 'all' ? 'Select a state first' : 'All Counties'}</option>
        {counties.map((county) => (
          <option key={county} value={county}>
            {county.replace(LOCATION_DELIMITER, ', ')}
          </option>
        ))}
      </select>

      {availableFeatures.length > 0 && (
        <>
          <h3 className="font-sans text-sm font-semibold text-gray-700 pt-1">Features</h3>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by feature">
            {availableFeatures.map((feature) => {
              const active = selectedFeatures.includes(feature.id);
              return (
                <button
                  key={feature.id}
                  type="button"
                  onClick={() => toggleFeature(feature.id)}
                  aria-pressed={active}
                  className={`min-h-[44px] px-4 rounded-full border font-sans text-sm font-semibold transition-colors ${
                    active ? 'bg-brand-teal border-brand-teal text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-brand-teal'
                  }`}
                >
                  {feature.name}
                </button>
              );
            })}
          </div>
        </>
      )}

      {activeFilterCount > 0 && (
        <button onClick={clearFilters} className="w-full min-h-[44px] font-sans text-sm text-brand-teal hover:underline flex items-center justify-center gap-1">
          <X className="w-4 h-4" />
          Clear all filters
        </button>
      )}
    </div>
  );

  const resultsList = (
    <>
      {origin && filteredBookstores.length > 0 && (
        <p className="px-4 pt-4 text-sm text-gray-600" role="status">
          Sorted by distance from your location
        </p>
      )}
      {filteredBookstores.length > 0 ? (
        <div className="p-4 space-y-3">
          <p className="font-sans text-sm text-gray-600">
            {filteredBookstores.length.toLocaleString('en-US')} bookshop{filteredBookstores.length === 1 ? '' : 's'}
          </p>
          {shownBookstores.map((bookshop) => (
            <div
              key={bookshop.id}
              id={`bookshop-${bookshop.id}`}
              onMouseEnter={() => setHoveredBookshopId(bookshop.id)}
              onMouseLeave={() => setHoveredBookshopId(null)}
              onClick={() => handlePinClick(bookshop.id)}
              className={`rounded-lg border-2 cursor-pointer transition-all ${selectedBookshopId === bookshop.id ? 'border-brand-orange' : hoveredBookshopId === bookshop.id ? 'border-brand-teal' : 'border-transparent'}`}
            >
              <BookshopCard bookshop={bookshop} featureLinks={featureLinks} size="compact" className="shadow-sm" />
            </div>
          ))}
          {filteredBookstores.length > shownCount && (
            <Button type="button" variant="outline" onClick={showMore} className="w-full min-h-[44px]">
              Show more ({(filteredBookstores.length - shownCount).toLocaleString('en-US')} left)
            </Button>
          )}
        </div>
      ) : (
        <div className="p-6 text-center">
          <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <h3 className="font-serif text-lg font-bold text-gray-700 mb-2">No bookshops found</h3>
          <p className="font-sans text-sm text-gray-600 mb-4">Try adjusting your filters or search query</p>
          {(activeFilterCount > 0 || searchQuery) && (
            <Button onClick={clearFilters} variant="outline" className="min-h-[44px]">
              Clear filters
            </Button>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="relative w-full md:flex-1 md:min-h-0">
      {/* Phones: sticky bar under the header with the view toggle, filters, and search */}
      <div className="md:hidden sticky top-14 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 px-3 pt-2">
          <div className="flex flex-1 rounded-lg bg-gray-100 p-1" role="group" aria-label="View">
            {(['list', 'map'] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => {
                  setMobileView(view);
                  // The map sits at the top of the page; don't leave it scrolled out of view
                  window.scrollTo({ top: 0 });
                }}
                aria-pressed={mobileView === view}
                className={`flex-1 min-h-[44px] rounded-md font-sans text-sm font-semibold transition-colors ${
                  mobileView === view ? 'bg-brand-teal text-white shadow-sm' : 'text-gray-700'
                }`}
              >
                {view === 'list' ? 'List' : 'Map'}
              </button>
            ))}
          </div>
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg border border-gray-300 font-sans text-sm font-semibold text-gray-700"
              >
                <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl">
              <SheetTitle className="font-serif text-xl text-brand-brown">Filters</SheetTitle>
              <SheetDescription className="sr-only">Filter bookshops by location and features</SheetDescription>
              <div className="mt-4">{filters}</div>
              <Button type="button" onClick={() => setFiltersOpen(false)} className="mt-6 w-full min-h-[44px]">
                Show {filteredBookstores.length.toLocaleString('en-US')} bookshop{filteredBookstores.length === 1 ? '' : 's'}
              </Button>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex gap-2 px-3 py-2">
          <div className="relative flex-1 bg-gray-50 rounded-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
            {searchInput('min-h-[44px] bg-transparent')}
          </div>
          <NearMeLink className="min-h-[44px] bg-gray-50" />
        </div>
      </div>

      {/* Map: a screen-height box under the sticky bar (phones); the full area behind the panel (desktop) */}
      <div
        ref={mapAreaRef}
        className={`overflow-hidden w-full h-[calc(100dvh-10.5rem)] md:h-full ${mobileView === 'list' ? 'hidden md:block' : ''} md:absolute md:inset-0`}
      >
        {!mapboxToken ? (
          <MapPlaceholder message="Map is unavailable right now." />
        ) : mapWanted ? (
          <DirectoryMap
            initialCenter={origin}
            shops={filteredBookstores}
            mapboxToken={mapboxToken}
            hoveredId={hoveredBookshopId}
            selectedId={selectedBookshopId}
            onPinClick={handlePinClick}
          />
        ) : (
          <MapPlaceholder />
        )}

        {/* Search Bar — desktop only (phones have it in the sticky bar) */}
        <div className="hidden md:flex gap-2 absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-xl px-4">
          <div className="relative flex-1 bg-white rounded-full shadow-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
            {searchInput('py-4')}
          </div>
          <NearMeLink className="bg-white shadow-lg" />
        </div>
      </div>

      {/* List: in the page flow on phones; a scrolling side panel on desktop */}
      <div
        className={`bg-white md:absolute md:top-0 md:left-0 md:h-full md:flex md:flex-col md:shadow-2xl md:transition-all md:duration-300 md:z-20 ${isPanelCollapsed ? 'md:w-16' : 'md:w-96'} ${mobileView === 'map' ? 'hidden md:flex' : ''}`}
      >
        {/* Collapsed strip: desktop only */}
        {isPanelCollapsed && (
          <div className="hidden md:flex relative h-full w-16 bg-white border-r-2 border-gray-200 items-center justify-center">
            <button onClick={() => setIsPanelCollapsed(false)} aria-label="Expand bookshop list panel" className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 p-2 bg-white rounded-full border-2 shadow-lg hover:bg-gray-50 min-h-[44px] min-w-[44px]">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className={`md:h-full md:min-h-0 md:flex md:flex-col relative ${isPanelCollapsed ? 'md:hidden' : ''}`}>
          <button onClick={() => setIsPanelCollapsed(true)} aria-label="Collapse bookshop list panel" className="hidden md:flex absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 p-2 bg-white rounded-full border-2 shadow-lg z-30 hover:bg-gray-50 min-h-[44px] min-w-[44px] items-center justify-center" />

          {/* Filters: desktop panel only (phones use the Filters sheet) */}
          <div className="hidden md:block flex-shrink-0 p-6 border-b border-gray-200">{filters}</div>

          <div className="md:flex-1 md:min-h-0 md:overflow-y-auto md:overscroll-contain">{resultsList}</div>
        </div>
      </div>
    </div>
  );
}
