import { useParams, Link, useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { Bookstore } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
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
import { SEO } from "../components/SEO";
import { 
  BASE_URL, 
  DESCRIPTION_TEMPLATES, 
  generateLocationKeywords,
  generateDescription 
} from "../lib/seo";
import { generateSlugFromName } from "../lib/linkUtils";
import { getFullStateName, stateMap } from "../lib/stateUtils";
import { Search, Map, List } from "lucide-react";

const CityDirectory = () => {
  // Get parameters from URL (for initial state)
  const params = useParams();
  const [_, navigate] = useLocation();
  
  // Handle all URL formats for initial load:
  // 1. /directory/city/:state/:city
  // 2. /directory/city/:city 
  // 3. /directory/city-state/:citystate
  
  // Extract city and state parameters from URL
  let initialCityParam = '';
  let initialStateParam = '';
  
  // Handle new format: /directory/city/:state/:city
  if (params.state && params.city) {
    initialStateParam = params.state;
    initialCityParam = params.city;
  }
  // Handle city-state combined format: /directory/city-state/:citystate
  else if (params.citystate) {
    const parts = params.citystate.split('-');
    if (parts.length >= 2) {
      initialStateParam = parts[parts.length - 1];
      initialCityParam = parts.slice(0, parts.length - 1).join('-');
    }
  }
  // Handle city-only format: /directory/city/:city
  else if (params.city) {
    initialCityParam = params.city;
  }
  
  // Convert slug to display name (Boston-ma → Boston)
  const cityFromUrl = initialCityParam
    ? initialCityParam.replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') 
    : '';
  
  // Standardize state parameter (works with both 'ma' and 'massachusetts')
  const stateFromUrl = initialStateParam ? initialStateParam.toUpperCase() : '';
  
  // Component state
  const [selectedCity, setSelectedCity] = useState<string>(cityFromUrl);
  const [selectedState, setSelectedState] = useState<string>(stateFromUrl);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bookshops, setBookshops] = useState<Bookstore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [selectedBookshopId, setSelectedBookshopId] = useState<number | null>(null);
  const [highlightedBookshopId, setHighlightedBookshopId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [showMapMobile, setShowMapMobile] = useState<boolean>(false);
  const [locationRequested, setLocationRequested] = useState<boolean>(false);
  
  // State name will be set once bookshops data is loaded
  const [stateName, setStateName] = useState(stateFromUrl ? getFullStateName(stateFromUrl) : '');
  
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
      // Get Mapbox access token
      const configResponse = await fetch('/api/config');
      const config = await configResponse.json();
      const accessToken = config.mapboxAccessToken;
      
      if (!accessToken) {
        return { city: null, state: null };
      }
      
      // Use Mapbox Geocoding API for reverse geocoding
      // Request multiple results to find the best city match
      // Note: Mapbox expects longitude,latitude (not latitude,longitude)
      // When using limit, must specify a single types parameter
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${accessToken}&types=place&limit=5`
      );
      
      if (!response.ok) {
        // Log error details for debugging
        const errorData = await response.json().catch(() => ({}));
        console.error('Mapbox reverse geocoding error:', response.status, errorData);
        return { city: null, state: null };
      }
      
      const data = await response.json();
      console.log('Mapbox reverse geocoding response:', data);
      
      if (data.features && data.features.length > 0) {
        console.log('Number of features returned:', data.features.length);
        // Filter for place/city features (place, locality, neighborhood)
        const placeFeatures = data.features.filter((feature: any) => 
          feature.place_type?.includes('place') || 
          feature.place_type?.includes('locality') ||
          feature.place_type?.includes('neighborhood')
        );
        console.log('Place features found:', placeFeatures.length);
        
        // Try to find a city/place feature with state context
        for (const feature of placeFeatures.length > 0 ? placeFeatures : data.features) {
          const context = feature.context || [];
          
          // Extract city name
          const city = feature.text || feature.properties?.name || null;
          
          // Extract state from context (region code)
          let state = null;
          const regionContext = context.find((ctx: any) => 
            ctx.id?.startsWith('region') || ctx.id?.startsWith('province')
          );
          
          if (regionContext) {
            // Mapbox returns state abbreviations in the short_code field for US states
            // Format: "US-XX" for US states, so we extract the XX part
            const shortCode = regionContext.short_code;
            if (shortCode && shortCode.includes('-')) {
              state = shortCode.split('-')[1]?.toUpperCase() || null;
            } else {
              state = shortCode?.toUpperCase() || regionContext.text || null;
            }
          }
          
          // Return the first result with both city and state
          if (city && state) {
            return { city, state };
          }
        }
        
        // If no perfect match, try to extract from any feature's context
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
            
            // Try to find a place feature in the results
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
    console.log('Geolocation useEffect running:', { cityFromUrl, locationRequested, hasGeolocation: !!navigator.geolocation });
    
    // Only request location if no city is selected and we haven't requested it yet
    if (cityFromUrl || locationRequested || !navigator.geolocation) {
      if (!cityFromUrl && !navigator.geolocation) {
        console.log('Geolocation not available in this browser');
      }
      if (cityFromUrl) {
        console.log('City from URL detected, skipping geolocation');
      }
      if (locationRequested) {
        console.log('Location already requested, skipping');
      }
      if (!cityFromUrl) {
        setIsLoading(false);
      }
      return;
    }
    
    // Check sessionStorage first to avoid repeated prompts
    const cachedLocation = sessionStorage.getItem('userLocation');
    console.log('Checking sessionStorage:', { cachedLocation });
    if (cachedLocation) {
      console.log('Using cached location from sessionStorage');
      try {
        const { city, state } = JSON.parse(cachedLocation);
        if (city && state) {
          // Verify the city still exists in our database
          fetch(`/api/states/${state}/cities`)
            .then(res => res.ok ? res.json() : [])
            .then(cities => {
              const matchingCity = cities.find((c: string) => 
                c.toLowerCase() === city.toLowerCase()
              );
              
              if (matchingCity) {
                setSelectedCity(matchingCity);
                setSelectedState(state);
              } else {
                // Cached city no longer exists, clear cache
                sessionStorage.removeItem('userLocation');
                setIsLoading(false);
              }
            })
            .catch(() => {
              setIsLoading(false);
            });
          return;
        }
      } catch (error) {
        // Invalid cache, remove it
        sessionStorage.removeItem('userLocation');
      }
    }
    
    // Check if user previously denied location access
    const locationDenied = sessionStorage.getItem('locationDenied');
    console.log('Checking locationDenied flag:', locationDenied);
    if (locationDenied === 'true') {
      console.log('Location access was previously denied - skipping geolocation request');
      setIsLoading(false);
      return;
    }
    
    console.log('Requesting browser geolocation...');
    setLocationRequested(true);
    
    const getLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log('Geolocation successful! Coordinates:', { latitude, longitude });
          
          // Reverse geocode to get city and state
          console.log('Starting reverse geocoding...');
          const { city, state } = await reverseGeocode(latitude, longitude);
          console.log('Reverse geocoding result:', { city, state });
          
          if (city && state) {
            console.log(`Found city: ${city}, state: ${state}. Checking if it exists in database...`);
            // Check if this city exists in our database
            const citiesResponse = await fetch(`/api/states/${state}/cities`);
            if (citiesResponse.ok) {
              const cities = await citiesResponse.json();
              console.log(`Cities in ${state}:`, cities.slice(0, 10)); // Log first 10 cities
              const matchingCity = cities.find((c: string) => 
                c.toLowerCase() === city.toLowerCase()
              );
              
              if (matchingCity) {
                console.log(`Match found! Setting city to: ${matchingCity}, state to: ${state}`);
                // Cache the location in sessionStorage for privacy
                sessionStorage.setItem('userLocation', JSON.stringify({ city: matchingCity, state }));
                setSelectedCity(matchingCity);
                setSelectedState(state);
              } else {
                console.log(`City "${city}" not found in database for state ${state}. Searching for nearest bookshop...`);
                // Fallback: Find nearest bookshop by coordinates
                try {
                  const allBookshopsResponse = await fetch(`/api/bookstores/filter?state=${encodeURIComponent(state)}`);
                  if (allBookshopsResponse.ok) {
                    const allBookshops = await allBookshopsResponse.json();
                    console.log(`Found ${allBookshops.length} bookshops in ${state}`);
                    
                    // Calculate distance to each bookshop and find the nearest
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
                      const nearestCity = nearestBookshop.city;
                      const distanceMiles = nearestBookshop.distance;
                      
                      console.log(`Nearest bookshop found: ${nearestBookshop.name} in ${nearestCity}, ${distanceMiles.toFixed(1)} miles away`);
                      
                      // Use the nearest city
                      sessionStorage.setItem('userLocation', JSON.stringify({ city: nearestCity, state }));
                      setSelectedCity(nearestCity);
                      setSelectedState(state);
                    } else {
                      console.log('No bookshops with coordinates found in state');
                      setIsLoading(false);
                    }
                  } else {
                    setIsLoading(false);
                  }
                } catch (error) {
                  console.error('Error finding nearest bookshop:', error);
                  setIsLoading(false);
                }
              }
            } else {
              console.error('Failed to fetch cities for state:', state);
              setIsLoading(false);
            }
          } else {
            console.log('Reverse geocoding did not return city and state');
            setIsLoading(false);
          }
        },
        (error) => {
          // User denied permission or location unavailable
          console.error('Geolocation error:', error.code, error.message);
          
          // Cache the denial to avoid repeated prompts during this session
          // error.code: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
          if (error.code === 1) {
            console.log('Permission denied - caching denial');
            sessionStorage.setItem('locationDenied', 'true');
          }
          
          setIsLoading(false);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000 // Cache for 5 minutes
        }
      );
    };
    
    getLocation();
  }, [cityFromUrl, locationRequested]);
  
  // Fetch cities for dropdown
  const { data: citiesData } = useQuery<string[]>({
    queryKey: selectedState ? ["/api/states", selectedState, "cities"] : ["/api/cities"],
    queryFn: async () => {
      if (selectedState) {
        const response = await fetch(`/api/states/${selectedState}/cities`);
        if (!response.ok) return [];
        return response.json();
      } else {
        const response = await fetch("/api/cities");
        if (!response.ok) return [];
        return response.json();
      }
    },
    enabled: true,
  });
  
  // Fetch states for dropdown
  const { data: statesData } = useQuery<string[]>({
    queryKey: ["/api/states"],
    queryFn: async () => {
      const response = await fetch("/api/states");
      if (!response.ok) return [];
      return response.json();
    },
  });
  
  // Fetch bookshops based on selected city
  useEffect(() => {
    const fetchBookshops = async () => {
      if (!selectedCity) {
        setBookshops([]);
        // Only set loading to false if we're not waiting for geolocation
        if (locationRequested || cityFromUrl) {
          setIsLoading(false);
        }
        return;
      }
      
      setIsLoading(true);
      setIsError(false);
      
      try {
        // Build the endpoint based on whether we have a state or just a city
        let endpoint = '';
        
        if (selectedState) {
          endpoint = `/api/bookstores/filter?city=${encodeURIComponent(selectedCity)}&state=${encodeURIComponent(selectedState)}`;
        } else {
          endpoint = `/api/bookstores/filter?city=${encodeURIComponent(selectedCity)}`;
        }
        
        // Fetch bookshops
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setBookshops(data);
        
        // If we don't have a state but have bookshops with state info,
        // use the state from the first bookshop to get the full state name
        if (data.length > 0 && data[0].state) {
          const bookshopState = data[0].state;
          const fullStateName = getFullStateName(bookshopState);
          setStateName(fullStateName);
          // Also update selectedState if it wasn't set
          if (!selectedState) {
            setSelectedState(bookshopState);
          }
        }
      } catch (error) {
        console.error('Error fetching bookshops:', error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBookshops();
  }, [selectedCity, selectedState, locationRequested, cityFromUrl]);
  
  // Filter bookshops based on search query
  const filteredBookshops = useMemo(() => {
    if (!searchQuery.trim()) {
      return bookshops;
    }
    
    const query = searchQuery.toLowerCase();
    return bookshops.filter(bookshop =>
      bookshop.name.toLowerCase().includes(query) ||
      (bookshop.description && bookshop.description.toLowerCase().includes(query)) ||
      (bookshop.city && bookshop.city.toLowerCase().includes(query))
    );
  }, [bookshops, searchQuery]);
  
  // Handle showing bookshop details
  const handleShowDetails = (id: number) => {
    setHighlightedBookshopId(id);
    // Find the bookshop by ID
    const bookshop = bookshops.find(b => b.id === id);
    
    if (bookshop) {
      // Navigate to the bookshop detail page using client-side navigation
      const slug = generateSlugFromName(bookshop.name);
      navigate(`/bookshop/${slug}`);
    }
  };
  
  // For optimized SEO titles and descriptions
  const seoTitle = useMemo(() => {
    return selectedState && stateName
      ? `Independent Bookshops in ${selectedCity}, ${stateName} | Local Bookshop Directory`
      : `Bookshops in ${selectedCity} | Find Local Independent Bookstores`;
  }, [selectedCity, stateName, selectedState]);
  
  const seoDescription = useMemo(() => {
    if (selectedState && stateName) {
      return generateDescription(
        DESCRIPTION_TEMPLATES.city_state,
        {
          city: selectedCity,
          state: stateName,
          bookshopCount: String(bookshops.length)
        }
      );
    } else {
      return generateDescription(
        DESCRIPTION_TEMPLATES.cities,
        {
          city: selectedCity,
          bookshopCount: String(bookshops.length)
        }
      );
    }
  }, [selectedCity, stateName, selectedState, bookshops.length]);
  
  const seoKeywords = useMemo(() => {
    const cityKeywords = [
      `bookshops in ${selectedCity}`,
      `independent bookstores ${selectedCity}`,
      `local bookshops ${selectedCity}`,
      `indie bookstores in ${selectedCity}`,
      `${selectedCity} bookstores`
    ];
    
    if (selectedState && stateName) {
      return [
        ...cityKeywords,
        `${selectedCity} ${stateName} bookstores`,
        `independent bookstores in ${selectedCity} ${stateName}`,
        `local bookshops ${stateName}`,
        `${stateName} bookshop directory`
      ];
    }
    
    return cityKeywords;
  }, [selectedCity, stateName, selectedState]);
  
  const canonicalUrl = useMemo(() => {
    if (selectedState) {
      const stateSlug = selectedState.toLowerCase();
      return `${BASE_URL}/directory/city/${stateSlug}/${generateSlugFromName(selectedCity)}`;
    }
    return `${BASE_URL}/directory/city/${generateSlugFromName(selectedCity)}`;
  }, [selectedCity, selectedState]);
  
  // Update URL when city/state changes
  useEffect(() => {
    if (!selectedCity) return;
    
    const stateSlug = selectedState ? selectedState.toLowerCase() : '';
    const citySlug = generateSlugFromName(selectedCity);
    
    let newUrl = '';
    if (selectedState) {
      newUrl = `/directory/city/${stateSlug}/${citySlug}`;
    } else {
      newUrl = `/directory/city/${citySlug}`;
    }
    
    // Only update URL if it's different from current location
    const currentPath = window.location.pathname;
    if (currentPath !== newUrl) {
      navigate(newUrl, { replace: true });
    }
  }, [selectedCity, selectedState, navigate]);
  
  // Handle city change from dropdown
  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setSearchQuery(''); // Clear search when city changes
    setHighlightedBookshopId(null); // Clear highlight
  };
  
  // Handle state change from dropdown
  const handleStateChange = (state: string) => {
    const newState = state === "all" ? "" : state;
    setSelectedState(newState);
    // Clear city when state changes since cities will be different
    setSelectedCity("");
    setSearchQuery(''); // Clear search
    setHighlightedBookshopId(null); // Clear highlight
  };
  
  // Handle map marker click - highlight corresponding card
  const handleMapMarkerClick = (id: number) => {
    setHighlightedBookshopId(id);
    // Scroll to the highlighted card in the list
    // Use setTimeout to ensure the card is rendered before scrolling
    setTimeout(() => {
      const cardElement = document.getElementById(`bookshop-card-${id}`);
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };
  
  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px]">
      <SEO 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={canonicalUrl}
      />
      
      {/* Top Section: Search Bar and City/State Dropdowns */}
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>
            
            {/* State Dropdown */}
            <div className="w-full md:w-48">
              <Select value={selectedState || "all"} onValueChange={handleStateChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {statesData && statesData.length > 0 ? (
                    statesData
                      .filter(state => state && state.trim() !== "" && state !== "#ERROR!")
                      .sort((a, b) => {
                        // Sort by full state name for better UX
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
            
            {/* City Dropdown */}
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
          </div>
          
          {/* Results count and mobile map toggle */}
          <div className="mt-3 flex items-center justify-between">
            {selectedCity && (
              <div className="text-sm text-gray-600">
                {filteredBookshops.length} bookshop{filteredBookshops.length !== 1 ? 's' : ''} found
                {selectedCity && ` in ${selectedCity}`}
                {stateName && `, ${stateName}`}
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
            {!selectedCity ? (
              <div className="text-center py-20 text-gray-500">
                <p className="text-lg mb-2">Select a city to view bookshops</p>
                <p className="text-sm">Choose a city from the dropdown above to get started</p>
              </div>
            ) : isLoading ? (
              <div className="text-center py-20">
                <p>Loading indie bookshops in {selectedCity}...</p>
              </div>
            ) : isError ? (
              <div className="text-center py-20">
                <p className="text-red-600 mb-4">Error loading independent bookshops. Please try again later.</p>
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
                  {searchQuery 
                    ? `No bookshops found matching "${searchQuery}"`
                    : `No local bookshops found in ${selectedCity}${stateName ? `, ${stateName}` : ''}`
                  }
                </p>
                {searchQuery && (
                  <Button 
                    onClick={() => setSearchQuery('')}
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
          {selectedCity && filteredBookshops.length > 0 ? (
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
                  {!selectedCity 
                    ? "Select a city to see bookshops on the map"
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

export default CityDirectory;