'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Search, MapPin, Loader2, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';
import { getStateAbbrev, getStateDisplayName } from '@/lib/state-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getBookstoreSlug } from '@/lib/data/slug';

// react-map-gl + mapbox-gl (~1.6 MB) load only once the map area is on screen
const DirectoryMap = dynamic(() => import('@/components/directory/DirectoryMap'), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

const LOCATION_DELIMITER = '|';

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
  description: string;
  featureIds: number[];
}

type DirectoryClientProps = {
  /** Every shop; filtering happens here so filter changes need no server round trip. */
  initialBookstores: DirectoryBookstore[];
  initialStates: string[];
  features: Array<{ id: number; name: string }>;
  mapboxToken: string;
  initialFilters: {
    state?: string;
    city?: string;
    county?: string;
    features?: string;
    view?: string;
  };
};

function MapPlaceholder({ message = 'Loading map...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6 text-center">
      <Loader2 className="w-12 h-12 text-[#2A6B7C] animate-spin mb-4" />
      <p className="text-gray-600 font-sans text-sm">{message}</p>
    </div>
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
  mapboxToken,
  initialFilters,
}: DirectoryClientProps) {
  // Filters start from the URL (?state=CA&city=Berkeley&county=Alameda&features=1,2)
  const initialState = getStateAbbrev(initialFilters.state) || 'all';
  const [searchQuery, setSearchQuery] = useState('');
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
    if (mobileView === 'map') params.set('view', 'map');
    const query = params.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
    if (url !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(window.history.state, '', url);
    }
  }, [selectedState, selectedCity, selectedCounty, selectedFeatures, mobileView]);

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

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((b) => {
        const name = b.name.toLowerCase();
        const city = b.city?.toLowerCase() || '';
        const state = b.state?.toLowerCase() || '';
        return name.includes(query) || city.includes(query) || state.includes(query);
      });
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

    return filtered;
  }, [initialBookstores, searchQuery, selectedState, selectedCity, selectedCounty, selectedFeatures]);

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

  // Handle pin click
  const handlePinClick = useCallback((bookshopId: number) => {
    setSelectedBookshopId(bookshopId);

    if (isPanelCollapsed) {
      setIsPanelCollapsed(false);
    }

    setTimeout(() => {
      const cardElement = document.getElementById(`bookshop-${bookshopId}`);
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 300);
  }, [isPanelCollapsed]);

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

  return (
    <div className="relative flex-1 min-h-0 flex flex-col md:block w-full">
      {/* Mobile: Map | List toggle — locked at top */}
      <div className="flex md:hidden flex-shrink-0 gap-0 p-2 bg-gray-100 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setMobileView('map')}
          className={`flex-1 py-3 px-4 rounded-lg font-sans text-sm font-semibold transition-colors min-h-[44px] ${
            mobileView === 'map' ? 'bg-[#2A6B7C] text-white shadow-sm' : 'bg-transparent text-gray-600 hover:bg-gray-200'
          }`}
          aria-pressed={mobileView === 'map'}
          aria-label="Show map view"
        >
          Map
        </button>
        <button
          type="button"
          onClick={() => setMobileView('list')}
          className={`flex-1 py-3 px-4 rounded-lg font-sans text-sm font-semibold transition-colors min-h-[44px] ${
            mobileView === 'list' ? 'bg-[#2A6B7C] text-white shadow-sm' : 'bg-transparent text-gray-600 hover:bg-gray-200'
          }`}
          aria-pressed={mobileView === 'list'}
          aria-label="Show list view"
        >
          List
        </button>
      </div>

      {/* Mobile: search bar below toggle */}
      <div className="flex md:hidden flex-shrink-0 px-3 py-2 bg-white border-b border-gray-200">
        <div className="relative w-full max-w-xl mx-auto bg-gray-50 rounded-full shadow-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input type="text" placeholder="Search state, city, or bookshop name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 font-sans text-base rounded-full border-0 bg-transparent focus:ring-2 focus:ring-[#2A6B7C]" />
        </div>
      </div>

      {/* Map: fills remaining space below toggle+search (mobile); full viewport area (desktop) */}
      <div
        ref={mapAreaRef}
        className={`overflow-hidden flex-1 min-h-0 w-full ${mobileView === 'list' ? 'hidden md:block' : ''} md:absolute md:inset-0 md:right-0 md:bottom-0 md:left-0 md:top-0 md:w-full md:h-full md:min-h-0`}
      >
        {!mapboxToken ? (
          <MapPlaceholder message="Map is unavailable right now." />
        ) : mapWanted ? (
          <DirectoryMap
            shops={filteredBookstores}
            mapboxToken={mapboxToken}
            hoveredId={hoveredBookshopId}
            selectedId={selectedBookshopId}
            onPinClick={handlePinClick}
          />
        ) : (
          <MapPlaceholder />
        )}

        {/* Search Bar — desktop only (mobile has search below toggle) */}
        <div className="hidden md:block absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-xl px-4">
          <div className="relative bg-white rounded-full shadow-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input type="text" placeholder="Search state, city, or bookshop name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 font-sans text-base rounded-full border-0 focus:ring-2 focus:ring-[#2A6B7C]" />
          </div>
        </div>
      </div>

      {/* List: full height when toggled (mobile) / left overlay (desktop) */}
      <div
        className={`flex-1 min-h-0 flex flex-col bg-white border-t border-gray-200 overflow-hidden md:flex-none md:absolute md:top-0 md:left-0 md:h-full md:border-t-0 md:shadow-2xl md:transition-all md:duration-300 md:z-20 ${isPanelCollapsed ? 'md:w-16' : 'md:w-96'} ${mobileView === 'map' ? 'hidden md:flex' : ''}`}
      >
        {/* Collapsed strip: desktop only */}
        {isPanelCollapsed && (
          <div className="hidden md:flex relative h-full w-16 bg-white border-r-2 border-gray-200 items-center justify-center">
            <button onClick={() => setIsPanelCollapsed(false)} aria-label="Expand bookshop list panel" className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 p-2 bg-white rounded-full border-2 shadow-lg hover:bg-gray-50 min-h-[44px] min-w-[44px]">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
        {/* Full panel: always on mobile; on desktop only when not collapsed */}
        <div className={`h-full min-h-0 flex flex-col relative ${isPanelCollapsed ? 'md:hidden' : ''}`}>
          <button onClick={() => setIsPanelCollapsed(true)} aria-label="Collapse bookshop list panel" className="hidden md:flex absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 p-2 bg-white rounded-full border-2 shadow-lg z-30 hover:bg-gray-50 min-h-[44px] min-w-[44px] items-center justify-center" />

          <div className="flex-shrink-0 p-4 md:p-6 border-b border-gray-200">
              <div className="space-y-3">
                <h3 className="font-sans text-sm font-semibold text-gray-700">Location</h3>

                {/* State Filter (initialStates are abbrevs; display full name) */}
                <select value={selectedState} onChange={(e) => changeState(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-sans text-sm">
                  <option value="all">All States</option>
                  {initialStates.map((abbrev) => (
                    <option key={abbrev} value={abbrev}>
                      {getStateDisplayName(abbrev) || abbrev}
                    </option>
                  ))}
                </select>

                {/* City Filter */}
                <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} disabled={cities.length === 0} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-sans text-sm">
                  <option value="all">{selectedState === 'all' ? 'Select a state first' : 'All Cities'}</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city.replace(LOCATION_DELIMITER, ', ')}
                    </option>
                  ))}
                </select>

                {/* County Filter */}
                <select value={selectedCounty} onChange={(e) => setSelectedCounty(e.target.value)} disabled={counties.length === 0} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-sans text-sm">
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
                            className={`px-3 py-1.5 rounded-full border font-sans text-xs font-semibold transition-colors ${
                              active ? 'bg-[#2A6B7C] border-[#2A6B7C] text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-[#2A6B7C]'
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
                  <button onClick={clearFilters} className="w-full font-sans text-sm text-[#2A6B7C] hover:underline flex items-center justify-center gap-1 py-1">
                    <X className="w-4 h-4" />
                    Clear all filters
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {filteredBookstores.length > 0 ? (
                <div className="p-4 space-y-3">
                  {filteredBookstores.map((bookshop) => (
                    <div
                      key={bookshop.id}
                      id={`bookshop-${bookshop.id}`}
                      onMouseEnter={() => setHoveredBookshopId(bookshop.id)}
                      onMouseLeave={() => setHoveredBookshopId(null)}
                      onClick={() => handlePinClick(bookshop.id)}
                      className={`bg-white border-2 rounded-lg p-4 cursor-pointer transition-all ${selectedBookshopId === bookshop.id ? 'border-[#E16D3D] shadow-md' : hoveredBookshopId === bookshop.id ? 'border-[#2A6B7C] shadow-sm' : 'border-gray-200'}`}
                    >
                      <Link href={`/bookshop/${getBookstoreSlug(bookshop)}`} onClick={(e: React.MouseEvent) => e.stopPropagation()} className="block">
                        <h3 className="font-serif font-bold text-base text-[#5F4B32] mb-1 hover:text-[#2A6B7C]">{bookshop.name}</h3>
                      </Link>
                      {(bookshop.city || bookshop.state) && (
                        <div className="flex items-start text-xs text-gray-600 mb-2">
                          <MapPin className="w-3 h-3 mr-1 mt-0.5" />
                          <span>
                            {bookshop.city && `${bookshop.city}, `}
                            {bookshop.state}
                          </span>
                        </div>
                      )}
                      {bookshop.description && <p className="font-sans text-xs text-gray-700 line-clamp-2 mb-2">{bookshop.description}</p>}
                      <Link href={`/bookshop/${getBookstoreSlug(bookshop)}`} className="font-sans text-xs text-[#2A6B7C] hover:underline font-medium" onClick={(e) => e.stopPropagation()}>
                        View details →
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <h3 className="font-serif text-lg font-bold text-gray-700 mb-2">No bookshops found</h3>
                  <p className="font-sans text-sm text-gray-600 mb-4">Try adjusting your filters or search query</p>
                  {(activeFilterCount > 0 || searchQuery) && (
                    <Button onClick={clearFilters} variant="outline" size="sm" className="rounded-full">
                      Clear filters
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
}
