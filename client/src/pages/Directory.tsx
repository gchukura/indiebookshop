import React, { useState, useMemo, useCallback, useRef, useEffect, Component, ReactNode } from "react";
import { Search, MapPin, Filter, X, ChevronDown, ChevronLeft, ChevronRight, Crosshair, Loader2, AlertCircle } from "lucide-react";
// react-map-gl v8 uses /mapbox subpath
import Map from "react-map-gl/mapbox";
import { Marker, NavigationControl } from "react-map-gl/mapbox";
import Supercluster from "supercluster";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Bookstore } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SEO } from "../components/SEO";
import { BASE_URL } from "../lib/seo";
import { generateSlugFromName } from "../lib/linkUtils";
import { DIRECTORY_MAP, CLUSTER_CONFIG, PANEL_CONFIG, LOCATION_DELIMITER } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { stateMap, stateNameMap, normalizeStateToAbbreviation } from "@/lib/stateUtils";
import { supabase } from "@/lib/supabase";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  MobileViewToggle,
  MobileFilterBar,
  MobileFilterDrawer,
  MobileListView,
  MobileMapView,
} from "../components/MobileDirectoryComponents";

// ============================================================================
// ERROR BOUNDARY - Catches map initialization failures
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class MapErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Map error', error, { errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-50">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="font-serif text-2xl font-bold text-gray-900 mb-2">
            Map Failed to Load
          </h2>
          <p className="font-sans text-gray-600 text-center mb-6 max-w-md">
            We're having trouble loading the map. This could be due to a network issue or browser compatibility.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => window.location.reload()}
              className="rounded-full font-sans"
            >
              Reload Page
            </Button>
            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-full font-sans"
            >
              Try Again
            </Button>
          </div>
          {this.state.error && process.env.NODE_ENV === 'development' && (
            <details className="mt-6 p-4 bg-white rounded-lg border border-gray-200 max-w-md">
              <summary className="font-sans text-sm font-semibold text-gray-700 cursor-pointer">
                Technical Details
              </summary>
              <pre className="mt-2 font-mono text-xs text-gray-600 overflow-auto max-h-32">
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// TYPES
// ============================================================================

type NotificationType = {
  type: 'success' | 'error' | 'info';
  message: string;
} | null;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Directory = () => {
  const [location] = useLocation();
  
  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedCounty, setSelectedCounty] = useState<string>("all");
  const [selectedFeatures, setSelectedFeatures] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [hoveredBookshopId, setHoveredBookshopId] = useState<number | null>(null);
  const [selectedBookshopId, setSelectedBookshopId] = useState<number | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [showSearchThisArea, setShowSearchThisArea] = useState(false);
  const [mapBounds, setMapBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);
  const [mobileSheetHeight, setMobileSheetHeight] = useState<"peek" | "half" | "full">("peek");
  const [mobileViewMode, setMobileViewMode] = useState<"list" | "map">("list");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [hasFitInitialView, setHasFitInitialView] = useState(false);
  const [notification, setNotification] = useState<NotificationType>(null);

  const mapRef = useRef<{ getMap: () => any } | null>(null);
  const [viewState, setViewState] = useState<{
    longitude: number;
    latitude: number;
    zoom: number;
    pitch: number;
    bearing: number;
    transitionDuration?: number;
  }>({
    longitude: DIRECTORY_MAP.DEFAULT_VIEW.longitude,
    latitude: DIRECTORY_MAP.DEFAULT_VIEW.latitude,
    zoom: DIRECTORY_MAP.DEFAULT_VIEW.zoom,
    pitch: DIRECTORY_MAP.DEFAULT_VIEW.pitch,
    bearing: DIRECTORY_MAP.DEFAULT_VIEW.bearing
  });

  // Fetch Mapbox token from API
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch('/api/config');
        if (!response.ok) {
          throw new Error(`Failed to load map configuration (${response.status})`);
        }
        const config = await response.json();
        if (config.mapboxAccessToken) {
          setMapboxToken(config.mapboxAccessToken);
        } else {
          logger.error('Mapbox access token is missing', undefined, { endpoint: '/api/config' });
        }
      } catch (error) {
        logger.error('Error fetching Mapbox token', error);
      }
    };
    fetchToken();
  }, []);

  // Fetch all bookshops from Supabase
  const { data: bookshops = [], isLoading } = useQuery<Bookstore[]>({
    queryKey: ['bookstores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookstores')
        .select('*')
        .eq('live', true)
        .order('name');
      
      if (error) throw error;
      
      // Map Supabase column names to match Bookstore type
      return (data || []).map((item: any) => ({
        ...item,
        latitude: item.lat_numeric?.toString() || item.latitude || null,
        longitude: item.lng_numeric?.toString() || item.longitude || null,
        featureIds: item.feature_ids || item.featureIds || [],
        imageUrl: item.image_url || item.imageUrl || null,
      })) as Bookstore[];
    }
  });

  // Fetch features for filtering
  const { data: features = [] } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ["/api/features"],
  });

  // Parse URL query parameters and apply filters on mount
  // Only run when location pathname changes (not on every filter change)
  useEffect(() => {
    if (bookshops.length === 0 || features.length === 0) return; // Wait for data to load
    
    const urlParams = new URLSearchParams(window.location.search);
    
    // Parse state parameter
    const stateParam = urlParams.get('state');
    if (stateParam) {
      const stateAbbr = normalizeStateToAbbreviation(stateParam) || stateParam.toUpperCase();
      // Validate state exists in our data
      const validStates = new Set(bookshops.map(b => b.state).filter(Boolean));
      if (validStates.has(stateAbbr) && selectedState !== stateAbbr) {
        setSelectedState(stateAbbr);
      }
    } else if (selectedState !== "all") {
      // Clear state if not in URL
      setSelectedState("all");
    }
    
    // Parse city parameter (requires state to be set first)
    const cityParam = urlParams.get('city');
    if (cityParam && stateParam) {
      const stateAbbr = normalizeStateToAbbreviation(stateParam) || stateParam.toUpperCase();
      // Find matching city in the format "City|State"
      const cityKey = `${cityParam}${LOCATION_DELIMITER}${stateAbbr}`;
      const validCities = new Set(
        bookshops
          .filter(b => b.state === stateAbbr && b.city)
          .map(b => `${b.city}${LOCATION_DELIMITER}${b.state}`)
      );
      // Try exact match first, then case-insensitive match
      let matchedCity = Array.from(validCities).find(c => 
        c.toLowerCase() === cityKey.toLowerCase()
      );
      if (matchedCity && selectedCity !== matchedCity) {
        setSelectedCity(matchedCity);
      } else if (!matchedCity && selectedCity !== "all") {
        // Clear city if not found in URL
        setSelectedCity("all");
      }
    } else if (selectedCity !== "all") {
      // Clear city if not in URL
      setSelectedCity("all");
    }
    
    // Parse county parameter (requires state to be set first)
    const countyParam = urlParams.get('county');
    if (countyParam && stateParam) {
      const stateAbbr = normalizeStateToAbbreviation(stateParam) || stateParam.toUpperCase();
      // Find matching county in the format "County|State"
      const countyKey = `${countyParam}${LOCATION_DELIMITER}${stateAbbr}`;
      const validCounties = new Set(
        bookshops
          .filter(b => b.state === stateAbbr && b.county)
          .map(b => `${b.county}${LOCATION_DELIMITER}${b.state}`)
      );
      // Try exact match first, then case-insensitive match
      let matchedCounty = Array.from(validCounties).find(c => 
        c.toLowerCase() === countyKey.toLowerCase()
      );
      if (matchedCounty && selectedCounty !== matchedCounty) {
        setSelectedCounty(matchedCounty);
      } else if (!matchedCounty && selectedCounty !== "all") {
        // Clear county if not found in URL
        setSelectedCounty("all");
      }
    } else if (selectedCounty !== "all") {
      // Clear county if not in URL
      setSelectedCounty("all");
    }
    
    // Parse features parameter
    const featuresParam = urlParams.get('features');
    if (featuresParam) {
      const featureIds = featuresParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (featureIds.length > 0) {
        // Validate feature IDs exist
        const validFeatureIds = new Set(features.map(f => f.id));
        const validIds = featureIds.filter(id => validFeatureIds.has(id));
        if (validIds.length > 0) {
          const currentIds = [...selectedFeatures].sort();
          const newIds = [...validIds].sort();
          if (JSON.stringify(currentIds) !== JSON.stringify(newIds)) {
            setSelectedFeatures(validIds);
          }
        } else if (selectedFeatures.length > 0) {
          // Clear features if none valid in URL
          setSelectedFeatures([]);
        }
      }
    } else if (selectedFeatures.length > 0) {
      // Clear features if not in URL
      setSelectedFeatures([]);
    }
  }, [location]); // Only re-run when location changes (user navigation)

  // Update URL when filters change (for bookmarking/sharing)
  // Skip if we're currently parsing URL params to avoid loops
  const isInitialMount = useRef(true);
  useEffect(() => {
    // Skip on initial mount - URL parsing will handle it
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    const params = new URLSearchParams();
    
    if (selectedState !== "all") {
      params.set('state', selectedState);
    }
    
    if (selectedCity !== "all") {
      const [city] = selectedCity.split(LOCATION_DELIMITER);
      if (city) {
        params.set('city', city);
      }
    }
    
    if (selectedCounty !== "all") {
      const [county] = selectedCounty.split(LOCATION_DELIMITER);
      if (county) {
        params.set('county', county);
      }
    }
    
    if (selectedFeatures.length > 0) {
      params.set('features', selectedFeatures.join(','));
    }
    
    const newUrl = `/directory${params.toString() ? '?' + params.toString() : ''}`;
    const currentUrl = window.location.pathname + window.location.search;
    
    // Only update URL if it's different to avoid unnecessary updates
    if (newUrl !== currentUrl) {
      // Use replaceState to avoid adding to history on every filter change
      window.history.replaceState({}, '', newUrl);
    }
  }, [selectedState, selectedCity, selectedCounty, selectedFeatures]);

  // Get unique states for filter
  const states = useMemo(() => {
    const stateSet = new Set(bookshops.map(b => b.state).filter(Boolean));
    return Array.from(stateSet).sort();
  }, [bookshops]);

  // Get unique cities for filter (filtered by selected state)
  // Uses LOCATION_DELIMITER to prevent issues with commas in city names
  const cities = useMemo(() => {
    const bookshopsToFilter = selectedState !== "all" 
      ? bookshops.filter(b => b.state === selectedState)
      : bookshops;
    
    const citySet = new Set(
      bookshopsToFilter
        .filter(b => b.city && b.state)
        .map(b => `${b.city}${LOCATION_DELIMITER}${b.state}`)
    );
    return Array.from(citySet).sort();
  }, [bookshops, selectedState]);

  // Get unique counties for filter (filtered by selected state)
  // Uses LOCATION_DELIMITER to prevent issues with commas in county names
  const counties = useMemo(() => {
    const bookshopsToFilter = selectedState !== "all" 
      ? bookshops.filter(b => b.state === selectedState)
      : bookshops;
    
    const countySet = new Set(
      bookshopsToFilter
        .filter(b => b.county && b.state)
        .map(b => `${b.county}${LOCATION_DELIMITER}${b.state}`)
    );
    return Array.from(countySet).sort();
  }, [bookshops, selectedState]);

  // Sort bookshops once (alphabetical) to avoid re-sorting on every filter change
  const sortedBookshops = useMemo(() => {
    return [...bookshops].sort((a, b) => {
      const nameA = a.name?.toLowerCase() || "";
      const nameB = b.name?.toLowerCase() || "";
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });
  }, [bookshops]);

  // Filter bookshops
  const filteredBookshops = useMemo(() => {
    let filtered = sortedBookshops;

    // Search filter - intelligent matching
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      
      // Check if query matches a state (handles both full names and abbreviations)
      let matchedState: string | null = null;
      
      // First, check if it's a state abbreviation (2 characters)
      if (query.length === 2) {
        const upperQuery = query.toUpperCase();
        const fullStateName = stateMap[upperQuery];
        if (fullStateName) {
          // Check if this full name exists in our states list
          matchedState = states.find(s => s === fullStateName) || null;
          // Also check if abbreviation matches directly
          if (!matchedState) {
            matchedState = states.find(s => s.toUpperCase() === upperQuery) || null;
          }
        }
      }
      
      // Check if query exactly matches any state name (full name)
      if (!matchedState) {
        matchedState = states.find(state => state.toLowerCase() === query) || null;
      }
      
      // Check if query matches state name via abbreviation mapping
      if (!matchedState && stateNameMap[query]) {
        const abbr = stateNameMap[query].toUpperCase();
        matchedState = states.find(s => s.toUpperCase() === abbr) || null;
      }
      
      // If we found a state match, filter to that state
      if (matchedState) {
        filtered = filtered.filter(b => {
          // Match by full state name
          if (b.state === matchedState) return true;
          // Also match by abbreviation if state is stored as abbreviation
          const stateAbbr = stateNameMap[matchedState.toLowerCase()];
          if (stateAbbr && b.state?.toUpperCase() === stateAbbr.toUpperCase()) return true;
          return false;
        });
      }
      // Otherwise, do intelligent partial matching
      else {
        filtered = filtered.filter(b => {
          const name = b.name.toLowerCase();
          const city = b.city?.toLowerCase() || '';
          const state = b.state?.toLowerCase() || '';
          const county = b.county?.toLowerCase() || '';
          
          // Check if query matches bookshop name
          if (name.includes(query)) return true;
          
          // Check if query matches city (exact or partial)
          if (city && (city === query || city.includes(query))) return true;
          
          // Check if query matches state (handle both full name and abbreviation)
          if (state && (state === query || state.includes(query))) return true;
          
          // Check state abbreviation mapping (if query is 2 chars, might be abbreviation)
          if (query.length === 2) {
            const upperQuery = query.toUpperCase();
            const fullStateName = stateMap[upperQuery];
            if (fullStateName) {
              // Check if bookshop state matches the full name
              if (state === fullStateName.toLowerCase()) return true;
            }
            // Check if bookshop state is the abbreviation
            if (state.toUpperCase() === upperQuery) return true;
          }
          
          // Check reverse: if query is a full state name, check if bookshop has that abbreviation
          if (stateNameMap[query]) {
            const abbr = stateNameMap[query].toUpperCase();
            if (state.toUpperCase() === abbr) return true;
          }
          
          // Check if query matches county
          if (county && (county === query || county.includes(query))) return true;
          
          return false;
        });
      }
    }

    // State filter
    if (selectedState !== "all") {
      filtered = filtered.filter(b => b.state === selectedState);
    }

    // City filter - safe parsing with delimiter
    if (selectedCity !== "all") {
      const [city, state] = selectedCity.split(LOCATION_DELIMITER);
      if (city && state) {
        filtered = filtered.filter(b => b.city === city && b.state === state);
      }
    }

    // County filter - safe parsing with delimiter
    if (selectedCounty !== "all") {
      const [county, state] = selectedCounty.split(LOCATION_DELIMITER);
      if (county && state) {
        filtered = filtered.filter(b => b.county === county && b.state === state);
      }
    }

    // Feature filters (using featureIds)
    if (selectedFeatures.length > 0) {
      filtered = filtered.filter(b => {
        if (!b.featureIds || !Array.isArray(b.featureIds)) return false;
        return selectedFeatures.some(featureId => b.featureIds!.includes(featureId));
      });
    }

    return filtered;
  }, [sortedBookshops, searchQuery, selectedState, selectedCity, selectedCounty, selectedFeatures, states]);

  // Create cluster index
  const { clusterInstance, points } = useMemo(() => {
    const supercluster = new Supercluster({
      radius: CLUSTER_CONFIG.radius,
      maxZoom: CLUSTER_CONFIG.maxZoom,
      minZoom: CLUSTER_CONFIG.minZoom
    });

    const geoPoints = filteredBookshops
      .filter(b => {
        const lat = b.latitude ? parseFloat(b.latitude) : null;
        const lon = b.longitude ? parseFloat(b.longitude) : null;
        return lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon);
      })
      .map(b => {
        const lat = parseFloat(b.latitude!);
        const lon = parseFloat(b.longitude!);
        return {
          type: 'Feature' as const,
          properties: { 
            cluster: false, 
            bookshopId: b.id,
            bookshop: b
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [lon, lat]
          }
        };
      });

    supercluster.load(geoPoints);
    
    return { clusterInstance: supercluster, points: geoPoints };
  }, [filteredBookshops]);

  // Get clusters for current map view
  const clusters = useMemo(() => {
    if (!mapBounds || !clusterInstance) return [];
    
    return clusterInstance.getClusters(
      [mapBounds.west, mapBounds.south, mapBounds.east, mapBounds.north],
      Math.floor(viewState.zoom)
    );
  }, [clusterInstance, mapBounds, viewState.zoom]);

  // Bookshops visible in current map bounds (for panel list)
  const visibleBookshops = useMemo(() => {
    if (!mapBounds) return filteredBookshops;
    
    return filteredBookshops.filter(b => {
      const lat = b.latitude ? parseFloat(b.latitude) : null;
      const lon = b.longitude ? parseFloat(b.longitude) : null;
      
      if (!lat || !lon || isNaN(lat) || isNaN(lon)) return false;
      
      return (
        lat >= mapBounds.south &&
        lat <= mapBounds.north &&
        lon >= mapBounds.west &&
        lon <= mapBounds.east
      );
    });
  }, [filteredBookshops, mapBounds]);

  // Toggle feature filter
  const toggleFeature = (featureId: number) => {
    setSelectedFeatures(prev =>
      prev.includes(featureId)
        ? prev.filter(f => f !== featureId)
        : [...prev, featureId]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedState("all");
    setSelectedCity("all");
    setSelectedCounty("all");
    setSelectedFeatures([]);
    setHasFitInitialView(false);
  };

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedState !== "all") count++;
    if (selectedCity !== "all") count++;
    if (selectedCounty !== "all") count++;
    count += selectedFeatures.length;
    return count;
  }, [selectedState, selectedCity, selectedCounty, selectedFeatures]);

  // Handle card hover
  const handleCardHover = useCallback((bookshopId: number | null) => {
    setHoveredBookshopId(bookshopId);
  }, []);

  // Handle pin click - improved timing with requestAnimationFrame
  const handlePinClick = useCallback((bookshopId: number) => {
    setSelectedBookshopId(bookshopId);
    
    // Expand panel if collapsed
    if (isPanelCollapsed) {
      setIsPanelCollapsed(false);
    }
    
    // Wait for panel animation and card render with better timing
    const scrollToCard = () => {
      const cardElement = document.getElementById(`bookshop-${bookshopId}`);
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else {
        // Card not rendered yet, try again on next frame
        requestAnimationFrame(scrollToCard);
      }
    };
    
    // Double RAF for smoother timing after state updates
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToCard);
    });
  }, [isPanelCollapsed]);

  // Handle cluster click - with error handling
  const handleClusterClick = useCallback((clusterId: number, longitude: number, latitude: number) => {
    if (!clusterInstance) {
      logger.warn('Cluster instance not available');
      return;
    }
    
    try {
      const expansionZoom = Math.min(
        clusterInstance.getClusterExpansionZoom(clusterId),
        CLUSTER_CONFIG.expansionMaxZoom
      );
      
      setViewState(prev => ({
        ...prev,
        longitude,
        latitude,
        zoom: expansionZoom,
        transitionDuration: DIRECTORY_MAP.TRANSITION_DURATION
      }));
    } catch (error) {
      logger.error('Error expanding cluster', error);
      // Fallback: just zoom in two levels
      setViewState(prev => ({
        ...prev,
        longitude,
        latitude,
        zoom: Math.min(prev.zoom + 2, CLUSTER_CONFIG.expansionMaxZoom),
        transitionDuration: DIRECTORY_MAP.TRANSITION_DURATION
      }));
    }
  }, [clusterInstance]);

  // Update map bounds helper - with validation
  const updateMapBounds = useCallback(() => {
    if (!mapRef.current) return;
    
    try {
      const map = mapRef.current.getMap();
      if (!map || !map.getBounds) return;
      
      const bounds = map.getBounds();
      const north = bounds.getNorth();
      const south = bounds.getSouth();
      const east = bounds.getEast();
      const west = bounds.getWest();
      
      // Validate bounds
      if (north <= south || east <= west) {
        if (process.env.NODE_ENV === 'development') {
          logger.debug('Invalid map bounds', { north, south, east, west });
        }
        return;
      }
      
      // Validate bounds are within valid lat/lng ranges
      if (north > 90 || south < -90 || east > 180 || west < -180) {
        if (process.env.NODE_ENV === 'development') {
          logger.debug('Bounds outside valid range', { north, south, east, west });
        }
        return;
      }
      
      setMapBounds({ north, south, east, west });
    } catch (error) {
      // Map might not be fully initialized yet
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Error getting map bounds', { error: String(error) });
      }
    }
  }, []);

  // Handle map movement - just update viewState
  const handleMapMove = useCallback((evt: any) => {
    if (evt.viewState) {
      setViewState(evt.viewState);
    }
  }, []);

  // Handle map movement end - update bounds on move end (debounced naturally)
  const handleMapMoveEnd = useCallback(() => {
    updateMapBounds();
    setShowSearchThisArea(true);
  }, [updateMapBounds]);

  // Set initial map bounds when map loads
  const handleMapLoad = useCallback(() => {
    updateMapBounds();
  }, [updateMapBounds]);

  // Search current map area
  const searchThisArea = useCallback(() => {
    setShowSearchThisArea(false);
  }, []);

  // Use current location - with comprehensive error handling
  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setNotification({
        type: 'error',
        message: 'Geolocation is not supported by your browser'
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    // Show loading indicator
    setNotification({
      type: 'info',
      message: 'Getting your location...'
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setViewState(prev => ({
          ...prev,
          longitude,
          latitude,
          zoom: DIRECTORY_MAP.GEOLOCATION_ZOOM,
          transitionDuration: DIRECTORY_MAP.TRANSITION_DURATION
        }));
        setNotification({
          type: 'success',
          message: 'Location found!'
        });
        setTimeout(() => setNotification(null), 2000);
      },
      (error) => {
        logger.error("Error getting location", error);
        let message = 'Unable to get your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable location access in your browser.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }
        
        setNotification({
          type: 'error',
          message
        });
        setTimeout(() => setNotification(null), 4000);
      }
    );
  }, []);

  // Automatically fit map to filtered bookshops when filters change
  useEffect(() => {
    // Don't try to fit if still loading or no bookshops
    if (isLoading || !mapRef.current || !mapboxToken || filteredBookshops.length === 0) return;

    // Get all bookshops with valid coordinates
    const bookshopsWithCoords = filteredBookshops.filter(b => {
      const lat = b.latitude ? parseFloat(b.latitude) : null;
      const lon = b.longitude ? parseFloat(b.longitude) : null;
      return lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon);
    });

    if (bookshopsWithCoords.length === 0) return;

    const hasActiveFilters = 
      selectedState !== "all" || 
      selectedCity !== "all" ||
      selectedCounty !== "all" ||
      selectedFeatures.length > 0 || 
      searchQuery.length > 0;
    const shouldFitAllBookshops = !hasActiveFilters && !hasFitInitialView;
    if (!hasActiveFilters && hasFitInitialView) return;

    try {
      const map = mapRef.current.getMap();
      if (!map || !map.fitBounds) return;

      // Calculate bounds of all filtered bookshops
      const lngs = bookshopsWithCoords.map(b => parseFloat(b.longitude!));
      const lats = bookshopsWithCoords.map(b => parseFloat(b.latitude!));

      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);

      // Check for zero-width bounds
      const lngSpan = maxLng - minLng;
      const latSpan = maxLat - minLat;

      // Add padding (10% on each side, with minimum span to prevent zero-width)
      const lngPadding = Math.max(lngSpan * DIRECTORY_MAP.BOUNDS_PADDING_PERCENT, DIRECTORY_MAP.MINIMUM_BOUNDS_SPAN);
      const latPadding = Math.max(latSpan * DIRECTORY_MAP.BOUNDS_PADDING_PERCENT, DIRECTORY_MAP.MINIMUM_BOUNDS_SPAN);

      const bounds: [[number, number], [number, number]] = [
        [minLng - lngPadding, minLat - latPadding],
        [maxLng + lngPadding, maxLat + latPadding]
      ];

      // Fit map to bounds with animation
      map.fitBounds(bounds, {
        padding: { 
          top: DIRECTORY_MAP.BOUNDS_PADDING.top, 
          bottom: DIRECTORY_MAP.BOUNDS_PADDING.bottom, 
          left: isPanelCollapsed 
            ? DIRECTORY_MAP.BOUNDS_PADDING.left.collapsed 
            : DIRECTORY_MAP.BOUNDS_PADDING.left.expanded,
          right: DIRECTORY_MAP.BOUNDS_PADDING.right 
        },
        duration: DIRECTORY_MAP.TRANSITION_DURATION,
        maxZoom: DIRECTORY_MAP.MAX_AUTO_ZOOM
      });
      
      if (shouldFitAllBookshops) {
        setHasFitInitialView(true);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Error fitting map bounds', { error: String(error) });
      }
    }
  }, [selectedState, selectedCity, selectedCounty, selectedFeatures, searchQuery, isPanelCollapsed, isLoading, mapboxToken, filteredBookshops.length, hasFitInitialView]);

  return (
    <>
      {/* SEO Component */}
      <SEO 
        title="Find Independent Bookshops | Directory of 2,000+ Indie Bookstores"
        description="Search our comprehensive directory of independent bookshops across America. Find indie bookstores by location, features, and more."
        keywords={["independent bookshop directory", "find indie bookstores", "local bookshop finder", "indie bookstore map"]}
        canonicalUrl={`${BASE_URL}/directory`}
      />

      {/* Full-Screen Map Container */}
      <div className="relative h-[calc(100vh-64px)]">
        {/* Notification Toast */}
        {notification && (
          <div className={`absolute top-24 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full shadow-lg font-sans text-sm font-semibold transition-opacity ${
            notification.type === 'error' ? 'bg-red-500 text-white' :
            notification.type === 'success' ? 'bg-green-500 text-white' :
            'bg-[#2A6B7C] text-white'
          }`}>
            {notification.message}
          </div>
        )}

        {/* Mapbox Map with Error Boundary */}
        {mapboxToken ? (
          <MapErrorBoundary>
            <Map
              ref={mapRef as any}
              {...viewState}
              onMove={handleMapMove}
              onMoveEnd={handleMapMoveEnd}
              onLoad={handleMapLoad}
              mapboxAccessToken={mapboxToken}
              mapStyle="mapbox://styles/mapbox/streets-v12"
              style={{ width: "100%", height: "100%" }}
            >
              {/* Navigation controls */}
              <NavigationControl position="bottom-right" />

              {/* Render clusters and individual pins */}
              {clusters.map((cluster: any) => {
                const [longitude, latitude] = cluster.geometry.coordinates;
                const { cluster: isCluster, point_count: pointCount, bookshopId, bookshop } = cluster.properties;

                if (isCluster) {
                  // Cluster Marker
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
                      <ClusterMarker pointCount={pointCount} />
                    </Marker>
                  );
                }

                // Individual Bookshop Pin
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
                    <BookshopPin
                      isHovered={isHovered}
                      isSelected={isSelected}
                      bookshop={bookshop}
                    />
                  </Marker>
                );
              })}
            </Map>
          </MapErrorBoundary>
        ) : (
          <div className="flex items-center justify-center h-full bg-white/80 backdrop-blur-sm">
            <div className="text-center">
              <Loader2 className="w-8 h-8 mx-auto text-[#2A6B7C] animate-spin mb-3" />
              <p className="font-sans text-sm text-gray-600">
                Loading map configuration...
              </p>
            </div>
          </div>
        )}

        {/* Floating Search Bar (Top Center) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-xl px-4">
          <div className="relative bg-white rounded-full shadow-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search state, city, or bookshop name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 font-sans text-base rounded-full border-0 focus:ring-2 focus:ring-[#2A6B7C]"
            />
          </div>
        </div>

        {/* Use My Location Button (Top Right) */}
        <div className="absolute top-4 right-4 z-10">
          <Button
            onClick={useMyLocation}
            className="bg-white hover:bg-gray-50 text-gray-700 rounded-full shadow-lg"
            size="icon"
            title="Use my location"
          >
            <Crosshair className="w-5 h-5" />
          </Button>
        </div>

        {/* Search This Area Button (Dynamic) */}
        {showSearchThisArea && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
            <Button
              onClick={searchThisArea}
              className="bg-[#2A6B7C] hover:bg-[#1d5a6a] text-white rounded-full shadow-lg px-6 py-3 font-sans font-semibold"
            >
              <Search className="w-4 h-4 mr-2" />
              Search this area
            </Button>
          </div>
        )}

        {/* Desktop Sliding Panel */}
        <div
          className={`hidden md:block absolute top-0 left-0 h-full bg-white shadow-2xl transition-all duration-300 z-20 ${
            isPanelCollapsed ? PANEL_CONFIG.collapsed.widthClass : PANEL_CONFIG.expanded.widthClass
          }`}
        >
          {isPanelCollapsed ? (
            /* Collapsed State - Vertical Design on Left Edge */
            <div className="relative h-full w-16 bg-white border-r-2 border-gray-200">
              {/* Expand button centered vertically */}
              <button
                onClick={() => setIsPanelCollapsed(false)}
                className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 p-2 bg-white hover:bg-gray-50 rounded-full border-2 border-gray-300 shadow-lg transition-all hover:scale-110 z-30"
                title="Expand panel"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
              
              {/* Vertical content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 py-8">
                {/* Bookshop count - vertical */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 bg-[#5F4B32] rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="writing-mode-vertical text-center">
                    <span className="font-sans text-sm font-bold text-[#5F4B32] whitespace-nowrap transform -rotate-180" style={{ writingMode: 'vertical-rl' }}>
                      {visibleBookshops.length} shops
                    </span>
                  </div>
                </div>
                
                {/* Filter indicator if active */}
                {activeFilterCount > 0 && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 bg-[#E16D3D] rounded-full flex items-center justify-center">
                      <span className="font-sans text-xs font-bold text-white">
                        {activeFilterCount}
                      </span>
                    </div>
                    <div className="writing-mode-vertical text-center">
                      <span className="font-sans text-xs text-gray-600 whitespace-nowrap transform -rotate-180" style={{ writingMode: 'vertical-rl' }}>
                        filters
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Expanded State */
            <div className="h-full flex flex-col relative">
              {/* Collapse button on right edge, centered vertically */}
              <button
                onClick={() => setIsPanelCollapsed(true)}
                className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 p-2 bg-white hover:bg-gray-50 rounded-full border-2 border-gray-300 shadow-lg transition-all hover:scale-110 z-30"
                title="Collapse panel"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
              
              {/* Panel Header */}
              <div className="flex-shrink-0 p-4 md:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  {/* Bookshop count - COMMENTED OUT: Suppressed per request */}
                  {/* <h2 className="font-serif text-xl md:text-2xl font-bold text-[#5F4B32]">
                    {visibleBookshops.length} bookshops
                  </h2> */}
                </div>

                {/* Location Filters */}
                <div className="space-y-3">
                  <h3 className="font-sans text-sm font-semibold text-gray-700 mb-2">
                    Location
                  </h3>
                  
                  {/* State Filter */}
                  <div className="relative">
                    <select
                      value={selectedState}
                      onChange={(e) => {
                        setSelectedState(e.target.value);
                        // Reset city/county when state changes
                        if (e.target.value === "all") {
                          setSelectedCity("all");
                          setSelectedCounty("all");
                        }
                      }}
                      className="appearance-none w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-10 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#2A6B7C]"
                    >
                      <option value="all">All States</option>
                      {states.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>

                  {/* City Filter */}
                  <div className="relative">
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      disabled={cities.length === 0}
                      className={`appearance-none w-full border rounded-lg px-3 py-2 pr-10 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#2A6B7C] ${
                        cities.length === 0 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-gray-50 text-gray-900'
                      }`}
                    >
                      <option value="all">
                        {selectedState === "all" 
                          ? "Select a state first" 
                          : cities.length === 0 
                          ? "No cities available"
                          : "All Cities"
                        }
                      </option>
                      {cities.map(city => (
                        <option key={city} value={city}>
                          {city.replace(LOCATION_DELIMITER, ", ")}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>

                  {/* County Filter */}
                  <div className="relative">
                    <select
                      value={selectedCounty}
                      onChange={(e) => setSelectedCounty(e.target.value)}
                      disabled={counties.length === 0}
                      className={`appearance-none w-full border rounded-lg px-3 py-2 pr-10 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#2A6B7C] ${
                        counties.length === 0 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-gray-50 text-gray-900'
                      }`}
                    >
                      <option value="all">
                        {selectedState === "all" 
                          ? "Select a state first" 
                          : counties.length === 0 
                          ? "No counties available"
                          : "All Counties"
                        }
                      </option>
                      {counties.map(county => (
                        <option key={county} value={county}>
                          {county.replace(LOCATION_DELIMITER, ", ")}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>

                  {/* Feature Filters Toggle - COMMENTED OUT: Not ready yet */}
                  {/* <div className="pt-2">
                    <h3 className="font-sans text-sm font-semibold text-gray-700 mb-2">
                      Features
                    </h3>
                    <Button
                      variant="outline"
                      onClick={() => setShowFilters(!showFilters)}
                      className="w-full justify-start relative rounded-lg font-sans"
                      size="sm"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      <span className="font-sans">
                        {selectedFeatures.length > 0 
                          ? `${selectedFeatures.length} selected`
                          : "Select features"
                        }
                      </span>
                      {selectedFeatures.length > 0 && (
                        <span className="ml-auto bg-[#E16D3D] text-white text-xs rounded-full px-2 py-0.5 font-sans font-semibold">
                          {selectedFeatures.length}
                        </span>
                      )}
                      <ChevronDown className={`ml-2 w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </Button>
                  </div> */}

                  {/* Advanced Filters (Collapsible) - COMMENTED OUT: Not ready yet */}
                  {/* {showFilters && (
                    <div className="space-y-2">
                      {features.map(feature => (
                        <button
                          key={feature.id}
                          onClick={() => toggleFeature(feature.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-sans font-medium transition-colors ${
                            selectedFeatures.includes(feature.id)
                              ? "bg-[#2A6B7C] text-white"
                              : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {feature.name}
                        </button>
                      ))}
                    </div>
                  )} */}

                  {/* Clear Filters */}
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="w-full font-sans text-sm text-[#2A6B7C] hover:underline flex items-center justify-center gap-1 py-1"
                    >
                      <X className="w-4 h-4" />
                      Clear all filters
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Card List */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="p-6 text-center">
                    <Loader2 className="w-8 h-8 mx-auto text-[#2A6B7C] animate-spin mb-3" />
                    <p className="font-sans text-sm text-gray-600">Loading bookshops...</p>
                  </div>
                ) : visibleBookshops.length > 0 ? (
                  <div className="p-4 space-y-3">
                    {visibleBookshops.map(bookshop => (
                      <PanelBookshopCard
                        key={bookshop.id}
                        bookshop={bookshop}
                        isHovered={hoveredBookshopId === bookshop.id}
                        isSelected={selectedBookshopId === bookshop.id}
                        onHover={handleCardHover}
                        onClick={() => handlePinClick(bookshop.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <h3 className="font-serif text-lg font-bold text-gray-700 mb-2">
                      No bookshops found
                    </h3>
                    <p className="font-sans text-sm text-gray-600 mb-4">
                      Try adjusting your filters or search in a different area
                    </p>
                    {activeFilterCount > 0 && (
                      <Button
                        onClick={clearFilters}
                        variant="outline"
                        size="sm"
                        className="rounded-full font-sans"
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile View Container */}
        <div className="md:hidden fixed inset-0 top-0 z-30 flex flex-col bg-white pt-16">
          {/* Mobile Header with Search and View Toggle */}
          <div className="flex-shrink-0 px-4 pt-4 pb-2 bg-white border-b border-gray-200">
            {/* Search Bar */}
            <div className="relative bg-white rounded-full shadow-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search bookshops..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 font-sans text-sm rounded-full border-2 border-gray-200 focus:ring-2 focus:ring-[#2A6B7C] focus:border-transparent"
              />
            </div>

            {/* View Toggle */}
            <MobileViewToggle
              viewMode={mobileViewMode}
              onViewModeChange={setMobileViewMode}
            />
          </div>

          {/* Filter Bar */}
          <MobileFilterBar
            activeFilterCount={activeFilterCount}
            resultCount={visibleBookshops.length}
            onOpenFilters={() => setShowMobileFilters(true)}
          />

          {/* Content Area - List or Map */}
          <div className="flex-1 overflow-hidden">
            {mobileViewMode === "list" ? (
              <MobileListView
                bookshops={visibleBookshops}
                isLoading={isLoading}
                activeFilterCount={activeFilterCount}
                onClearFilters={clearFilters}
                selectedBookshopId={selectedBookshopId}
                onBookshopClick={handlePinClick}
                onMapThumbnailClick={() => setMobileViewMode("map")}
              />
            ) : (
              <MobileMapView
                bookshops={visibleBookshops}
                selectedBookshopId={selectedBookshopId}
                onBookshopSelect={setSelectedBookshopId}
              >
                <MapErrorBoundary>
                  <Map
                    ref={mapRef as any}
                    {...viewState}
                    onMove={handleMapMove}
                    onMoveEnd={handleMapMoveEnd}
                    onLoad={handleMapLoad}
                    mapboxAccessToken={mapboxToken || undefined}
                    mapStyle="mapbox://styles/mapbox/streets-v12"
                    style={{ width: "100%", height: "100%" }}
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
                            <ClusterMarker pointCount={pointCount} />
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
                          <BookshopPin
                            isHovered={isHovered}
                            isSelected={isSelected}
                            bookshop={bookshop}
                          />
                        </Marker>
                      );
                    })}
                  </Map>
                </MapErrorBoundary>
              </MobileMapView>
            )}
          </div>

          {/* Mobile Filter Drawer */}
          <MobileFilterDrawer
            isOpen={showMobileFilters}
            onClose={() => setShowMobileFilters(false)}
            selectedState={selectedState}
            onStateChange={setSelectedState}
            states={states}
            selectedCity={selectedCity}
            onCityChange={setSelectedCity}
            cities={cities}
            selectedCounty={selectedCounty}
            onCountyChange={setSelectedCounty}
            counties={counties}
            activeFilterCount={activeFilterCount}
            onClearAll={clearFilters}
            resultCount={filteredBookshops.length}
          />
        </div>
      </div>
    </>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Cluster Marker Component
const ClusterMarker: React.FC<{ pointCount: number }> = ({ pointCount }) => {
  // Calculate cluster size based on point count
  const size = pointCount < 10 ? 40 : pointCount < 50 ? 50 : pointCount < 100 ? 60 : 70;
  
  return (
    <div className="relative cursor-pointer">
      {/* Outer ring (pulsing effect) */}
      <div 
        className="absolute inset-0 bg-[#2A6B7C] rounded-full opacity-20 animate-ping"
        style={{ width: size, height: size }}
      />
      
      {/* Main cluster circle */}
      <div 
        className="relative bg-[#2A6B7C] rounded-full flex items-center justify-center shadow-lg hover:bg-[#1d5a6a] transition-colors"
        style={{ width: size, height: size }}
      >
        <span className="font-sans font-bold text-white" style={{ fontSize: pointCount < 10 ? '14px' : '16px' }}>
          {pointCount}
        </span>
      </div>
      
      {/* Outer border ring */}
      <div 
        className="absolute inset-0 border-3 border-[#2A6B7C] border-opacity-30 rounded-full pointer-events-none"
        style={{ width: size + 8, height: size + 8, left: -4, top: -4 }}
      />
    </div>
  );
};

// Bookshop Pin Component (Classic Map Pin Style)
const BookshopPin: React.FC<{
  isHovered: boolean;
  isSelected: boolean;
  bookshop: Bookstore;
}> = ({ isHovered, isSelected, bookshop }) => {
  return (
    <div className="relative">
      {/* Classic pin shape */}
      <svg
        width="36"
        height="44"
        viewBox="0 0 36 44"
        className={`cursor-pointer transition-transform drop-shadow-lg ${
          isSelected
            ? "scale-125"
            : isHovered
            ? "scale-110"
            : "hover:scale-105"
        }`}
      >
        {/* Pin background */}
        <path
          d="M18 0C8.059 0 0 8.059 0 18c0 9.941 18 26 18 26s18-16.059 18-26C36 8.059 27.941 0 18 0z"
          fill={isSelected ? "#E16D3D" : isHovered ? "#2A6B7C" : "#5F4B32"}
          className="transition-colors duration-200"
        />
        
        {/* White circle background for icon */}
        <circle cx="18" cy="16" r="9" fill="white" />
        
        {/* Book icon */}
        <g transform="translate(12, 10)">
          <path
            d="M1 3.5v9A1.5 1.5 0 0 0 2.5 14h9V2h-9A1.5 1.5 0 0 0 1 3.5z"
            stroke={isSelected ? "#E16D3D" : isHovered ? "#2A6B7C" : "#5F4B32"}
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="11.5"
            y1="2"
            x2="11.5"
            y2="14"
            stroke={isSelected ? "#E16D3D" : isHovered ? "#2A6B7C" : "#5F4B32"}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
};

// Panel Bookshop Card (Compact for side panel)
interface PanelBookshopCardProps {
  bookshop: Bookstore;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (id: number | null) => void;
  onClick: () => void;
}

const PanelBookshopCard: React.FC<PanelBookshopCardProps> = ({ 
  bookshop, 
  isHovered, 
  isSelected,
  onHover,
  onClick
}) => {
  const slug = generateSlugFromName(bookshop.name);

  return (
    <div
      id={`bookshop-${bookshop.id}`}
      onMouseEnter={() => onHover(bookshop.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
      className={`bg-white border-2 rounded-lg p-3 md:p-4 cursor-pointer transition-all ${
        isSelected 
          ? "border-[#E16D3D] shadow-md" 
          : isHovered
          ? "border-[#2A6B7C] shadow-sm"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <h3 className="font-serif font-bold text-base text-[#5F4B32] mb-1 break-words line-clamp-1">
        {bookshop.name}
      </h3>
      
      {(bookshop.city || bookshop.state) && (
        <div className="flex items-start text-xs text-gray-600 mb-2">
          <MapPin className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
          <span className="font-sans line-clamp-1">
            {bookshop.city && `${bookshop.city}, `}
            {bookshop.state}
          </span>
        </div>
      )}

      {bookshop.description && (
        <p className="font-sans text-xs text-gray-700 line-clamp-2 mb-2">
          {bookshop.description}
        </p>
      )}

      <Link 
        to={`/bookshop/${slug}`}
        className="font-sans text-xs text-[#2A6B7C] hover:underline font-medium inline-block"
        onClick={(e) => e.stopPropagation()}
      >
        View details →
      </Link>
    </div>
  );
};

export default Directory;
