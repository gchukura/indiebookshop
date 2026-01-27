'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Search, MapPin, Crosshair, Loader2, AlertCircle, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Map from 'react-map-gl/mapbox';
import { Marker, NavigationControl } from 'react-map-gl/mapbox';
import Supercluster from 'supercluster';
import Link from 'next/link';
import { Bookstore } from '@/shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateSlugFromName } from '@/shared/utils';
import 'mapbox-gl/dist/mapbox-gl.css';

// Constants for map and clustering
const DIRECTORY_MAP = {
  DEFAULT_VIEW: {
    longitude: -98.5795,
    latitude: 39.8283,
    zoom: 4,
    pitch: 0,
    bearing: 0,
  },
  TRANSITION_DURATION: 1000,
  GEOLOCATION_ZOOM: 12,
  MAX_AUTO_ZOOM: 14,
  BOUNDS_PADDING_PERCENT: 0.1,
  MINIMUM_BOUNDS_SPAN: 0.5,
  BOUNDS_PADDING: {
    top: 100,
    bottom: 100,
    left: { expanded: 450, collapsed: 100 },
    right: 100,
  },
};

const CLUSTER_CONFIG = {
  radius: 60,
  maxZoom: 16,
  minZoom: 0,
  expansionMaxZoom: 18,
};

const LOCATION_DELIMITER = '|';

type DirectoryClientProps = {
  initialBookstores: Bookstore[];
  initialStates: string[];
  initialFilters: {
    state?: string;
    city?: string;
    county?: string;
    features?: string;
  };
};

export default function DirectoryClient({
  initialBookstores,
  initialStates,
  initialFilters,
}: DirectoryClientProps) {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>(initialFilters.state || 'all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedCounty, setSelectedCounty] = useState<string>('all');
  const [hoveredBookshopId, setHoveredBookshopId] = useState<number | null>(null);
  const [selectedBookshopId, setSelectedBookshopId] = useState<number | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);

  const mapRef = useRef<{ getMap: () => any } | null>(null);
  const [viewState, setViewState] = useState(DIRECTORY_MAP.DEFAULT_VIEW);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Failed to load map configuration');
        const config = await response.json();
        if (config.mapboxAccessToken) {
          setMapboxToken(config.mapboxAccessToken);
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
      }
    };
    fetchToken();
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

    // State filter
    if (selectedState !== 'all') {
      filtered = filtered.filter((b) => b.state?.toUpperCase() === selectedState.toUpperCase());
    }

    // City filter
    if (selectedCity !== 'all') {
      const [city, state] = selectedCity.split(LOCATION_DELIMITER);
      filtered = filtered.filter((b) => b.city === city && b.state === state);
    }

    // County filter
    if (selectedCounty !== 'all') {
      const [county, state] = selectedCounty.split(LOCATION_DELIMITER);
      filtered = filtered.filter((b) => b.county === county && b.state === state);
    }

    return filtered;
  }, [initialBookstores, searchQuery, selectedState, selectedCity, selectedCounty]);

  // Get unique cities and counties
  const cities = useMemo(() => {
    const bookshopsToFilter = selectedState !== 'all' ? initialBookstores.filter((b) => b.state === selectedState) : initialBookstores;
    const citySet = new Set(bookshopsToFilter.filter((b) => b.city && b.state).map((b) => `${b.city}${LOCATION_DELIMITER}${b.state}`));
    return Array.from(citySet).sort();
  }, [initialBookstores, selectedState]);

  const counties = useMemo(() => {
    const bookshopsToFilter = selectedState !== 'all' ? initialBookstores.filter((b) => b.state === selectedState) : initialBookstores;
    const countySet = new Set(bookshopsToFilter.filter((b) => b.county && b.state).map((b) => `${b.county}${LOCATION_DELIMITER}${b.state}`));
    return Array.from(countySet).sort();
  }, [initialBookstores, selectedState]);

  // Create cluster index
  const { clusterInstance, points } = useMemo(() => {
    const supercluster = new Supercluster({
      radius: CLUSTER_CONFIG.radius,
      maxZoom: CLUSTER_CONFIG.maxZoom,
      minZoom: CLUSTER_CONFIG.minZoom,
    });

    const geoPoints = filteredBookstores
      .filter((b) => {
        const lat = b.latitude ? parseFloat(b.latitude) : null;
        const lon = b.longitude ? parseFloat(b.longitude) : null;
        return lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon);
      })
      .map((b) => {
        const lat = parseFloat(b.latitude!);
        const lon = parseFloat(b.longitude!);
        return {
          type: 'Feature' as const,
          properties: {
            cluster: false,
            bookshopId: b.id,
            bookshop: b,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [lon, lat],
          },
        };
      });

    supercluster.load(geoPoints);

    return { clusterInstance: supercluster, points: geoPoints };
  }, [filteredBookstores]);

  // Get clusters for current map view
  const clusters = useMemo(() => {
    if (!mapBounds || !clusterInstance) return [];

    return clusterInstance.getClusters([mapBounds.west, mapBounds.south, mapBounds.east, mapBounds.north], Math.floor(viewState.zoom));
  }, [clusterInstance, mapBounds, viewState.zoom]);

  // Update map bounds
  const updateMapBounds = useCallback(() => {
    if (!mapRef.current) return;

    try {
      const map = mapRef.current.getMap();
      if (!map || !map.getBounds) return;

      const bounds = map.getBounds();
      setMapBounds({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    } catch (error) {
      // Map not fully initialized
    }
  }, []);

  // Handle map movement
  const handleMapMove = useCallback((evt: any) => {
    if (evt.viewState) {
      setViewState(evt.viewState);
    }
  }, []);

  // Handle map load
  const handleMapLoad = useCallback(() => {
    setTimeout(() => {
      updateMapBounds();
    }, 100);
  }, [updateMapBounds]);

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

  // Handle cluster click
  const handleClusterClick = useCallback((clusterId: number, longitude: number, latitude: number) => {
    if (!clusterInstance) return;

    try {
      const expansionZoom = Math.min(clusterInstance.getClusterExpansionZoom(clusterId), CLUSTER_CONFIG.expansionMaxZoom);

      setViewState((prev) => ({
        ...prev,
        longitude,
        latitude,
        zoom: expansionZoom,
        transitionDuration: DIRECTORY_MAP.TRANSITION_DURATION,
      }));
    } catch (error) {
      setViewState((prev) => ({
        ...prev,
        longitude,
        latitude,
        zoom: Math.min(prev.zoom + 2, CLUSTER_CONFIG.expansionMaxZoom),
        transitionDuration: DIRECTORY_MAP.TRANSITION_DURATION,
      }));
    }
  }, [clusterInstance]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedState('all');
    setSelectedCity('all');
    setSelectedCounty('all');
  }, []);

  // Visible bookstores in current map bounds
  const visibleBookshops = useMemo(() => {
    if (!mapBounds) return filteredBookstores;

    return filteredBookstores.filter((b) => {
      const lat = b.latitude ? parseFloat(b.latitude) : null;
      const lon = b.longitude ? parseFloat(b.longitude) : null;

      if (!lat || !lon || isNaN(lat) || isNaN(lon)) return false;

      return lat >= mapBounds.south && lat <= mapBounds.north && lon >= mapBounds.west && lon <= mapBounds.east;
    });
  }, [filteredBookstores, mapBounds]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedState !== 'all') count++;
    if (selectedCity !== 'all') count++;
    if (selectedCounty !== 'all') count++;
    return count;
  }, [selectedState, selectedCity, selectedCounty]);

  return (
    <div className="relative h-[calc(100vh-64px)]">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`absolute top-24 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full shadow-lg font-sans text-sm font-semibold ${
            notification.type === 'error' ? 'bg-red-500 text-white' : notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-[#2A6B7C] text-white'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Mapbox Map */}
      {mapboxToken ? (
        <Map
          ref={mapRef as any}
          {...viewState}
          onMove={handleMapMove}
          onMoveEnd={updateMapBounds}
          onLoad={handleMapLoad}
          mapboxAccessToken={mapboxToken}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="bottom-right" />

          {/* Render clusters and pins */}
          {clusters.map((cluster: any) => {
            const [longitude, latitude] = cluster.geometry.coordinates;
            const { cluster: isCluster, point_count: pointCount, bookshopId, bookshop } = cluster.properties;

            if (isCluster) {
              return (
                <Marker
                  key={`cluster-${cluster.id}`}
                  longitude={longitude}
                  latitude={latitude}
                  onClick={(e: any) => {
                    e.originalEvent.stopPropagation();
                    handleClusterClick(cluster.id, longitude, latitude);
                  }}
                >
                  <div className="cursor-pointer">
                    <div className="relative bg-[#2A6B7C] rounded-full flex items-center justify-center shadow-lg hover:bg-[#1d5a6a] transition-colors" style={{ width: 50, height: 50 }}>
                      <span className="font-sans font-bold text-white">{pointCount}</span>
                    </div>
                  </div>
                </Marker>
              );
            }

            const isHovered = hoveredBookshopId === bookshopId;
            const isSelected = selectedBookshopId === bookshopId;

            return (
              <Marker
                key={`bookshop-${bookshopId}`}
                longitude={longitude}
                latitude={latitude}
                onClick={(e: any) => {
                  e.originalEvent.stopPropagation();
                  handlePinClick(bookshopId);
                }}
              >
                <div className={`cursor-pointer transition-transform ${isSelected ? 'scale-125' : isHovered ? 'scale-110' : ''}`}>
                  <MapPin className={`w-8 h-8 ${isSelected ? 'text-[#E16D3D]' : isHovered ? 'text-[#2A6B7C]' : 'text-[#5F4B32]'}`} fill="currentColor" />
                </div>
              </Marker>
            );
          })}
        </Map>
      ) : (
        <div className="flex items-center justify-center h-full bg-white/80">
          <Loader2 className="w-8 h-8 text-[#2A6B7C] animate-spin" />
        </div>
      )}

      {/* Search Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-xl px-4">
        <div className="relative bg-white rounded-full shadow-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input type="text" placeholder="Search state, city, or bookshop name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 font-sans text-base rounded-full border-0 focus:ring-2 focus:ring-[#2A6B7C]" />
        </div>
      </div>

      {/* Sliding Panel */}
      <div className={`absolute top-0 left-0 h-full bg-white shadow-2xl transition-all duration-300 z-20 ${isPanelCollapsed ? 'w-16' : 'w-96'}`}>
        {isPanelCollapsed ? (
          <div className="relative h-full w-16 bg-white border-r-2 border-gray-200">
            <button onClick={() => setIsPanelCollapsed(false)} aria-label="Expand bookshop list panel" className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 p-2 bg-white rounded-full border-2 shadow-lg hover:bg-gray-50 min-h-[44px] min-w-[44px]">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="h-full flex flex-col relative">
            <button onClick={() => setIsPanelCollapsed(true)} aria-label="Collapse bookshop list panel" className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 p-2 bg-white rounded-full border-2 shadow-lg z-30 hover:bg-gray-50 min-h-[44px] min-w-[44px]">
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex-shrink-0 p-6 border-b border-gray-200">
              <div className="space-y-3">
                <h3 className="font-sans text-sm font-semibold text-gray-700">Location</h3>

                {/* State Filter */}
                <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-sans text-sm">
                  <option value="all">All States</option>
                  {initialStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
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

                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="w-full font-sans text-sm text-[#2A6B7C] hover:underline flex items-center justify-center gap-1 py-1">
                    <X className="w-4 h-4" />
                    Clear all filters
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto">
              {visibleBookshops.length > 0 ? (
                <div className="p-4 space-y-3">
                  {visibleBookshops.map((bookshop) => (
                    <div
                      key={bookshop.id}
                      id={`bookshop-${bookshop.id}`}
                      onMouseEnter={() => setHoveredBookshopId(bookshop.id)}
                      onMouseLeave={() => setHoveredBookshopId(null)}
                      onClick={() => handlePinClick(bookshop.id)}
                      className={`bg-white border-2 rounded-lg p-4 cursor-pointer transition-all ${selectedBookshopId === bookshop.id ? 'border-[#E16D3D] shadow-md' : hoveredBookshopId === bookshop.id ? 'border-[#2A6B7C] shadow-sm' : 'border-gray-200'}`}
                    >
                      {(() => {
                        const bookshopSlug = bookshop.slug || generateSlugFromName(bookshop.name);
                        return (
                          <>
                            <Link href={`/bookshop/${bookshopSlug}`} onClick={(e: React.MouseEvent) => e.stopPropagation()} className="block">
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
                            <Link href={`/bookshop/${bookshopSlug}`} className="font-sans text-xs text-[#2A6B7C] hover:underline font-medium" onClick={(e) => e.stopPropagation()}>
                              View details →
                            </Link>
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <h3 className="font-serif text-lg font-bold text-gray-700 mb-2">No bookshops found</h3>
                  <p className="font-sans text-sm text-gray-600 mb-4">Try adjusting your filters or search in a different area</p>
                  {activeFilterCount > 0 && (
                    <Button onClick={clearFilters} variant="outline" size="sm" className="rounded-full">
                      Clear filters
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
