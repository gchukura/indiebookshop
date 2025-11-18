import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import BookshopCard from "@/components/BookshopCard";
import BookshopDetail from "@/components/BookshopDetail";
import MapboxMap from "@/components/MapboxMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bookstore } from "@shared/schema";
import { SEO } from "../components/SEO";
import { BASE_URL, MAIN_KEYWORDS } from "../lib/seo";
import { getFullStateName, stateMap, statesMatch } from "../lib/stateUtils";
import { Search, Map, List } from "lucide-react";

type FilterType = "state" | "city" | "county" | "";

const Directory = () => {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  
  // Get initial values from URL query parameters
  const stateFromUrl = searchParams.get("state") || "";
  const cityFromUrl = searchParams.get("city") || "";
  const countyFromUrl = searchParams.get("county") || "";
  const searchQuery = searchParams.get("search") || "";
  
  // Determine filter type from URL params
  const getFilterTypeFromUrl = (): FilterType => {
    if (countyFromUrl) return "county";
    if (cityFromUrl) return "city";
    if (stateFromUrl) return "state";
    return "";
  };
  
  // Component state
  const [filterType, setFilterType] = useState<FilterType>(getFilterTypeFromUrl());
  const [selectedState, setSelectedState] = useState<string>(stateFromUrl);
  const [selectedCity, setSelectedCity] = useState<string>(cityFromUrl);
  const [selectedCounty, setSelectedCounty] = useState<string>(countyFromUrl);
  
  // Update filterType when URL params change (for initial load)
  useEffect(() => {
    const newFilterType = getFilterTypeFromUrl();
    if (newFilterType !== filterType) {
      setFilterType(newFilterType);
    }
  }, [stateFromUrl, cityFromUrl, countyFromUrl, filterType]);
  const [searchQueryState, setSearchQueryState] = useState<string>(searchQuery);
  const [bookshops, setBookshops] = useState<Bookstore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [selectedBookshopId, setSelectedBookshopId] = useState<number | null>(null);
  const [highlightedBookshopId, setHighlightedBookshopId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [showMapMobile, setShowMapMobile] = useState<boolean>(false);
  const [locationRequested, setLocationRequested] = useState<boolean>(false);
  
  // State name for display
  const [stateName, setStateName] = useState<string>(stateFromUrl ? getFullStateName(stateFromUrl) : "");
  
  // Calculate distance between two coordinates using Haversine formula (returns miles)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  
  // Reverse geocode coordinates to city/state using Mapbox Geocoding API
  const reverseGeocode = async (latitude: number, longitude: number): Promise<{ city: string | null; state: string | null }> => {
    try {
      const configResponse = await fetch('/api/config');
      const config = await configResponse.json();
      const accessToken = config.mapboxAccessToken;
      
      if (!accessToken) {
        return { city: null, state: null };
      }
      
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${accessToken}&types=place&limit=5`
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Mapbox reverse geocoding error:', response.status, errorData);
        return { city: null, state: null };
      }
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const placeFeatures = data.features.filter((feature: any) => 
          feature.place_type?.includes('place') || 
          feature.place_type?.includes('locality') ||
          feature.place_type?.includes('neighborhood')
        );
        
        for (const feature of placeFeatures.length > 0 ? placeFeatures : data.features) {
          const context = feature.context || [];
          const city = feature.text || feature.properties?.name || null;
          let state = null;
          const regionContext = context.find((ctx: any) => 
            ctx.id?.startsWith('region') || ctx.id?.startsWith('province')
          );
          
          if (regionContext) {
            const shortCode = regionContext.short_code;
            if (shortCode && shortCode.includes('-')) {
              state = shortCode.split('-')[1]?.toUpperCase() || null;
            } else {
              state = shortCode?.toUpperCase() || regionContext.text || null;
            }
          }
          
          if (city && state) {
            return { city, state };
          }
        }
        
        // Fallback: try to extract from any feature's context
        for (const feature of data.features) {
          const context = feature.context || [];
          const regionContext = context.find((ctx: any) => 
            ctx.id?.startsWith('region') || ctx.id?.startsWith('province')
          );
          
          if (regionContext) {
            const shortCode = regionContext.short_code;
            let state = null;
            if (shortCode && shortCode.includes('-')) {
              state = shortCode.split('-')[1]?.toUpperCase() || null;
            } else {
              state = shortCode?.toUpperCase() || regionContext.text || null;
            }
            
            const placeFeature = data.features.find((f: any) => 
              f.place_type?.includes('place') || f.place_type?.includes('locality')
            );
            
            if (placeFeature && state) {
              const city = placeFeature.text || placeFeature.properties?.name || null;
              if (city) {
                return { city, state };
              }
            }
          }
        }
      }
      
      return { city: null, state: null };
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return { city: null, state: null };
    }
  };
  
  // Get user location from browser and set default city/state
  useEffect(() => {
    console.log('Geolocation useEffect running:', { 
      filterType, 
      stateFromUrl, 
      cityFromUrl, 
      countyFromUrl,
      locationRequested, 
      hasGeolocation: !!navigator.geolocation 
    });
    
    // Only request location if no URL params are set and we haven't requested it yet
    const hasUrlParams = !!(stateFromUrl || cityFromUrl || countyFromUrl);
    
    if (hasUrlParams || locationRequested || !navigator.geolocation) {
      if (hasUrlParams) {
        console.log('URL params detected, skipping geolocation');
      }
      if (!hasUrlParams && !navigator.geolocation) {
        console.log('Geolocation not available in this browser');
      }
      if (locationRequested) {
        console.log('Location already requested, skipping');
      }
      if (!hasUrlParams && !locationRequested) {
        setIsLoading(false);
      }
      return;
    }
    
    // Check sessionStorage first
    const cachedLocation = sessionStorage.getItem('userLocation');
    console.log('Checking sessionStorage:', { cachedLocation });
    if (cachedLocation) {
      try {
        const { city, state } = JSON.parse(cachedLocation);
        if (city && state) {
          fetch(`/api/states/${state}/cities`)
            .then(res => res.ok ? res.json() : [])
            .then(cities => {
              const matchingCity = cities.find((c: string) => 
                c.toLowerCase() === city.toLowerCase()
              );
              
              if (matchingCity) {
                setFilterType('city');
                setSelectedState(state);
                setSelectedCity(matchingCity);
              } else {
                sessionStorage.removeItem('userLocation');
                setIsLoading(false);
              }
            })
            .catch(() => setIsLoading(false));
          return;
        }
      } catch (error) {
        sessionStorage.removeItem('userLocation');
      }
    }
    
    const locationDenied = sessionStorage.getItem('locationDenied');
    console.log('Checking locationDenied flag:', locationDenied);
    if (locationDenied === 'true') {
      console.log('Location previously denied, skipping');
      setIsLoading(false);
      return;
    }
    
    console.log('Requesting browser geolocation...');
    setLocationRequested(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log('Geolocation successful! Coordinates:', { latitude, longitude });
        console.log('Starting reverse geocoding...');
        const { city, state } = await reverseGeocode(latitude, longitude);
        console.log('Reverse geocoding result:', { city, state });
        
        if (city && state) {
          console.log(`Found city: ${city}, state: ${state}. Checking if it exists in database...`);
          const citiesResponse = await fetch(`/api/states/${state}/cities`);
          if (citiesResponse.ok) {
            const cities = await citiesResponse.json();
            console.log(`Cities in ${state}:`, cities);
            const matchingCity = cities.find((c: string) => 
              c.toLowerCase() === city.toLowerCase()
            );
            
            if (matchingCity) {
              console.log(`City "${matchingCity}" found in database! Setting filters...`);
              sessionStorage.setItem('userLocation', JSON.stringify({ city: matchingCity, state }));
              setFilterType('city');
              setSelectedState(state);
              setSelectedCity(matchingCity);
            } else {
              console.log(`City "${city}" not found in database for state ${state}. Available cities:`, cities);
              console.log('Falling back to nearest bookshop...');
              // Fallback to nearest bookshop
              const allBookshopsResponse = await fetch(`/api/bookstores/filter?state=${encodeURIComponent(state)}`);
              if (allBookshopsResponse.ok) {
                const allBookshops = await allBookshopsResponse.json();
                const bookshopsWithDistance = allBookshops
                  .filter((b: Bookstore) => b.latitude && b.longitude)
                  .map((b: Bookstore) => {
                    const lat = parseFloat(b.latitude || '0');
                    const lng = parseFloat(b.longitude || '0');
                    const distance = calculateDistance(latitude, longitude, lat, lng);
                    return { ...b, distance };
                  })
                  .sort((a: any, b: any) => a.distance - b.distance);
                
                if (bookshopsWithDistance.length > 0) {
                  const nearestBookshop = bookshopsWithDistance[0];
                  console.log(`Nearest bookshop found: ${nearestBookshop.city}, ${state} (${nearestBookshop.distance.toFixed(2)} miles away)`);
                  sessionStorage.setItem('userLocation', JSON.stringify({ city: nearestBookshop.city, state }));
                  setFilterType('city');
                  setSelectedState(state);
                  setSelectedCity(nearestBookshop.city);
                } else {
                  console.log('No bookshops found in state');
                  setIsLoading(false);
                }
              } else {
                console.log('Failed to fetch bookshops for fallback');
                setIsLoading(false);
              }
            }
          } else {
            console.log('Failed to fetch cities');
            setIsLoading(false);
          }
        } else {
          console.log('No city/state from reverse geocoding');
          setIsLoading(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        if (error.code === 1) {
          console.log('User denied location access');
          sessionStorage.setItem('locationDenied', 'true');
        }
        setIsLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }, [stateFromUrl, cityFromUrl, countyFromUrl, locationRequested]);
  
  // Fetch states for dropdown
  const { data: statesData } = useQuery<string[]>({
    queryKey: ["/api/states"],
    queryFn: async () => {
      const response = await fetch("/api/states");
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limit hit on /api/states, using cached data if available');
        }
        return [];
      }
      return response.json();
    },
    staleTime: Infinity,
    retry: false,
  });
  
  // Fetch cities - filter by state if selected
  const { data: citiesData } = useQuery<string[]>({
    queryKey: selectedState ? ["/api/states", selectedState, "cities"] : ["/api/cities"],
    queryFn: async () => {
      if (selectedState) {
        const response = await fetch(`/api/states/${selectedState}/cities`);
        if (!response.ok) {
          if (response.status === 429) {
            console.warn('Rate limit hit on cities endpoint, using cached data if available');
          }
          return [];
        }
        return response.json();
      } else {
        const response = await fetch("/api/cities");
        if (!response.ok) {
          if (response.status === 429) {
            console.warn('Rate limit hit on cities endpoint, using cached data if available');
          }
          return [];
        }
        return response.json();
      }
    },
    enabled: filterType === "city" && !!selectedState,
    staleTime: Infinity,
    retry: false,
  });
  
  // Fetch counties - filter by state if selected
  const { data: countiesData } = useQuery<string[]>({
    queryKey: selectedState ? ["/api/states", selectedState, "counties"] : ["/api/counties"],
    queryFn: async () => {
      if (selectedState) {
        const response = await fetch(`/api/states/${selectedState}/counties`);
        if (!response.ok) {
          if (response.status === 429) {
            console.warn('Rate limit hit on counties endpoint, using cached data if available');
          }
          return [];
        }
        return response.json();
      } else {
        const response = await fetch("/api/counties");
        if (!response.ok) {
          if (response.status === 429) {
            console.warn('Rate limit hit on counties endpoint, using cached data if available');
          }
          return [];
        }
        return response.json();
      }
    },
    enabled: filterType === "county" && !!selectedState,
    staleTime: Infinity,
    retry: false,
  });
  
  // Fetch bookshops based on filters
  useEffect(() => {
    const fetchBookshops = async () => {
      // Only fetch if we have a filter type selected, or if we're waiting for geolocation
      if (!filterType && locationRequested) {
        setIsLoading(false);
        return;
      }
      
      if (!filterType) {
        setBookshops([]);
        return;
      }
      
      setIsLoading(true);
      setIsError(false);
      
      try {
        let endpoint = '/api/bookstores/filter?';
        const params = new URLSearchParams();
        
        if (selectedState) params.append('state', selectedState);
        if (selectedCity) params.append('city', selectedCity);
        if (selectedCounty) params.append('county', selectedCounty);
        
        endpoint += params.toString();
        
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setBookshops(data);
        
        if (data.length > 0 && data[0].state) {
          const fullStateName = getFullStateName(data[0].state);
          setStateName(prev => prev || fullStateName);
        }
      } catch (error) {
        console.error('Error fetching bookshops:', error);
        if (error instanceof Error && error.message.includes('429')) {
          console.warn('Rate limit hit, please wait a moment before trying again');
        }
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBookshops();
  }, [filterType, selectedState, selectedCity, selectedCounty, locationRequested]);
  
  // Filter bookshops based on search query
  const filteredBookshops = useMemo(() => {
    if (!searchQueryState.trim()) {
      return bookshops;
    }
    
    const query = searchQueryState.toLowerCase();
    return bookshops.filter(bookshop =>
      bookshop.name.toLowerCase().includes(query) ||
      (bookshop.description && bookshop.description.toLowerCase().includes(query)) ||
      (bookshop.city && bookshop.city.toLowerCase().includes(query))
    );
  }, [bookshops, searchQueryState]);
  
  // Update URL when filters change
  useEffect(() => {
    const newParams = new URLSearchParams();
    
    if (searchQueryState) newParams.set('search', searchQueryState);
    if (selectedState) newParams.set('state', selectedState);
    if (selectedCity) newParams.set('city', selectedCity);
    if (selectedCounty) newParams.set('county', selectedCounty);
    
    const newSearch = newParams.toString();
    const newUrl = newSearch ? `/directory?${newSearch}` : '/directory';
    
    if (window.location.pathname + window.location.search !== newUrl) {
      setLocation(newUrl, { replace: true });
    }
  }, [selectedState, selectedCity, selectedCounty, searchQueryState, setLocation]);
  
  // Handle filter type change
  const handleFilterTypeChange = (type: string) => {
    const filterTypeValue = type === "all" ? "" : type as FilterType;
    setFilterType(filterTypeValue);
    // Clear filters when changing type
    setSelectedState("");
    setSelectedCity("");
    setSelectedCounty("");
  };
  
  // Handle state change
  const handleStateChange = (state: string) => {
    setSelectedState(state === "all" ? "" : state);
    // Clear city/county when state changes
    setSelectedCity("");
    setSelectedCounty("");
  };
  
  // Handle city change
  const handleCityChange = (city: string) => {
    setSelectedCity(city || "");
    setHighlightedBookshopId(null);
  };
  
  // Handle county change
  const handleCountyChange = (county: string) => {
    setSelectedCounty(county || "");
    setHighlightedBookshopId(null);
  };
  
  // Handle map marker click
  const handleMapMarkerClick = (id: number) => {
    setHighlightedBookshopId(id);
    setTimeout(() => {
      const cardElement = document.getElementById(`bookshop-card-${id}`);
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };
  
  // Handle showing bookshop details
  const handleShowDetails = (id: number) => {
    setHighlightedBookshopId(id);
    const bookshop = filteredBookshops.find(b => b.id === id);
    if (bookshop) {
      const slug = bookshop.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      setLocation(`/bookshop/${slug}`);
    }
  };
  
  // SEO metadata
  const seoTitle = useMemo(() => {
    if (searchQueryState) {
      return `Search Results for "${searchQueryState}" | Independent Bookshop Directory`;
    }
    if (selectedCounty && stateName) {
      return `Independent Bookshops in ${selectedCounty} County, ${stateName} | Local Bookshop Directory`;
    }
    if (selectedCity && stateName) {
      return `Independent Bookshops in ${selectedCity}, ${stateName} | Local Bookshop Directory`;
    }
    if (selectedState && stateName) {
      return `Independent Bookshops in ${stateName} | Find Local Bookstores`;
    }
    return "Independent Bookshop Directory | Find Local Indie Bookstores Near You";
  }, [searchQueryState, selectedCounty, selectedCity, selectedState, stateName]);
  
  const seoDescription = useMemo(() => {
    if (searchQueryState) {
      return `Browse search results for "${searchQueryState}" in our independent bookshop directory.`;
    }
    if (selectedCounty && stateName) {
      return `Discover independent bookshops in ${selectedCounty} County, ${stateName}. Browse our directory of local indie bookstores.`;
    }
    if (selectedCity && stateName) {
      return `Discover independent bookshops in ${selectedCity}, ${stateName}. Browse our directory of local indie bookstores.`;
    }
    if (selectedState && stateName) {
      return `Discover independent bookshops in ${stateName}. Browse our complete directory of local indie bookstores.`;
    }
    return "Browse our comprehensive directory of independent bookshops across America. Find local indie bookstores near you, view their locations on the map, and discover their unique offerings.";
  }, [searchQueryState, selectedCounty, selectedCity, selectedState, stateName]);
  
  const canonicalUrl = useMemo(() => {
    return `${BASE_URL}/directory`;
  }, []);
  
  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px]">
      <SEO 
        title={seoTitle}
        description={seoDescription}
        keywords={MAIN_KEYWORDS}
        canonicalUrl={canonicalUrl}
      />
      
      {/* Top Section: Search Bar and Filter Controls */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            {/* Search Bar */}
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search bookshops..."
                  value={searchQueryState}
                  onChange={(e) => setSearchQueryState(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>
            
            {/* Filter Type Dropdown */}
            <div className="w-full md:w-40">
              <Select value={filterType || "all"} onValueChange={handleFilterTypeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bookshops</SelectItem>
                  <SelectItem value="state">State</SelectItem>
                  <SelectItem value="city">City</SelectItem>
                  <SelectItem value="county">County</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* State Dropdown - shown for all filter types except when filterType is empty */}
            {filterType && (
              <div className="w-full md:w-48">
                <Select value={selectedState || "all"} onValueChange={handleStateChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {statesData && statesData.length > 0 ? (
                      statesData
                        .filter(state => state && state.trim() !== "" && state !== "#ERROR!")
                        .sort((a, b) => {
                          const nameA = stateMap[a] || a;
                          const nameB = stateMap[b] || b;
                          return nameA.localeCompare(nameB);
                        })
                        .map((state) => (
                          <SelectItem key={state} value={state}>
                            {stateMap[state] || state}
                          </SelectItem>
                        ))
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Show message when state is required for city/county but not selected */}
            {filterType === "city" && !selectedState && (
              <div className="w-full md:w-48 flex items-center text-sm text-gray-500">
                Select a state first
              </div>
            )}
            {filterType === "county" && !selectedState && (
              <div className="w-full md:w-48 flex items-center text-sm text-gray-500">
                Select a state first
              </div>
            )}
            
            {/* City Dropdown - shown when filter type is city */}
            {filterType === "city" && selectedState && (
              <div className="w-full md:w-48">
                <Select 
                  value={selectedCity || undefined} 
                  onValueChange={handleCityChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a city" />
                  </SelectTrigger>
                  <SelectContent>
                    {citiesData && citiesData.length > 0 ? (
                      citiesData
                        .filter(city => city && city.trim() !== "")
                        .sort()
                        .map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-gray-500">
                        No cities available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* County Dropdown - shown when filter type is county */}
            {filterType === "county" && selectedState && (
              <div className="w-full md:w-48">
                <Select 
                  value={selectedCounty || undefined} 
                  onValueChange={handleCountyChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a county" />
                  </SelectTrigger>
                  <SelectContent>
                    {countiesData && countiesData.length > 0 ? (
                      countiesData
                        .filter(county => county && county.trim() !== "")
                        .sort()
                        .map((county) => (
                          <SelectItem key={county} value={county}>
                            {county}
                          </SelectItem>
                        ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-gray-500">
                        No counties available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          {/* Results count and mobile map toggle */}
          <div className="mt-3 flex items-center justify-between">
            {filterType && (
              <div className="text-sm text-gray-600">
                {filteredBookshops.length} bookshop{filteredBookshops.length !== 1 ? 's' : ''} found
                {selectedCity && ` in ${selectedCity}`}
                {selectedCounty && ` in ${selectedCounty} County`}
                {selectedState && stateName && `, ${stateName}`}
              </div>
            )}
            {/* Mobile Map Toggle */}
            <Button
              variant="outline"
              size="sm"
              className="md:hidden"
              onClick={() => setShowMapMobile(!showMapMobile)}
            >
              {showMapMobile ? (
                <>
                  <List className="h-4 w-4 mr-2" />
                  List
                </>
              ) : (
                <>
                  <Map className="h-4 w-4 mr-2" />
                  Map
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Split View: List (Left) + Map (Right) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Column: Bookshop List */}
        <div className={`w-full md:w-1/2 lg:w-2/5 border-r border-gray-200 overflow-y-auto bg-gray-50 ${
          showMapMobile ? 'hidden' : 'block'
        } md:block`}>
          <div className="p-4">
            {!filterType ? (
              <div className="text-center py-20 text-gray-500">
                <p className="text-lg mb-2">Select a filter to view bookshops</p>
                <p className="text-sm">Choose State, City, or County from the dropdown above</p>
              </div>
            ) : isLoading ? (
              <div className="text-center py-20">
                <p>Loading bookshops...</p>
              </div>
            ) : isError ? (
              <div className="text-center py-20">
                <p className="text-red-600 mb-4">Error loading bookshops. Please try again later.</p>
                <Button 
                  onClick={() => window.location.reload()}
                  className="bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white"
                >
                  Retry
                </Button>
              </div>
            ) : filteredBookshops.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-600 mb-2">
                  {searchQueryState 
                    ? `No bookshops found matching "${searchQueryState}"`
                    : `No bookshops found${selectedCity ? ` in ${selectedCity}` : ''}${selectedCounty ? ` in ${selectedCounty} County` : ''}${selectedState && stateName ? `, ${stateName}` : ''}`
                  }
                </p>
                {searchQueryState && (
                  <Button 
                    onClick={() => setSearchQueryState('')}
                    variant="outline"
                    className="mt-4"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookshops.map((bookshop) => (
                  <BookshopCard
                    key={bookshop.id}
                    bookstore={bookshop}
                    showDetails={handleShowDetails}
                    isHighlighted={highlightedBookshopId === bookshop.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Map */}
        <div className={`w-full md:w-1/2 lg:w-3/5 bg-white ${
          showMapMobile ? 'block' : 'hidden'
        } md:flex`}>
          {filterType && filteredBookshops.length > 0 ? (
            <div className="w-full h-full">
              <MapboxMap 
                bookstores={filteredBookshops} 
                onSelectBookshop={handleMapMarkerClick}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <div className="text-center text-gray-500">
                <p className="text-lg mb-2">Map View</p>
                <p className="text-sm">
                  {!filterType 
                    ? "Select a filter to see bookshops on the map"
                    : "No bookshops to display on the map"
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bookshop Detail Modal */}
      {selectedBookshopId && (
        <BookshopDetail 
          bookshopId={selectedBookshopId} 
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
        />
      )}
    </div>
  );
};

export default Directory;
